import { EMBEDDING_MODEL } from "@blah-chat/ai/operational-models";
import {
  createRouter,
  ROUTE_BINS,
  MODEL_CONFIG as ROUTER_MODEL_CONFIG,
  type RouteLabel,
  runHardRules,
  SEED_EXAMPLES,
} from "@blah-chat/auto-router";
import {
  buildComparisonStats,
  buildLatestHealthMap as buildLatestHealthMapEngine,
  buildOutcomeStats as buildOutcomeStatsEngine,
  selectCandidate,
} from "@blah-chat/auto-router/policy-engine";
import {
  type CandidateInput,
  DEFAULT_POLICY_WEIGHTS as ENGINE_DEFAULT_WEIGHTS,
  type PolicyWeights,
} from "@blah-chat/auto-router/types";
import { embedMany } from "ai";
import type { createGenerationV2Repository } from "./repository";
import type { PersistedRequestBundle } from "./types";

const DEFAULT_FALLBACK_MODEL_ID =
  Object.keys(ROUTER_MODEL_CONFIG).find((modelId) => modelId !== "auto") ??
  "openai:gpt-5-mini";
const DEFAULT_POLICY_HISTORY_WINDOW = 50;

const classifierRouter = createRouter({
  examples: SEED_EXAMPLES,
  embeddingProvider: {
    async embedBatch(texts: string[]) {
      const { embeddings } = await embedMany({
        model: EMBEDDING_MODEL,
        values: texts.map((text) => text.slice(0, 8_000)),
      });
      return embeddings as number[][];
    },
  },
});

function getCandidateModelIds(input: {
  routeLabel: RouteLabel;
  requiresVision: boolean;
  currentContextTokens?: number;
}) {
  const routeBin = ROUTE_BINS[input.routeLabel] ?? ROUTE_BINS.fallback_default;
  const seen = new Set<string>();
  const candidates = [...routeBin.primary, ...routeBin.fallbacks].filter(
    (modelId) => {
      if (seen.has(modelId)) {
        return false;
      }
      seen.add(modelId);
      const config = ROUTER_MODEL_CONFIG[modelId];
      if (!config || config.isInternalOnly) {
        return false;
      }
      if (input.requiresVision && !config.capabilities.includes("vision")) {
        return false;
      }
      if (
        input.currentContextTokens &&
        config.contextWindow < input.currentContextTokens * 1.2
      ) {
        return false;
      }
      return true;
    },
  );

  return candidates.length > 0 ? candidates : [DEFAULT_FALLBACK_MODEL_ID];
}

export async function resolveRouteLabel(input: {
  message: string;
  hasAttachments: boolean;
  attachmentTypes: string[];
}) {
  const hardRule = runHardRules({
    message: input.message,
    hasAttachments: input.hasAttachments,
    attachmentTypes: input.attachmentTypes,
    currentContextTokens: undefined,
  });

  if (hardRule) {
    return {
      routeLabel: hardRule.routeLabel,
      routerMode: "hard_rules",
      hardRuleMatched: hardRule.hardRuleMatched ?? null,
      topSimilarityScore: null,
      secondRouteLabel: null,
      secondSimilarityScore: null,
    };
  }

  try {
    const { getAutoRouterConfig } = await import(
      "@/lib/persistence/autoRouter"
    );
    const adminCfg = await getAutoRouterConfig();
    const classified = await classifierRouter.classify({
      message: input.message,
      hasAttachments: input.hasAttachments,
      attachmentTypes: input.attachmentTypes,
      currentContextTokens: undefined,
      classifierConfig: {
        confidenceThreshold: adminCfg.classifierConfidenceThreshold,
        topK: adminCfg.classifierTopK,
        fallbackEnabled: adminCfg.classifierFallbackEnabled,
      },
    });

    return {
      routeLabel: classified.routeLabel,
      routerMode: "classifier_v1",
      hardRuleMatched: classified.hardRuleMatched ?? null,
      topSimilarityScore: classified.topSimilarityScore ?? null,
      secondRouteLabel: classified.secondRouteLabel ?? null,
      secondSimilarityScore: classified.secondSimilarityScore ?? null,
    };
  } catch {
    return {
      routeLabel: "fallback_default" as RouteLabel,
      routerMode: "fallback_default",
      hardRuleMatched: null,
      topSimilarityScore: null,
      secondRouteLabel: null,
      secondSimilarityScore: null,
    };
  }
}

type Repository = ReturnType<typeof createGenerationV2Repository>;

export async function resolveSessionRoute(
  repository: Repository,
  input: {
    bundle: PersistedRequestBundle;
    session: PersistedRequestBundle["sessions"][number];
  },
) {
  if (input.session.modelId !== "auto") {
    return {
      selectedModelId: input.session.modelId,
      policyId: null,
      candidateScores: [],
      routeLabel: "explicit",
      reasoning: null,
      details: {
        source: "generation_v2",
      } satisfies Record<string, unknown>,
    };
  }

  const context = await repository.getAutoRoutingContext({
    conversationId: input.bundle.conversationId,
    userId: input.bundle.userId,
    userMessageId: input.bundle.userMessageId,
  });
  const autoRouterEnabled = context.autoRouterEnabled !== false;

  if (!autoRouterEnabled) {
    const preferredDefault =
      typeof context.defaultModel === "string" ? context.defaultModel : null;
    const selectedModelId =
      preferredDefault &&
      preferredDefault !== "auto" &&
      preferredDefault in ROUTER_MODEL_CONFIG
        ? preferredDefault
        : DEFAULT_FALLBACK_MODEL_ID;

    return {
      selectedModelId,
      policyId: null,
      candidateScores: [],
      routeLabel: "manual_default",
      reasoning: "Auto router disabled; using manual default model.",
      details: {
        source: "generation_v2",
        routerMode: "disabled",
        defaultModel: preferredDefault,
        fallbackUsed: selectedModelId !== preferredDefault,
      } satisfies Record<string, unknown>,
    };
  }

  const hasAttachments = context.attachmentTypes.length > 0;
  const message = input.bundle.promptMessages.at(-1)?.content ?? "";
  const resolvedRouteLabel = await resolveRouteLabel({
    message,
    hasAttachments,
    attachmentTypes: context.attachmentTypes,
  });
  const routeLabel = resolvedRouteLabel.routeLabel;
  const policy = await repository.getOrCreateActiveRoutingPolicy();
  const policyConfig =
    (policy.config as Record<string, unknown> | null) ?? null;
  const weights =
    (policyConfig?.weights as Record<string, unknown> | undefined) ?? {};
  const historyWindow =
    typeof policyConfig?.historyWindow === "number"
      ? policyConfig.historyWindow
      : DEFAULT_POLICY_HISTORY_WINDOW;
  const candidateModelIds = getCandidateModelIds({
    routeLabel,
    requiresVision: context.attachmentTypes.some((type) =>
      type.startsWith("image/"),
    ),
    currentContextTokens: undefined,
  });
  const [recentOutcomes, recentHealth, recentComparisonFeedback] =
    await Promise.all([
      repository.listRecentRoutingOutcomes(candidateModelIds, historyWindow),
      repository.listRecentProviderHealth(),
      repository.listRecentComparisonFeedback(candidateModelIds, historyWindow),
    ]);
  const outcomeStats = buildOutcomeStatsEngine(recentOutcomes);
  const healthByModelId = buildLatestHealthMapEngine(
    recentHealth,
    candidateModelIds,
  );
  const comparisonStats = buildComparisonStats(recentComparisonFeedback);
  const maxAverageCost = Math.max(
    ...candidateModelIds.map((candidateModelId) => {
      const config = ROUTER_MODEL_CONFIG[candidateModelId];
      return config ? (config.pricing.input + config.pricing.output) / 2 : 1;
    }),
    1,
  );
  const costBias = typeof context.costBias === "number" ? context.costBias : 50;
  const speedBias =
    typeof context.speedBias === "number" ? context.speedBias : 50;

  const resolvedWeights: PolicyWeights = {
    ...ENGINE_DEFAULT_WEIGHTS,
    ...Object.fromEntries(
      Object.entries(weights).filter(([, v]) => typeof v === "number"),
    ),
  };

  const candidates: CandidateInput[] = candidateModelIds.map(
    (candidateModelId, index) => {
      const config = ROUTER_MODEL_CONFIG[candidateModelId];
      return {
        modelId: candidateModelId,
        binIndex: index,
        pricing: config?.pricing ?? {
          input: maxAverageCost,
          output: maxAverageCost,
        },
        hostOrder: config?.hostOrder,
        outcomeStats: outcomeStats.get(candidateModelId),
        health: healthByModelId.get(candidateModelId),
        comparisonStats: comparisonStats.get(candidateModelId),
      };
    },
  );

  const isComparisonMode =
    input.bundle.sessions && input.bundle.sessions.length > 1;
  const engineResult = selectCandidate(
    candidates,
    {
      routeLabel,
      weights: resolvedWeights,
      costBias,
      speedBias,
      previousModelId: context.previousModelId ?? undefined,
      previousRouteLabel: context.previousRouteLabel ?? undefined,
      totalCandidates: candidateModelIds.length,
      maxAverageCost,
    },
    {
      fallbackModelId: DEFAULT_FALLBACK_MODEL_ID,
      isComparisonMode: !!isComparisonMode,
      shadow: true,
    },
  );

  const topCandidate = engineResult.rankedCandidates[0];

  return {
    selectedModelId: engineResult.selectedModelId,
    routeLabel,
    policyId: policy.id,
    candidateScores: engineResult.rankedCandidates.map((c) => ({
      modelId: c.modelId,
      provider: c.provider,
      score: c.score,
      rank: c.rank,
      features: {
        ...c.features,
        explanation: c.explanation,
      } satisfies Record<string, unknown>,
    })),
    reasoning:
      resolvedRouteLabel.routerMode === "hard_rules"
        ? `Hard rule matched: ${resolvedRouteLabel.hardRuleMatched}`
        : resolvedRouteLabel.routerMode === "classifier_v1"
          ? `Classifier selected ${routeLabel}; scored ${engineResult.rankedCandidates.length} candidates.${engineResult.isExploration ? " (exploration pick)" : ""}`
          : "Classifier unavailable; used fallback_default scoring.",
    details: {
      source: "generation_v2",
      policyId: policy.id,
      policyStrategy: policy.strategy,
      routerMode: resolvedRouteLabel.routerMode,
      hardRuleMatched: resolvedRouteLabel.hardRuleMatched,
      topSimilarityScore: resolvedRouteLabel.topSimilarityScore,
      secondRouteLabel: resolvedRouteLabel.secondRouteLabel,
      secondSimilarityScore: resolvedRouteLabel.secondSimilarityScore,
      candidateModels: engineResult.rankedCandidates.map((c) => c.modelId),
      candidatesConsidered: engineResult.rankedCandidates.length,
      isExploration: engineResult.isExploration,
      shadowModelId: engineResult.shadowModelId ?? null,
      isSticky:
        topCandidate && typeof topCandidate.features.isSticky === "boolean"
          ? topCandidate.features.isSticky
          : false,
      attachmentTypes: context.attachmentTypes,
      previousModelId: context.previousModelId,
      previousRouteLabel: context.previousRouteLabel,
      engineExplanation: engineResult.explanation,
    } satisfies Record<string, unknown>,
  };
}
