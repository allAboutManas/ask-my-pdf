import axios from "axios";

const isClient = typeof window !== "undefined";

const baseURL = isClient
  ? "/api/backend"
  : (process.env.NEXT_PUBLIC_API_URL || "https://ask-my-pdf-c2pr.onrender.com").replace(/\/+$/, "");

export const api = axios.create({
  baseURL,
  timeout: 120000,
});

export default api;
