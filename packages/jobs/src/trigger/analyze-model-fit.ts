import { getGatewayOptions } from "@blah-chat/ai/gateway";
import type { ModelConfig } from "@blah-chat/ai/models";
import { MODEL_CONFIG } from "@blah-chat/ai/models";
import { MODEL_TRIAGE_PROMPT } from "@blah-chat/ai/prompts/modelTriage";
import { getModel } from "@blah-chat/ai/registry";
import {
  conversations,
  createNeonDatabase,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { task } from "@trigger.dev/sdk";
import { generateObject } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const EXPENSIVE_THRESHOLD = 5;
const TRIAGE_DECIDER_MODEL_ID = "openai:gpt-oss-120b";
const TASK_CATEGORIES = [
  "coding",
  "analysis",
  "research",
  "conversation",
  "writing",
  "other",
] as const;
type TaskCategoryId = (typeof TASK_CATEGORIES)[number];

type AnalysisResult = {
  shouldRecommend: boolean;
  recommendedModel?: string;
  reasoning: string;
};

type AnalyzePromptComplexity = (input: {
  prompt: string;
  currentModel: ModelConfig;
  alternatives: string[];
  userId: string;
}) => Promise<AnalysisResult>;

export interface AnalyzeModelFitDependencies {
  db?: PersistenceDb;
  now?: () => number;
  classifyTask?: (input: {
    message: string;
    userId: string;
  }) => Promise<TaskCategoryId>;
  analyzePromptComplexity?: AnalyzePromptComplexity;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return databaseUrl;
}

function calculateSavings(
  currentModel: ModelConfig,
  suggestedModel: ModelConfig,
) {
  const currentAvg =
    (currentModel.pricing.input + currentModel.pricing.output) / 2;
  const suggestedAvg =
    (suggestedModel.pricing.input + suggestedModel.pricing.output) / 2;

  return {
    percentSaved: Math.round(((currentAvg - suggestedAvg) / currentAvg) * 100),
  };
}

function getCheaperAlternatives(
  currentModel: ModelConfig,
  _taskCategory: TaskCategoryId,
) {
  const currentAvg =
    (currentModel.pricing.input + currentModel.pricing.output) / 2;
  const wantsVision = currentModel.capabilities.includes("vision");
  const wantsFunctions = currentModel.capabilities.includes("function-calling");

  return Object.entries(MODEL_CONFIG)
    .filter(([id, model]) => {
      if (id === currentModel.id || model.isInternalOnly) {
        return false;
      }

      const candidateAvg = (model.pricing.input + model.pricing.output) / 2;
      if (candidateAvg >= currentAvg * 0.5) {
        return false;
      }

      if (wantsVision && !model.capabilities.includes("vision")) {
        return false;
      }

      if (wantsFunctions && !model.capabilities.includes("function-calling")) {
        return false;
      }

      if (
        model.capabilities.includes("image-generation") &&
        !model.capabilities.includes("function-calling")
      ) {
        return false;
      }

      return model.contextWindow >= 8_000;
    })
    .sort((left, right) => {
      const leftAvg = (left[1].pricing.input + left[1].pricing.output) / 2;
      const rightAvg = (right[1].pricing.input + right[1].pricing.output) / 2;
      return leftAvg - rightAvg;
    })
    .map(([id]) => id)
    .slice(0, 3);
}

function createDefaultClassifyTask() {
  return async (_input: {
    message: string;
    userId: string;
  }): Promise<TaskCategoryId> => "conversation";
}

function createDefaultAnalyzePromptComplexity(): AnalyzePromptComplexity {
  return async (input) => {
    const schema = z.object({
      shouldRecommend: z.boolean(),
      recommendedModel:
        input.alternatives.length > 0
          ? z
              .enum([input.alternatives[0], ...input.alternatives.slice(1)] as [
                string,
                ...string[],
              ])
              .optional()
          : z.string().optional(),
      reasoning: z.string().min(1),
    });

    try {
      const response = await generateObject({
        model: getModel(TRIAGE_DECIDER_MODEL_ID),
        schema,
        temperature: 0.3,
        providerOptions: getGatewayOptions(
          TRIAGE_DECIDER_MODEL_ID,
          input.userId,
          ["model-triage"],
        ),
        prompt: `${MODEL_TRIAGE_PROMPT}

USER QUERY:
${input.prompt}

CURRENT MODEL:
${input.currentModel.name}

CHEAPER ALTERNATIVES:
${input.alternatives
  .map((modelId) => {
    const model = MODEL_CONFIG[modelId];
    const averageCost = (
      (model.pricing.input + model.pricing.output) /
      2
    ).toFixed(2);

    return `[${modelId}] ${model.name} - $${averageCost}/M`;
  })
  .join("\n")}`,
      });

      return response.object as AnalysisResult;
    } catch {
      return {
        shouldRecommend: false,
        reasoning: "Analysis failed, keeping the current model.",
      };
    }
  };
}

export async function analyzeModelFitForConversation(
  payload: {
    conversationId: string;
    userMessage: string;
    currentModelId: string;
    wasAutoSelected?: boolean;
  },
  dependencies: AnalyzeModelFitDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const classifyTask = dependencies.classifyTask ?? createDefaultClassifyTask();
  const analyzePromptComplexity =
    dependencies.analyzePromptComplexity ??
    createDefaultAnalyzePromptComplexity();

  if (payload.wasAutoSelected) {
    return { success: true, skipped: "auto_selected" as const };
  }

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, payload.conversationId),
  });

  if (!conversation) {
    return { success: true, skipped: "not_found" as const };
  }

  if (conversation.modelRecommendation) {
    return { success: true, skipped: "already_recommended" as const };
  }

  const currentModel = MODEL_CONFIG[payload.currentModelId];
  if (!currentModel) {
    return { success: true, skipped: "unknown_model" as const };
  }

  const currentAvgCost =
    (currentModel.pricing.input + currentModel.pricing.output) / 2;
  if (currentAvgCost < EXPENSIVE_THRESHOLD) {
    return { success: true, skipped: "not_expensive" as const };
  }

  const taskCategory = await classifyTask({
    message: payload.userMessage,
    userId: conversation.userId,
  });
  const alternatives = getCheaperAlternatives(currentModel, taskCategory);

  if (alternatives.length === 0) {
    return { success: true, skipped: "no_alternatives" as const };
  }

  const analysis = await analyzePromptComplexity({
    prompt: payload.userMessage,
    currentModel,
    alternatives,
    userId: conversation.userId,
  });

  if (!analysis.shouldRecommend || !analysis.recommendedModel) {
    return { success: true, skipped: "keep_current_model" as const };
  }

  const suggestedModel = MODEL_CONFIG[analysis.recommendedModel];
  if (!suggestedModel) {
    return { success: true, skipped: "invalid_recommendation" as const };
  }

  const recommendation = {
    suggestedModelId: suggestedModel.id,
    currentModelId: currentModel.id,
    reasoning: analysis.reasoning,
    estimatedSavings: calculateSavings(currentModel, suggestedModel),
    createdAt: now(),
    dismissed: false,
  };

  await db
    .update(conversations)
    .set({
      modelRecommendation: recommendation,
      updatedAt: now(),
    })
    .where(
      and(
        eq(conversations.id, payload.conversationId),
        eq(conversations.userId, conversation.userId),
      ),
    );

  return {
    success: true,
    recommendedModel: recommendation.suggestedModelId,
  };
}

export const analyzeModelFitTask = task({
  id: "analyze-model-fit",
  maxDuration: 60,
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: {
    conversationId: string;
    userMessage: string;
    currentModelId: string;
    wasAutoSelected?: boolean;
  }) => {
    return analyzeModelFitForConversation(payload);
  },
});
