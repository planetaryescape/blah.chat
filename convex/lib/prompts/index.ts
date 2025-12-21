/**
 * Prompts Index
 *
 * Central export point for all prompts used in the application.
 * Import from here: import { CONVERSATION_TITLE_PROMPT } from "./lib/prompts"
 */

export type {} from "./base";
// Base system prompt
export { getBasePrompt } from "./base";

// Formatting utilities
export { formatMemoriesByCategory, truncateMemories } from "./formatting";
export {
  buildDesignSystemPrompt,
  DESIGN_SYSTEM_PROMPT,
} from "./operational/designSystem";
export { DOCUMENT_MODE_PROMPT } from "./operational/documentMode";
export {
  buildImageGenerationPrompt,
  IMAGE_GENERATION_SYSTEM_PROMPT,
} from "./operational/imageGeneration";
export {
  buildClusterConsolidationPrompt,
  buildSingleMemoryConsolidationPrompt,
} from "./operational/memoryConsolidation";
export { buildMemoryExtractionPrompt } from "./operational/memoryExtraction";
export { buildMemoryRephrasePrompt } from "./operational/memoryRephrase";
export {
  buildSlideImagePrompt,
  type SlideImageContext,
} from "./operational/slideImage";
export {
  buildSummarizationPrompt,
  SUMMARIZATION_SYSTEM_PROMPT,
} from "./operational/summarization";
export { buildAutoTagPrompt } from "./operational/tagExtraction";
// Operational prompts
export {
  CONVERSATION_TITLE_PROMPT,
  NOTE_TITLE_PROMPT,
} from "./operational/titleGeneration";

// Built-in templates
export { BUILT_IN_TEMPLATES } from "./templates/builtIn";

// System prompt builder
export { buildSystemPrompts } from "./systemBuilder";
export type {
  BuildSystemPromptsArgs,
  BuildSystemPromptsResult,
} from "./systemBuilder";
