// scanner.js
import { BrowserMultiFormatReader } from "https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.4/+esm";
import { preprocessToCanvas } from "./preprocess.js";

const reader = new BrowserMultiFormatReader();

// Temporal buffer to stabilize reads
const recent = []; // { code, time }
let lastAccepted = null;
let lastAcceptedAt = 0;

// Tune these
const DECODE_INTERVAL_MS = 70;     // faster loop
const CONSENSUS_WINDOW_MS = 450;   // time window
const CONSENSUS_MIN_HITS = 2;      // same code must appear >= this
const ACCEPT_COOLDOWN_MS = 650;    // prevents repeat spam from same barcode

// For speed: try "none" first, then "enhance" if needed
const MODES = ["none", "enhance", "cv"];

// Crops: center + four directions (helps when barcode isn't centered)
function getCropRects(w, h) {
  const cw = Math.floor(w * 0.72);
  const ch = Math.floor(h * 0.72);

  const rect = (x, y, ww, hh) => ({ x, y, w: ww, h: hh });

  return [
    // center
    rect(Math.floor((w - cw) / 2), Math.floor((h - ch) / 2), cw, ch),

    // top
    rect(Math.floor((w - cw) / 2), 0, cw, ch),

    // bottom
    rect(Math.floor((w - cw) / 2), h - ch, cw, ch),

    // left
    rect(0, Math.floor((h - ch) / 2), cw, ch),

    // right
    rect(w - cw, Math.floor((h - ch) / 2), cw, ch),
  ];
}

function isLikelyGTIN(s) {
  // GTIN-8, GTIN-12 (UPC-A), GTIN-13 (EAN-13), GTIN-14
  if (!/^\d{8}(\d{4}|\d{5}|\d{6})?$/.test(s)) return false;
  return [8, 12, 13, 14].includes(s.length);
}

function gtinChecksumValid(gtin) {
  // Works for GTIN-8/12/13/14 (standard modulo-10)
  // https://www.gs1.org/services/how-calculate-check-digit-manually
  const digits = gtin.split("").map(n => Number(n));
  const check = digits.pop();

  let sum = 0;
  // From rightmost (excluding check digit), weights alternate 3 and 1
  // For GTIN, starting weight depends on length; this formula handles it:
  // Iterate from rightmost towards left
  let weight = 3;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += digits[i] * weight;
    weight = (weight === 3) ? 1 : 3;
  }

  const calc = (10 - (sum % 10)) % 10;
  return calc === check;
}

function pushRecent(code) {
  const now = Date.now();
  recent.push({ code, time: now });

  // Trim by time window
  while (recent.length && now - recent[0].time > CONSENSUS_WINDOW_MS) {
    recent.shift();
  }

  // Count hits for this code
  const hits = recent.filter(r => r.code === code).length;
  return hits;
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

async function tryDecodeFromCanvas(canvas) {
  // ZXing throws if none found
  const res = await reader.decodeFromCanvas(canvas);
  return res?.text ?? null;
}

export function startScanner(video, workCanvas, onResult) {
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

    // Draw full frame once (fast)
    workCanvas.width = vw;
    workCanvas.height = vh;
    workCtx.drawImage(video, 0, 0, vw, vh);

    const crops = getCropRects(vw, vh);

    // Strategy:
    // For each crop, try decode with "none" first (fast),
    // then "enhance" if needed (more robust).
    let found = null;

    for (const crop of crops) {
      cropCanvas.width = crop.w;
      cropCanvas.height = crop.h;

      // copy crop region
      cropCtx.drawImage(
        workCanvas,
        crop.x, crop.y, crop.w, crop.h,
        0, 0, crop.w, crop.h
      );

      for (const mode of MODES) {
        if (mode !== "none") {
          preprocessToCanvas(cropCtx, crop.w, crop.h, mode);
        }

        try {
          const text = await tryDecodeFromCanvas(cropCanvas);
          if (!text) continue;

          // Clean up common spacing artifacts
          const code = String(text).trim();

          // Hard filter to GTIN-ish to reduce false positives
          if (!isLikelyGTIN(code)) continue;
          if (!gtinChecksumValid(code)) continue;

          found = code;
          break;
        } catch {
          // no barcode found for this attempt
        }
      }
      if (found) break;
    }

    if (found && canAccept(found)) {
      const hits = pushRecent(found);
      if (hits >= CONSENSUS_MIN_HITS) {
        accept(found, onResult);
      }
    }

    busy = false;
  }, DECODE_INTERVAL_MS);
}
