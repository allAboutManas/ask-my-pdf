import "dotenv/config";
import { randomUUID } from "crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import logger from "./logger.js";

const client = new QdrantClient({
  url: process.env.QDRANT_URL || "https://c9c1ac35-4b40-46cd-896c-e5d64ac38d9a.us-east-2-0.aws.cloud.qdrant.io",
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || "chunk1";
const VECTOR_SIZE = Number(process.env.QDRANT_VECTOR_SIZE || 3072);
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
      } else {
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
      }

      await client.createPayloadIndex(COLLECTION_NAME, {
        field_name: "documentId",
        field_schema: "keyword",
        wait: true,
      });
      logger.info("Qdrant payload index ensured for documentId", { collectionName: COLLECTION_NAME });
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
  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points,
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

export async function testQdrantConnection() {
  const existsResponse = await client.collectionExists(COLLECTION_NAME);
  return {
    collectionName: COLLECTION_NAME,
    exists: Boolean(existsResponse?.exists ?? existsResponse),
  };
}
