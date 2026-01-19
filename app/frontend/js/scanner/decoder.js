import { BrowserMultiFormatReader } from "https://esm.sh/@zxing/browser@0.1.4";
import { preprocessToCanvas } from "../preprocess/index.js";
import { pointsToBox } from "./geometry.js";

const reader = new BrowserMultiFormatReader();

export async function tryDecode(ctx, canvas, crop, mode) {
  if (mode !== "none") {
    preprocessToCanvas(ctx, crop.w, crop.h, mode);
  }

  try {
    const result = await reader.decodeFromCanvas(canvas);
    const code = String(result.text).trim();

    if (!isLikelyGTIN(code)) return null;
    if (!gtinChecksumValid(code)) return null;

    const box = pointsToBox(result, crop);
    return { code, box };
  } catch {
    return null;
  }
}
