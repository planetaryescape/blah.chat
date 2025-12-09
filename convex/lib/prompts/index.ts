/**
 * Prompts Index
 *
 * Central export point for all prompts used in the application.
 * Import from here: import { CONVERSATION_TITLE_PROMPT } from "./lib/prompts"
 */

// Base system prompt
export { getBasePrompt } from "./base";
export type { } from "./base";

// Formatting utilities
export { formatMemoriesByCategory, truncateMemories } from "./formatting";

// Operational prompts
export {
    CONVERSATION_TITLE_PROMPT,
    NOTE_TITLE_PROMPT
} from "./operational/titleGeneration";

export { buildTagExtractionPrompt } from "./operational/tagExtraction";

export {
    SUMMARIZATION_SYSTEM_PROMPT,
    buildSummarizationPrompt
} from "./operational/summarization";

export {
    IMAGE_GENERATION_SYSTEM_PROMPT,
    buildImageGenerationPrompt
} from "./operational/imageGeneration";

export { buildMemoryExtractionPrompt } from "./operational/memoryExtraction";

export { buildMemoryRephrasePrompt } from "./operational/memoryRephrase";

export {
    buildClusterConsolidationPrompt, buildSingleMemoryConsolidationPrompt
} from "./operational/memoryConsolidation";

// Built-in templates
export { BUILT_IN_TEMPLATES } from "./templates/builtIn";
