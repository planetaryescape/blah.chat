/**
 * Centralized configuration for operational task models.
 *
 * This file defines which models are used for internal system tasks
 * (title generation, memory extraction, tagging, summarization, etc.)
 *
 * Change models here - no need to hunt through the codebase!
 */

import { openai } from "@ai-sdk/openai";
import { MODEL_CONFIG, type ModelConfig } from "./models";

// ============================================================================
// DEFAULT MODEL (used for new conversations when no model is specified)
// ============================================================================

export const DEFAULT_MODEL_ID = "openai:gpt-oss-120b";
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

// ============================================================================
// EMBEDDING MODEL
// ============================================================================

/**
 * Embedding model for vector search (memories, messages, conversations).
 * Used to generate embeddings for semantic search across the application.
 */
export const EMBEDDING_MODEL = openai.embedding("text-embedding-3-small");

// ============================================================================
// HELPER EXPORTS
// ============================================================================

/**
 * All operational models in one object for easy iteration/validation.
 */
export const OPERATIONAL_MODELS = {
  default: DEFAULT_MODEL,
  titleGeneration: TITLE_GENERATION_MODEL,
  memoryExtraction: MEMORY_EXTRACTION_MODEL,
  memoryProcessing: MEMORY_PROCESSING_MODEL,
  tagExtraction: TAG_EXTRACTION_MODEL,
  summarization: SUMMARIZATION_MODEL,
  embeddingSummarization: EMBEDDING_SUMMARIZATION_MODEL,
  memoryRerank: MEMORY_RERANK_MODEL,
  feedbackTriage: FEEDBACK_TRIAGE_MODEL,
  embedding: EMBEDDING_MODEL,
} as const;
