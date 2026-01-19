export function preprocessCanvas(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const contrast = 1.25;

  for (let i = 0; i < data.length; i += 4) {
    let y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    y = (y - 128) * contrast + 128;
    y = Math.max(0, Math.min(255, y));
    data[i] = data[i + 1] = data[i + 2] = y;
  }

  ctx.putImageData(img, 0, 0);

  const src = ctx.getImageData(0, 0, w, h);
  const s = src.data;
  const dst = ctx.createImageData(w, h);
  const d = dst.data;

  const idx = (x, y) => (y * w + x) * 4;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let val =
        5 * s[idx(x, y)] -
        s[idx(x, y - 1)] -
        s[idx(x, y + 1)] -
        s[idx(x - 1, y)] -
        s[idx(x + 1, y)];

      val = Math.max(0, Math.min(255, val));
      const p = idx(x, y);
      d[p] = d[p + 1] = d[p + 2] = val;
      d[p + 3] = 255;
    }
  }

  ctx.putImageData(dst, 0, 0);
}
