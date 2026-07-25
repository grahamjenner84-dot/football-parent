// Minimal single-sheet XLSX reader/writer on top of zip-lite.ts. Values are
// written as inline strings/numbers (no shared-strings table needed for
// writing, which keeps the writer simple); reading supports both inline
// strings (t="str"/"inlineStr"), shared strings (t="s"), and plain numbers,
// which covers Google Search Console's own XLSX exports as well as files
// this system writes itself. No formulas, styles, merged cells, or
// multi-sheet support - not needed for flat tracker tables.
import { readZip, writeZip, type ZipEntry } from "./zip-lite";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlUnescape(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

function colIndexToLetters(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function colLettersToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

function workbookXml(sheetName: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

function isNumericValue(value: string): boolean {
  return value.trim() !== "" && !Number.isNaN(Number(value)) && /^-?\d+(\.\d+)?$/.test(value.trim());
}

function sheetXml(rows: (string | number | null | undefined)[][]): string {
  const rowsXml = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, colIndex) => {
          const ref = `${colIndexToLetters(colIndex)}${rowIndex + 1}`;
          if (cell === null || cell === undefined || cell === "") return "";
          const strValue = String(cell);
          if (typeof cell === "number" || isNumericValue(strValue)) {
            return `<c r="${ref}"><v>${strValue}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(strValue)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml}</sheetData></worksheet>`;
}

export function writeXlsx(rows: (string | number | null | undefined)[][], sheetName = "Sheet1"): Buffer {
  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: Buffer.from(CONTENT_TYPES, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(ROOT_RELS, "utf8") },
    { name: "xl/workbook.xml", data: Buffer.from(workbookXml(sheetName), "utf8") },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(WORKBOOK_RELS, "utf8") },
    { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheetXml(rows), "utf8") },
  ];
  return writeZip(entries);
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const strings: string[] = [];
  const siRegex = /<si[^>]*>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;
  while ((match = siRegex.exec(xml))) {
    const inner = match[1];
    const parts = [...inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => xmlUnescape(m[1]));
    strings.push(parts.join(""));
  }
  return strings;
}

export function readXlsx(buffer: Buffer, sheetFile = "xl/worksheets/sheet1.xml"): string[][] {
  const entries = readZip(buffer);
  const byName = new Map(entries.map((e) => [e.name, e.data]));

  const sheetData = byName.get(sheetFile);
  if (!sheetData) throw new Error(`XLSX file has no "${sheetFile}" entry - not a supported single-sheet workbook`);

  const sharedStrings = parseSharedStrings(byName.get("xl/sharedStrings.xml")?.toString("utf8"));
  const sheetXmlStr = sheetData.toString("utf8");

  const rows: string[][] = [];
  const rowRegex = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(sheetXmlStr))) {
    const rowNum = Number(rowMatch[1]);
    const rowContent = rowMatch[2];
    const cellRegex = /<c\s+r="([A-Z]+)(\d+)"([^>]*)>(?:([\s\S]*?))?<\/c>|<c\s+r="([A-Z]+)(\d+)"([^>]*)\/>/g;
    const cellsByIndex = new Map<number, string>();
    let maxCol = -1;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowContent))) {
      const colLetters = cellMatch[1] ?? cellMatch[5];
      const attrs = cellMatch[3] ?? cellMatch[6] ?? "";
      const inner = cellMatch[4] ?? "";
      const colIndex = colLettersToIndex(colLetters);
      maxCol = Math.max(maxCol, colIndex);

      const typeMatch = attrs.match(/t="([^"]+)"/);
      const type = typeMatch ? typeMatch[1] : "n";

      let value = "";
      if (type === "inlineStr") {
        const tMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        value = tMatch ? xmlUnescape(tMatch[1]) : "";
      } else if (type === "s") {
        const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
        const idx = vMatch ? Number(vMatch[1]) : NaN;
        value = Number.isNaN(idx) ? "" : (sharedStrings[idx] ?? "");
      } else if (type === "str") {
        const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
        value = vMatch ? xmlUnescape(vMatch[1]) : "";
      } else {
        const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
        value = vMatch ? vMatch[1] : "";
      }
      cellsByIndex.set(colIndex, value);
    }

    const row: string[] = [];
    for (let i = 0; i <= maxCol; i++) row.push(cellsByIndex.get(i) ?? "");
    rows[rowNum - 1] = row;
  }

  // Fill any skipped (fully blank) rows so indices line up.
  for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
  return rows;
}
