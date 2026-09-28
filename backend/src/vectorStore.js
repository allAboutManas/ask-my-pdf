/**
 * VECTOR STORE (Qdrant)
 * ----------------------------------
 * Qdrant is used for persistent vector storage and similarity search.
 * The app stores document chunks with their embeddings and retrieves
 * the closest matches using cosine similarity.
 */
import { QdrantClient } from "@qdrant/js-client-rest";
import logger from "./logger.js";

const client = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "ask_my_pdf_gemini_chunks";
const VECTOR_SIZE = Number(process.env.QDRANT_VECTOR_SIZE || 768);
const DISTANCE = process.env.QDRANT_DISTANCE || "Cosine";

let collectionReadyPromise = null;

async function ensureCollection() {
  if (!collectionReadyPromise) {
    collectionReadyPromise = (async () => {
      const existsResponse = await client.collectionExists(COLLECTION_NAME).catch((err) => {
        logger.error("Qdrant collection existence check failed", { error: err.message, collectionName: COLLECTION_NAME });
        throw err;
      });

      const exists = Boolean(existsResponse?.exists ?? existsResponse);
      logger.debug("Qdrant collection status", { collectionName: COLLECTION_NAME, exists });

      if (!exists) {
        await client.createCollection(COLLECTION_NAME, {
          vectors: {
            size: VECTOR_SIZE,
            distance: DISTANCE,
          },
        });
        logger.info("Qdrant collection created", { collectionName: COLLECTION_NAME, vectorSize: VECTOR_SIZE, distance: DISTANCE });
        return;
      }

      const collectionInfo = await client.getCollection(COLLECTION_NAME);
      const existingVectorSize = Number(
        collectionInfo?.config?.params?.vectors?.size ??
          collectionInfo?.config?.params?.vectors?.params?.size ??
          collectionInfo?.config?.params?.vectors?.size ??
          0
      );

      if (existingVectorSize && existingVectorSize !== VECTOR_SIZE) {
        throw new Error(
          `Qdrant collection "${COLLECTION_NAME}" already exists with vector size ${existingVectorSize}, but this app is configured for ${VECTOR_SIZE}. Delete the collection or use a new collection name.`
        );
      }
    })();
  }

  return collectionReadyPromise;
}

/**
 * Stores chunks + their embeddings + metadata for a given document.
 *
 * @param {string} documentId - unique id for this uploaded PDF
 * @param {Array<{ text: string, pageNumber: number, chunkIndex: number }>} chunks
 * @param {number[][]} embeddings - same order/length as chunks
 */
export async function storeChunks(documentId, chunks, embeddings) {
  await ensureCollection();

  const points = chunks.map((chunk, index) => ({
    id: `${documentId}-${chunk.chunkIndex}`,
    vector: embeddings[index],
    payload: {
      documentId,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
    },
  }));

  logger.debug("Upserting chunks into Qdrant", { documentId, chunkCount: points.length });
  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points,
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
  await ensureCollection();

  const filter = documentId
    ? {
        must: [{ key: "documentId", match: { value: documentId } }],
      }
    : undefined;

  const results = await client.search(COLLECTION_NAME, {
    vector: queryEmbedding,
    limit: topK,
    filter,
    with_payload: true,
    with_vector: false,
  });

  logger.debug("Qdrant similarity search results", {
    documentId,
    resultCount: results.length,
    topK,
  });

  return results.map((hit) => ({
    text: hit.payload?.text || "",
    pageNumber: hit.payload?.pageNumber,
    score: hit.score,
    distance: typeof hit.score === "number" ? 1 - hit.score : null,
  }));
}
