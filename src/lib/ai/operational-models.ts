/**
 * Centralized configuration for operational task models.
 *
 * This file defines which models are used for internal system tasks
 * (title generation, memory extraction, tagging, summarization, etc.)
 *
 * Change models here - no need to hunt through the codebase!
 */

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
} as const;
