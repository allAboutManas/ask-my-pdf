import pdfParse from "pdf-parse";
import zlib from "zlib";
import logger from "./logger.js";

function extractTextFromMalformedPdf(fileBuffer) {
  const textChunks = [];
  const rawString = fileBuffer.toString("binary");
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = streamRegex.exec(rawString)) !== null) {
    const rawStream = Buffer.from(match[1], "binary");
    let decompressed = "";
    try {
      decompressed = zlib.inflateSync(rawStream).toString("utf-8");
    } catch {
      try {
        decompressed = zlib.inflateRawSync(rawStream).toString("utf-8");
      } catch {
        decompressed = rawStream.toString("utf-8");
      }
    }

    const tjMatches = decompressed.match(/\(([^)]+)\)\s*Tj/g) || [];
    for (const item of tjMatches) {
      const clean = item.replace(/^\(/, "").replace(/\)\s*Tj$/, "").trim();
      if (clean.length > 0) textChunks.push(clean);
    }

    const arrayTjMatches = decompressed.match(/\[(.*?)\]\s*TJ/g) || [];
    for (const block of arrayTjMatches) {
      const parts = block.match(/\(([^)]+)\)/g) || [];
      const line = parts.map((p) => p.slice(1, -1)).join(" ").trim();
      if (line.length > 0) textChunks.push(line);
    }
  }

  const combined = textChunks.join("\n").trim();
  return combined.length > 0 ? combined : null;
}

export async function extractPagesFromPdf(fileBuffer) {
  let data;
  try {
    data = await pdfParse(fileBuffer);
  } catch (err1) {
    logger.warn("Standard PDF parse failed, trying v2.0.550", { error: err1.message });
    try {
      data = await pdfParse(fileBuffer, { version: "v2.0.550" });
    } catch (err2) {
      logger.warn("PDF v2.0.550 failed, attempting stream extraction fallback", { error: err2.message });
      const fallbackText = extractTextFromMalformedPdf(fileBuffer);
      if (fallbackText) {
        return [{ pageNumber: 1, text: fallbackText }];
      }
      throw err1;
    }
  }

  const rawPages = (data.text || "").split("\f");
  const pages = rawPages
    .map((text, i) => ({ pageNumber: i + 1, text }))
    .filter((p) => p.text.trim().length > 0);

  if (pages.length === 0 && data.text && data.text.trim().length > 0) {
    return [{ pageNumber: 1, text: data.text.trim() }];
  }

  if (pages.length === 0) {
    const fallbackText = extractTextFromMalformedPdf(fileBuffer);
    if (fallbackText) {
      return [{ pageNumber: 1, text: fallbackText }];
    }
  }

  return pages;
}
