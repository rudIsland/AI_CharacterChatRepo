import * as path from "path";
import type { DistanceStrategy } from "@langchain/community/vectorstores/pgvector";

export interface PgVectorRetrieverConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  tableName: string;
  collectionName: string;
  collectionTableName: string;
  distanceStrategy: DistanceStrategy;
  enableHnsw: boolean;
  rebuildIndexOnRun: boolean;
  maxIndexedChunks: number;
}

export function readPgVectorConfigFromEnv(
  workspacePath: string
): PgVectorRetrieverConfig {
  const repositoryName =
    process.env.GITHUB_REPOSITORY?.trim() || path.basename(workspacePath);
  const branchName =
    process.env.GITHUB_BASE_REF?.trim() ||
    process.env.GITHUB_REF_NAME?.trim() ||
    "main";
  const defaultCollectionName = sanitizeCollectionName(
    `${repositoryName}-${branchName}`
  );

  const distanceStrategy = readDistanceStrategy(
    process.env.PGVECTOR_DISTANCE_STRATEGY
  );

  return {
    host: process.env.PGVECTOR_HOST?.trim() || "127.0.0.1",
    port: parseIntegerEnv(process.env.PGVECTOR_PORT, 5432),
    user: process.env.PGVECTOR_USER?.trim() || "postgres",
    password: process.env.PGVECTOR_PASSWORD?.trim() || "postgres",
    database: process.env.PGVECTOR_DATABASE?.trim() || "postgres",
    tableName: process.env.PGVECTOR_TABLE_NAME?.trim() || "code_embeddings",
    collectionName:
      process.env.PGVECTOR_COLLECTION_NAME?.trim() || defaultCollectionName,
    collectionTableName:
      process.env.PGVECTOR_COLLECTION_TABLE_NAME?.trim() ||
      "code_embedding_collections",
    distanceStrategy,
    enableHnsw: parseBooleanEnv(process.env.PGVECTOR_ENABLE_HNSW, true),
    rebuildIndexOnRun: parseBooleanEnv(
      process.env.PGVECTOR_REBUILD_INDEX,
      false
    ),
    maxIndexedChunks: parseIntegerEnv(process.env.PGVECTOR_MAX_INDEXED_CHUNKS, 600),
  };
}

function readDistanceStrategy(
  rawValue: string | undefined
): DistanceStrategy {
  const normalizedValue = rawValue?.trim();
  if (
    normalizedValue === "cosine" ||
    normalizedValue === "innerProduct" ||
    normalizedValue === "euclidean"
  ) {
    return normalizedValue;
  }

  return "cosine";
}

function parseBooleanEnv(
  rawValue: string | undefined,
  defaultValue: boolean
): boolean {
  if (!rawValue) {
    return defaultValue;
  }

  const normalizedValue = rawValue.trim().toLowerCase();
  if (normalizedValue === "true" || normalizedValue === "1") {
    return true;
  }
  if (normalizedValue === "false" || normalizedValue === "0") {
    return false;
  }

  return defaultValue;
}

function parseIntegerEnv(
  rawValue: string | undefined,
  defaultValue: number
): number {
  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
}

function sanitizeCollectionName(rawValue: string): string {
  const normalizedValue = rawValue
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  return normalizedValue || "main";
}
