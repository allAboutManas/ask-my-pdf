/**
 * Handles Microsoft Word .docx documents using Mammoth.
 * Extracts raw text while ignoring formatting noise.
 */
import mammoth from "mammoth";

export async function extractPagesFromDocx(fileBuffer) {
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  const text = result.value
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) {
    return [];
  }

  return [{ pageNumber: 1, text }];
}
