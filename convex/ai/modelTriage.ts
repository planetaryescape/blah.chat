"use node";

import { generateObject, generateText } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { getGatewayOptions } from "@/lib/ai/gateway";
import type { ModelConfig } from "@/lib/ai/models";
import { MODEL_CONFIG } from "@/lib/ai/models";
import { getModel } from "@/lib/ai/registry";
import { MODEL_TRIAGE_PROMPT } from "../../src/lib/prompts/modelTriage";
import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";

/**
 * Cost threshold for triggering triage analysis
 * $5/M average cost catches truly expensive models:
 * - GPT-5 ($30/M)
 * - Claude Opus ($15/M)
 * - Sonar ($60/M)
 *
 * Ignores mid-tier models already reasonable:
 * - GPT-5-mini ($2.50/M)
 * - Claude Sonnet ($3/M)
 */
const EXPENSIVE_THRESHOLD = 5.0;

/**
 * Analysis result from LLM triage
 */
interface AnalysisResult {
  shouldRecommend: boolean;
  recommendedModel?: string;
  reasoning: string;
}

/**
 * Main triage action - analyzes if cheaper model would work
 *
 * Runs in parallel with message generation (non-blocking)
 * Only triggers once per conversation (checks existing recommendation)
 */
export const analyzeModelFit = internalAction({
  args: {
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    currentModelId: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      // 1. Check if already triaged (conversation.modelRecommendation exists)
      const conversation = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.lib.helpers.getConversation,
        { id: args.conversationId },
      )) as any;

      if (conversation?.modelRecommendation) {
        return; // Already suggested - respect one-time rule
      }

      // 2. Get current model + validate it's expensive
      const currentModel = MODEL_CONFIG[args.currentModelId];
      if (!currentModel) {
        console.warn(`Model not found: ${args.currentModelId}`);
        return;
      }

      const avgCost =
        (currentModel.pricing.input + currentModel.pricing.output) / 2;

      if (avgCost < EXPENSIVE_THRESHOLD) {
        return; // Not expensive enough to warrant analysis
      }

      // Track analysis started
      console.log("Model triage analysis started", {
        conversationId: args.conversationId,
        currentModel: args.currentModelId,
        avgCost,
        userMessageLength: args.userMessage.length,
      });

      // 3. Find cheaper alternatives (50%+ cheaper, matching capabilities)
      const alternatives = getCheaperAlternatives(currentModel);
      if (alternatives.length === 0) {
        console.log("No cheaper alternatives found", {
          currentModel: args.currentModelId,
        });
        return;
      }

      // 4. Use gpt-oss-120b to analyze prompt complexity (ultra-fast via Cerebras)
      const analysis = await analyzePromptComplexity(
        args.userMessage,
        currentModel,
        alternatives,
      );

      if (!analysis.shouldRecommend) {
        // Track when expensive model is justified
        console.log("Expensive model justified", {
          conversationId: args.conversationId,
          currentModel: args.currentModelId,
          reasoning: analysis.reasoning,
        });
        return;
      }

      if (!analysis.recommendedModel) {
        console.warn("Analysis recommended switch but no model specified");
        return;
      }

      // Validate model is in alternatives list (prevent hallucination)
      if (!alternatives.includes(analysis.recommendedModel)) {
        console.error("LLM recommended model outside alternatives list", {
          recommended: analysis.recommendedModel,
          validAlternatives: alternatives,
          conversationId: args.conversationId,
        });
        return;
      }

      // 5. Calculate savings
      const recommendedModel = MODEL_CONFIG[analysis.recommendedModel];
      if (!recommendedModel) {
        console.warn(
          `Recommended model not found: ${analysis.recommendedModel}`,
        );
        return;
      }

      const savings = calculateSavings(currentModel, recommendedModel);

      // 6. Store recommendation in conversation
      (await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.conversations.setModelRecommendation,
        {
          conversationId: args.conversationId,
          recommendation: {
            suggestedModelId: analysis.recommendedModel,
            currentModelId: args.currentModelId,
            reasoning: analysis.reasoning,
            estimatedSavings: savings,
            createdAt: Date.now(),
            dismissed: false,
          },
        },
      )) as Promise<void>;

      // Track successful recommendation generation
      console.log("Model recommendation generated", {
        conversationId: args.conversationId,
        currentModel: args.currentModelId,
        suggestedModel: analysis.recommendedModel,
        percentSaved: savings.percentSaved,
        reasoning: analysis.reasoning,
        analysisTimeMs: Date.now() - startTime,
      });
    } catch (error) {
      console.error("Error in model triage analysis:", error);
      // Don't throw - this is a nice-to-have feature, shouldn't break chat
    }
  },
});

/**
 * Generate preview with suggested cheaper model
 * Used for side-by-side comparison in modal
 */
export const generatePreview = action({
  args: {
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    suggestedModelId: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    // Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    try {
      console.log("Preview generation started", {
        conversationId: args.conversationId,
        suggestedModel: args.suggestedModelId,
      });

      // 1. Fetch conversation to get system prompt (Server-side only)
      const conversation = await (ctx.runQuery as any)(
        internal.lib.helpers.getConversation,
        { id: args.conversationId },
      );

      // 2. Get conversation context (last few messages for context)
      const messages = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.lib.helpers.getConversationMessages,
        {
          conversationId: args.conversationId,
        },
      )) as any[];

      if (!messages || messages.length === 0) {
        throw new Error("No messages found for conversation");
      }

      console.log("Fetched messages for preview", {
        conversationId: args.conversationId,
        messageCount: messages.length,
        hasSystemPrompt: !!conversation?.systemPrompt,
      });

      // Exclude the last assistant message (the current response we're comparing against)
      const messagesBeforeCurrent = messages.filter(
        (m: any) => !(m.role === "assistant" && m.content === args.userMessage),
      );

      if (
        messagesBeforeCurrent.length > 0 &&
        messagesBeforeCurrent[messagesBeforeCurrent.length - 1].role ===
          "assistant"
      ) {
        messagesBeforeCurrent.pop();
      }

      const recentMessages = messagesBeforeCurrent.slice(-10);

      const conversationText = recentMessages
        .map((m: any) => {
          const content =
            typeof m.content === "string"
              ? m.content
              : m.content?.find((c: any) => c.type === "text")?.text ||
                "[attachment]";
          return `${m.role === "user" ? "User" : "Assistant"}: ${content}`;
        })
        .join("\n\n");

      // Construct prompt with system prompt if available
      let fullPrompt = "";
      if (conversation?.systemPrompt) {
        fullPrompt += `System: ${conversation.systemPrompt}\n\n`;
      }
      fullPrompt += `Continue this conversation naturally:\n\n${conversationText}\n\nAssistant:`;

      // Generate with suggested model
      const response = await generateText({
        model: getModel(args.suggestedModelId),
        prompt: fullPrompt,
        temperature: 0.7,
        providerOptions: getGatewayOptions(args.suggestedModelId, undefined, [
          "model-preview",
        ]),
      });

      console.log("Preview generation completed", {
        conversationId: args.conversationId,
        suggestedModel: args.suggestedModelId,
        generationTimeMs: Date.now() - startTime,
        responseLength: response.text.length,
      });

      return { content: response.text };
    } catch (error) {
      console.error("Error generating preview:", error);
      throw error instanceof Error
        ? new Error(`Preview generation failed: ${error.message}`, {
            cause: error,
          })
        : new Error(`Preview generation failed: ${String(error)}`);
    }
  },
});

/**
 * Find cheaper alternatives that match current model's capabilities
 *
 * Criteria:
 * - 50%+ cheaper (significant savings)
 * - Matching vision capability
 * - Reasonable context window (8K+)
 */
function getCheaperAlternatives(currentModel: ModelConfig): string[] {
  const currentAvg =
    (currentModel.pricing.input + currentModel.pricing.output) / 2;

  return Object.entries(MODEL_CONFIG)
    .filter(([_id, model]) => {
      const candidateAvg = (model.pricing.input + model.pricing.output) / 2;

      return (
        candidateAvg < currentAvg * 0.5 && // 50%+ cheaper
        // Exclude image-only models (keep multimodal that can do text + images)
        !(
          model.capabilities.includes("image-generation") &&
          !model.capabilities.includes("function-calling")
        ) &&
        model.capabilities.includes("vision") ===
          currentModel.capabilities.includes("vision") &&
        model.contextWindow >= 8000 // Reasonable minimum
      );
    })
    .sort(([, a], [, b]) => {
      // Sort by cost (cheapest first)
      const aAvg = (a.pricing.input + a.pricing.output) / 2;
      const bAvg = (b.pricing.input + b.pricing.output) / 2;
      return aAvg - bAvg;
    })
    .map(([id]) => id)
    .slice(0, 3); // Top 3 by cost savings
}

/**
 * Use LLM to analyze if cheaper model would work
 *
 * Uses gpt-oss-120b via Cerebras (ultra-fast 1000 TPS, cheap)
 */
async function analyzePromptComplexity(
  prompt: string,
  currentModel: ModelConfig,
  alternatives: string[],
): Promise<AnalysisResult> {
  try {
    // Build dynamic schema with enum constraint to alternatives list
    const schema = z.object({
      shouldRecommend: z.boolean(),
      recommendedModel:
        alternatives.length > 0
          ? z
              .enum([alternatives[0], ...alternatives.slice(1)] as [
                string,
                ...string[],
              ])
              .optional()
          : z.string().optional(),
      reasoning: z.string(),
    });

    const response = await generateObject({
      model: getModel("openai:gpt-oss-120b"),
      schema,
      temperature: 0.3,
      providerOptions: getGatewayOptions("openai:gpt-oss-120b", undefined, [
        "model-triage",
      ]),
      prompt: `${MODEL_TRIAGE_PROMPT}

USER QUERY:
${prompt}

CURRENT MODEL:
${currentModel.name} - $${((currentModel.pricing.input + currentModel.pricing.output) / 2).toFixed(2)}/M

CHEAPER ALTERNATIVES:
${alternatives
  .map((id) => {
    const model = MODEL_CONFIG[id];
    const avgCost = ((model.pricing.input + model.pricing.output) / 2).toFixed(
      2,
    );

    return `[${id}] ${model.name} - $${avgCost}/M
  - Capabilities: ${model.capabilities.join(", ")}
  - Context: ${model.contextWindow.toLocaleString()} tokens
  - Best for: ${model.bestFor || "General purpose"}`;
  })
  .join("\n\n")}`,
    });

    return response.object as AnalysisResult;
  } catch (error) {
    console.error("Error in prompt complexity analysis:", error);
    // Conservative fallback - don't recommend if analysis fails
    return {
      shouldRecommend: false,
      reasoning: "Analysis failed, keeping current model to be safe",
    };
  }
}

/**
 * Calculate cost savings between two models
 */
function calculateSavings(
  currentModel: ModelConfig,
  suggestedModel: ModelConfig,
): { costReduction: string; percentSaved: number } {
  const currentAvg =
    (currentModel.pricing.input + currentModel.pricing.output) / 2;
  const suggestedAvg =
    (suggestedModel.pricing.input + suggestedModel.pricing.output) / 2;

  const percentSaved = Math.round(
    ((currentAvg - suggestedAvg) / currentAvg) * 100,
  );
  const costReduction = `$${currentAvg.toFixed(2)}/M → $${suggestedAvg.toFixed(2)}/M`;

  return {
    costReduction,
    percentSaved,
  };
}
