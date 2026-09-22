/**
 * SESSION 2 — PROMPT CONSTRUCTION (the "Augmentation" in RAG)
 * -------------------------------------------------------------
 * Combines the system instructions + retrieved chunks + user's question
 * into the messages array we send to the chat model.
 *
 * Key teaching points:
 *  - Context comes BEFORE the question so the model "reads" it first
 *  - Each chunk is tagged with its page number -> enables citations
 *  - Explicit "answer only from context" instruction reduces hallucination
 *  - Explicit fallback instruction for when context doesn't cover it
 */

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions using ONLY the
provided context from an uploaded PDF document. Follow these rules:

1. Base your answer strictly on the CONTEXT below. Do not use outside knowledge.
2. If the context does not contain the answer, say:
   "I couldn't find that in the document."
3. Always cite the page number(s) your answer came from, like: (Page 3).
4. Keep answers concise and direct.`;

/**
 * @param {string} question
 * @param {Array<{ text: string, pageNumber: number }>} retrievedChunks
 * @returns {Array<{ role: string, content: string }>} messages for the chat API
 */
export function buildMessages(question, retrievedChunks) {
  const contextBlock = retrievedChunks
    .map((chunk) => `[Page ${chunk.pageNumber}]: ${chunk.text}`)
    .join("\n\n");

  const userMessage = `CONTEXT:\n${contextBlock}\n\nQUESTION:\n${question}`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];
}
