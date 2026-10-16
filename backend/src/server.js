import "dotenv/config";
import dns from "node:dns";
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}
import express from "express";
import cors from "cors";
import multer from "multer";
import { randomUUID } from "crypto";

import { extractPagesFromDocument, getDocumentType } from "./documentParser.js";
import { chunkPages } from "./chunker.js";
import { embedTexts, embedText } from "./embeddings.js";
import { storeChunks, queryChunks, testQdrantConnection } from "./vectorStore.js";
import { buildMessages } from "./promptBuilder.js";
import { generateAnswer } from "./generator.js";
import logger from "./logger.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const upload = multer({ storage: multer.memoryStorage() });

const documents = new Map();

app.post("/upload", upload.any(), async (req, res) => {
  try {
    const file = req.files?.[0] || req.file;
    if (!file) {
      logger.warn("Upload request without file");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const documentId = randomUUID();
    const documentType = getDocumentType(file.originalname, file.mimetype);
    logger.info("Starting document upload", {
      documentId,
      filename: file.originalname,
      mimetype: file.mimetype,
      fileSize: file.size,
      documentType,
    });

    if (documentType === "unknown") {
      logger.warn("Rejected unsupported upload type", {
        filename: file.originalname,
        mimetype: file.mimetype,
      });
      return res.status(415).json({
        error: "Unsupported file type. Upload a PDF, Word document (.doc, .docx), Excel workbook (.xlsx, .xls), or CSV (.csv).",
      });
    }

    const pages = await extractPagesFromDocument(
      file.buffer,
      file.originalname,
      file.mimetype
    );

    if (pages.length === 0) {
      logger.warn("No extractable text found in uploaded file", {
        documentId,
        filename: file.originalname,
      });
      return res.status(422).json({
        error: "No extractable text found in the uploaded file.",
      });
    }

    const chunks = chunkPages(pages);
    logger.debug("Document chunked for indexing", {
      documentId,
      pageCount: pages.length,
      chunkCount: chunks.length,
    });

    const BATCH_SIZE = 100;
    const allEmbeddings = [];
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE).map((c) => c.text);
      logger.debug("Embedding batch", {
        documentId,
        batchIndex: i / BATCH_SIZE,
        batchSize: batch.length,
      });
      try {
        const embeddings = await embedTexts(batch);
        allEmbeddings.push(...embeddings);
      } catch (embErr) {
        throw new Error(`Gemini embedding failed: ${embErr.message}${embErr.cause ? ` (${embErr.cause.message || embErr.cause.code || embErr.cause})` : ""}`);
      }
    }

    try {
      await storeChunks(documentId, chunks, allEmbeddings);
    } catch (storeErr) {
      throw new Error(`Qdrant vector storage failed: ${storeErr.message}${storeErr.cause ? ` (${storeErr.cause.message || storeErr.cause.code || storeErr.cause})` : ""}`);
    }

    documents.set(documentId, {
      filename: file.originalname,
      pageCount: pages.length,
      chunkCount: chunks.length,
      type: documentType,
    });

    logger.info("Upload processed successfully", {
      documentId,
      filename: file.originalname,
      pageCount: pages.length,
      chunkCount: chunks.length,
    });

    res.json({
      documentId,
      filename: file.originalname,
      fileType: documentType,
      pageCount: pages.length,
      chunkCount: chunks.length,
    });
  } catch (err) {
    logger.error("Upload error", { error: err.message, details: err.stack, filename: req.files?.[0]?.originalname || req.file?.originalname });
    res.status(500).json({
      error: `Failed to process ${req.files?.[0]?.originalname || req.file?.originalname || "file"}`,
      details: err.message,
    });
  }
});

app.post("/ask", async (req, res) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      logger.warn("Ask request missing required fields", { documentId, questionProvided: Boolean(question) });
      return res.status(400).json({ error: "documentId and question are required" });
    }
    if (!documents.has(documentId)) {
      logger.info("Document not in server memory, querying Qdrant directly", { documentId });
    }

    logger.info("Processing ask request", { documentId, questionLength: question.length });

    const queryEmbedding = await embedText(question);

    const retrievedChunks = await queryChunks(queryEmbedding, {
      documentId,
      topK: 4,
    });

    if (retrievedChunks.length === 0) {
      logger.warn("No matching chunks found for document", { documentId });
      return res.status(404).json({ error: "Unknown or empty document. Please upload your document first." });
    }
    logger.debug("Retrieved matching chunks", {
      documentId,
      resultCount: retrievedChunks.length,
      pageNumbers: retrievedChunks.map((c) => c.pageNumber),
    });

    const messages = buildMessages(question, retrievedChunks);

    const answer = await generateAnswer(messages);
    logger.info("Answer generated successfully", {
      documentId,
      answerLength: answer.length,
      sourcePages: [...new Set(retrievedChunks.map((c) => c.pageNumber))].sort((a, b) => a - b),
    });

    res.json({
      answer,
      sources: [...new Set(retrievedChunks.map((c) => c.pageNumber))].sort(
        (a, b) => a - b
      ),
    });
  } catch (err) {
    logger.error("Ask error", { error: err.message, details: err.stack, documentId: req.body?.documentId });
    res.status(500).json({ error: "Failed to answer question", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "DocuMind Neural RAG Backend API",
    version: "1.0.2",
    endpoints: {
      health: "GET /health",
      diag: "GET /diag",
      upload: "POST /upload",
      ask: "POST /ask",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.2",
    config: {
      geminiKeySet: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      qdrantUrlSet: Boolean(process.env.QDRANT_URL),
      qdrantApiKeySet: Boolean(process.env.QDRANT_API_KEY),
      qdrantCollection: process.env.QDRANT_COLLECTION || "ask_my_pdf_gemini_chunks",
      vectorSize: Number(process.env.QDRANT_VECTOR_SIZE || 768),
    },
  });
});

app.get("/diag", async (req, res) => {
  const result = {
    gemini: { ok: false },
    qdrant: { ok: false },
  };

  try {
    const emb = await embedText("diagnostic probe");
    result.gemini = { ok: true, dimension: emb?.length || 0 };
  } catch (err) {
    result.gemini = {
      ok: false,
      error: err.message,
      cause: err.cause?.message || String(err.cause || ""),
    };
  }

  try {
    const qdrantRes = await testQdrantConnection();
    result.qdrant = { ok: true, ...qdrantRes };
  } catch (err) {
    result.qdrant = {
      ok: false,
      error: err.message,
      cause: err.cause?.message || String(err.cause || ""),
    };
  }

  res.json(result);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Ask My PDF backend running on port ${PORT}`);
});
