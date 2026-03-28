import { Dirent, readFileSync, readdirSync, statSync } from "fs";
import * as path from "path";
import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import type { PoolConfig } from "pg";
import { v5 as uuidv5 } from "uuid";
import type { PgVectorRetrieverConfig } from "../config/pgvector-config";

const MAX_FILE_SIZE_BYTES = 220_000;
const CHUNK_LINE_SIZE = 70;
const CHUNK_LINE_OVERLAP = 12;
const DEFAULT_TOP_K = 8;
const MAX_SEARCH_CANDIDATES = 24;
const CHUNK_ID_NAMESPACE = uuidv5.URL;

const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".java",
  ".cs",
  ".dart",
  ".go",
  ".rs",
  ".kt",
  ".swift",
  ".md",
]);

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  ".next",
  ".venv",
  "venv",
  "coverage",
]);

const IDENTIFIER_STOP_WORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "class",
  "public",
  "private",
  "protected",
  "static",
  "new",
  "return",
  "import",
  "from",
  "export",
  "default",
  "async",
  "await",
  "true",
  "false",
  "null",
  "undefined",
  "if",
  "else",
  "for",
  "while",
  "switch",
  "case",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "this",
]);

export interface RetrievedContextChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
}

export interface CollectionSyncInput {
  changedFiles?: string[];
  deletedFiles?: string[];
  fullReindex?: boolean;
}

export interface CollectionSyncResult {
  collectionName: string;
  indexedChunkCount: number;
  processedFileCount: number;
}

interface SourceChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  extension: string;
  directoryPath: string;
}

interface RetrieveContextInput {
  prDiff: string;
  changedFiles: string[];
  topK?: number;
}

export interface RetrieveContextOutput {
  ragContext: string;
  chunks: RetrievedContextChunk[];
  queryText: string;
  indexedChunkCount: number;
  collectionName: string;
}

interface ChunkMetadata {
  filePath: string;
  startLine: number;
  endLine: number;
  extension: string;
  directoryPath: string;
}

export class ProjectContextRetriever {
  private readonly embeddings: GoogleGenerativeAIEmbeddings;
  private readonly workspacePath: string;
  private readonly config: PgVectorRetrieverConfig;
  private embeddingDimensions?: number;

  constructor(
    workspacePath: string,
    apiKey: string,
    config: PgVectorRetrieverConfig
  ) {
    this.workspacePath = workspacePath;
    this.config = config;
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      modelName: this.config.embeddingModelName,
    });
  }

  async syncCollection(
    input: CollectionSyncInput
  ): Promise<CollectionSyncResult> {
    const vectorStore = await this.openVectorStore();

    try {
      if (input.fullReindex) {
        const sourceFiles = collectSourceFiles(this.workspacePath);
        const sourceChunks = buildChunksForFiles(
          this.workspacePath,
          sourceFiles,
          this.config.maxIndexedChunks
        );

        await this.deleteCollectionDocuments(vectorStore);
        await this.addSourceChunks(vectorStore, sourceChunks);

        return {
          collectionName: this.config.collectionName,
          indexedChunkCount: sourceChunks.length,
          processedFileCount: sourceFiles.length,
        };
      }

      const changedFiles = uniqueNormalizedPaths(input.changedFiles ?? []);
      const deletedFiles = uniqueNormalizedPaths(input.deletedFiles ?? []);
      const filesToDelete = [...new Set([...changedFiles, ...deletedFiles])];
      const indexableFiles = collectExistingIndexableFiles(
        this.workspacePath,
        changedFiles
      );
      const sourceChunks = buildChunksForFiles(
        this.workspacePath,
        indexableFiles,
        this.config.maxIndexedChunks
      );

      if (filesToDelete.length > 0) {
        await this.deleteDocumentsForFiles(vectorStore, filesToDelete);
      }
      if (sourceChunks.length > 0) {
        await this.addSourceChunks(vectorStore, sourceChunks);
      }

      return {
        collectionName: this.config.collectionName,
        indexedChunkCount: sourceChunks.length,
        processedFileCount: filesToDelete.length,
      };
    } finally {
      await vectorStore.end();
    }
  }

  async retrieveContext(
    input: RetrieveContextInput
  ): Promise<RetrieveContextOutput> {
    const queryText = buildQueryText(input.prDiff, input.changedFiles);
    if (!queryText.trim()) {
      return {
        ragContext: "No query text could be built from the PR diff.",
        chunks: [],
        queryText,
        indexedChunkCount: 0,
        collectionName: this.config.collectionName,
      };
    }

    if (this.config.rebuildIndexOnRun) {
      await this.syncCollection({ fullReindex: true });
    }

    const vectorStore = await this.openVectorStore();

    try {
      const retrievedChunks = await this.searchChunks(
        vectorStore,
        queryText,
        input.changedFiles,
        input.topK ?? DEFAULT_TOP_K
      );

      return {
        ragContext: formatChunksAsContext(retrievedChunks),
        chunks: retrievedChunks,
        queryText,
        indexedChunkCount: 0,
        collectionName: this.config.collectionName,
      };
    } finally {
      await vectorStore.end();
    }
  }

  private async openVectorStore(): Promise<PGVectorStore> {
    const embeddingDimensions = await this.getEmbeddingDimensions();
    const vectorStore = await PGVectorStore.initialize(this.embeddings, {
      postgresConnectionOptions: buildPostgresConnectionOptions(this.config),
      tableName: this.config.tableName,
      collectionTableName: this.config.collectionTableName,
      collectionName: this.config.collectionName,
      distanceStrategy: this.config.distanceStrategy,
      scoreNormalization: "similarity",
      dimensions: embeddingDimensions,
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "content",
        metadataColumnName: "metadata",
      },
    });

    if (this.config.enableHnsw && embeddingDimensions <= 2000) {
      await vectorStore.createHnswIndex({
        dimensions: embeddingDimensions,
        namespace: this.config.tableName,
      });
    }

    return vectorStore;
  }

  private async deleteCollectionDocuments(
    vectorStore: PGVectorStore
  ): Promise<void> {
    await vectorStore.delete({
      filter: {
        collectionScope: this.config.collectionName,
      },
    });
  }

  private async deleteDocumentsForFiles(
    vectorStore: PGVectorStore,
    filePaths: string[]
  ): Promise<void> {
    if (filePaths.length === 0) {
      return;
    }

    await vectorStore.delete({
      filter: {
        collectionScope: this.config.collectionName,
        filePath: {
          in: filePaths,
        },
      },
    });
  }

  private async addSourceChunks(
    vectorStore: PGVectorStore,
    sourceChunks: SourceChunk[]
  ): Promise<void> {
    if (sourceChunks.length === 0) {
      return;
    }

    const documents = sourceChunks.map(
      (sourceChunk) =>
        new Document({
          pageContent: sourceChunk.content,
          metadata: {
            filePath: sourceChunk.filePath,
            startLine: sourceChunk.startLine,
            endLine: sourceChunk.endLine,
            extension: sourceChunk.extension,
            directoryPath: sourceChunk.directoryPath,
            collectionScope: this.config.collectionName,
          },
        })
    );
    const documentIds = sourceChunks.map((sourceChunk) =>
      buildChunkDocumentId(this.config.collectionName, sourceChunk)
    );

    await vectorStore.addDocuments(documents, { ids: documentIds });
  }

  private async searchChunks(
    vectorStore: PGVectorStore,
    queryText: string,
    changedFiles: string[],
    topK: number
  ): Promise<RetrievedContextChunk[]> {
    const candidateCount = Math.min(
      Math.max(topK * 3, topK),
      MAX_SEARCH_CANDIDATES
    );
    const rawResults = await vectorStore.similaritySearchWithScore(
      queryText,
      candidateCount,
      {
        collectionScope: this.config.collectionName,
      }
    );

    const changedFileSet = new Set(changedFiles.map(normalizePath));
    const changedDirectorySet = new Set(
      changedFiles
        .map((changedFile) =>
          normalizePath(path.posix.dirname(normalizePath(changedFile)))
        )
        .filter((directoryPath) => directoryPath !== "." && directoryPath !== "")
    );
    const queryTerms = extractIdentifierTerms(queryText);

    const rankedChunks = rawResults
      .map(([document, similarityScore]) => {
        const metadata = parseChunkMetadata(document.metadata);
        const keywordBoost = computeKeywordBoost(
          queryTerms,
          document.pageContent
        );
        const changedFileBoost = changedFileSet.has(metadata.filePath) ? 0.08 : 0;
        const directoryBoost = isFileInsideChangedDirectory(
          metadata.filePath,
          changedDirectorySet
        )
          ? 0.03
          : 0;

        return {
          filePath: metadata.filePath,
          startLine: metadata.startLine,
          endLine: metadata.endLine,
          content: document.pageContent,
          score: similarityScore + keywordBoost + changedFileBoost + directoryBoost,
        } satisfies RetrievedContextChunk;
      })
      .sort((leftChunk, rightChunk) => rightChunk.score - leftChunk.score);

    const uniqueChunks: RetrievedContextChunk[] = [];
    const seenChunkKeys = new Set<string>();

    for (const rankedChunk of rankedChunks) {
      const chunkKey = `${rankedChunk.filePath}:${rankedChunk.startLine}:${rankedChunk.endLine}`;
      if (seenChunkKeys.has(chunkKey)) {
        continue;
      }

      seenChunkKeys.add(chunkKey);
      uniqueChunks.push(rankedChunk);

      if (uniqueChunks.length >= topK) {
        break;
      }
    }

    return uniqueChunks;
  }

  private async getEmbeddingDimensions(): Promise<number> {
    if (this.embeddingDimensions) {
      return this.embeddingDimensions;
    }

    const probeVector = await this.embeddings.embedQuery(
      "pgvector-dimension-probe"
    );
    this.embeddingDimensions = probeVector.length;
    return this.embeddingDimensions;
  }
}

function buildPostgresConnectionOptions(
  config: PgVectorRetrieverConfig
): PoolConfig {
  const connectionOptions: PoolConfig = config.connectionString
    ? {
        connectionString: config.connectionString,
      }
    : {
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
      };

  if (config.sslEnabled) {
    connectionOptions.ssl = {
      ca: config.sslCaCert,
      rejectUnauthorized: config.sslRejectUnauthorized,
    };
  }

  return connectionOptions;
}

function normalizePath(targetPath: string): string {
  return targetPath.replace(/\\/g, "/");
}

function uniqueNormalizedPaths(filePaths: string[]): string[] {
  return [...new Set(filePaths.map(normalizePath).filter(Boolean))];
}

function collectExistingIndexableFiles(
  workspacePath: string,
  filePaths: string[]
): string[] {
  const existingFiles: string[] = [];

  for (const filePath of filePaths) {
    const normalizedFilePath = normalizePath(filePath);
    const extension = path.extname(normalizedFilePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      continue;
    }

    const absoluteFilePath = path.join(workspacePath, normalizedFilePath);

    let fileStats: ReturnType<typeof statSync>;
    try {
      fileStats = statSync(absoluteFilePath);
    } catch {
      continue;
    }

    if (!fileStats.isFile() || fileStats.size > MAX_FILE_SIZE_BYTES) {
      continue;
    }

    existingFiles.push(normalizedFilePath);
  }

  return existingFiles;
}

function collectSourceFiles(workspacePath: string): string[] {
  const collectedFiles: string[] = [];
  const directoriesToScan: string[] = [workspacePath];

  while (directoriesToScan.length > 0) {
    const currentDirectory = directoriesToScan.pop();
    if (!currentDirectory) {
      continue;
    }

    let entries: Dirent[];
    try {
      entries = readdirSync(currentDirectory, {
        withFileTypes: true,
        encoding: "utf-8",
      });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const absoluteEntryPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        if (EXCLUDED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        directoriesToScan.push(absoluteEntryPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(extension)) {
        continue;
      }

      let fileStats: ReturnType<typeof statSync>;
      try {
        fileStats = statSync(absoluteEntryPath);
      } catch {
        continue;
      }

      if (fileStats.size > MAX_FILE_SIZE_BYTES) {
        continue;
      }

      const relativePath = normalizePath(
        path.relative(workspacePath, absoluteEntryPath)
      );
      collectedFiles.push(relativePath);
    }
  }

  return collectedFiles.sort((leftFile, rightFile) =>
    leftFile.localeCompare(rightFile)
  );
}

function isFileInsideChangedDirectory(
  filePath: string,
  changedDirectorySet: Set<string>
): boolean {
  const normalizedFilePath = normalizePath(filePath);

  for (const changedDirectory of changedDirectorySet) {
    if (normalizedFilePath.startsWith(`${changedDirectory}/`)) {
      return true;
    }
  }

  return false;
}

function buildChunksForFiles(
  workspacePath: string,
  sourceFiles: string[],
  maxChunkCount: number
): SourceChunk[] {
  const sourceChunks: SourceChunk[] = [];

  for (const relativeFilePath of sourceFiles) {
    if (sourceChunks.length >= maxChunkCount) {
      break;
    }

    const absoluteFilePath = path.join(workspacePath, relativeFilePath);

    let fileContent: string;
    try {
      fileContent = readFileSync(absoluteFilePath, "utf-8");
    } catch {
      continue;
    }

    const splitChunks = splitFileContentIntoLineChunks(
      relativeFilePath,
      fileContent
    );
    for (const splitChunk of splitChunks) {
      sourceChunks.push(splitChunk);

      if (sourceChunks.length >= maxChunkCount) {
        break;
      }
    }
  }

  return sourceChunks;
}

function splitFileContentIntoLineChunks(
  filePath: string,
  fileContent: string
): SourceChunk[] {
  const lines = fileContent.split(/\r?\n/);
  if (lines.length === 0) {
    return [];
  }

  const fileExtension = path.extname(filePath).toLowerCase();
  const directoryPath = normalizePath(path.posix.dirname(filePath));
  const chunks: SourceChunk[] = [];
  const step = CHUNK_LINE_SIZE - CHUNK_LINE_OVERLAP;

  for (
    let startLineIndex = 0;
    startLineIndex < lines.length;
    startLineIndex += step
  ) {
    const endLineIndex = Math.min(
      startLineIndex + CHUNK_LINE_SIZE,
      lines.length
    );
    const chunkContent = lines
      .slice(startLineIndex, endLineIndex)
      .join("\n")
      .trim();

    if (chunkContent.length < 80) {
      continue;
    }

    chunks.push({
      filePath,
      startLine: startLineIndex + 1,
      endLine: endLineIndex,
      content: chunkContent,
      extension: fileExtension,
      directoryPath,
    });
  }

  return chunks;
}

function buildQueryText(prDiff: string, changedFiles: string[]): string {
  const querySections: string[] = [];

  if (changedFiles.length > 0) {
    querySections.push(`Changed files:\n${changedFiles.join("\n")}`);
  }

  const identifiers = extractIdentifierTerms(prDiff).slice(0, 40);
  if (identifiers.length > 0) {
    querySections.push(`Identifiers:\n${identifiers.join(", ")}`);
  }

  const diffPreview = prDiff.trim().slice(0, 8_000);
  if (diffPreview.length > 0) {
    querySections.push(`Diff preview:\n${diffPreview}`);
  }

  return querySections.join("\n\n");
}

function extractIdentifierTerms(text: string): string[] {
  const matches = text.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g) ?? [];
  const uniqueTerms = new Set<string>();

  for (const match of matches) {
    const normalizedTerm = match.toLowerCase();
    if (IDENTIFIER_STOP_WORDS.has(normalizedTerm)) {
      continue;
    }

    uniqueTerms.add(match);
    if (uniqueTerms.size >= 80) {
      break;
    }
  }

  return [...uniqueTerms];
}

function buildChunkDocumentId(
  collectionName: string,
  sourceChunk: SourceChunk
): string {
  const chunkIdentity = [
    collectionName,
    sourceChunk.filePath,
    sourceChunk.startLine,
    sourceChunk.endLine,
    sourceChunk.content,
  ].join(":");

  return uuidv5(chunkIdentity, CHUNK_ID_NAMESPACE);
}

function computeKeywordBoost(terms: string[], content: string): number {
  if (terms.length === 0) {
    return 0;
  }

  const lowercaseContent = content.toLowerCase();
  let matchCount = 0;

  for (const term of terms.slice(0, 25)) {
    if (lowercaseContent.includes(term.toLowerCase())) {
      matchCount += 1;
    }
  }

  return Math.min(matchCount, 5) * 0.01;
}

function parseChunkMetadata(metadata: Record<string, unknown>): ChunkMetadata {
  const filePath =
    typeof metadata.filePath === "string" ? metadata.filePath : "unknown";
  const startLine =
    typeof metadata.startLine === "number" ? metadata.startLine : 1;
  const endLine =
    typeof metadata.endLine === "number" ? metadata.endLine : startLine;
  const extension =
    typeof metadata.extension === "string"
      ? metadata.extension
      : path.extname(filePath);
  const directoryPath =
    typeof metadata.directoryPath === "string"
      ? metadata.directoryPath
      : normalizePath(path.posix.dirname(filePath));

  return {
    filePath: normalizePath(filePath),
    startLine,
    endLine,
    extension,
    directoryPath,
  };
}

function formatChunksAsContext(chunks: RetrievedContextChunk[]): string {
  if (chunks.length === 0) {
    return "pgvector did not return any related project context.";
  }

  return chunks
    .map(
      (chunk) =>
        `[File] ${chunk.filePath}:${chunk.startLine}-${chunk.endLine}\n\n\`\`\`\n${chunk.content}\n\`\`\``
    )
    .join("\n\n---\n\n");
}
