/**
 * SESSION 2 — PROMPT CONSTRUCTION (the "Augmentation" in RAG)
 * -------------------------------------------------------------
 * Combines system instructions + retrieved context chunks + user's question
 * into the messages array sent to the Gemini chat model.
 *
 * Grounding rules:
 *  - Strict adherence to provided context only
 *  - Explicit citation of pages, sheet names, or sections
 *  - Structured tabular formatting when answering from spreadsheets/CSVs
 *  - Graceful fallback when the context doesn't contain the answer
 */

const SYSTEM_PROMPT = `You are an expert research and document assistant that answers questions using ONLY the provided context from an uploaded document (which can be a PDF, Microsoft Word doc, Excel spreadsheet, or CSV file). Follow these rules strictly:

1. Base your answer strictly on the CONTEXT below. Do not assume facts or use outside knowledge.
2. If the context does not contain the information needed to answer the question, state:
   "I couldn't find that in the document."
3. Always cite the page number(s) or sheet reference(s) where your answer came from, for example: (Page 3) or (Sheet: Sales, Page 2).
4. If answering questions from spreadsheet, CSV, or tabular data, format metrics, lists, or comparisons neatly using markdown bullet points or clean markdown tables.
5. Keep answers accurate, direct, and concise.`;

/**
 * Builds the chat message payload for the Gemini model.
 *
 * @param {string} question
 * @param {Array<{ text: string, pageNumber: number }>} retrievedChunks
 * @returns {Array<{ role: string, content: string }>} messages for the chat API
 */
export function buildMessages(question, retrievedChunks) {
  const contextBlock = retrievedChunks
    .map((chunk) => `[Source Page ${chunk.pageNumber}]:\n${chunk.text}`)
    .join("\n\n---\n\n");

  const userMessage = `CONTEXT:\n${contextBlock}\n\nQUESTION:\n${question}`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];
}
