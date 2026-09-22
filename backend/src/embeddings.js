/**
 * SESSION 1 — EMBEDDINGS
 * -----------------------
 * Turns text into vectors using Gemini's text-embedding-004.
 * 768 dimensions, fast, cheap, high quality for RAG.
 *
 * IMPORTANT teaching point: we use the SAME model for embedding both
 * the document chunks AND the user's query later. Two different
 * embedding models produce vectors that live in different, incompatible
 * spaces — comparing them would be meaningless.
 */
import { GoogleGenAI } from "@google/genai";

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.OPENAI_API_KEY;

const ai = new GoogleGenAI(apiKey ? { apiKey } : {});
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";

/**
 * Embeds a batch of text strings in one API call.
 * Batching is both faster and cheaper than one call per chunk.
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>} one embedding vector per input text
 */
export async function embedTexts(texts) {
  if (!texts || texts.length === 0) return [];

  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
  });

  if (response.embeddings && Array.isArray(response.embeddings)) {
    return response.embeddings.map((item) => item.values);
  }

  if (response.embedding && response.embedding.values) {
    return [response.embedding.values];
  }

  throw new Error("No embeddings returned by Gemini API");
}

/**
 * Convenience wrapper for embedding a single string (e.g. a user query).
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedText(text) {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
