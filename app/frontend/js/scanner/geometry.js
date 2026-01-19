export function pointsToBox(result, crop) {
  const pts = result.resultPoints || [];
  if (!pts.length) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const padX = Math.max(8, Math.floor(crop.w * 0.02));
  const padY = Math.max(8, Math.floor(crop.h * 0.03));

  return {
    x: crop.x + minX - padX,
    y: crop.y + minY - padY,
    w: (maxX - minX) + padX * 2,
    h: (maxY - minY) + padY * 2,
  };
}
