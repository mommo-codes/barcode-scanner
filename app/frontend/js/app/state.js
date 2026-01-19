/* =============================
   STATE
   ============================= */

const scanLog = [];
const scanned = new Set();

let lastScannedGtin = null;

/* =============================
   PUBLIC API
   ============================= */

export function shouldIgnoreGtin(gtin) {
  return gtin === lastScannedGtin;
}

export function isDuplicateGtin(gtin) {
  return scanned.has(gtin);
}

export function registerGtin(gtin) {
  scanned.add(gtin);
  lastScannedGtin = gtin;
}

export function addScanResult({ gtin, name, price, status }) {
  scanLog.push({ gtin, name, price, status });
}

export function getScanLog() {
  return scanLog;
}

export function resetLastScanned() {
  lastScannedGtin = null;
}
