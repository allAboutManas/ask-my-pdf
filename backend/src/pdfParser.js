import pdfParse from "pdf-parse";

export async function extractPagesFromPdf(fileBuffer) {
  const data = await pdfParse(fileBuffer);

  const rawPages = data.text.split("\f");

  const pages = rawPages
    .map((text, i) => ({ pageNumber: i + 1, text }))
    .filter((p) => p.text.trim().length > 0);

  if (pages.length === 0 && data.text.trim().length > 0) {
    return [{ pageNumber: 1, text: data.text }];
  }

  return pages;
}
