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

await startCamera(video);

// Load OpenCV in the background (but now, not “later”)
initOpenCV()
  .then(() => (status.textContent = "CV: OpenCV ready ✅ (rescue mode enabled)"))
  .catch(() => (status.textContent = "CV: OpenCV failed to load (using fast mode only)"));

function resizeOverlay() {
  overlay.width = video.videoWidth;
  overlay.height = video.videoHeight;
}
video.onloadedmetadata = resizeOverlay;
window.addEventListener("resize", resizeOverlay);

// Focus box
function drawFocusBox() {
  const ctx = overlay.getContext("2d");
  const w = overlay.width;
  const h = overlay.height;

  ctx.clearRect(0, 0, w, h);

  const boxW = w * 0.7;
  const boxH = h * 0.25;
  const x = (w - boxW) / 2;
  const y = (h - boxH) / 2;

  ctx.strokeStyle = "#00ffb3";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, boxW, boxH);

  // Tiny hint line (optional)
  ctx.font = `${Math.max(14, Math.floor(h * 0.03))}px system-ui`;
  ctx.fillStyle = "rgba(0,255,179,0.9)";
  ctx.fillText(isOpenCVReady() ? "CV rescue ON" : "CV rescue OFF", x, y - 8);
}
setInterval(drawFocusBox, 100);

// Batch set
const scanned = new Set();

startScanner(video, workCanvas, gtin => {
  if (scanned.has(gtin)) return;

  scanned.add(gtin);
  gtinBox.textContent = gtin;

  beep.currentTime = 0;
  beep.play().catch(() => { /* iOS sometimes blocks autoplay until user gesture */ });

  if (navigator.vibrate) navigator.vibrate(80);

  const li = document.createElement("li");
  li.textContent = gtin;
  list.prepend(li);
});
