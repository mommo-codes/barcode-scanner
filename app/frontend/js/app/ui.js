/* =============================
   DOM
   ============================= */

const toast = document.getElementById("toast");

const priceModeSelect = document.getElementById("price-mode");
const priceModal = document.getElementById("price-modal");
const priceInput = document.getElementById("price-input");
const priceConfirm = document.getElementById("price-confirm");

const gtinBox = document.getElementById("gtin");
const list = document.getElementById("scan-list");

/* =============================
   STATE
   ============================= */

let priceMode = "no-price";

/* =============================
   TOAST
   ============================= */

export function showToast(message, duration = 1500) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), duration);
}

/* =============================
   PRICE MODE
   ============================= */

export function initPriceMode() {
  priceModeSelect.addEventListener("change", () => {
    priceMode = priceModeSelect.value;
  });
}

export function getPriceMode() {
  return priceMode;
}

/* =============================
   PRICE MODAL
   ============================= */

export function askPrice() {
  return new Promise((resolve) => {
    priceInput.value = "";
    priceModal.classList.remove("hidden");

    setTimeout(() => priceInput.focus(), 50);

    priceConfirm.onclick = () => {
      priceModal.classList.add("hidden");
      resolve(priceInput.value.trim());
    };
  });
}

/* =============================
   SCAN LIST
   ============================= */

export function updateLastGtin(gtin) {
  gtinBox.textContent = gtin;
}

export function addScanItem({ gtin, name, price, status }) {
  const li = document.createElement("li");

  li.textContent = name
    ? `${gtin} — ${name}${price ? ` (${price})` : ""}`
    : gtin;

  li.classList.add(`scan-${status}`);
  list.prepend(li);
}
