// preprocess.js, unsure of everything in here, some things, chat used so learn more about them and refactor. 

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

    // Official docs-hosted prebuilt opencv.js
    // https://docs.opencv.org/{VERSION}/opencv.js or /4.x/opencv.js for latest 4.x
    script.src = "https://docs.opencv.org/4.x/opencv.js";

    script.onload = () => {
      // OpenCV sets up Module; runtime becomes ready via onRuntimeInitialized
      const cv = window.cv;
      if (!cv) return reject(new Error("cv not found after script load"));

      cv["onRuntimeInitialized"] = () => {
        cvReady = true;
        resolve();
      };
    };

    script.onerror = () => reject(new Error("Failed to load opencv.js"));

    document.head.appendChild(script);
  });

  return cvLoading;
}

export function preprocessToCanvas(ctx, w, h, mode = "enhance") {
  if (mode === "cv" && isOpenCVReady()) {
    return preprocessOpenCV(ctx, w, h);
  }
  if (mode === "enhance") {
    return preprocessCanvas(ctx, w, h);
  }
  // mode === "none"
}

// canvas pipeline: contrast + sharpen
function preprocessCanvas(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;

  const contrast = 1.25;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    y = (y - 128) * contrast + 128;
    if (y < 0) y = 0;
    if (y > 255) y = 255;
    data[i] = data[i + 1] = data[i + 2] = y;
  }

  ctx.putImageData(img, 0, 0);

  // quick sharpen
  const src = ctx.getImageData(0, 0, w, h);
  const s = src.data;
  const dst = ctx.createImageData(w, h);
  const d = dst.data;
  const idx = (x, y) => (y * w + x) * 4;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = s[idx(x, y)];
      const up = s[idx(x, y - 1)];
      const dn = s[idx(x, y + 1)];
      const lf = s[idx(x - 1, y)];
      const rt = s[idx(x + 1, y)];

      let val = (5 * c) - up - dn - lf - rt;
      if (val < 0) val = 0;
      if (val > 255) val = 255;

      const p = idx(x, y);
      d[p] = d[p + 1] = d[p + 2] = val;
      d[p + 3] = 255;
    }
  }

  ctx.putImageData(dst, 0, 0);
}

// OpenCV.js rescue pipeline
function preprocessOpenCV(ctx, w, h) {
  const cv = window.cv;

  // Read from the current canvas pixels into a Mat
  // cv.imread can take a canvas element id or element. We don't have direct element here,
  // so we use ImageData -> Mat.
  //TODO
  const imgData = ctx.getImageData(0, 0, w, h);
  let src = cv.matFromImageData(imgData);

  try {
    // RGBA -> GRAY
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Blur gate: skip expensive processing if frame is too blurry
    // Compute variance of Laplacian; low variance => blur.
    //TODO
    const sharpness = laplacianVariance(gray);
    if (sharpness < 45) {
      gray.delete();
      return; // keep original crop; scanner will try another crop/mode
    }

    // Denoise (light blur)
    let blur = new cv.Mat();
    cv.GaussianBlur(gray, blur, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);

    // Adaptive threshold: great for uneven lighting
    let th = new cv.Mat();
    cv.adaptiveThreshold(
      blur,
      th,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      31,   // blockSize (odd)
      7     // C
    );

    // Morph close to connect broken bars
    let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    let morphed = new cv.Mat();
    cv.morphologyEx(th, morphed, cv.MORPH_CLOSE, kernel);

    // Convert back to RGBA so ZXing is happy via canvas
    let rgba = new cv.Mat();
    cv.cvtColor(morphed, rgba, cv.COLOR_GRAY2RGBA);

    // Write back to the same canvas
    const out = new ImageData(new Uint8ClampedArray(rgba.data), w, h);
    ctx.putImageData(out, 0, 0);

    // Cleanup
    gray.delete();
    blur.delete();
    th.delete();
    kernel.delete();
    morphed.delete();
    rgba.delete();
  } finally {
    src.delete();
  }
}

function laplacianVariance(grayMat) {
  const cv = window.cv;
  let lap = new cv.Mat();
  try {
    cv.Laplacian(grayMat, lap, cv.CV_64F);
    let mean = new cv.Mat();
    let stddev = new cv.Mat();
    cv.meanStdDev(lap, mean, stddev);

    const sd = stddev.doubleAt(0, 0);
    mean.delete();
    stddev.delete();

    return sd * sd; // variance
  } finally {
    lap.delete();
  }
}
