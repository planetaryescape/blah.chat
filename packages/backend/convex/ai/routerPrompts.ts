/**
 * Auto Router Classification Prompts
 *
 * Prompts used by the router to classify user messages
 * and select optimal models.
 */

/**
 * Previous model context for sticky routing evaluation
 */
export interface PreviousModelContext {
  id: string;
  name: string;
  tier: "cheap" | "mid" | "premium";
  hasVision: boolean;
  hasReasoning: boolean;
  maxContextTokens: number;
}

/**
 * Main classification prompt builder for the router LLM
 * @param previousModel - Optional context about the previously selected model
 */
export function buildClassificationPrompt(
  previousModel?: PreviousModelContext,
): string {
  const basePrompt = `You are a task classifier for an AI routing system. Analyze the user message and determine the best task category and requirements.

## TASK CATEGORIES

Choose the PRIMARY category that best describes the user's request:

- **coding**: Code generation, debugging, refactoring, code review, technical programming questions, software architecture
- **reasoning**: Complex multi-step problems, mathematics, logic puzzles, strategic planning, proofs, algorithmic thinking
- **creative**: Creative writing, storytelling, brainstorming, poetry, scripts, marketing copy, artistic content
- **factual**: Simple Q&A, definitions, factual knowledge retrieval, basic explanations, lookup questions
- **analysis**: Data analysis, document review, comparison, summarization, deep reading comprehension
- **conversation**: Casual chat, simple questions, greetings, small talk, personal advice, friendly discussion
- **multimodal**: Image analysis, document/PDF understanding, file processing, visual content questions
- **research**: Tasks needing web search, current events, fact-checking, deep research synthesis with citations

## COMPLEXITY LEVELS

Assess how complex the task is:

- **simple**: One-step answer, factual lookup, basic response (1-2 sentences typical)
- **moderate**: Multi-part question, some reasoning needed, structured response (paragraph-length typical)
- **complex**: Multi-step reasoning, long-form output, synthesis of multiple concepts (detailed response needed)

## REQUIREMENTS

Set these flags based on the task:

- **requiresVision**: True ONLY if the task explicitly involves images, screenshots, PDFs, or visual content
- **requiresLongContext**: True ONLY if the task involves very long documents (>50K tokens) or needs extensive history
- **requiresReasoning**: True if the task would benefit from chain-of-thought thinking (math, logic, complex analysis)

## HIGH-STAKES DETECTION

Set isHighStakes: true when user seeks ACTIONABLE ADVICE about:
- **medical**: Symptoms, diagnoses, treatments, medication decisions, drug interactions, dosing, health emergencies
- **legal**: Legal rights, lawsuits, contracts to sign, criminal matters, liability decisions
- **financial**: Investment decisions, tax strategies, retirement planning, debt management, large purchases
- **safety**: Physical safety, emergencies, dangerous activities, threats
- **mental_health**: Suicide ideation, self-harm, severe depression, panic attacks, crisis support
- **privacy**: Identity theft, stalking, data breaches, account compromise, online harassment
- **immigration**: Visa decisions, deportation risk, asylum claims, work permits, citizenship
- **domestic_abuse**: Abusive relationships, safety planning, leaving abusive situations

ADVICE-SEEKING SIGNALS (likely HIGH STAKES):
- "Should I..." / "Can I..." / "Is it safe to..." / "Is it okay to..."
- Personal pronouns + action: "I take", "my medication", "my symptoms"
- Decision language: "deciding whether", "considering", "thinking about"
- Consequence concern: "will it hurt", "could it cause", "what happens if"

EDUCATIONAL SIGNALS (likely NOT high stakes):
- "What is..." / "What are..." / "How does X work?"
- "Define..." / "Explain..." / "Tell me about..."
- No personal context, clearly hypothetical or academic

EXAMPLES:
1. "What is a heart attack?" = NOT high stakes (educational)
2. "Am I having a heart attack?" = HIGH STAKES (medical)
3. "Should I take ibuprofen for a migraine?" = HIGH STAKES (medical) - treatment advice
4. "What is ibuprofen?" = NOT high stakes (educational)
5. "Can I take aspirin with blood pressure meds?" = HIGH STAKES (medical) - drug interaction
6. "How does aspirin work?" = NOT high stakes (mechanism explanation)
7. "Should I sign this contract?" = HIGH STAKES (legal) - seeking legal guidance
8. "What is a contract?" = NOT high stakes (definition)
9. "Should I invest in crypto?" = HIGH STAKES (financial) - investment advice
10. "What is cryptocurrency?" = NOT high stakes (educational)
11. "I've been thinking about ending it" = HIGH STAKES (mental_health)
12. "Someone is stalking me online" = HIGH STAKES (privacy)
13. Casual mentions are NOT high stakes

RULE: When genuinely uncertain about advice-seeking intent, err toward HIGH STAKES for safety. Better to use a premium model unnecessarily than give poor advice on important topics.

## IMPORTANT GUIDELINES

1. Be conservative with requirements - only set true when clearly needed
2. Most casual questions are "conversation" or "factual", not "reasoning"
3. Simple coding questions are "coding" with "simple" complexity
4. Research category is ONLY for tasks needing current/real-time information
5. Multimodal is ONLY when user explicitly mentions images/files
6. If unsure between categories, prefer the more general one`;

  // Add stickiness evaluation section when previous model context is provided
  const stickinessSection = previousModel
    ? `

## MODEL STICKINESS EVALUATION

The previous message used this model:
- Model: ${previousModel.name} (${previousModel.id})
- Cost tier: ${previousModel.tier}
- Has vision: ${previousModel.hasVision}
- Has reasoning/thinking: ${previousModel.hasReasoning}
- Context window: ${previousModel.maxContextTokens.toLocaleString()} tokens

DECIDE whether to KEEP the previous model or CHANGE to a different one.

Set recommendedAction to "keep" if ALL of these are true:
1. Task category is SIMILAR (same category OR closely related)
2. Complexity is SAME OR LOWER
3. Previous model has all required capabilities (vision, reasoning, context)
4. NOT high-stakes (high-stakes ALWAYS triggers "change" to ensure premium model)

Set recommendedAction to "change" if ANY of these are true:
1. Task CATEGORY shifted significantly (e.g., coding → creative, conversation → reasoning)
2. Complexity INCREASED (simple → complex needs a capable model)
3. HIGH-STAKES detected (always use premium model for safety)
4. CAPABILITY mismatch (needs vision but previous lacks it, needs reasoning but previous lacks it)
5. Context requirement exceeds previous model's window

When in doubt, prefer "keep" - continuity improves conversation flow and reduces latency.
If recommendedAction is "change", provide a brief changeReason explaining why.`
    : `

## MODEL STICKINESS EVALUATION

No previous model was used - this is the first message in the conversation.
Set recommendedAction to "change" (full routing required for first message).`;

  const outputFormat = `

## OUTPUT FORMAT

Return a JSON object with:
- primaryCategory: The main category from the list above
- secondaryCategory: Optional second category if applicable (or null)
- complexity: "simple" | "moderate" | "complex"
- requiresVision: boolean
- requiresLongContext: boolean
- requiresReasoning: boolean
- confidence: 0.0-1.0 (how confident you are in this classification)
- isHighStakes: boolean (true ONLY if user seeks advice on high-stakes domains)
- highStakesDomain: "medical" | "legal" | "financial" | "safety" | "mental_health" | "privacy" | "immigration" | "domestic_abuse" | null
- recommendedAction: "keep" | "change" (whether to keep the previous model or select a new one)
- changeReason: string | null (brief reason if recommending change, null if keeping)`;

  return basePrompt + stickinessSection + outputFormat;
}

// Legacy export for backwards compatibility (first message scenario)
export const ROUTER_CLASSIFICATION_PROMPT = buildClassificationPrompt();

import type { HighStakesDomain } from "./modelProfiles";

/**
 * Prompt for generating routing reasoning explanation
 *
 * Generates educational explanations to help users learn model selection.
 */
export const ROUTER_REASONING_TEMPLATE = (
  taskCategory: string,
  complexity: string,
  modelName: string,
  categoryScore: number,
  pricing: { input: number; output: number },
  preferences: { costBias: number; speedBias: number },
  isHighStakes?: boolean,
  highStakesDomain?: HighStakesDomain | null,
): string => {
  // High-stakes override explanation (takes priority)
  if (isHighStakes && highStakesDomain) {
    const domainLabels: Record<HighStakesDomain, string> = {
      medical: "health-related",
      legal: "legal",
      financial: "financial",
      safety: "safety-critical",
      mental_health: "mental health",
      privacy: "privacy and security",
      immigration: "immigration",
      domestic_abuse: "sensitive personal safety",
    };
    return `${modelName} selected for this ${domainLabels[highStakesDomain]} question. For important topics like this, we use our most capable models to ensure accuracy.`;
  }

  // Category descriptions for education
  const categoryDescriptions: Record<string, string> = {
    coding: "code generation, debugging, and technical programming",
    reasoning: "complex multi-step problems and logical analysis",
    creative: "creative writing, brainstorming, and artistic content",
    factual: "factual questions and knowledge retrieval",
    analysis: "document analysis, summarization, and comparison",
    conversation: "casual chat and general discussion",
    multimodal: "image understanding and visual content",
    research: "web search and current information",
  };

  // Complexity explanations
  const complexityExplanations: Record<string, string> = {
    simple: "straightforward question that needs a quick, focused answer",
    moderate: "multi-part question requiring structured thinking",
    complex: "detailed task needing thorough analysis and long-form output",
  };

  // Pricing tier descriptions
  const getPricingTier = (input: number): string => {
    if (input < 0.2) return "very cost-effective";
    if (input < 1.0) return "cost-efficient";
    if (input < 5.0) return "mid-range";
    return "premium";
  };

  // Build the educational explanation
  const categoryDesc = categoryDescriptions[taskCategory] || taskCategory;
  const complexityDesc = complexityExplanations[complexity] || complexity;
  const pricingTier = getPricingTier(pricing.input);

  // Score interpretation
  const scoreDesc =
    categoryScore >= 90
      ? "excels at"
      : categoryScore >= 80
        ? "is strong at"
        : categoryScore >= 70
          ? "handles well"
          : "can handle";

  // Cost preference influence
  const costInfluence =
    preferences.costBias > 70
      ? " Your cost-optimized settings prioritized efficiency."
      : preferences.costBias < 30
        ? " Your quality-focused settings prioritized capability."
        : "";

  return `${modelName} ${scoreDesc} ${categoryDesc} (${categoryScore}/100). This is a ${complexityDesc}, so a ${pricingTier} model provides good value without overkill.${costInfluence}`;
};
