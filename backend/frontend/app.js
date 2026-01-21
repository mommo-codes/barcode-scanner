import { startCamera } from "./camera.js";
import { startScanner } from "./scanner.js";
import { initOpenCV } from "./preprocess.js";


const video = document.getElementById("video");
const workCanvas = document.getElementById("canvas");
const overlay = document.getElementById("overlay");
const gtinBox = document.getElementById("gtin");
const list = document.getElementById("scan-list");
const beep = document.getElementById("beep");
const cameraContainer = document.getElementById("camera-container");

const priceModeSelect = document.getElementById("price-mode");
const priceModal = document.getElementById("price-modal");
const priceInput = document.getElementById("price-input");
const priceConfirm = document.getElementById("price-confirm");

const API = "";
const scanLog = [];

const toast = document.getElementById("toast");

function showToast(message, duration = 1500) {
  toast.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, duration);
}


let priceMode = "no-price";

priceModeSelect.addEventListener("change", () => {
  priceMode = priceModeSelect.value;
});



function askPrice() {
  return new Promise((resolve) => {
    priceInput.value = "";
    priceModal.classList.remove("hidden");

    // ensure numeric keyboard on mobile
    setTimeout(() => priceInput.focus(), 50);

    priceConfirm.onclick = () => {
      priceModal.classList.add("hidden");
      resolve(priceInput.value.trim());
    };
  });
}


// dynamic camera sizing for mobile
function adjustCameraHeight() {
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  if (vw > 768) {
    cameraContainer.style.height = "";
    return;
  }

  const isLandscape = vw > vh;
  const heightRatio = isLandscape ? 0.55 : 0.36;

  cameraContainer.style.height = `${Math.floor(vh * heightRatio)}px`;
  resizeOverlay();
}

window.addEventListener("resize", adjustCameraHeight);
window.addEventListener("orientationchange", adjustCameraHeight);


// unlocking audio on mobile
document.body.addEventListener(
  "touchstart",
  () => {
    beep.play().catch(() => {});
    beep.pause();
    beep.currentTime = 0;
  },
  { once: true }
);


let lastBox = null;
let lastBoxAt = 0;
const BOX_TTL_MS = 300;


// camera start
await startCamera(video);
adjustCameraHeight();


initOpenCV().catch(() => {});

// helpers
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

function resizeOverlay() {
  const rect = video.getBoundingClientRect();
  overlay.width = rect.width;
  overlay.height = rect.height;
}

video.onloadedmetadata = resizeOverlay;

function drawOverlay() {
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

setInterval(drawOverlay, 60);

const scanned = new Set();
let lastScannedGtin = null;

startScanner(
  video,
  workCanvas,
  async (gtin) => {

    // Same GTIN repeatedly → ignore
    if (gtin === lastScannedGtin) return;

    // Seen before but not last → warn
    if (scanned.has(gtin)) {
  showToast(`GTIN ${gtin} already scanned`);
  lastScannedGtin = gtin;
  return;
}


    scanned.add(gtin);
    lastScannedGtin = gtin;

    gtinBox.textContent = gtin;

    beep.currentTime = 0;
    beep.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(80);

    const res = await fetch(`${API}/api/check-gtin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gtin }),
    });

    const data = await res.json();

    let price = "";

    if (priceMode === "price") {
      price = await askPrice();
    }

    scanLog.push({
      gtin,
      name: data.name || "",
      price,
      status: data.status,
    });

    const li = document.createElement("li");
    li.textContent = data.name
      ? `${gtin} — ${data.name}${price ? ` (${price})` : ""}`
      : gtin;

    li.classList.add(`scan-${data.status}`);
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


// csv download
document.getElementById("download").onclick = () => {
  let csv = "gtin,name,price,status\n";

  for (const row of scanLog) {
    csv += `${row.gtin},"${row.name}","${row.price}",${row.status}\n`;
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "scans.csv";
  a.click();

  URL.revokeObjectURL(url);
};
