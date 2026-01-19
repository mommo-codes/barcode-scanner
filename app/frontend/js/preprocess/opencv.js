let cvReady = false;
let cvLoading = null;

export function isOpenCVReady() {
  return cvReady && typeof window.cv !== "undefined";
}

export async function initOpenCV() {
  if (cvLoading) return cvLoading;

  cvLoading = new Promise((resolve, reject) => {
    if (isOpenCVReady()) {
      cvReady = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://docs.opencv.org/4.x/opencv.js";

    script.onload = () => {
      const cv = window.cv;
      if (!cv) return reject(new Error("cv not found"));

      cv.onRuntimeInitialized = () => {
        cvReady = true;
        resolve();
      };
    };

    script.onerror = () => reject(new Error("Failed to load opencv.js"));
    document.head.appendChild(script);
  });

  return cvLoading;
}
