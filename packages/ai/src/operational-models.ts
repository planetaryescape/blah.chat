/**
 * Centralized configuration for operational task models.
 *
 * This file defines which models are used for internal system tasks
 * (title generation, memory extraction, tagging, summarization, etc.)
 *
 * Change models here - no need to hunt through the codebase!
 */

import type { EmbeddingModel } from "ai";
import { AUTO_MODEL, MODEL_CONFIG, type ModelConfig } from "./models";
import { openrouter } from "./providers/openrouter";

// ============================================================================
// DEFAULT MODEL (used for new conversations when no model is specified)
// ============================================================================

export const DEFAULT_MODEL_ID = "auto";
export const DEFAULT_MODEL =
  DEFAULT_MODEL_ID === "auto" ? AUTO_MODEL : MODEL_CONFIG[DEFAULT_MODEL_ID];

// ============================================================================
// OPERATIONAL TASK MODELS
// ============================================================================

/**
 * Title generation for conversations and notes.
 * Fast, cost-effective model for generating short titles.
 */
export const TITLE_GENERATION_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

/**
 * Memory extraction from conversations.
 * Needs good reasoning to identify important facts, preferences, etc.
 */
export const MEMORY_EXTRACTION_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

/**
 * Memory rephrasing and consolidation.
 * Used when combining or cleaning up memories.
 */
export const MEMORY_PROCESSING_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

/**
 * Tag extraction from notes.
 * Identifies relevant tags from content.
 */
export const TAG_EXTRACTION_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

/**
 * Text summarization (selection summary feature).
 * Needs good comprehension for high-quality summaries.
 */
export const SUMMARIZATION_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

/**
 * Message embedding summarization (for vector search).
 * Creates concise summaries of messages for embedding.
 */
export const EMBEDDING_SUMMARIZATION_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

/**
 * Memory reranking for search results.
 * Reorders memory candidates by relevance to query.
 */
export const MEMORY_RERANK_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

/**
 * Feedback triage and categorization.
 * Analyzes user feedback for priority, sentiment, and actionability.
 */
export const FEEDBACK_TRIAGE_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

/**
 * Task extraction from transcripts.
 * Extracts actionable tasks with deadlines from meeting transcripts.
 */
export const TASK_EXTRACTION_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

/**
 * Deadline parsing from natural language.
 * Converts deadline expressions like "next Friday" to timestamps.
 */
export const DEADLINE_PARSING_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

/**
 * Meeting extraction (combined tasks + notes).
 * Extracts both actionable tasks and meeting notes from transcripts.
 */
export const MEETING_EXTRACTION_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

/**
 * Document extraction (OCR/text extraction from files).
 * Uses Gemini 2.0 Flash for native PDF/document support.
 * Extracts text from PDFs, images, DOCX, etc. page-by-page.
 */
export const DOCUMENT_EXTRACTION_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

/**
 * Design system generation for presentations.
 * Uses GLM-4.6 for creative, distinctive visual design generation.
 * Higher temperature (0.9) for creative output.
 */
export const DESIGN_SYSTEM_GENERATION_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:glm-5"];

/**
 * Template analysis for brand extraction.
 * Uses Gemini 3 Flash for multimodal analysis of templates (PDF, PPTX, images).
 * Extracts colors, fonts, layout patterns from organization templates.
 */
export const TEMPLATE_ANALYSIS_MODEL: ModelConfig =
  MODEL_CONFIG["openrouter:gemini-2.0-flash-exp"];

// ============================================================================
// EMBEDDING MODEL
// ============================================================================

/**
 * Embedding model for vector search (memories, messages, conversations).
 * Used to generate embeddings for semantic search across the application.
 * Routed via OpenRouter so prod only needs OPENROUTER_API_KEY.
 */
export const EMBEDDING_MODEL: EmbeddingModel = openrouter.textEmbeddingModel(
  "openai/text-embedding-3-small",
) as unknown as EmbeddingModel;

/**
 * Embedding model pricing (per 1M tokens).
 * text-embedding-3-small: $0.02/1M tokens
 * Source: https://openrouter.ai/openai/text-embedding-3-small
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
  taskExtraction: ModelConfig;
  deadlineParsing: ModelConfig;
  meetingExtraction: ModelConfig;
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
  taskExtraction: TASK_EXTRACTION_MODEL,
  deadlineParsing: DEADLINE_PARSING_MODEL,
  meetingExtraction: MEETING_EXTRACTION_MODEL,
  documentExtraction: DOCUMENT_EXTRACTION_MODEL,
  designSystemGeneration: DESIGN_SYSTEM_GENERATION_MODEL,
  templateAnalysis: TEMPLATE_ANALYSIS_MODEL,
  embedding: EMBEDDING_MODEL,
};
