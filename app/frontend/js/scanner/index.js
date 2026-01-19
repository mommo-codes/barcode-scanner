import { startEngine } from "./engine.js";

export function startScanner(video, workCanvas, onResult, onBox) {
  startEngine({
    video,
    workCanvas,
    onResult,
    onBox,
  });
}
