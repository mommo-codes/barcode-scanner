export function downloadCsv(rows, filename = "scans.csv") {
  let csv = "gtin,name,price,status\n";

  for (const row of rows) {
    const name = row.name ? `"${row.name}"` : "";
    const price = row.price ?? "";
    csv += `${row.gtin},${name},${price},${row.status}\n`;
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
