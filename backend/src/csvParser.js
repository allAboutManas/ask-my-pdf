/**
 * Handles spreadsheet-style documents: CSV, TSV, and Excel files (.xls, .xlsx, .xlsm, .xlsb).
 * Uses a native RFC-4180 parser for CSV/TSV to handle quoted commas, newlines, and currency strings,
 * and XLSX library for multi-sheet Excel workbooks.
 * Formats tabular data with clean markdown tables and semantic key-value records for high-fidelity RAG.
 */
import * as XLSX from "xlsx";
import logger from "./logger.js";

/**
 * Robust RFC 4180 CSV / TSV parser.
 * Handles delimiters inside quotes, escaped quotes, multiline values, and mixed line breaks.
 *
 * @param {string} text
 * @param {string} [delimiter]
 * @returns {string[][]}
 */
export function parseCsvText(text, delimiter = null) {
  if (!text) return [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (!delimiter) {
    const firstLine = normalized.split("\n")[0] || "";
    const commas = (firstLine.match(/,/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    if (tabs > commas && tabs > semicolons) delimiter = "\t";
    else if (semicolons > commas) delimiter = ";";
    else delimiter = ",";
  }

  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === "\n") {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Formats a grid of tabular rows into paginated, structured text chunks.
 *
 * @param {string[][]} rows
 * @param {string} sheetName
 * @param {number} startPageNum
 * @param {number} rowsPerPage
 * @returns {Array<{ pageNumber: number, text: string }>}
 */
function formatRowsToPages(rows, sheetName = "Sheet1", startPageNum = 1, rowsPerPage = 25) {
  if (!rows || rows.length === 0) return [];

  // Determine headers from the first non-empty row
  const firstRow = rows[0] || [];
  const headers = firstRow.map((h, idx) => {
    const trimmed = String(h ?? "").trim();
    return trimmed || `Col_${idx + 1}`;
  });

  const hasDistinctHeaders = firstRow.some((h) => String(h ?? "").trim().length > 0);
  const dataRows = hasDistinctHeaders ? rows.slice(1) : rows;

  if (dataRows.length === 0) {
    return [
      {
        pageNumber: startPageNum,
        text: `### Sheet: ${sheetName}\nColumns: ${headers.join(" | ")}\n\n(Sheet contains headers but no data rows)`,
      },
    ];
  }

  const pages = [];
  let currentPageNum = startPageNum;

  for (let i = 0; i < dataRows.length; i += rowsPerPage) {
    const batch = dataRows.slice(i, i + rowsPerPage);
    const startRowIdx = i + (hasDistinctHeaders ? 2 : 1);
    const endRowIdx = i + batch.length + (hasDistinctHeaders ? 1 : 0);

    const parts = [];
    parts.push(
      `### Sheet: ${sheetName} (Rows ${startRowIdx} - ${endRowIdx} of ${dataRows.length + (hasDistinctHeaders ? 1 : 0)})`
    );
    parts.push(`Columns: ${headers.join(" | ")}`);

    // 1. Markdown Table representation
    const maxCols = Math.min(headers.length, 12);
    const tableHeader = "| " + headers.slice(0, maxCols).join(" | ") + " |";
    const tableDivider = "| " + headers.slice(0, maxCols).map(() => "---").join(" | ") + " |";
    const tableRows = batch.map((row) => {
      const cells = headers.slice(0, maxCols).map((_, colIdx) => {
        const val = String(row[colIdx] ?? "").trim();
        return (val || "-").replace(/\|/g, "/");
      });
      return "| " + cells.join(" | ") + " |";
    });

    parts.push("");
    parts.push(tableHeader);
    parts.push(tableDivider);
    parts.push(tableRows.join("\n"));

    // 2. Structured Record representation for semantic vector matching
    parts.push("");
    parts.push("Record Details:");
    batch.forEach((row, rowOffset) => {
      const actualRowNumber = startRowIdx + rowOffset;
      const fieldPairs = headers
        .map((h, colIdx) => {
          const val = String(row[colIdx] ?? "").trim();
          return val ? `${h}: ${val}` : null;
        })
        .filter(Boolean);

      if (fieldPairs.length > 0) {
        parts.push(`- Row ${actualRowNumber}: ${fieldPairs.join(" | ")}`);
      }
    });

    pages.push({
      pageNumber: currentPageNum++,
      text: parts.join("\n").trim(),
    });
  }

  return pages;
}

/**
 * Extracts structured pages from a spreadsheet file (Excel or CSV).
 * Handles:
 * - Direct CSV/TSV native parsing
 * - Multi-sheet Excel parsing (.xlsx, .xls)
 * - Automatic pagination and markdown formatting
 *
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @returns {Promise<Array<{ pageNumber: number, text: string }>>}
 */
export async function extractPagesFromSpreadsheet(fileBuffer, fileName = "spreadsheet") {
  const name = fileName.toLowerCase();
  const isCsvOrTsv = name.endsWith(".csv") || name.endsWith(".tsv");
  const isZipExcel = fileBuffer.length >= 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b;
  const isOleExcel = fileBuffer.length >= 4 && fileBuffer[0] === 0xd0 && fileBuffer[1] === 0xcf;

  const allPages = [];
  let nextPageNumber = 1;

  // 1. If it's a CSV or TSV file, use our native RFC-4180 parser directly
  if (isCsvOrTsv && !isZipExcel && !isOleExcel) {
    try {
      const text = fileBuffer.toString("utf8");
      const rows = parseCsvText(text);
      if (rows.length > 0) {
        const baseTitle = fileName.replace(/\.[^/.]+$/, "") || "CSV_Data";
        const pages = formatRowsToPages(rows, baseTitle, nextPageNumber, 25);
        if (pages.length > 0) {
          logger.info("CSV parsed successfully with native RFC-4180 parser", {
            fileName,
            rowsCount: rows.length,
            pagesCount: pages.length,
          });
          return pages;
        }
      }
    } catch (csvErr) {
      logger.warn("Native CSV parsing failed, falling back to XLSX engine", {
        fileName,
        error: csvErr.message,
      });
    }
  }

  // 2. Parse using XLSX library for Excel files (.xlsx, .xls) or fallback CSV
  try {
    const workbook = XLSX.read(fileBuffer, {
      type: "buffer",
      cellDates: true,
      raw: false,
      codepage: 65001,
    });

    if (workbook && Array.isArray(workbook.SheetNames) && workbook.SheetNames.length > 0) {
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const rawRows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
          raw: false,
          blankrows: false,
        });

        const rows = rawRows.filter((r) =>
          Array.isArray(r) && r.some((cell) => String(cell ?? "").trim().length > 0)
        );

        if (rows.length === 0) continue;

        const sheetPages = formatRowsToPages(rows, sheetName, nextPageNumber, 25);
        if (sheetPages.length > 0) {
          allPages.push(...sheetPages);
          nextPageNumber += sheetPages.length;
        }
      }
    }
  } catch (xlsxErr) {
    logger.warn("XLSX parsing failed", { fileName, error: xlsxErr.message });
  }

  // 3. Fallback: If still empty, attempt raw text line splitting
  if (allPages.length === 0) {
    const rawText = fileBuffer.toString("utf8").replace(/\r\n/g, "\n").trim();
    if (rawText) {
      const rows = parseCsvText(rawText);
      if (rows.length > 0) {
        const baseTitle = fileName.replace(/\.[^/.]+$/, "") || "Spreadsheet";
        const fallbackPages = formatRowsToPages(rows, baseTitle, nextPageNumber, 25);
        allPages.push(...fallbackPages);
      }
    }
  }

  logger.info("Spreadsheet parsing completed", {
    fileName,
    totalPages: allPages.length,
  });

  return allPages;
}

export async function extractPagesFromCsv(fileBuffer, fileName = "data.csv") {
  return extractPagesFromSpreadsheet(fileBuffer, fileName);
}

export async function extractPagesFromExcel(fileBuffer, fileName = "data.xlsx") {
  return extractPagesFromSpreadsheet(fileBuffer, fileName);
}
