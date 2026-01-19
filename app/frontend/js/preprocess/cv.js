export function preprocessOpenCV(ctx, w, h) {
  const cv = window.cv;
  const imgData = ctx.getImageData(0, 0, w, h);
  let src = cv.matFromImageData(imgData);

  try {
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    if (laplacianVariance(gray) < 45) {
      gray.delete();
      return;
    }

    let blur = new cv.Mat();
    cv.GaussianBlur(gray, blur, new cv.Size(3, 3), 0);

    let th = new cv.Mat();
    cv.adaptiveThreshold(
      blur, th, 255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      31, 7
    );

    let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    let morphed = new cv.Mat();
    cv.morphologyEx(th, morphed, cv.MORPH_CLOSE, kernel);

    let rgba = new cv.Mat();
    cv.cvtColor(morphed, rgba, cv.COLOR_GRAY2RGBA);

    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(rgba.data), w, h),
      0, 0
    );

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

function laplacianVariance(gray) {
  const cv = window.cv;
  let lap = new cv.Mat();

  try {
    cv.Laplacian(gray, lap, cv.CV_64F);
    let mean = new cv.Mat();
    let std = new cv.Mat();
    cv.meanStdDev(lap, mean, std);

    const sd = std.doubleAt(0, 0);
    mean.delete();
    std.delete();
    return sd * sd;
  } finally {
    lap.delete();
  }
}
