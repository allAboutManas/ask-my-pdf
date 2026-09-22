/**
 * SESSION 1 — CHUNKING
 * ---------------------
 * We can't embed an entire PDF as one vector — it would be too long,
 * and the embedding would blur together too many unrelated ideas.
 * So we split the extracted text into overlapping chunks.
 *
 * Strategy used here: fixed-size chunking by character count, with
 * overlap so we don't lose context at chunk boundaries.
 *
 * In class: try changing CHUNK_SIZE and OVERLAP and show students
 * how the resulting chunk count and quality change.
 */

const CHUNK_SIZE = 1000;   // characters per chunk (roughly ~200-250 tokens)
const CHUNK_OVERLAP = 150; // characters shared between consecutive chunks

/**
 * Splits raw text into overlapping chunks, tagging each chunk with
 * which page(s) it came from.
 *
 * @param {Array<{ pageNumber: number, text: string }>} pages
 * @returns {Array<{ text: string, pageNumber: number, chunkIndex: number }>}
 */
export function chunkPages(pages) {
  const chunks = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const text = page.text.replace(/\s+/g, " ").trim();
    if (!text) continue;

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      const chunkText = text.slice(start, end).trim();

      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          pageNumber: page.pageNumber,
          chunkIndex: chunkIndex++,
        });
      }

      if (end === text.length) break;
      start = end - CHUNK_OVERLAP; // step back to create overlap
    }
  }

  return chunks;
}
