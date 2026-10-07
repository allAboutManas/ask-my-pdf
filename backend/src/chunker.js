/**
 * SESSION 1 — CHUNKING
 * ---------------------
 * Splits document pages into overlapping semantic chunks for embedding.
 * Uses a boundary-aware sliding window strategy that respects newlines,
 * paragraphs, markdown tables, and sentence ends, preventing words or table rows
 * from being sliced mid-sentence.
 */

const CHUNK_SIZE = 1000;   // characters per chunk (~200-250 tokens)
const CHUNK_OVERLAP = 150; // overlap window to retain contextual continuity

/**
 * Splits extracted document pages into overlapping, boundary-aware chunks.
 *
 * @param {Array<{ pageNumber: number, text: string }>} pages
 * @returns {Array<{ text: string, pageNumber: number, chunkIndex: number }>}
 */
export function chunkPages(pages) {
  const chunks = [];
  let chunkIndex = 0;

  for (const page of pages) {
    if (!page || !page.text) continue;

    // Clean whitespace while preserving linebreaks and paragraph structure
    const text = page.text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!text) continue;

    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + CHUNK_SIZE, text.length);

      // If we aren't at the end of the text, look back for clean paragraph/line/sentence boundaries
      if (end < text.length) {
        const sliceToSearch = text.slice(start, end);
        const minCut = Math.floor(CHUNK_SIZE * 0.7); // ensure chunks stay reasonably sized

        const doubleBreak = sliceToSearch.lastIndexOf("\n\n");
        const singleBreak = sliceToSearch.lastIndexOf("\n");
        const sentenceBreak = sliceToSearch.lastIndexOf(". ");

        if (doubleBreak >= minCut) {
          end = start + doubleBreak + 2;
        } else if (singleBreak >= minCut) {
          end = start + singleBreak + 1;
        } else if (sentenceBreak >= minCut) {
          end = start + sentenceBreak + 2;
        }
      }

      const chunkText = text.slice(start, end).trim();
      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          pageNumber: page.pageNumber,
          chunkIndex: chunkIndex++,
        });
      }

      if (end >= text.length) break;

      // Advance start by at least 1 character to guarantee loop termination
      const nextStart = end - CHUNK_OVERLAP;
      start = nextStart > start ? nextStart : end;
    }
  }

  return chunks;
}
