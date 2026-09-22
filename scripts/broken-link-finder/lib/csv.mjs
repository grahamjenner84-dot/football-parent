import fs from "node:fs";

function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function writeCsv(filePath, columns, rows) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(row[c])).join(","));
  }
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
}
