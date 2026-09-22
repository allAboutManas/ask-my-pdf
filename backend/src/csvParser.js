/**
 * Handles spreadsheet-style documents: CSV and Excel files.
 * We use xlsx so the same code path can parse CSV, XLS, and XLSX.
 */
import * as XLSX from "xlsx";

function sheetToText(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return rows
    .map((row) =>
      row
        .map((cell) => String(cell ?? "").trim())
        .filter((cell) => cell.length > 0)
        .join(" | ")
    )
    .filter((rowText) => rowText.length > 0)
    .join("\n");
}

export async function extractPagesFromSpreadsheet(fileBuffer, fileName = "spreadsheet") {
  const workbook = XLSX.read(fileBuffer, {
    type: "buffer",
    cellDates: true,
    raw: false,
  });

  const pages = workbook.SheetNames
    .map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const text = sheetToText(sheet);
      if (!text) return null;

      return {
        pageNumber: workbook.SheetNames.indexOf(sheetName) + 1,
        text: `Sheet: ${sheetName}\n${text}`,
      };
    })
    .filter(Boolean);

  if (pages.length === 0) {
    const csvText = fileBuffer.toString("utf8");
    const normalized = csvText.replace(/\r\n/g, "\n").trim();
    if (!normalized) return [];

    return [{ pageNumber: 1, text: normalized }];
  }

  return pages;
}
