/**
 * SESSIONS 1-2 — THE FULL BACKEND PIPELINE
 * ------------------------------------------
 * Two endpoints, matching the two flows in the architecture diagram:
 *
 *   POST /upload  -> indexing flow (parse -> chunk -> embed -> store)
 *   POST /ask     -> query flow    (embed -> retrieve -> augment -> generate)
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { randomUUID } from "crypto";

import { extractPagesFromDocument, getDocumentType } from "./documentParser.js";
import { chunkPages } from "./chunker.js";
import { embedTexts, embedText } from "./embeddings.js";
import { storeChunks, queryChunks } from "./vectorStore.js";
import { buildMessages } from "./promptBuilder.js";
import { generateAnswer } from "./generator.js";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// In-memory record of uploaded documents, for demo purposes.
// A real app would persist this in a database.
const documents = new Map(); // documentId -> { filename, pageCount, chunkCount }

/**
 * INDEXING FLOW
 */
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const documentId = randomUUID();
    const documentType = getDocumentType(req.file.originalname, req.file.mimetype);

    if (documentType === "unknown") {
      return res.status(415).json({
        error: "Unsupported file type. Upload a PDF, DOCX, CSV, XLS, or XLSX file.",
      });
    }

    // 1. Parse according to file type
    const pages = await extractPagesFromDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    if (pages.length === 0) {
      return res.status(422).json({
        error: "No extractable text found in the uploaded file.",
      });
    }

    // 2. Chunk
    const chunks = chunkPages(pages);

    // 3. Embed (batch, in groups to stay under API limits)
    const BATCH_SIZE = 100;
    const allEmbeddings = [];
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE).map((c) => c.text);
      const embeddings = await embedTexts(batch);
      allEmbeddings.push(...embeddings);
    }

    // 4. Store
    await storeChunks(documentId, chunks, allEmbeddings);

    documents.set(documentId, {
      filename: req.file.originalname,
      pageCount: pages.length,
      chunkCount: chunks.length,
      type: documentType,
    });

    res.json({
      documentId,
      filename: req.file.originalname,
      fileType: documentType,
      pageCount: pages.length,
      chunkCount: chunks.length,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: `Failed to process ${req.file?.originalname || "file"}` });
  }
});

/**
 * QUERY FLOW
 */
app.post("/ask", async (req, res) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({ error: "documentId and question are required" });
    }
    if (!documents.has(documentId)) {
      return res.status(404).json({ error: "Unknown documentId. Upload a supported document first." });
    }

    // 1. Embed the query (same model as the chunks!)
    const queryEmbedding = await embedText(question);

    // 2. Retrieve top-k similar chunks (cosine similarity, inside Chroma)
    const retrievedChunks = await queryChunks(queryEmbedding, {
      documentId,
      topK: 4,
    });

    // 3. Augment: build the prompt
    const messages = buildMessages(question, retrievedChunks);

    // 4. Generate
    const answer = await generateAnswer(messages);

    res.json({
      answer,
      sources: [...new Set(retrievedChunks.map((c) => c.pageNumber))].sort(
        (a, b) => a - b
      ),
    });
  } catch (err) {
    console.error("Ask error:", err);
    res.status(500).json({ error: "Failed to answer question" });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Ask My PDF backend running on http://localhost:${PORT}`);
});
