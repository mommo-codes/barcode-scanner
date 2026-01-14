import { startCamera } from "./camera.js";
import { startScanner } from "./scanner.js";
import { initOpenCV, isOpenCVReady } from "./preprocess.js";

const video = document.getElementById("video");
const workCanvas = document.getElementById("canvas");
const overlay = document.getElementById("overlay");
const gtinBox = document.getElementById("gtin");
const list = document.getElementById("scan-list");
const beep = document.getElementById("beep");
const status = document.getElementById("status");

// =============================
// Barcode box state
// =============================
let lastBox = null;
let lastBoxAt = 0;
const BOX_TTL_MS = 300;

// =============================
// Start camera
// =============================
await startCamera(video);

// =============================
// Load OpenCV
// =============================
initOpenCV()
  .then(() => (status.textContent = "CV: OpenCV ready"))
  .catch(() => (status.textContent = "CV: OpenCV disabled"));

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}


// =============================
// Resize overlay to match CSS video size
// =============================
function resizeOverlay() {
  const rect = video.getBoundingClientRect();
  overlay.width = rect.width;
  overlay.height = rect.height;
}

video.onloadedmetadata = resizeOverlay;
window.addEventListener("resize", resizeOverlay);

// =============================
// Draw focus box + detection box
// =============================
function drawOverlay() {
  const ctx = overlay.getContext("2d");
  const w = overlay.width;
  const h = overlay.height;

  ctx.clearRect(0, 0, w, h);

  // ---- Focus box (theme color)
  const boxW = w * 0.7;
  const boxH = h * 0.25;
  const fx = (w - boxW) / 2;
  const fy = (h - boxH) / 2;

  ctx.strokeStyle = "#3b82f6"; // SWE blue
  ctx.lineWidth = 4;
  roundRect(ctx, fx, fy, boxW, boxH, 18);
  ctx.stroke();

  ctx.shadowColor = "rgba(59,130,246,0.6)";
  ctx.shadowBlur = 12;


  // ---- Detected barcode box
  if (lastBox && (Date.now() - lastBoxAt) <= BOX_TTL_MS) {
    ctx.strokeStyle = "#3b82f6"; // SWE blue 
    ctx.lineWidth = 5;
    roundRect(ctx, lastBox.x, lastBox.y, lastBox.w, lastBox.h, 12);
    ctx.stroke();

    ctx.fill();
    ctx.fillStyle = "rgba(59,130,246,0.12)";

    ctx.shadowBlur = 0;
  }
}

setInterval(drawOverlay, 60);

// =============================
// Batch storage
// =============================
const scanned = new Set();

// =============================
// Start scanner
// =============================
startScanner(
  video,
  workCanvas,
  (gtin) => {
    if (scanned.has(gtin)) return;

    scanned.add(gtin);
    gtinBox.textContent = gtin;

    // Feedback
    beep.currentTime = 0;
    beep.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(80);

    const li = document.createElement("li");
    li.textContent = gtin;
    list.prepend(li);
  },
  (box) => {
    if (!box) return;

    // Convert from video pixels → CSS overlay pixels
    const scaleX = overlay.width / video.videoWidth;
    const scaleY = overlay.height / video.videoHeight;

    lastBox = {
      x: box.x * scaleX,
      y: box.y * scaleY,
      w: box.w * scaleX,
      h: box.h * scaleY
    };

    lastBoxAt = Date.now();
  }
);
