import { extractPagesFromPdf } from "./pdfParser.js";
import { extractPagesFromWord } from "./docxParser.js";
import { extractPagesFromSpreadsheet } from "./csvParser.js";
import logger from "./logger.js";

export function getDocumentType(fileName = "", mimeType = "") {
  const name = fileName.toLowerCase();
  const type = mimeType.toLowerCase();

  if (name.endsWith(".pdf") || type.includes("pdf")) {
    return "pdf";
  }

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

  if (
    name.endsWith(".csv") ||
    name.endsWith(".tsv") ||
    type.includes("csv") ||
    type.includes("tab-separated-values")
  ) {
    return "csv";
  }

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
