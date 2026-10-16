import "dotenv/config";
import { randomUUID } from "crypto";
import logger from "./logger.js";

const QDRANT_URL = (
  process.env.QDRANT_URL ||
  "https://c9c1ac35-4b40-46cd-896c-e5d64ac38d9a.us-east-2-0.aws.cloud.qdrant.io"
).replace(/\/+$/, "");

const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "";
const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "chunk1";
const VECTOR_SIZE = Number(process.env.QDRANT_VECTOR_SIZE || 3072);
const DISTANCE = process.env.QDRANT_DISTANCE || "Cosine";

function getHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };
  if (QDRANT_API_KEY) {
    headers["api-key"] = QDRANT_API_KEY;
  }
  return headers;
}

async function qdrantFetch(endpoint, options = {}) {
  const url = `${QDRANT_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  const bodyText = await res.text();
  let json;
  try {
    json = JSON.parse(bodyText);
  } catch {
    json = { message: bodyText };
  }

  if (!res.ok) {
    throw new Error(json?.status?.error || json?.message || `Qdrant HTTP ${res.status}`);
  }

  return json;
}

let collectionReadyPromise = null;

async function ensureCollection() {
  if (!collectionReadyPromise) {
    collectionReadyPromise = (async () => {
      let exists = false;
      try {
        const check = await qdrantFetch(`/collections/${COLLECTION_NAME}`, { method: "GET" });
        exists = Boolean(check?.result?.status);
      } catch (err) {
        if (!err.message?.includes("404") && !err.message?.includes("Not found")) {
          logger.error("Qdrant collection check failed", { error: err.message, collectionName: COLLECTION_NAME });
          throw err;
        }
      }

      logger.debug("Qdrant collection status", { collectionName: COLLECTION_NAME, exists });

      if (!exists) {
        await qdrantFetch(`/collections/${COLLECTION_NAME}`, {
          method: "PUT",
          body: JSON.stringify({
            vectors: {
              size: VECTOR_SIZE,
              distance: DISTANCE,
            },
          }),
        });
        logger.info("Qdrant collection created", { collectionName: COLLECTION_NAME, vectorSize: VECTOR_SIZE, distance: DISTANCE });
      }

      try {
        await qdrantFetch(`/collections/${COLLECTION_NAME}/index`, {
          method: "PUT",
          body: JSON.stringify({
            field_name: "documentId",
            field_schema: "keyword",
            wait: true,
          }),
        });
        logger.info("Qdrant payload index ensured for documentId", { collectionName: COLLECTION_NAME });
      } catch (idxErr) {
        logger.debug("Qdrant index check/create notice", { message: idxErr.message });
      }
    })();
  }
  return collectionReadyPromise;
}

export async function storeChunks(documentId, chunks, embeddings) {
  await ensureCollection();

  const points = chunks.map((chunk, index) => ({
    id: randomUUID(),
    vector: embeddings[index],
    payload: {
      documentId,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
    },
  }));

  logger.debug("Upserting chunks into Qdrant", { documentId, chunkCount: points.length });
  await qdrantFetch(`/collections/${COLLECTION_NAME}/points?wait=true`, {
    method: "PUT",
    body: JSON.stringify({ points }),
  });

  return chunks.length;
}

export async function queryChunks(queryEmbedding, { documentId, topK = 4 } = {}) {
  await ensureCollection();

  const filter = documentId
    ? {
        must: [{ key: "documentId", match: { value: documentId } }],
      }
    : undefined;

  const res = await qdrantFetch(`/collections/${COLLECTION_NAME}/points/search`, {
    method: "POST",
    body: JSON.stringify({
      vector: queryEmbedding,
      limit: topK,
      filter,
      with_payload: true,
      with_vector: false,
    }),
  });

  const results = res.result || [];
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

export async function testQdrantConnection() {
  const check = await qdrantFetch(`/collections/${COLLECTION_NAME}`, { method: "GET" });
  return {
    collectionName: COLLECTION_NAME,
    exists: Boolean(check?.result?.status),
  };
}
