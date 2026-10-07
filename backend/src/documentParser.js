/**
 * Dispatcher for all supported document upload types:
 * - PDF documents (.pdf)
 * - Word documents (.doc, .docx)
 * - Excel workbooks (.xlsx, .xls, .xlsm, .xlsb)
 * - CSV and TSV spreadsheets (.csv, .tsv)
 */
import { extractPagesFromPdf } from "./pdfParser.js";
import { extractPagesFromWord } from "./docxParser.js";
import { extractPagesFromSpreadsheet } from "./csvParser.js";
import logger from "./logger.js";

/**
 * Identifies the document type based on filename extension and MIME type.
 *
 * @param {string} fileName
 * @param {string} mimeType
 * @returns {"pdf" | "word" | "excel" | "csv" | "unknown"}
 */
export function getDocumentType(fileName = "", mimeType = "") {
  const name = fileName.toLowerCase();
  const type = mimeType.toLowerCase();

  // 1. PDF
  if (name.endsWith(".pdf") || type.includes("pdf")) {
    return "pdf";
  }

  // 2. Microsoft Word (.doc and .docx)
  if (
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    name.endsWith(".dot") ||
    name.endsWith(".dotx") ||
    type.includes("word") ||
    type.includes("officedocument.wordprocessingml") ||
    type.includes("msword")
  ) {
    return "word";
  }

  // 3. Delimited Text (CSV / TSV)
  if (
    name.endsWith(".csv") ||
    name.endsWith(".tsv") ||
    type.includes("csv") ||
    type.includes("tab-separated-values")
  ) {
    return "csv";
  }

  // 4. Excel Workbooks (.xlsx, .xls, etc.)
  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsm") ||
    name.endsWith(".xlsb") ||
    type.includes("excel") ||
    type.includes("spreadsheetml") ||
    type.includes("ms-excel")
  ) {
    return "excel";
  }

  return "unknown";
}

/**
 * Parses raw file buffer and extracts structured pages according to file type.
 *
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @param {string} mimeType
 * @returns {Promise<Array<{ pageNumber: number, text: string }>>}
 */
export async function extractPagesFromDocument(fileBuffer, fileName = "", mimeType = "") {
  const documentType = getDocumentType(fileName, mimeType);

  logger.info("Extracting pages from document", {
    fileName,
    mimeType,
    detectedType: documentType,
    fileSize: fileBuffer.length,
  });

  if (documentType === "pdf") {
    return extractPagesFromPdf(fileBuffer);
  }

  if (documentType === "word") {
    return extractPagesFromWord(fileBuffer, fileName);
  }

  if (documentType === "excel" || documentType === "csv") {
    return extractPagesFromSpreadsheet(fileBuffer, fileName);
  }

  throw new Error(
    `Unsupported file format for "${fileName || "uploaded file"}". Please upload a PDF (.pdf), Word doc (.doc, .docx), Excel sheet (.xlsx, .xls), or CSV (.csv).`
  );
}
