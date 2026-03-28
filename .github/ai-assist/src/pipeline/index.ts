import { readFileSync, writeFileSync } from "fs";
import * as path from "path";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  readPgVectorConfigFromEnv,
  type PgVectorRetrieverConfig,
} from "../config/pgvector-config";
import { ProjectContextRetriever } from "../rag/project-context-retriever";
import { generateCodeReviewComment } from "../review/code-reviewer";
import { generateTestSuggestions } from "../test-generation/test-generator";

const DEFAULT_MODEL_NAME = "gemini-2.5-flash";
const DEFAULT_RAG_TOP_K = 8;

interface PipelineConfig {
  apiKey: string;
  prDiffPath: string;
  workspacePath: string;
  changedFiles: string[];
  modelName: string;
  ragTopK: number;
  pgVectorConfig: PgVectorRetrieverConfig;
}

async function runPipeline(): Promise<void> {
  const config = readPipelineConfigFromEnv();
  const prDiffText = readFileSync(config.prDiffPath, "utf-8");
  console.log(`Loaded PR diff: ${config.prDiffPath}`);
  console.log(`Changed files count: ${config.changedFiles.length}`);
  console.log(`Gemini review model: ${config.modelName}`);
  console.log(
    `Gemini embedding model: ${config.pgVectorConfig.embeddingModelName}`
  );

  const reviewModel = createReviewModel(config.apiKey, config.modelName);
  const ragRetriever = new ProjectContextRetriever(
    config.workspacePath,
    config.apiKey,
    config.pgVectorConfig
  );

  console.log("Retrieving project context from pgvector.");
  const retrievedContext = await ragRetriever.retrieveContext({
    prDiff: prDiffText,
    changedFiles: config.changedFiles,
    topK: config.ragTopK,
  });

  console.log("Generating Gemini review comment.");
  const reviewComment = await generateCodeReviewComment(reviewModel, {
    prDiff: prDiffText,
    changedFiles: config.changedFiles,
    ragContext: retrievedContext.ragContext,
  });

  console.log("Generating Gemini test suggestions.");
  const testSuggestions = await generateTestSuggestions(reviewModel, {
    workspacePath: config.workspacePath,
    changedFiles: config.changedFiles,
    ragContext: retrievedContext.ragContext,
  });
  const combinedReviewComment = buildCombinedReviewComment(
    reviewComment,
    testSuggestions
  );
  const publishedReviewComment = buildPublishedReviewComment(
    config.modelName,
    combinedReviewComment
  );
  if (!publishedReviewComment.trim()) {
    throw new Error(
      "Gemini returned an empty review output. Check the model response and upstream retrieval logs."
    );
  }

  const reviewOutputPath = path.join(config.workspacePath, "review_result.txt");
  const testOutputPath = path.join(config.workspacePath, "test_suggestions.txt");

  writeFileSync(reviewOutputPath, publishedReviewComment, "utf-8");
  writeFileSync(testOutputPath, testSuggestions, "utf-8");

  console.log(`RAG query text length: ${retrievedContext.queryText.length}`);
  console.log(`Indexed chunks in pgvector: ${retrievedContext.indexedChunkCount}`);
  console.log(`pgvector collection: ${retrievedContext.collectionName}`);
  console.log(`Retrieved context chunks: ${retrievedContext.chunks.length}`);
  console.log(`Review result saved: ${reviewOutputPath}`);
  console.log(`Test suggestions saved: ${testOutputPath}`);

  // Future extension point:
  // Keep pipeline state explicit so LangGraph state transitions can replace this orchestrator later.
}

function readPipelineConfigFromEnv(): PipelineConfig {
  const apiKey = process.env.GEMINI_API_KEY;
  const prDiffPath = process.env.PR_DIFF_PATH;
  const workspacePath = process.env.GITHUB_WORKSPACE;

  if (!apiKey) {
    throw new Error("Missing required environment variable: GEMINI_API_KEY");
  }
  if (!prDiffPath) {
    throw new Error("Missing required environment variable: PR_DIFF_PATH");
  }
  if (!workspacePath) {
    throw new Error("Missing required environment variable: GITHUB_WORKSPACE");
  }

  const rawChangedFiles = process.env.CHANGED_FILES;
  const changedFiles = parseChangedFiles(rawChangedFiles);

  const modelName = process.env.LLM_MODEL?.trim() || DEFAULT_MODEL_NAME;
  const parsedTopK = Number(process.env.RAG_TOP_K);
  const ragTopK =
    Number.isFinite(parsedTopK) && parsedTopK > 0
      ? Math.floor(parsedTopK)
      : DEFAULT_RAG_TOP_K;
  const pgVectorConfig = readPgVectorConfigFromEnv(workspacePath);

  return {
    apiKey,
    prDiffPath,
    workspacePath,
    changedFiles,
    modelName,
    ragTopK,
    pgVectorConfig,
  };
}

function parseChangedFiles(rawChangedFiles: string | undefined): string[] {
  if (!rawChangedFiles) {
    return [];
  }

  const parsedFiles = rawChangedFiles
    .split(/\r?\n|,|\s+/)
    .map((filePath) => filePath.trim())
    .filter((filePath) => filePath.length > 0);

  return [...new Set(parsedFiles)];
}

function createReviewModel(apiKey: string, modelName: string): BaseChatModel {
  return new ChatGoogleGenerativeAI({
    model: modelName,
    apiKey,
    temperature: 0.2,
  }) as unknown as BaseChatModel;
}

function buildCombinedReviewComment(
  reviewComment: string,
  testSuggestions: string
): string {
  const trimmedReviewComment = reviewComment.trim();
  const trimmedTestSuggestions = testSuggestions.trim();

  if (!trimmedTestSuggestions) {
    return trimmedReviewComment;
  }

  return `${trimmedReviewComment}\n\n---\n\n${trimmedTestSuggestions}`;
}

function buildPublishedReviewComment(
  modelName: string,
  combinedReviewComment: string
): string {
  const trimmedCombinedReviewComment = combinedReviewComment.trim();
  if (!trimmedCombinedReviewComment) {
    return "";
  }

  const headerLines = [
    "## Gemini AI Review",
    "",
    `- Model: \`${modelName}\``,
    "- Source: GitHub Actions workflow",
    "- Note: This review content was generated by Gemini and posted automatically.",
    "",
    "---",
    "",
  ];

  return `${headerLines.join("\n")}${trimmedCombinedReviewComment}`;
}

runPipeline().catch((error) => {
  console.error("Failed to run AI review pipeline.", error);
  process.exit(1);
});
