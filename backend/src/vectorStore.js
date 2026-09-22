/**
 * SESSION 1 — VECTOR STORE (Chroma)
 * ----------------------------------
 * Chroma needs to run as a separate local server before this app starts:
 *
 *     pip install chromadb
 *     chroma run --path ./chroma_data
 *
 * We pass our own Gemini-computed embeddings directly to Chroma instead
 * of letting Chroma compute embeddings for us. This keeps every step of
 * the RAG pipeline visible to students — nothing happens "by magic"
 * inside the vector DB.
 *
 * Cosine similarity happens INSIDE collection.query() below — Chroma's
 * default index compares the query vector against every stored vector
 * using cosine distance and returns the closest matches. That's the
 * "similarity search" step from our architecture diagram.
 */
import { ChromaClient } from "chromadb";

const client = new ChromaClient({ path: process.env.CHROMA_URL });
const COLLECTION_NAME =
  process.env.CHROMA_COLLECTION || "ask_my_pdf_gemini_chunks";

let collectionPromise = null;

function getCollection() {
  if (!collectionPromise) {
    collectionPromise = client.getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: { "hnsw:space": "cosine" }, // explicitly use cosine similarity
    });
  }
  return collectionPromise;
}

/**
 * Stores chunks + their embeddings + metadata for a given document.
 *
 * @param {string} documentId - unique id for this uploaded PDF
 * @param {Array<{ text: string, pageNumber: number, chunkIndex: number }>} chunks
 * @param {number[][]} embeddings - same order/length as chunks
 */
export async function storeChunks(documentId, chunks, embeddings) {
  const collection = await getCollection();

  await collection.upsert({
    ids: chunks.map((c) => `${documentId}-${c.chunkIndex}`),
    embeddings,
    documents: chunks.map((c) => c.text),
    metadatas: chunks.map((c) => ({
      documentId,
      pageNumber: c.pageNumber,
      chunkIndex: c.chunkIndex,
    })),
  });

  return chunks.length;
}

/**
 * Finds the top-k most similar chunks to a query embedding.
 * Optionally restricts the search to one document.
 *
 * @param {number[]} queryEmbedding
 * @param {object} options
 * @param {string} [options.documentId]
 * @param {number} [options.topK]
 */
export async function queryChunks(queryEmbedding, { documentId, topK = 4 } = {}) {
  const collection = await getCollection();

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    where: documentId ? { documentId } : undefined,
  });

  // Chroma returns parallel arrays wrapped one level for batch queries;
  // we only ever send one query, so we unwrap index [0].
  const documents = results.documents[0] || [];
  const metadatas = results.metadatas[0] || [];
  const distances = results.distances[0] || [];

  return documents.map((text, i) => ({
    text,
    pageNumber: metadatas[i]?.pageNumber,
    distance: distances[i], // lower = more similar (cosine distance)
  }));
}
