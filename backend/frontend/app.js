import { startCamera } from "./camera.js";
import { startScanner } from "./scanner.js";
import { initOpenCV } from "./preprocess.js";

const video = document.getElementById("video");
const workCanvas = document.getElementById("canvas");
const overlay = document.getElementById("overlay");
const gtinBox = document.getElementById("gtin");
const list = document.getElementById("scan-list");
const beep = document.getElementById("beep");
const status = document.getElementById("status");

const API = "";

const scanLog = [];

// Unlock audio on mobile
document.body.addEventListener(
  "touchstart",
  () => {
    beep.play().catch(() => {});
    beep.pause();
    beep.currentTime = 0;
  },
  { once: true }
);

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

// =============================
// Rounded rectangle helper
// =============================
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
// Resize overlay
// =============================
function resizeOverlay() {
  const rect = video.getBoundingClientRect();
  overlay.width = rect.width;
  overlay.height = rect.height;
}

video.onloadedmetadata = resizeOverlay;
window.addEventListener("resize", resizeOverlay);

// =============================
// Draw overlay
// =============================
function drawOverlay() {
  const ctx = overlay.getContext("2d");
  const w = overlay.width;
  const h = overlay.height;

  ctx.clearRect(0, 0, w, h);

  // Focus box
  const boxW = w * 0.7;
  const boxH = h * 0.25;
  const fx = (w - boxW) / 2;
  const fy = (h - boxH) / 2;

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#3b82f6";
  roundRect(ctx, fx, fy, boxW, boxH, 18);
  ctx.stroke();

  // Detected barcode box
  if (lastBox && Date.now() - lastBoxAt < BOX_TTL_MS) {
    ctx.save();
    ctx.shadowColor = "rgba(59,130,246,0.6)";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#3b82f6";
    ctx.fillStyle = "rgba(59,130,246,0.12)";
    ctx.lineWidth = 5;

    roundRect(ctx, lastBox.x, lastBox.y, lastBox.w, lastBox.h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

setInterval(drawOverlay, 60);

// =============================
// Batch
// =============================
const scanned = new Set();

// =============================
// Start scanner
// =============================
startScanner(
  video,
  workCanvas,
  async (gtin) => {
    if (scanned.has(gtin)) return;
    scanned.add(gtin);

    gtinBox.textContent = gtin;

    // Feedback
    beep.currentTime = 0;
    beep.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(80);

    // Backend lookup
    let res;
try {
  res = await fetch(`${API}/api/check-gtin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gtin }),
  });
} catch (e) {
  alert("API call failed: " + e.message);
  return;
}


    let data;
try {
  data = await res.json();
} catch (e) {
  alert("JSON parse failed");
  return;
}


    // Log for CSV
    scanLog.push({ gtin, status: data.status });

    // Add to list
    const li = document.createElement("li");
    li.textContent = `${gtin} — ${data.status.toUpperCase()}`;

    if (data.status === "red") li.classList.add("scan-red");
    if (data.status === "yellow") li.classList.add("scan-yellow");
    if (data.status === "green") li.classList.add("scan-green");

    list.prepend(li);
  },
  (box) => {
    if (!box) return;

    const scaleX = overlay.width / video.videoWidth;
    const scaleY = overlay.height / video.videoHeight;

    lastBox = {
      x: box.x * scaleX,
      y: box.y * scaleY,
      w: box.w * scaleX,
      h: box.h * scaleY,
    };

    lastBoxAt = Date.now();
  }
);

// =============================
// CSV Download
// =============================
document.getElementById("download").onclick = () => {
  let csv = "gtin,status\n";
  for (const row of scanLog) {
    csv += `${row.gtin},${row.status}\n`;
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "scans.csv";
  a.click();

  URL.revokeObjectURL(url);
};
