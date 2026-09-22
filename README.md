# Ask My PDF — Class Project

## One-time setup (do this first, in Session 1)

```bash
# 1. Install Chroma (Python package, runs as a local server)
pip install chromadb

# 2. Start the Chroma server (leave this running in its own terminal)
chroma run --path ./chroma_data

# 3. Backend setup (in a second terminal)
cd backend
npm install
cp .env.example .env
# edit .env and paste in your GEMINI_API_KEY

# 4. Start the backend
npm run dev
```

Then open `frontend/index.html` directly in a browser (no build step needed).

---

## Session breakdown

### Session 1 — Architecture + Ingestion pipeline
Files: `pdfParser.js`, `chunker.js`, `embeddings.js`, `vectorStore.js`
- Walk the architecture diagram
- Live-code `pdfParser.js` → test extraction on a sample PDF
- Live-code `chunker.js` → print chunk count/sizes, tweak CHUNK_SIZE
- Live-code `embeddings.js` → call Gemini (text-embedding-004), log a vector's length (768)
- Live-code `vectorStore.js` → store chunks in Chroma
- Wire into `/upload` in `server.js`, test with Postman/curl

### Session 2 — Query pipeline
Files: `promptBuilder.js`, `generator.js`, `/ask` route in `server.js`
- Recap cosine similarity — this is what `collection.query()` does internally
- Live-code `promptBuilder.js` → print the assembled prompt to console
- Live-code `generator.js` → call Gemini (gemini-3.1-flash-lite) generateContent
- Wire into `/ask`, test end-to-end via curl/Postman
- Discuss: what happens with irrelevant chunks? Try asking an off-topic question.

### Session 3 — Frontend + full demo
File: `frontend/index.html`
- Walk through the upload flow UI → fetch → backend
- Walk through the ask flow UI → fetch → backend
- Full live demo: upload a real PDF, ask several questions
- Wrap-up discussion: limitations (chunking quality, retrieval misses,
  no conversation memory) and extensions (multi-PDF, reranking, streaming)

---

## Quick test commands (for demoing the API directly)

```bash
# Upload
curl -X POST http://localhost:4000/upload -F "file=@/path/to/sample.pdf"

# Ask (use the documentId returned above)
curl -X POST http://localhost:4000/ask \
  -H "Content-Type: application/json" \
  -d '{"documentId": "PASTE_ID_HERE", "question": "What is this document about?"}'
```
