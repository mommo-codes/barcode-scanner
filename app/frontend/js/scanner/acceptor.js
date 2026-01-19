const recent = [];
let lastAccepted = null;
let lastAcceptedAt = 0;

let difficulty = 0;
let lastSuccessAt = Date.now();

export function getModes() {
  if (difficulty === 0) return ["none"];
  if (difficulty === 1) return ["none", "enhance"];
  return ["none", "enhance", "cv"];
}

export function getCropRects(w, h) {
  const scale = difficulty === 0 ? 0.65 : difficulty === 1 ? 0.75 : 0.85;
  const cw = Math.floor(w * scale);
  const ch = Math.floor(h * 0.35);

  const rect = (x, y) => ({ x, y, w: cw, h: ch });

  return [
    rect((w - cw) / 2, (h - ch) / 2),
    rect((w - cw) / 2, 0),
    rect((w - cw) / 2, h - ch),
    rect(0, (h - ch) / 2),
    rect(w - cw, (h - ch) / 2),
  ];
}

export function shouldAccept(code) {
  const now = Date.now();
  if (code === lastAccepted && now - lastAcceptedAt < 700) return false;
  return true;
}

export function registerHit(code, onResult) {
  lastAccepted = code;
  lastAcceptedAt = Date.now();
  recent.length = 0;
  onResult(code);
}

export function updateDifficulty(success) {
  const now = Date.now();
  if (success) {
    lastSuccessAt = now;
    difficulty = Math.max(0, difficulty - 1);
  } else if (now - lastSuccessAt > 1200) {
    difficulty = Math.min(2, difficulty + 1);
  }
}
