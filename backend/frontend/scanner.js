// scanner.js
import { BrowserMultiFormatReader } from "https://esm.sh/@zxing/browser@0.1.4";
import { preprocessToCanvas } from "./preprocess.js";

const reader = new BrowserMultiFormatReader();

const recent = []; // { code, time }
let lastAccepted = null;
let lastAcceptedAt = 0;

// time constants
const DECODE_INTERVAL_MS = 60;
const CONSENSUS_WINDOW_MS = 400;
const CONSENSUS_MIN_HITS = 2;
const ACCEPT_COOLDOWN_MS = 700;

// adapt difficulty
let difficulty = 0; // 0 = easy, 1 = medium, 2 = hard
let lastSuccessAt = Date.now();

function getModes() {
  if (difficulty === 0) return ["none"];
  if (difficulty === 1) return ["none", "enhance"];
  return ["none", "enhance", "cv"];
}

function updateDifficulty(success) {
  const now = Date.now();

  if (success) {
    lastSuccessAt = now;
    difficulty = Math.max(0, difficulty - 1);
  } else if (now - lastSuccessAt > 1200) {
    difficulty = Math.min(2, difficulty + 1);
  }
}

// Adaptive crop sizes
function getCropRects(w, h) {
  const scale = difficulty === 0 ? 0.65 : difficulty === 1 ? 0.75 : 0.85;
  const cw = Math.floor(w * scale);
  const ch = Math.floor(h * 0.35);

  const rect = (x, y) => ({ x, y, w: cw, h: ch });

  return [
    rect((w - cw) / 2, (h - ch) / 2), // center
    rect((w - cw) / 2, 0),           // top
    rect((w - cw) / 2, h - ch),      // bottom
    rect(0, (h - ch) / 2),           // left
    rect(w - cw, (h - ch) / 2),      // right
  ];
}

// gtin validation
function isLikelyGTIN(s) {
  if (!/^\d{8}(\d{4}|\d{5}|\d{6})?$/.test(s)) return false;
  return [8, 12, 13, 14].includes(s.length);
}

function gtinChecksumValid(gtin) {
  const digits = gtin.split("").map(n => Number(n));
  const check = digits.pop();

  let sum = 0;
  let weight = 3;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += digits[i] * weight;
    weight = weight === 3 ? 1 : 3;
  }

  const calc = (10 - (sum % 10)) % 10;
  return calc === check;
}

function pushRecent(code) {
  const now = Date.now();
  recent.push({ code, time: now });

  while (recent.length && now - recent[0].time > CONSENSUS_WINDOW_MS) {
    recent.shift();
  }

  return recent.filter(r => r.code === code).length;
}

function canAccept(code) {
  const now = Date.now();
  if (lastAccepted === code && (now - lastAcceptedAt) < ACCEPT_COOLDOWN_MS) return false;
  return true;
}

function accept(code, onResult) {
  lastAccepted = code;
  lastAcceptedAt = Date.now();
  recent.length = 0;
  onResult(code);
}

// decode helper
async function tryDecodeResultFromCanvas(canvas) {
  // ZXing throws if none found
  return await reader.decodeFromCanvas(canvas);
}

function getPointsFromResult(result) {
  const pts =
    (result && Array.isArray(result.resultPoints) && result.resultPoints) ||
    (result && typeof result.getResultPoints === "function" && result.getResultPoints()) ||
    null;

  if (!pts || !pts.length) return null;

  // Normalize to {x,y}
  return pts
    .map(p => {
      // could be {x,y} or {getX,getY}
      if (p && typeof p.x === "number" && typeof p.y === "number") return { x: p.x, y: p.y };
      if (p && typeof p.getX === "function" && typeof p.getY === "function") return { x: p.getX(), y: p.getY() };
      return null;
    })
    .filter(Boolean);
}

// bounding box
// For 1D codes, ZXing often returns 2 points (start/end along a row). :contentReference[oaicite:1]{index=1} // need to learn more about this. 
// TODO: check if this works well for 2D codes too.
function pointsToBox(points, cropW, cropH) {
  if (!points || points.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  // height and width based on points
  const width = maxX - minX;
  const height = maxY - minY;

  let boxMinX = minX;
  let boxMaxX = maxX;
  let boxMinY = minY;
  let boxMaxY = maxY;

  // padding based on crop size
  const padX = Math.max(8, Math.floor(cropW * 0.02));
  const padY = Math.max(8, Math.floor(cropH * 0.03));

  if (height < 8) {
    // likely just two points in same row -> make a band // make this more adaptive
    const bandH = Math.max(40, Math.floor(cropH * 0.25));
    const midY = (minY + maxY) / 2;
    boxMinY = midY - bandH / 2;
    boxMaxY = midY + bandH / 2;
  }

  boxMinX -= padX;
  boxMaxX += padX;
  boxMinY -= padY;
  boxMaxY += padY;

  // clamp
  boxMinX = Math.max(0, Math.min(cropW, boxMinX));
  boxMaxX = Math.max(0, Math.min(cropW, boxMaxX));
  boxMinY = Math.max(0, Math.min(cropH, boxMinY));
  boxMaxY = Math.max(0, Math.min(cropH, boxMaxY));

  return {
    x: boxMinX,
    y: boxMinY,
    w: Math.max(0, boxMaxX - boxMinX),
    h: Math.max(0, boxMaxY - boxMinY),
  };
}

// ============================
// Main engine
// startScanner(video, workCanvas, onResult, onBox)
//   onBox: (boxInVideoCoords | null) => void
// ============================
export function startScanner(video, workCanvas, onResult, onBox) {
  const workCtx = workCanvas.getContext("2d", { willReadFrequently: true });

  const cropCanvas = document.createElement("canvas");
  const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });

  let busy = false;

  setInterval(async () => {
    if (busy) return;
    if (video.readyState !== 4) return;

    busy = true;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Draw full frame
    workCanvas.width = vw;
    workCanvas.height = vh;
    workCtx.drawImage(video, 0, 0, vw, vh);

    const crops = getCropRects(vw, vh);
    const modes = getModes();

    let found = null;
    let foundBoxVideo = null;

    for (const crop of crops) {
      cropCanvas.width = crop.w;
      cropCanvas.height = crop.h;

      // Copy crop region
      cropCtx.drawImage(
        workCanvas,
        crop.x, crop.y, crop.w, crop.h,
        0, 0, crop.w, crop.h
      );

      for (const mode of modes) {
        if (mode !== "none") {
          preprocessToCanvas(cropCtx, crop.w, crop.h, mode);
        }

        try {
          const result = await tryDecodeResultFromCanvas(cropCanvas);
          if (!result) continue;

          const code = String(result.text ?? result.getText?.() ?? "").trim();
          if (!code) continue;

          if (!isLikelyGTIN(code)) continue;
          if (!gtinChecksumValid(code)) continue;

          // Build box from points (in crop coords), then convert to video coords
          const pts = getPointsFromResult(result);
          const boxCrop = pointsToBox(pts, crop.w, crop.h);

          if (boxCrop) {
            foundBoxVideo = {
              x: crop.x + boxCrop.x,
              y: crop.y + boxCrop.y,
              w: boxCrop.w,
              h: boxCrop.h,
            };
          }

          found = code;
          break;
        } catch {
          // no barcode found
        }
      }

      if (found) break;
    }

    if (typeof onBox === "function") {
      // Only show box briefly; app will also time it out
      onBox(foundBoxVideo);
    }

    if (found && canAccept(found)) {
      const hits = pushRecent(found);
      if (hits >= CONSENSUS_MIN_HITS) {
        updateDifficulty(true);
        accept(found, onResult);
      }
    } else {
      updateDifficulty(false);
    }

    busy = false;
  }, DECODE_INTERVAL_MS);
}
