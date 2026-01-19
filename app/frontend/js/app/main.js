import { startCamera } from "/frontend/camera.js";
import { startScanner } from "/frontend/js/scanner/index.js";
import { initOpenCV } from "/frontend/js/preprocess/index.js";

import { checkGtin } from "/frontend/js/api.js";
import { downloadCsv } from "/frontend/js/exporter.js";

import {
  showToast,
  initPriceMode,
  getPriceMode,
  askPrice,
  updateLastGtin,
  addScanItem,
} from "./ui.js";

import {
  initOverlay,
  updateDetectedBox,
  resizeOverlay,
} from "./overlay.js";

import {
  shouldIgnoreGtin,
  isDuplicateGtin,
  registerGtin,
  addScanResult,
  getScanLog,
} from "./state.js";

/* =============================
   DOM
============================= */

const video = document.getElementById("video");
const workCanvas = document.getElementById("canvas");
const overlay = document.getElementById("overlay");
const cameraContainer = document.getElementById("camera-container");
const downloadBtn = document.getElementById("download");
const beep = document.getElementById("beep");

/* =============================
   CAMERA LAYOUT
============================= */

function adjustCameraHeight() {
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  if (vw > 768) {
    cameraContainer.style.height = "";
    resizeOverlay();
    return;
  }

  const isLandscape = vw > vh;
  const ratio = isLandscape ? 0.55 : 0.36;

  cameraContainer.style.height = `${Math.floor(vh * ratio)}px`;
  resizeOverlay();
}

window.addEventListener("resize", adjustCameraHeight);
window.addEventListener("orientationchange", adjustCameraHeight);

/* =============================
   CAMERA BOOT (USER GESTURE!)
============================= */

let cameraStarted = false;

async function bootCamera() {
  if (cameraStarted) return;
  cameraStarted = true;

  try {
  await startCamera(video);
} catch (err) {
  console.warn("Camera start blocked, waiting for user gesture", err);

  // Fallback: start on first user interaction
  const resume = async () => {
    document.removeEventListener("click", resume);
    document.removeEventListener("touchstart", resume);
    await startCamera(video);
  };

  document.addEventListener("click", resume, { once: true });
  document.addEventListener("touchstart", resume, { once: true });
}

adjustCameraHeight();


  initOverlay({
    overlayCanvas: overlay,
    videoEl: video,
  });

  initOpenCV().catch(() => {});
}

/* =============================
   AUDIO + CAMERA UNLOCK
============================= */

function unlockMedia() {
  // unlock audio
  beep.play().catch(() => {});
  beep.pause();
  beep.currentTime = 0;

  // start camera
  bootCamera();
}

document.body.addEventListener("click", unlockMedia, { once: true });
document.body.addEventListener("touchstart", unlockMedia, { once: true });

/* =============================
   INIT STATE
============================= */

initPriceMode();

/* =============================
   SCANNER
============================= */

startScanner(
  video,
  workCanvas,
  async (gtin) => {
    if (shouldIgnoreGtin(gtin)) return;

    if (isDuplicateGtin(gtin)) {
      showToast(`GTIN ${gtin} already scanned`);
      registerGtin(gtin);
      return;
    }

    registerGtin(gtin);
    updateLastGtin(gtin);

    beep.currentTime = 0;
    beep.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(80);

    const data = await checkGtin({ gtin });

    let price = "";
    if (getPriceMode() === "price") {
      price = await askPrice();
    }

    addScanResult({
      gtin,
      name: data.name || "",
      price,
      status: data.status,
    });

    addScanItem({
      gtin,
      name: data.name || "",
      price,
      status: data.status,
    });
  },
  (box) => {
    updateDetectedBox(box);
  }
);

/* =============================
   EXPORT
============================= */

downloadBtn.onclick = () => {
  downloadCsv(getScanLog());
};
