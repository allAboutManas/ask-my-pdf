/**
 * SESSION 1 — PDF PARSING
 * ------------------------
 * pdf-parse gives us the full extracted text of the PDF. It does not
 * natively give clean per-page text, so we split on the form-feed
 * character page markers pdf-parse inserts, and fall back to treating
 * the whole document as "page 1" if that fails.
 *
 * Teaching note: this is the step that breaks for scanned PDFs
 * (image-only pages) — pdf-parse can't extract text that isn't
 * actually text. Worth demoing a scanned PDF failing, briefly.
 */
import pdfParse from "pdf-parse";

/**
 * @param {Buffer} fileBuffer - raw PDF file bytes
 * @returns {Promise<Array<{ pageNumber: number, text: string }>>}
 */
export async function extractPagesFromPdf(fileBuffer) {
  const data = await pdfParse(fileBuffer);

  // pdf-parse separates pages with form-feed (\f) characters
  const rawPages = data.text.split("\f");

  const pages = rawPages
    .map((text, i) => ({ pageNumber: i + 1, text }))
    .filter((p) => p.text.trim().length > 0);

  // Fallback: some PDFs don't produce \f separators at all
  if (pages.length === 0 && data.text.trim().length > 0) {
    return [{ pageNumber: 1, text: data.text }];
  }

  return pages;
}
