import { getCropRects, getModes } from "./acceptor.js";
import { tryDecode } from "./decoder.js";
import { shouldAccept, registerHit, updateDifficulty } from "./acceptor.js";

export function startEngine({ video, workCanvas, onResult, onBox }) {
  const workCtx = workCanvas.getContext("2d", { willReadFrequently: true });
  const cropCanvas = document.createElement("canvas");
  const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });

  let busy = false;

  setInterval(async () => {
    if (busy || video.videoWidth === 0) return;
    busy = true;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    workCanvas.width = vw;
    workCanvas.height = vh;
    workCtx.drawImage(video, 0, 0, vw, vh);

    let found = null;
    let foundBox = null;

    for (const crop of getCropRects(vw, vh)) {
      if (crop.w === 0 || crop.h === 0) continue;

      cropCanvas.width = crop.w;
      cropCanvas.height = crop.h;

      cropCtx.drawImage(
        workCanvas,
        crop.x, crop.y, crop.w, crop.h,
        0, 0, crop.w, crop.h
      );

      for (const mode of getModes()) {
        const result = await tryDecode(cropCtx, cropCanvas, crop, mode);
        if (!result) continue;

        found = result.code;
        foundBox = result.box;
        break;
      }

      if (found) break;
    }

    onBox?.(foundBox);

    if (found && shouldAccept(found)) {
      registerHit(found, onResult);
      updateDifficulty(true);
    } else {
      updateDifficulty(false);
    }

    busy = false;
  }, 60);
}
