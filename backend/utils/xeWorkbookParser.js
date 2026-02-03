const XLSX = require("xlsx");

function normalizeHeader(h) {
  return h
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\*/g, "") // remove required stars
    .replace(/\s*\(.*?\)\s*/g, "") // remove things in parentheses
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Parse an XE workbook created by our generator. Extract rows from all sheets whose names are not Instructions.
function parseXeWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const result = [];

  for (const sheetName of workbook.SheetNames) {
    if (/instructions/i.test(sheetName)) continue;

    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (!aoa.length) continue;

    const headers = aoa[0].map((h) => h?.toString?.() || "");
    const normalized = headers.map(normalizeHeader);

    const rows = aoa
      .slice(1)
      .filter((row) => row.some((cell) => (cell ?? "").toString().trim() !== ""))
      .map((row, idx) => {
        const obj = {};
        normalized.forEach((key, i) => {
          obj[key || `col_${i + 1}`] = row[i] ?? "";
        });
        obj._rowNumber = idx + 2; // excel row index
        return obj;
      });

    // Try to infer country/currency from sheet name like IN_INR
    let inferredCountry = "";
    let inferredCurrency = "";
    const match = sheetName.match(/^([A-Z]{2})_([A-Z]{3})$/);
    if (match) {
      inferredCountry = match[1];
      inferredCurrency = match[2];
    }

    result.push({
      sheetName,
      inferredCountry,
      inferredCurrency,
      headers,
      rows,
      rowCount: rows.length,
    });
  }

  return { success: true, sheets: result };
}

module.exports = { parseXeWorkbook };













