/* =============================
   STATE
   ============================= */

let overlay;
let video;

let lastBox = null;
let lastBoxAt = 0;
const BOX_TTL_MS = 300;

/* =============================
   INIT
   ============================= */

export function initOverlay({ overlayCanvas, videoEl }) {
  overlay = overlayCanvas;
  video = videoEl;

  resizeOverlay();
  video.onloadedmetadata = resizeOverlay;

  setInterval(drawOverlay, 60);
}

/* =============================
   PUBLIC API
   ============================= */

export function updateDetectedBox(box) {
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

export function resizeOverlay() {
  if (!overlay || !video) return;

  const rect = video.getBoundingClientRect();
  overlay.width = rect.width;
  overlay.height = rect.height;
}

/* =============================
   DRAWING
   ============================= */

function drawOverlay() {
  if (!overlay) return;

  const ctx = overlay.getContext("2d");
  const w = overlay.width;
  const h = overlay.height;

  ctx.clearRect(0, 0, w, h);

  const boxW = w * 0.7;
  const boxH = h * 0.35;
  const fx = (w - boxW) / 2;
  const fy = (h - boxH) / 2;

  ctx.lineWidth = 4;
  ctx.strokeStyle = "#3b82f6";
  roundRect(ctx, fx, fy, boxW, boxH, 18);
  ctx.stroke();

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
