/**
 * Auto Router Classification Prompts
 *
 * Prompts used by the router to classify user messages
 * and select optimal models.
 */

/**
 * Main classification prompt for the router LLM
 */
export const ROUTER_CLASSIFICATION_PROMPT = `You are a task classifier for an AI routing system. Analyze the user message and determine the best task category and requirements.

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

Set isHighStakes: true ONLY when user seeks actionable advice about:
- **medical**: Symptoms, diagnoses, treatments, medication, health emergencies
- **legal**: Legal rights, lawsuits, contracts, criminal matters, liability
- **financial**: Investments, taxes, retirement, debt decisions, large purchases
- **safety**: Physical safety, emergencies, dangerous activities
- **mental_health**: Suicide ideation, self-harm, severe depression, panic attacks, crisis support
- **privacy**: Identity theft, stalking, data breaches, account compromise, online harassment
- **immigration**: Visa status, deportation risk, asylum claims, work permits, citizenship
- **domestic_abuse**: Abusive relationships, safety planning, leaving abusive situations

RULES:
1. Must seek ADVICE or ACTION, not just information
2. "What is a heart attack?" = NOT high stakes (educational)
3. "Am I having a heart attack?" = HIGH STAKES (medical)
4. "What does liability mean?" = NOT high stakes (definition)
5. "Can my employer fire me for this?" = HIGH STAKES (legal)
6. "I've been thinking about ending it" = HIGH STAKES (mental_health)
7. "What is depression?" = NOT high stakes (educational)
8. "Someone is stalking me online" = HIGH STAKES (privacy)
9. Casual mentions are NOT high stakes
10. When in doubt, err toward NOT high stakes

## IMPORTANT GUIDELINES

1. Be conservative with requirements - only set true when clearly needed
2. Most casual questions are "conversation" or "factual", not "reasoning"
3. Simple coding questions are "coding" with "simple" complexity
4. Research category is ONLY for tasks needing current/real-time information
5. Multimodal is ONLY when user explicitly mentions images/files
6. If unsure between categories, prefer the more general one

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
- highStakesDomain: "medical" | "legal" | "financial" | "safety" | "mental_health" | "privacy" | "immigration" | "domestic_abuse" | null`;

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
