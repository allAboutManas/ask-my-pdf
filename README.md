# DocuMind — Advanced Neural RAG Platform 🧠📄

> **Intelligent Document Intelligence powered by Google Gemini 2.0 & Qdrant Vector Engine**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://ask-my-pdf-frontend-chi.vercel.app/)
[![Backend API](https://img.shields.io/badge/API-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://ask-my-pdf-c2pr.onrender.com/health)

🌐 **Live Application**: [https://ask-my-pdf-frontend-chi.vercel.app](https://ask-my-pdf-frontend-chi.vercel.app/)  
⚡ **Backend API**: [https://ask-my-pdf-c2pr.onrender.com](https://ask-my-pdf-c2pr.onrender.com)

---

## 🌟 Overview

**DocuMind** (Ask My PDF) is a production-grade Retrieval-Augmented Generation (RAG) platform designed to transform static documents into dynamic, conversational knowledge bases. Upload PDFs, Word documents (.doc, .docx), Excel workbooks (.xlsx, .xls), or CSVs and interact with your documents with zero hallucinations and verified source page citations.

---

## ✨ Key Features

- 🤖 **Dex AI Companion Mascot**: State-reactive animated companion indicating ingestion states (Standby, File Drag, Vector Indexing, Deep Retrieval, Answering).
- 🎨 **Obsidian Luxury Design System**: Deep dark mode aesthetics (`#05070c`), ambient glow, glassmorphism, and responsive dual-pane workspace.
- ⚡ **Multi-Format Ingestion Pipeline**: Ingest PDF, Word (.doc, .docx), Excel (.xlsx, .xls), and CSV files with structured table representations, sliding window chunking, and metadata preservation.
- 🧠 **Semantic Vector Cloud**: Powered by **Google Gemini embeddings** (`gemini-embedding-001` / `text-embedding-004`) and **Qdrant Vector Database** with cosine similarity search.
- 🎯 **Strict Source Grounding**: Every answer is grounded directly in document chunks with clickable page citation chips (`📄 Page X`).
- ⚡ **Instant Insight Starters**: One-click prompt starters including *Executive Summary*, *Key Takeaways*, *Facts & Metrics*, and *Action Items*.
- 🔊 **Tactile Audio Feedback**: Synthesized Web Audio API sound effects for messages, indexing chimes, and query completions.
- 🗣️ **Text-to-Speech (TTS)**: Built-in voice synthesis to listen to answers.

---

## 🏗️ Architecture

```mermaid
flowchart LR
    A[User Document\nPDF / DOC / DOCX / XLSX / CSV] --> B[Ingestion Engine\npdf-parse / mammoth / word-extractor / xlsx]
    B --> C[Recursive Chunker\nSliding Window]
    C --> D[Gemini Embeddings\ntext-embedding-004]
    D --> E[(Qdrant Vector DB\nCloud / Local)]
    
    F[User Query] --> G[Query Vectorizer]
    G --> H[Top-K Cosine Search]
    E --> H
    H --> I[Grounded Context Builder]
    I --> J[Gemini 2.0 Flash\nGenerator]
    J --> K[Cited Response + Page Chips]
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))
- **Qdrant Vector Database** ([Qdrant Cloud](https://cloud.qdrant.io/) or local Docker instance)

---

### 1. Backend Setup

```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env
```

Edit `backend/.env` with your API credentials:
```env
PORT=4000
GEMINI_API_KEY=your_gemini_api_key_here
QDRANT_URL=your_qdrant_instance_url
QDRANT_API_KEY=your_qdrant_api_key
```

Run the backend server:
```bash
npm run dev
```
> Backend runs at `http://localhost:4000`

---

### 2. Frontend Setup

```bash
cd frontend
npm install

# Start Next.js development server
npm run dev
```
> Frontend runs at `http://localhost:3000`

---

## 📡 API Reference

### Document Ingestion
```http
POST /upload
Content-Type: multipart/form-data

file: <document_file>
```
**Response:**
```json
{
  "documentId": "uuid-v4",
  "filename": "90-day-plan-letscode.pdf",
  "chunkCount": 6,
  "pages": 1
}
```

### Grounded Question Answering
```http
POST /ask
Content-Type: application/json

{
  "documentId": "uuid-v4",
  "question": "What are the milestones for Month 3?"
}
```
**Response:**
```json
{
  "answer": "The milestone for Month 3 is actively interviewing...",
  "sources": [
    { "page": 1, "text": "..." }
  ]
}
```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Lucide Icons, Web Audio API
- **Backend**: Node.js, Express.js, Multer
- **Vector Database**: Qdrant Cloud (`cosine` metric, 768 Float32)
- **LLM & Embeddings**: Google Gemini 2.0 Flash & Gemini `text-embedding-004`
- **Parsers**: `pdf-parse`, `mammoth`, `xlsx`, `csv-parser`

---

## 🚀 Deployment Guide (Render + Vercel)

### ⚠️ Deployment Order: Deploy Backend FIRST

You must deploy the **Backend on Render first** so you have its live public URL (e.g., `https://documind-backend.onrender.com`). The **Frontend on Vercel** requires this URL during build and runtime to communicate with the RAG API.

---

### Step 1: Deploy Backend on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/) and click **New + > Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   - **Name**: `documind-backend` (or your choice)
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Your Google AI Studio Gemini API key)*
   - `QDRANT_URL`: *(Your Qdrant Cloud instance URL)*
   - `QDRANT_API_KEY`: *(Your Qdrant API key)*
   - `QDRANT_COLLECTION`: `chunk1`
   - `QDRANT_VECTOR_SIZE`: `3072`
   - `QDRANT_DISTANCE`: `Cosine`
   - `LOG_LEVEL`: `info`
5. Click **Create Web Service**.
6. Once deployed, test your live backend in a browser:
   `https://<your-backend-name>.onrender.com/health` &rarr; should return `{"status":"ok"}`.
   Copy this backend URL for Step 2.

---

### Step 2: Deploy Frontend on Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/) and click **Add New... > Project**.
2. Import the same Git repository.
3. In the project configuration:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select **`frontend`**
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL`: `https://<your-backend-name>.onrender.com` *(Do NOT include trailing slash)*
5. Click **Deploy**.
6. Once deployed, open your Vercel URL. Dex AI and the document uploader will connect directly to your live Render backend!

