const API_BASE = "/api";

export async function checkGtin({ gtin, country = "se" }) {
  const res = await fetch(`${API_BASE}/check-gtin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gtin, country }),
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }

  return res.json();
}
