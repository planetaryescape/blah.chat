/**
 * Centralized configuration for operational task models.
 *
 * This file defines which models are used for internal system tasks
 * (title generation, memory extraction, tagging, summarization, etc.)
 *
 * Change models here - no need to hunt through the codebase!
 */

import type { EmbeddingModel } from "ai";
import { DEFAULT_MODEL_ID, MODEL_CONFIG, type ModelConfig } from "./models";
import { vercel } from "./providers/gateway";

// ============================================================================
// DEFAULT MODEL (used for new conversations when no model is specified)
// ============================================================================

export { DEFAULT_MODEL_ID } from "./models";
export const DEFAULT_MODEL = MODEL_CONFIG[DEFAULT_MODEL_ID];

// ============================================================================
// OPERATIONAL TASK MODELS
// ============================================================================

/**
 * Title generation for conversations and notes.
 * Fast, cost-effective model for generating short titles.
 */
export const TITLE_GENERATION_MODEL: ModelConfig =
  MODEL_CONFIG["openai:gpt-oss-120b"];

/** Bounded, source-validated code outlines; never rewrites the source rendition. */
export const SPEECH_PREPARATION_MODEL: ModelConfig = TITLE_GENERATION_MODEL;

/** Cheap classification and tiebreak model for auto routing. */
export const ROUTER_TIEBREAK_MODEL: ModelConfig =
  MODEL_CONFIG["openai:gpt-oss-120b"];

/**
 * Memory extraction from conversations.
 * Needs good reasoning to identify important facts, preferences, etc.
 */
export const MEMORY_EXTRACTION_MODEL: ModelConfig =
  MODEL_CONFIG["openai:gpt-oss-120b"];

/**
 * Memory rephrasing and consolidation.
 * Used when combining or cleaning up memories.
 */
export const MEMORY_PROCESSING_MODEL: ModelConfig =
  MODEL_CONFIG["openai:gpt-oss-120b"];

/**
 * Tag extraction from notes.
 * Identifies relevant tags from content.
 */
export const TAG_EXTRACTION_MODEL: ModelConfig =
  MODEL_CONFIG["openai:gpt-oss-120b"];

/**
 * Text summarization (selection summary feature).
 * Needs good comprehension for high-quality summaries.
 */
export const SUMMARIZATION_MODEL: ModelConfig =
  MODEL_CONFIG["openai:gpt-oss-120b"];

/**
 * Message embedding summarization (for vector search).
 * Creates concise summaries of messages for embedding.
 */
export const EMBEDDING_SUMMARIZATION_MODEL: ModelConfig =
  MODEL_CONFIG["openai:gpt-oss-120b"];

/**
 * Memory reranking for search results.
 * Reorders memory candidates by relevance to query.
 */
export const MEMORY_RERANK_MODEL: ModelConfig =
  MODEL_CONFIG["openai:gpt-oss-120b"];

/**
 * Feedback triage and categorization.
 * Analyzes user feedback for priority, sentiment, and actionability.
 */
export const FEEDBACK_TRIAGE_MODEL: ModelConfig =
  MODEL_CONFIG["openai:gpt-oss-120b"];

/**
 * Deadline parsing from natural language.
 * Converts deadline expressions like "next Friday" to timestamps.
 */
export const DEADLINE_PARSING_MODEL: ModelConfig =
  MODEL_CONFIG["openai:gpt-oss-120b"];

/**
 * Document extraction (OCR/text extraction from files).
 * Uses Gemini 3 Flash for native PDF/document support.
 * Extracts text from PDFs, images, DOCX, etc. page-by-page.
 */
export const DOCUMENT_EXTRACTION_MODEL: ModelConfig =
  MODEL_CONFIG["google:gemini-3-flash"];

/**
 * Design system generation for presentations.
 * Uses the direct text model for design specifications without paid-gateway dependency.
 * Higher temperature (0.9) for creative output.
 */
export const DESIGN_SYSTEM_GENERATION_MODEL: ModelConfig =
  MODEL_CONFIG[DEFAULT_MODEL_ID];

/**
 * Template analysis for brand extraction.
 * Uses Gemini 3 Flash for multimodal analysis of templates (PDF, PPTX, images).
 * Extracts colors, fonts, layout patterns from organization templates.
 */
export const TEMPLATE_ANALYSIS_MODEL: ModelConfig =
  MODEL_CONFIG["google:gemini-3-flash"];

// ============================================================================
// EMBEDDING MODEL
// ============================================================================

/**
 * Embedding model for vector search (memories, messages, conversations).
 * Used to generate embeddings for semantic search across the application.
 */
export const EMBEDDING_MODEL: EmbeddingModel = vercel.embeddingModel(
  "openai/text-embedding-3-small",
) as unknown as EmbeddingModel;

/**
 * Embedding model pricing (per 1M tokens).
 * text-embedding-3-small: $0.02/1M tokens
 * Source: https://vercel.com/ai-gateway/models/text-embedding-3-small
 */
export const EMBEDDING_PRICING = {
  model: "openai/text-embedding-3-small",
  pricePerMillionTokens: 0.02,
};

/**
 * Calculate embedding cost from token count.
 */
export function calculateEmbeddingCost(tokenCount: number): number {
  return (tokenCount / 1_000_000) * EMBEDDING_PRICING.pricePerMillionTokens;
}

// ============================================================================
// HELPER EXPORTS
// ============================================================================

/**
 * All operational models in one object for easy iteration/validation.
 */
export type OperationalModels = {
  default: ModelConfig;
  titleGeneration: ModelConfig;
  memoryExtraction: ModelConfig;
  memoryProcessing: ModelConfig;
  tagExtraction: ModelConfig;
  summarization: ModelConfig;
  embeddingSummarization: ModelConfig;
  memoryRerank: ModelConfig;
  feedbackTriage: ModelConfig;
  deadlineParsing: ModelConfig;
  documentExtraction: ModelConfig;
  designSystemGeneration: ModelConfig;
  templateAnalysis: ModelConfig;
  embedding: EmbeddingModel;
};

export const OPERATIONAL_MODELS: OperationalModels = {
  default: DEFAULT_MODEL,
  titleGeneration: TITLE_GENERATION_MODEL,
  memoryExtraction: MEMORY_EXTRACTION_MODEL,
  memoryProcessing: MEMORY_PROCESSING_MODEL,
  tagExtraction: TAG_EXTRACTION_MODEL,
  summarization: SUMMARIZATION_MODEL,
  embeddingSummarization: EMBEDDING_SUMMARIZATION_MODEL,
  memoryRerank: MEMORY_RERANK_MODEL,
  feedbackTriage: FEEDBACK_TRIAGE_MODEL,
  deadlineParsing: DEADLINE_PARSING_MODEL,
  documentExtraction: DOCUMENT_EXTRACTION_MODEL,
  designSystemGeneration: DESIGN_SYSTEM_GENERATION_MODEL,
  templateAnalysis: TEMPLATE_ANALYSIS_MODEL,
  embedding: EMBEDDING_MODEL,
};
