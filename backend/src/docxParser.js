import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import logger from "./logger.js";

function splitIntoPages(fullText, charsPerPage = 2500) {
  if (!fullText || !fullText.trim()) return [];

  const normalized = fullText
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalized.includes("\f")) {
    const rawPages = normalized.split("\f");
    const pages = rawPages
      .map((t, idx) => ({ pageNumber: idx + 1, text: t.trim() }))
      .filter((p) => p.text.length > 0);
    if (pages.length > 0) return pages;
  }

  const paragraphs = normalized.split(/\n\n+/);
  const pages = [];
  let currentText = "";
  let currentPage = 1;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentText && currentText.length + trimmed.length > charsPerPage) {
      pages.push({ pageNumber: currentPage++, text: currentText.trim() });
      currentText = trimmed;
    } else {
      currentText = currentText ? `${currentText}\n\n${trimmed}` : trimmed;
    }
  }

  if (currentText.trim().length > 0) {
    pages.push({ pageNumber: currentPage, text: currentText.trim() });
  }

  return pages.length > 0 ? pages : [{ pageNumber: 1, text: normalized }];
}

async function extractFromDocBinary(fileBuffer) {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(fileBuffer);
  
  const parts = [];
  const headers = doc.getHeaders({ includeFooters: false });
  if (headers && headers.trim()) parts.push(headers.trim());

  const body = doc.getBody();
  if (body && body.trim()) parts.push(body.trim());

  const footers = doc.getFooters();
  if (footers && footers.trim()) parts.push(footers.trim());

  return parts.join("\n\n").trim();
}

async function extractFromDocxZip(fileBuffer) {
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  return (result.value || "").trim();
}

export async function extractPagesFromWord(fileBuffer, fileName = "") {
  const name = fileName.toLowerCase();
  const isZip = fileBuffer.length >= 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b;
  const isOle = fileBuffer.length >= 4 && fileBuffer[0] === 0xd0 && fileBuffer[1] === 0xcf;

  let rawText = "";
  let extractionMethod = "unknown";

  if (isZip || name.endsWith(".docx")) {
    try {
      rawText = await extractFromDocxZip(fileBuffer);
      extractionMethod = "mammoth-docx";
    } catch (docxErr) {
      logger.warn("Mammoth extraction failed, falling back to WordExtractor", {
        fileName,
        error: docxErr.message,
      });
      try {
        rawText = await extractFromDocBinary(fileBuffer);
        extractionMethod = "word-extractor-fallback";
      } catch (docErr) {
        logger.warn("WordExtractor fallback also failed", { error: docErr.message });
      }
    }
  }

  if (!rawText && (isOle || name.endsWith(".doc"))) {
    try {
      rawText = await extractFromDocBinary(fileBuffer);
      extractionMethod = "word-extractor-doc";
    } catch (docErr) {
      logger.warn("WordExtractor failed on .doc, attempting Mammoth fallback", {
        fileName,
        error: docErr.message,
      });
      try {
        rawText = await extractFromDocxZip(fileBuffer);
        extractionMethod = "mammoth-fallback";
      } catch (docxErr) {
        logger.warn("Mammoth fallback also failed", { error: docErr.message });
      }
    }
  }

  if (!rawText) {
    try {
      rawText = await extractFromDocxZip(fileBuffer);
      extractionMethod = "mammoth-generic";
    } catch {
      try {
        rawText = await extractFromDocBinary(fileBuffer);
        extractionMethod = "word-extractor-generic";
      } catch {
        const utf8Content = fileBuffer.toString("utf8").trim();
        const printableCount = (utf8Content.slice(0, 500).match(/[\x20-\x7E\r\n\t]/g) || []).length;
        if (printableCount > 200) {
          rawText = utf8Content;
          extractionMethod = "utf8-text-fallback";
        }
      }
    }
  }

  if (!rawText || !rawText.trim()) {
    logger.warn("No text could be extracted from Word document", { fileName });
    return [];
  }

  logger.info("Successfully extracted text from Word document", {
    fileName,
    method: extractionMethod,
    characterCount: rawText.length,
  });

  return splitIntoPages(rawText);
}

export async function extractPagesFromDocx(fileBuffer, fileName = "document.docx") {
  return extractPagesFromWord(fileBuffer, fileName);
}

export async function extractPagesFromDoc(fileBuffer, fileName = "document.doc") {
  return extractPagesFromWord(fileBuffer, fileName);
}
