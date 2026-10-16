import { GoogleGenAI } from "@google/genai";

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.OPENAI_API_KEY;

const ai = new GoogleGenAI(apiKey ? { apiKey } : {});
const CHAT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function generateAnswer(messages) {
  let systemInstruction;
  const contents = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = msg.content;
    } else {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }
  }

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents,
    config: {
      temperature: 0.2,
      ...(systemInstruction ? { systemInstruction } : {}),
    },
  });

  return response.text;
}
