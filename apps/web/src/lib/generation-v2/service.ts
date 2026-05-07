import { calculateCost } from "@blah-chat/ai";
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
import {
  conversations,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import type { GenerationEvent } from "@blah-chat/streaming-core";
import { embedMany } from "ai";
import { eq } from "drizzle-orm";
import type { MetricsCollector } from "@/lib/observability/metrics";
import { persistMessageSources } from "@/lib/persistence/sources";
import { createComposioTools } from "./composioTools";
import { createGenerationV2Repository } from "./repository";
import type {
  GenerationEventStore,
  GenerationPromptMessage,
  GenerationProvider,
  PersistedRequestBundle,
  ResolveByokKeysFn,
  StartedGeneration,
  StartGenerationInput,
} from "./types";

const CHECKPOINT_INTERVAL_MS = 250;
const CHECKPOINT_INTERVAL_BYTES = 1024;
const STOP_CHECK_INTERVAL_MS = 250;

const terminalStatuses = new Set(["complete", "cancelled", "error"]);
const DEFAULT_FALLBACK_MODEL_ID =
  Object.keys(ROUTER_MODEL_CONFIG).find((modelId) => modelId !== "auto") ??
  "openai:gpt-5-mini";
const DEFAULT_POLICY_HISTORY_WINDOW = 50;

interface GenerationV2BackgroundTasks {
  embedMessage?: (messageId: string) => Promise<void>;
  autoTitleConversation?: (conversationId: string) => Promise<void>;
  analyzeModelFit?: (input: {
    conversationId: string;
    userMessage: string;
    currentModelId: string;
    wasAutoSelected: boolean;
  }) => Promise<void>;
  enrichSourceMetadata?: (input: {
    messageId: string;
    sourceUrls: string[];
  }) => Promise<void>;
}

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

function providerFromModelId(modelId: string) {
  return modelId.split(":")[0] ?? modelId;
}

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

function mapPromptMessages(
  messages: Array<{ role: string; content: string }>,
): GenerationPromptMessage[] {
  return messages
    .filter(
      (
        message,
      ): message is {
        role: "user" | "assistant" | "system";
        content: string;
      } =>
        ["user", "assistant", "system"].includes(message.role) &&
        message.content.trim().length > 0,
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export class GenerationV2Service {
  readonly repository: ReturnType<typeof createGenerationV2Repository>;

  constructor(
    readonly db: PersistenceDb,
    private readonly store: GenerationEventStore,
    private readonly provider: GenerationProvider,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
    private readonly now: () => number = () => Date.now(),
    private readonly backgroundTasks: GenerationV2BackgroundTasks = {},
    readonly _createMetricsCollector?: () => MetricsCollector,
    readonly _resolveByokKeysFn?: ResolveByokKeysFn,
  ) {
    this.repository = createGenerationV2Repository(db);
  }

  async start(input: StartGenerationInput): Promise<StartedGeneration> {
    return this.repository.createRequest(input);
  }

  async startSameChatConsolidation(input: {
    comparisonGroupId: string;
    consolidationModel: string;
  }): Promise<StartedGeneration> {
    return this.repository.createSameChatConsolidationRequest(input);
  }

  async startNewConversationConsolidation(input: {
    userId: string;
    comparisonGroupId: string;
    consolidationModel: string;
  }): Promise<StartedGeneration> {
    return this.repository.createNewConversationConsolidationRequest(input);
  }

  async recordVote(input: {
    userId: string;
    comparisonGroupId: string;
    winnerMessageId?: string | null;
    outcome: "winner" | "tie" | "both_bad";
  }) {
    return this.repository.recordVote(input);
  }

  async getOriginalResponses(consolidatedMessageId: string) {
    return this.repository.listOriginalResponses(consolidatedMessageId);
  }

  async process(requestId: string) {
    const bundle = await this.repository.getRequestBundle(requestId);
    if (!bundle) {
      throw new Error("Generation request not found");
    }

    if (terminalStatuses.has(bundle.requestStatus)) {
      await this.store.setRequestStatus(requestId, bundle.requestStatus);
      return bundle.requestStatus;
    }

    let effectiveStatus = bundle.requestStatus;
    if (effectiveStatus === "pending") {
      const claimed =
        await this.repository.claimRequestForProcessing(requestId);
      if (!claimed) {
        effectiveStatus =
          (await this.repository.getRequestStatus(requestId)) ??
          effectiveStatus;
        if (effectiveStatus !== "cancelling") {
          await this.store.setRequestStatus(requestId, effectiveStatus);
          return effectiveStatus;
        }
      } else {
        effectiveStatus = "running";
      }
    }

    const collector = this._createMetricsCollector?.();
    const byokKeys = this._resolveByokKeysFn
      ? await this._resolveByokKeysFn(bundle.userId).catch(() => ({
          enabled: false as const,
        }))
      : { enabled: false as const };

    await this.store.setRequestStatus(
      requestId,
      effectiveStatus === "cancelling" ? "cancelling" : "running",
    );

    await Promise.all(
      bundle.sessions.map((session) =>
        this.processSession({
          bundle,
          session,
          promptMessages: mapPromptMessages(bundle.promptMessages),
          collector,
          byokKeys,
        }),
      ),
    );

    const status = await this.repository.refreshRequestStatus(requestId);
    await this.store.setRequestStatus(requestId, status);

    if (status === "complete") {
      await this.queueModelFitIfNeeded(bundle);
      await this.queueAutoTitleIfNeeded(bundle.conversationId);
    }

    await collector?.flush(bundle.userId);

    return status;
  }

  async stop(requestId: string) {
    await this.repository.markRequestCancelling(requestId);
    await this.repository.markRequestSessionsCancelling(requestId);
    await this.store.setCancelled(requestId, true);
    await this.store.setRequestStatus(requestId, "cancelling");
  }

  async stopSession(requestId: string, sessionId: string) {
    await this.repository.markRequestCancelling(requestId);
    await this.repository.markSessionCancelling(sessionId);
    await this.store.setSessionCancelled(sessionId, true);
    await this.store.setRequestStatus(requestId, "cancelling");
  }

  async streamToSse(
    requestId: string,
    signal: AbortSignal,
    send: (event: string, data: unknown) => Promise<void>,
  ) {
    let cursor = -1;
    let replayedCanonical = false;
    let lastCanonicalReplayAtMs = 0;
    const highestSeqBySession = new Map<string, number>();

    const emitIfNew = async (event: GenerationEvent) => {
      const highestSeq = highestSeqBySession.get(event.sessionId) ?? -1;
      if (event.seq <= highestSeq) {
        return;
      }
      highestSeqBySession.set(event.sessionId, event.seq);
      await send("generation", event);
    };

    while (!signal.aborted) {
      const { events, nextCursor } = await this.store.read(requestId, cursor);
      cursor = nextCursor;

      for (const event of events) {
        await emitIfNew(event);
      }

      const redisStatus = await this.store.getRequestStatus(requestId);
      let status = redisStatus;
      const currentTimeMs = Date.now();
      const shouldReplayCanonical =
        !redisStatus &&
        events.length === 0 &&
        (!replayedCanonical || currentTimeMs - lastCanonicalReplayAtMs >= 250);
      if (shouldReplayCanonical) {
        const replay = await this.repository.getRequestStreamReplay(requestId);
        if (replay) {
          for (const event of this.buildCanonicalReplayEvents(replay)) {
            await emitIfNew(event);
          }
          status ??= replay.requestStatus;
        }
        replayedCanonical = true;
        lastCanonicalReplayAtMs = currentTimeMs;
      }

      if (status && terminalStatuses.has(status)) {
        break;
      }

      await this.sleep(100);
    }
  }

  private async resolveRouteLabel(input: {
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

  private async resolveSessionRoute(input: {
    bundle: PersistedRequestBundle;
    session: PersistedRequestBundle["sessions"][number];
  }) {
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

    const context = await this.repository.getAutoRoutingContext({
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
    const resolvedRouteLabel = await this.resolveRouteLabel({
      message,
      hasAttachments,
      attachmentTypes: context.attachmentTypes,
    });
    const routeLabel = resolvedRouteLabel.routeLabel;
    const policy = await this.repository.getOrCreateActiveRoutingPolicy();
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
        this.repository.listRecentRoutingOutcomes(
          candidateModelIds,
          historyWindow,
        ),
        this.repository.listRecentProviderHealth(),
        this.repository.listRecentComparisonFeedback(
          candidateModelIds,
          historyWindow,
        ),
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
    const costBias =
      typeof context.costBias === "number" ? context.costBias : 50;
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

  private async processSession(input: {
    bundle: PersistedRequestBundle;
    session: PersistedRequestBundle["sessions"][number];
    promptMessages: GenerationPromptMessage[];
    collector?: MetricsCollector;
    byokKeys?: {
      enabled: boolean;
      gatewayKey?: string;
      openRouterKey?: string;
    };
  }) {
    const { bundle, session, promptMessages, collector, byokKeys } = input;
    const abortController = new AbortController();
    const sessionStartedAt = this.now();
    const routerStartedAt = this.now();
    const resolvedRoute = await this.resolveSessionRoute({ bundle, session });
    collector?.recordRouterLatency(this.now() - routerStartedAt);
    const resolvedModelId = resolvedRoute.selectedModelId;
    const resolvedSession = { ...session, modelId: resolvedModelId };
    const composioTools = await createComposioTools({
      db: this.db,
      userId: bundle.userId,
      integrations: bundle.integrations,
    });
    let lastStopCheck = 0;
    let lastCheckpointAt = this.now();
    let lastCheckpointLength = 0;
    let sequence = 0;
    let accumulated = "";
    let firstTokenAt: number | null = null;

    if (resolvedModelId !== session.modelId) {
      await this.repository.updateSessionModel({
        sessionId: session.sessionId,
        assistantMessageId: session.assistantMessageId,
        modelId: resolvedModelId,
      });
    }

    // Record model-switch dissatisfaction: user explicitly chose a different
    // model after auto-router previously selected a different one.
    if (resolvedRoute.routeLabel === "explicit") {
      const prevAutoRouted =
        await this.repository.findLastAutoRoutedAssistantMessageId(
          bundle.conversationId,
        );
      if (prevAutoRouted) {
        await this.repository
          .recordModelSwitchFeedback(prevAutoRouted)
          .catch(() => {
            // Non-critical — don't fail the generation
          });
      }
    }

    await this.repository.updateSessionStatus(
      session.sessionId,
      "running",
      this.provider.constructor.name,
    );
    const routingDecision = await this.repository.getOrCreateRoutingDecision({
      policyId: resolvedRoute.policyId,
      requestId: bundle.requestId,
      conversationId: bundle.conversationId,
      userId: bundle.userId,
      selectedModelId: resolvedModelId,
      routeLabel: resolvedRoute.routeLabel,
      reasoning: resolvedRoute.reasoning,
      details: {
        ...resolvedRoute.details,
        promptMessageCount: promptMessages.length,
      },
    });
    if (resolvedRoute.candidateScores?.length) {
      await this.repository.replaceRoutingCandidateScores({
        decisionId: routingDecision.id,
        scores: resolvedRoute.candidateScores,
      });
    }
    await this.repository.updateAssistantMessage({
      assistantMessageId: session.assistantMessageId,
      content: "",
      status: "streaming",
    });

    await this.emit(bundle.requestId, {
      requestId: bundle.requestId,
      sessionId: session.sessionId,
      assistantMessageId: session.assistantMessageId,
      modelId: resolvedModelId,
      seq: sequence++,
      ts: this.now(),
      type: "start",
    });

    try {
      for await (const delta of this.provider.streamText({
        modelId: resolvedModelId,
        userId: bundle.userId,
        conversationId: bundle.conversationId,
        requestId: bundle.requestId,
        sessionId: session.sessionId,
        messages: promptMessages,
        integrations: bundle.integrations,
        tools:
          Object.keys(composioTools).length > 0 ? composioTools : undefined,
        signal: abortController.signal,
        byokGatewayKey:
          byokKeys?.enabled && byokKeys.gatewayKey
            ? byokKeys.gatewayKey
            : undefined,
        byokOpenRouterKey:
          byokKeys?.enabled && byokKeys.openRouterKey
            ? byokKeys.openRouterKey
            : undefined,
      })) {
        accumulated += delta;
        if (firstTokenAt === null) {
          firstTokenAt = this.now();
          collector?.recordTTFT(firstTokenAt - sessionStartedAt);
        }

        await this.emit(bundle.requestId, {
          requestId: bundle.requestId,
          sessionId: session.sessionId,
          assistantMessageId: session.assistantMessageId,
          modelId: resolvedModelId,
          seq: sequence++,
          ts: this.now(),
          type: "delta",
          delta,
        });

        const now = this.now();
        if (now - lastStopCheck >= STOP_CHECK_INTERVAL_MS) {
          if (
            (await this.store.isCancelled(bundle.requestId)) ||
            (await this.store.isSessionCancelled(session.sessionId))
          ) {
            abortController.abort();
            await this.cancelSession(
              routingDecision.id,
              bundle.requestId,
              session.sessionId,
              session.assistantMessageId,
              resolvedModelId,
              accumulated,
              sequence,
              sessionStartedAt,
              firstTokenAt,
            );
            return;
          }
          lastStopCheck = now;
        }

        if (
          now - lastCheckpointAt >= CHECKPOINT_INTERVAL_MS ||
          accumulated.length - lastCheckpointLength >= CHECKPOINT_INTERVAL_BYTES
        ) {
          lastCheckpointAt = now;
          lastCheckpointLength = accumulated.length;
          await this.checkpoint(
            bundle.requestId,
            resolvedSession,
            accumulated,
            sequence++,
            "streaming",
          );
        }
      }
      await this.repository.updateSessionStatus(session.sessionId, "complete");
      await this.checkpoint(
        bundle.requestId,
        resolvedSession,
        accumulated,
        sequence++,
        "complete",
      );
      const completedAt = this.now();
      const usage = await this.provider.getUsage?.({
        requestId: bundle.requestId,
        sessionId: session.sessionId,
      });
      if (usage?.outputTokens) {
        collector?.recordTokenRate(
          usage.outputTokens,
          Math.max(1, completedAt - sessionStartedAt),
        );
      }
      const computedCostUsd = usage
        ? calculateCost(resolvedModelId, {
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
            cachedInputTokens: usage.cachedInputTokens,
            reasoningTokens: usage.reasoningTokens,
          })
        : null;
      await this.repository.upsertRoutingOutcome({
        decisionId: routingDecision.id,
        requestId: bundle.requestId,
        sessionId: session.sessionId,
        status: "complete",
        ttftMs:
          firstTokenAt === null
            ? null
            : Math.max(0, firstTokenAt - sessionStartedAt),
        latencyMs: Math.max(0, completedAt - sessionStartedAt),
        totalTokens: usage?.totalTokens ?? null,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        costUsd: computedCostUsd,
      });
      if (usage) {
        await this.repository.recordUsage({
          userId: bundle.userId,
          conversationId: bundle.conversationId,
          model: resolvedModelId,
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          reasoningTokens: usage.reasoningTokens,
          cost: computedCostUsd ?? 0,
          isByok: byokKeys?.enabled === true && Boolean(byokKeys.gatewayKey),
        });
      }
      await this.persistToolCallsIfPresent({
        requestId: bundle.requestId,
        sessionId: session.sessionId,
        assistantMessageId: session.assistantMessageId,
        conversationId: bundle.conversationId,
        userId: bundle.userId,
      });
      await this.persistSourcesIfPresent({
        requestId: bundle.requestId,
        sessionId: session.sessionId,
        assistantMessageId: session.assistantMessageId,
        conversationId: bundle.conversationId,
        userId: bundle.userId,
        provider: providerFromModelId(resolvedModelId),
      });

      await this.emit(bundle.requestId, {
        requestId: bundle.requestId,
        sessionId: session.sessionId,
        assistantMessageId: session.assistantMessageId,
        modelId: resolvedModelId,
        seq: sequence++,
        ts: this.now(),
        type: "complete",
        content: accumulated,
      });

      // Embed the completed assistant message for search
      this.backgroundTasks
        .embedMessage?.(session.assistantMessageId)
        .catch(() => {});
    } catch (error) {
      if (abortController.signal.aborted) {
        return;
      }

      collector?.recordProviderError(
        providerFromModelId(resolvedModelId),
        error instanceof Error ? error.message : String(error),
        "unknown",
      );
      await this.repository.updateSessionStatus(session.sessionId, "error");
      const erroredAt = this.now();
      await this.repository.upsertRoutingOutcome({
        decisionId: routingDecision.id,
        requestId: bundle.requestId,
        sessionId: session.sessionId,
        status: "error",
        ttftMs:
          firstTokenAt === null
            ? null
            : Math.max(0, firstTokenAt - sessionStartedAt),
        latencyMs: Math.max(0, erroredAt - sessionStartedAt),
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      await this.repository.updateAssistantMessage({
        assistantMessageId: session.assistantMessageId,
        content: accumulated,
        status: "error",
      });

      await this.emit(bundle.requestId, {
        requestId: bundle.requestId,
        sessionId: session.sessionId,
        assistantMessageId: session.assistantMessageId,
        modelId: resolvedModelId,
        seq: sequence++,
        ts: this.now(),
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async persistToolCallsIfPresent(input: {
    requestId: string;
    sessionId: string;
    assistantMessageId: string;
    conversationId: string;
    userId: string;
  }) {
    if (!this.provider.getToolCalls) {
      return;
    }

    try {
      const toolCalls = await this.provider.getToolCalls({
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      if (!toolCalls.length) {
        return;
      }

      await this.repository.replaceAssistantToolCalls({
        assistantMessageId: input.assistantMessageId,
        conversationId: input.conversationId,
        userId: input.userId,
        toolCalls,
      });
    } catch {
      // Non-critical: generation completion must stay green if tool metadata persistence fails.
    }
  }

  private buildCanonicalReplayEvents(
    input: NonNullable<
      Awaited<
        ReturnType<
          ReturnType<
            typeof createGenerationV2Repository
          >["getRequestStreamReplay"]
        >
      >
    >,
  ) {
    const events: GenerationEvent[] = [];

    for (const session of input.sessions) {
      const checkpoint = session.latestCheckpoint;
      const message = session.assistantMessage;
      const checkpointContent = checkpoint?.content ?? "";
      const canonicalContent = message?.content ?? "";
      const replayContent = checkpointContent || canonicalContent;
      const checkpointSeq = checkpoint?.sequence ?? 0;

      if (
        ["pending", "running", "cancelling"].includes(session.status) &&
        replayContent
      ) {
        events.push({
          requestId: input.requestId,
          sessionId: session.sessionId,
          assistantMessageId: session.assistantMessageId,
          modelId: session.modelId,
          seq: checkpointSeq,
          ts: message?.updatedAt ?? checkpoint?.createdAt ?? this.now(),
          type: "checkpoint",
          content: replayContent,
        });
        continue;
      }

      if (session.status === "complete") {
        events.push({
          requestId: input.requestId,
          sessionId: session.sessionId,
          assistantMessageId: session.assistantMessageId,
          modelId: session.modelId,
          seq: checkpoint ? checkpointSeq + 1 : 0,
          ts: message?.updatedAt ?? checkpoint?.createdAt ?? this.now(),
          type: "complete",
          content: canonicalContent,
        });
        continue;
      }

      if (session.status === "cancelled") {
        if (replayContent) {
          events.push({
            requestId: input.requestId,
            sessionId: session.sessionId,
            assistantMessageId: session.assistantMessageId,
            modelId: session.modelId,
            seq: checkpointSeq,
            ts: message?.updatedAt ?? checkpoint?.createdAt ?? this.now(),
            type: "checkpoint",
            content: replayContent,
          });
        }
        events.push({
          requestId: input.requestId,
          sessionId: session.sessionId,
          assistantMessageId: session.assistantMessageId,
          modelId: session.modelId,
          seq: checkpointSeq + 1,
          ts: message?.updatedAt ?? checkpoint?.createdAt ?? this.now(),
          type: "cancelled",
          reason: "stop_requested",
        });
        continue;
      }

      if (session.status === "error") {
        if (replayContent) {
          events.push({
            requestId: input.requestId,
            sessionId: session.sessionId,
            assistantMessageId: session.assistantMessageId,
            modelId: session.modelId,
            seq: checkpointSeq,
            ts: message?.updatedAt ?? checkpoint?.createdAt ?? this.now(),
            type: "checkpoint",
            content: replayContent,
          });
        }
        events.push({
          requestId: input.requestId,
          sessionId: session.sessionId,
          assistantMessageId: session.assistantMessageId,
          modelId: session.modelId,
          seq: checkpointSeq + 1,
          ts: message?.updatedAt ?? checkpoint?.createdAt ?? this.now(),
          type: "error",
          error: "Generation failed",
        });
      }
    }

    return events;
  }

  private async checkpoint(
    requestId: string,
    session: {
      sessionId: string;
      assistantMessageId: string;
      modelId: string;
    },
    content: string,
    sequence: number,
    status: "streaming" | "complete" | "cancelled" = "streaming",
  ) {
    await this.repository.updateAssistantMessage({
      assistantMessageId: session.assistantMessageId,
      content,
      status,
    });
    await this.repository.insertCheckpoint({
      sessionId: session.sessionId,
      content,
      sequence,
    });

    await this.emit(requestId, {
      requestId,
      sessionId: session.sessionId,
      assistantMessageId: session.assistantMessageId,
      modelId: session.modelId,
      seq: sequence,
      ts: this.now(),
      type: "checkpoint",
      content,
    });
  }

  private async cancelSession(
    decisionId: string,
    requestId: string,
    sessionId: string,
    assistantMessageId: string,
    modelId: string,
    content: string,
    sequence: number,
    sessionStartedAt: number,
    firstTokenAt: number | null,
  ) {
    if (content) {
      await this.checkpoint(
        requestId,
        {
          sessionId,
          assistantMessageId,
          modelId,
        },
        content,
        sequence++,
        "cancelled",
      );
    } else {
      await this.repository.updateAssistantMessage({
        assistantMessageId,
        content,
        status: "cancelled",
      });
    }

    await this.repository.updateSessionStatus(sessionId, "cancelled");
    const cancelledAt = this.now();
    await this.repository.upsertRoutingOutcome({
      decisionId,
      requestId,
      sessionId,
      status: "cancelled",
      ttftMs:
        firstTokenAt === null
          ? null
          : Math.max(0, firstTokenAt - sessionStartedAt),
      latencyMs: Math.max(0, cancelledAt - sessionStartedAt),
      metadata: {
        reason: "stop_requested",
      },
    });

    await this.emit(requestId, {
      requestId,
      sessionId,
      assistantMessageId,
      modelId,
      seq: sequence,
      ts: this.now(),
      type: "cancelled",
      reason: "stop_requested",
    });
  }

  private async emit(requestId: string, event: GenerationEvent) {
    await this.store.append(requestId, event);
  }

  private async queueAutoTitleIfNeeded(conversationId: string) {
    if (!this.backgroundTasks.autoTitleConversation) {
      return;
    }

    const conversation = await this.db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation || conversation.title !== "New Chat") {
      return;
    }

    try {
      await this.backgroundTasks.autoTitleConversation(conversationId);
    } catch {
      // Non-critical background task: generation completion must stay green.
    }
  }

  private async queueModelFitIfNeeded(bundle: PersistedRequestBundle) {
    if (!this.backgroundTasks.analyzeModelFit || bundle.sessions.length !== 1) {
      return;
    }

    const userMessage = [...bundle.promptMessages]
      .reverse()
      .find((message) => message.role === "user");
    const session = bundle.sessions[0];

    if (!userMessage || !session?.modelId) {
      return;
    }

    try {
      await this.backgroundTasks.analyzeModelFit({
        conversationId: bundle.conversationId,
        userMessage: userMessage.content,
        currentModelId: session.modelId,
        wasAutoSelected: bundle.requestedModelIds.includes("auto"),
      });
    } catch {
      // Non-critical background task: generation completion must stay green.
    }
  }

  private async persistSourcesIfPresent(input: {
    requestId: string;
    sessionId: string;
    assistantMessageId: string;
    conversationId: string;
    userId: string;
    provider: string;
  }) {
    if (!this.provider.getSources) {
      return;
    }

    try {
      const sources = await this.provider.getSources({
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      if (!sources.length) {
        return;
      }

      const result = await persistMessageSources({
        db: this.db,
        messageId: input.assistantMessageId,
        conversationId: input.conversationId,
        userId: input.userId,
        provider: input.provider,
        sources,
        now: this.now,
      });

      if (
        result.unenrichedUrls.length > 0 &&
        this.backgroundTasks.enrichSourceMetadata
      ) {
        await this.backgroundTasks.enrichSourceMetadata({
          messageId: input.assistantMessageId,
          sourceUrls: result.unenrichedUrls,
        });
      }
    } catch {
      // Non-critical background task: generation completion must stay green.
    }
  }
}
