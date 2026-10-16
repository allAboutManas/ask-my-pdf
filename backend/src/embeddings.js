import { GoogleGenAI } from "@google/genai";

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.OPENAI_API_KEY;

const ai = new GoogleGenAI(apiKey ? { apiKey } : {});
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

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

export async function embedText(text) {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
