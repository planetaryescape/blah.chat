import { getModelConfig } from "@/lib/ai/utils";

// Exact model matches (top models)
const SUGGESTED_PROMPTS: Record<string, readonly string[]> = {
  "gpt-4o": [
    "Analyze this architecture diagram and suggest improvements",
    "Debug React useEffect infinite loop with async dependencies",
    "Extract structured data from handwritten notes",
    "Compare these two UI mockups and list differences",
  ],
  "claude-3-5-sonnet-20241022": [
    "Review this PR for security vulnerabilities and best practices",
    "Refactor this component to follow React composition patterns",
    "Explain TCP/IP handshake like I'm interviewing for senior engineer",
    "Write comprehensive test cases for this authentication flow",
  ],
  "o1-preview": [
    "Prove: sum of first n cubes equals (n(n+1)/2)²",
    "Find the logic error in this distributed consensus algorithm",
    "Debug race condition in concurrent Rust code",
    "Analyze failure scenario in blockchain consensus",
  ],
  "gemini-2.0-flash-thinking-exp": [
    "Derive Black-Scholes equation from first principles",
    "Find edge case causing intermittent deadlock",
    "Prove correctness of this sorting algorithm variant",
    "Optimize this dynamic programming solution",
  ],
  "gpt-5": [
    "Design distributed caching system for 1M requests/sec",
    "Analyze architectural tradeoffs for microservices migration",
    "Review API design for RESTful best practices",
    "Refactor monolith to event-driven architecture",
  ],
} as const;

// Capability-based fallbacks
const CAPABILITY_PROMPTS = {
  thinking: [
    "Prove: \\(\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\\) using mathematical induction",
    "Derive quadratic formula from \\(ax^2 + bx + c = 0\\)",
    "Find subtle bug in encryption implementation",
    "Debug infinite recursion in tree traversal",
  ],
  vision: [
    "Extract text from handwritten medical form",
    "Compare before/after screenshots and list UI changes",
    "Analyze chart trends and summarize insights",
    "Identify accessibility issues in this design mockup",
  ],
  fast: [
    "Summarize 3-page article in 2 bullet points",
    "Quick regex for email validation",
    "Fix TypeScript error in 10 lines",
    "Generate 5 taglines for SaaS product",
  ],
  general: [
    "Explain photosynthesis: $$\\ce{6CO2 + 6H2O ->[ ] C6H12O6 + 6O2}$$",
    "Compare PostgreSQL vs MongoDB for this use case",
    "Refactor callback hell to async/await",
    "Solve Einstein's equation: \\(E = mc^2\\) for mass",
  ],
} as const;

export type PromptCategory =
  | "suggested"
  | "thinking"
  | "vision"
  | "fast"
  | "general";

export interface PromptResult {
  category: PromptCategory;
  prompts: readonly string[];
  source: "exact-model" | "capability" | "default";
}

/**
 * Get appropriate prompts for model based on exact match or capabilities
 * Cascade: exact model → capability → general
 */
export function getPromptsForModel(modelId: string | undefined): PromptResult {
  // No model selected
  if (!modelId) {
    return {
      category: "general",
      prompts: CAPABILITY_PROMPTS.general,
      source: "default",
    };
  }

  // 1. Try exact model match
  if (modelId in SUGGESTED_PROMPTS) {
    return {
      category: "suggested",
      prompts: SUGGESTED_PROMPTS[modelId as keyof typeof SUGGESTED_PROMPTS],
      source: "exact-model",
    };
  }

  // 2. Try capability-based match
  const config = getModelConfig(modelId);
  if (!config) {
    return {
      category: "general",
      prompts: CAPABILITY_PROMPTS.general,
      source: "default",
    };
  }

  // Priority: thinking > vision > fast > general
  if (
    config.capabilities.includes("thinking") ||
    config.capabilities.includes("extended-thinking") ||
    config.reasoning
  ) {
    return {
      category: "thinking",
      prompts: CAPABILITY_PROMPTS.thinking,
      source: "capability",
    };
  }

  if (config.capabilities.includes("vision")) {
    return {
      category: "vision",
      prompts: CAPABILITY_PROMPTS.vision,
      source: "capability",
    };
  }

  // Fast models (mini, flash, nano in name)
  const nameLC = config.name.toLowerCase();
  if (
    nameLC.includes("mini") ||
    nameLC.includes("flash") ||
    nameLC.includes("nano")
  ) {
    return {
      category: "fast",
      prompts: CAPABILITY_PROMPTS.fast,
      source: "capability",
    };
  }

  // Default
  return {
    category: "general",
    prompts: CAPABILITY_PROMPTS.general,
    source: "capability",
  };
}

// Export for testing/reference
export { CAPABILITY_PROMPTS, SUGGESTED_PROMPTS };
