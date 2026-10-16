const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

export function chunkPages(pages) {
  const chunks = [];
  let chunkIndex = 0;

  for (const page of pages) {
    if (!page || !page.text) continue;

    const text = page.text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!text) continue;

    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + CHUNK_SIZE, text.length);

      if (end < text.length) {
        const sliceToSearch = text.slice(start, end);
        const minCut = Math.floor(CHUNK_SIZE * 0.7);

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

      const nextStart = end - CHUNK_OVERLAP;
      start = nextStart > start ? nextStart : end;
    }
  }

  return chunks;
}
