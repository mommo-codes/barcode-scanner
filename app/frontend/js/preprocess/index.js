import { isOpenCVReady, initOpenCV } from "./opencv.js";
import { preprocessCanvas } from "./canvas.js";
import { preprocessOpenCV } from "./cv.js";

export { initOpenCV };

export function preprocessToCanvas(ctx, w, h, mode = "enhance") {
  if (mode === "cv" && isOpenCVReady()) {
    return preprocessOpenCV(ctx, w, h);
  }

  if (mode === "enhance") {
    return preprocessCanvas(ctx, w, h);
  }
}
