/**
 * Model Profile Types for Auto Router
 *
 * Each model has a profile describing its strengths, weaknesses, and
 * task-specific scores used by the router to select optimal models.
 */

/**
 * Task categories the router classifies user messages into
 */
export const TASK_CATEGORIES = [
  "coding", // Code generation, debugging, refactoring
  "reasoning", // Complex multi-step problems, math, logic
  "creative", // Writing, storytelling, brainstorming
  "factual", // Q&A, knowledge retrieval, definitions
  "analysis", // Document analysis, summarization, comparison
  "conversation", // Casual chat, simple questions, greetings
  "multimodal", // Image analysis, file processing, vision tasks
  "research", // Web search, current events, deep research
] as const;

export type TaskCategoryId = (typeof TASK_CATEGORIES)[number];

/**
 * Score 0-100 for each task category
 * Higher = model is better suited for this task type
 */
export type TaskCategoryScores = Partial<Record<TaskCategoryId, number>>;

/**
 * Cost tier classification
 */
export type CostTier = "free" | "budget" | "standard" | "premium";

/**
 * Speed tier classification
 */
export type SpeedTier = "ultra-fast" | "fast" | "medium" | "slow";

/**
 * Model profile for auto-routing decisions
 */
export interface ModelProfile {
  /** Model ID matching MODEL_CONFIG key (e.g., "openai:gpt-5") */
  modelId: string;

  /** Task category scores (0-100) - how good this model is for each task type */
  categoryScores: TaskCategoryScores;

  /** Natural language descriptions of model strengths */
  strengths: string[];

  /** Natural language descriptions of model weaknesses */
  weaknesses: string[];

  /** Task descriptions this model excels at */
  bestFor: string[];

  /** Task descriptions to avoid using this model for */
  avoidFor: string[];

  /** Speed score override (0-100, 100 = fastest). Computed from config if not set. */
  speedScore?: number;

  /** Quality score override (0-100). Computed from benchmarks if not set. */
  qualityScore?: number;

  /** Cost tier override. Computed from pricing if not set. */
  costTier?: CostTier;

  /** Speed tier override. Computed from model characteristics if not set. */
  speedTier?: SpeedTier;

  /** Additional notes for router consideration */
  notes?: string;
}

/**
 * Task classification result from the router LLM
 */
export interface TaskClassification {
  /** Primary task category */
  primaryCategory: TaskCategoryId;

  /** Secondary task category (if applicable) */
  secondaryCategory?: TaskCategoryId;

  /** Task complexity assessment */
  complexity: "simple" | "moderate" | "complex";

  /** Whether the task requires vision/image capabilities */
  requiresVision: boolean;

  /** Whether the task needs long context (>50K tokens) */
  requiresLongContext: boolean;

  /** Whether the task benefits from chain-of-thought reasoning */
  requiresReasoning: boolean;

  /** Router's confidence in classification (0-1) */
  confidence: number;
}

/**
 * User preferences for auto-routing bias
 */
export interface RouterPreferences {
  /** Cost optimization bias: 0 = quality focus, 100 = cheapest possible */
  costBias: number;

  /** Speed optimization bias: 0 = quality focus, 100 = fastest possible */
  speedBias: number;
}

/**
 * Result returned by the router
 */
export interface RouterResult {
  /** Selected model ID */
  selectedModelId: string;

  /** Task classification details */
  classification: TaskClassification;

  /** Human-readable reasoning for selection */
  reasoning: string;

  /** Number of models considered */
  candidatesConsidered: number;
}
