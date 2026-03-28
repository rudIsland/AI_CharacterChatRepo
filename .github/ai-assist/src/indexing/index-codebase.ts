import { readPgVectorConfigFromEnv } from "../config/pgvector-config";
import { ProjectContextRetriever } from "../rag/project-context-retriever";

async function main(): Promise<void> {
  const workspacePath = process.env.GITHUB_WORKSPACE;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!workspacePath) {
    throw new Error("Missing required environment variable: GITHUB_WORKSPACE");
  }
  if (!apiKey) {
    throw new Error("Missing required environment variable: GEMINI_API_KEY");
  }

  const pgVectorConfig = readPgVectorConfigFromEnv(workspacePath);
  const retriever = new ProjectContextRetriever(
    workspacePath,
    apiKey,
    pgVectorConfig
  );

  const fullReindex = parseBooleanEnv(process.env.FULL_REINDEX, false);
  const changedFiles = parseFileList(process.env.INDEX_CHANGED_FILES);
  const deletedFiles = parseFileList(process.env.INDEX_DELETED_FILES);

  if (!fullReindex && changedFiles.length === 0 && deletedFiles.length === 0) {
    console.log("No changed files were provided for indexing.");
    return;
  }

  const syncResult = await retriever.syncCollection({
    changedFiles,
    deletedFiles,
    fullReindex,
  });

  console.log(`pgvector collection: ${syncResult.collectionName}`);
  console.log(`Indexed chunks: ${syncResult.indexedChunkCount}`);
  console.log(`Processed files: ${syncResult.processedFileCount}`);
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

function parseFileList(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }

  return [...new Set(rawValue.split(/\r?\n|,|\s+/).map((value) => value.trim()).filter(Boolean))];
}

main().catch((error) => {
  console.error("Failed to index the codebase.", error);
  process.exit(1);
});
