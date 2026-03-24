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
  conversations,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import type { GenerationEvent } from "@blah-chat/streaming-core";
import { embedMany } from "ai";
import { eq } from "drizzle-orm";
import { persistMessageSources } from "@/lib/persistence/sources";
import { createGenerationV2Repository } from "./repository";
import type {
  GenerationEventStore,
  GenerationPromptMessage,
  GenerationProvider,
  PersistedRequestBundle,
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
const DEFAULT_POLICY_WEIGHTS = {
  binRank: 0.4,
  successRate: 2,
  errorRate: 1.5,
  cancelRate: 0.75,
  latencySeconds: 0.15,
  ttftSeconds: 0.15,
  costScore: 1,
  speedScore: 0.5,
  stickyBonus: 1.25,
  degradedPenalty: 1.5,
  downPenalty: 4,
} as const;

interface GenerationV2BackgroundTasks {
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

function buildOutcomeStats(
  rows: Array<{
    selectedModelId: string;
    status: string;
    latencyMs: number | null;
    ttftMs: number | null;
    costUsd: number | null;
  }>,
) {
  const grouped = new Map<
    string,
    {
      total: number;
      complete: number;
      error: number;
      cancelled: number;
      latencyTotal: number;
      latencyCount: number;
      ttftTotal: number;
      ttftCount: number;
      costTotal: number;
      costCount: number;
    }
  >();

  for (const row of rows) {
    const current = grouped.get(row.selectedModelId) ?? {
      total: 0,
      complete: 0,
      error: 0,
      cancelled: 0,
      latencyTotal: 0,
      latencyCount: 0,
      ttftTotal: 0,
      ttftCount: 0,
      costTotal: 0,
      costCount: 0,
    };
    current.total += 1;
    if (row.status === "complete") current.complete += 1;
    if (row.status === "error") current.error += 1;
    if (row.status === "cancelled") current.cancelled += 1;
    if (typeof row.latencyMs === "number") {
      current.latencyTotal += row.latencyMs;
      current.latencyCount += 1;
    }
    if (typeof row.ttftMs === "number") {
      current.ttftTotal += row.ttftMs;
      current.ttftCount += 1;
    }
    if (typeof row.costUsd === "number") {
      current.costTotal += row.costUsd;
      current.costCount += 1;
    }
    grouped.set(row.selectedModelId, current);
  }

  return grouped;
}

function buildLatestHealthMap(
  rows: Array<{
    provider: string;
    modelId: string | null;
    status: string;
  }>,
  candidateModelIds: string[],
) {
  const latest = new Map<string, { status: string }>();

  for (const modelId of candidateModelIds) {
    const provider = providerFromModelId(modelId);
    const exact = rows.find((row) => row.modelId === modelId);
    const providerLevel = rows.find(
      (row) => row.modelId === null && row.provider === provider,
    );
    const match = exact ?? providerLevel;
    if (match) {
      latest.set(modelId, { status: match.status });
    }
  }

  return latest;
}

function getNumericWeight(
  weights: Record<string, unknown>,
  key: keyof typeof DEFAULT_POLICY_WEIGHTS,
) {
  const value = weights[key];
  return typeof value === "number" ? value : DEFAULT_POLICY_WEIGHTS[key];
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
    rating: "left_better" | "right_better" | "tie" | "both_bad";
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

    await this.store.setRequestStatus(requestId, "running");
    await this.repository.updateRequestStatus(requestId, "running");

    await Promise.all(
      bundle.sessions.map((session) =>
        this.processSession({
          bundle,
          session,
          promptMessages: mapPromptMessages(bundle.promptMessages),
        }),
      ),
    );

    const status = await this.repository.refreshRequestStatus(requestId);
    await this.store.setRequestStatus(requestId, status);

    if (status === "complete") {
      await this.queueModelFitIfNeeded(bundle);
      await this.queueAutoTitleIfNeeded(bundle.conversationId);
    }

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
      const classified = await classifierRouter.classify({
        message: input.message,
        hasAttachments: input.hasAttachments,
        attachmentTypes: input.attachmentTypes,
        currentContextTokens: undefined,
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
    const [recentOutcomes, recentHealth] = await Promise.all([
      this.repository.listRecentRoutingOutcomes(
        candidateModelIds,
        historyWindow,
      ),
      this.repository.listRecentProviderHealth(),
    ]);
    const outcomeStats = buildOutcomeStats(recentOutcomes);
    const healthByModelId = buildLatestHealthMap(
      recentHealth,
      candidateModelIds,
    );
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
    const rankedCandidates = candidateModelIds
      .map((candidateModelId, index) => {
        const config = ROUTER_MODEL_CONFIG[candidateModelId];
        const stats = outcomeStats.get(candidateModelId);
        const health = healthByModelId.get(candidateModelId);
        const averageCost = config
          ? (config.pricing.input + config.pricing.output) / 2
          : maxAverageCost;
        const costScore = 1 - averageCost / maxAverageCost;
        const speedScore = config?.hostOrder?.some(
          (host) => host === "groq" || host === "cerebras",
        )
          ? 1
          : 0;
        const successRate = stats ? stats.complete / stats.total : 0.5;
        const errorRate = stats ? stats.error / stats.total : 0;
        const cancelRate = stats ? stats.cancelled / stats.total : 0;
        const avgLatencySeconds =
          stats && stats.latencyCount > 0
            ? stats.latencyTotal / stats.latencyCount / 1_000
            : 0;
        const avgTtftSeconds =
          stats && stats.ttftCount > 0
            ? stats.ttftTotal / stats.ttftCount / 1_000
            : 0;
        const stickyBonus =
          context.previousModelId === candidateModelId &&
          context.previousRouteLabel === routeLabel
            ? getNumericWeight(weights, "stickyBonus")
            : 0;
        const isSticky = stickyBonus > 0;
        const healthPenalty =
          health?.status === "down"
            ? getNumericWeight(weights, "downPenalty")
            : health?.status === "degraded"
              ? getNumericWeight(weights, "degradedPenalty")
              : 0;
        const score =
          (candidateModelIds.length - index) *
            getNumericWeight(weights, "binRank") +
          successRate * getNumericWeight(weights, "successRate") -
          errorRate * getNumericWeight(weights, "errorRate") -
          cancelRate * getNumericWeight(weights, "cancelRate") -
          avgLatencySeconds * getNumericWeight(weights, "latencySeconds") -
          avgTtftSeconds * getNumericWeight(weights, "ttftSeconds") +
          costScore *
            ((costBias - 50) / 50) *
            getNumericWeight(weights, "costScore") +
          speedScore *
            ((speedBias - 50) / 50) *
            getNumericWeight(weights, "speedScore") +
          stickyBonus -
          healthPenalty;

        return {
          modelId: candidateModelId,
          provider: providerFromModelId(candidateModelId),
          score,
          features: {
            routeLabel,
            binIndex: index,
            successRate,
            errorRate,
            cancelRate,
            avgLatencySeconds,
            avgTtftSeconds,
            costScore,
            speedScore,
            isSticky,
            stickyBonus,
            healthStatus: health?.status ?? "unknown",
          } satisfies Record<string, unknown>,
        };
      })
      .sort((left, right) => right.score - left.score)
      .map((candidate, index) => ({
        ...candidate,
        rank: index + 1,
      }));
    const topCandidate = rankedCandidates[0];

    return {
      selectedModelId: topCandidate?.modelId ?? DEFAULT_FALLBACK_MODEL_ID,
      routeLabel,
      policyId: policy.id,
      candidateScores: rankedCandidates,
      reasoning:
        resolvedRouteLabel.routerMode === "hard_rules"
          ? `Hard rule matched: ${resolvedRouteLabel.hardRuleMatched}`
          : resolvedRouteLabel.routerMode === "classifier_v1"
            ? `Classifier selected ${routeLabel}; scored ${rankedCandidates.length} candidates.`
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
        candidateModels: rankedCandidates.map((candidate) => candidate.modelId),
        candidatesConsidered: rankedCandidates.length,
        isSticky:
          topCandidate && typeof topCandidate.features.isSticky === "boolean"
            ? topCandidate.features.isSticky
            : false,
        attachmentTypes: context.attachmentTypes,
        previousModelId: context.previousModelId,
        previousRouteLabel: context.previousRouteLabel,
      } satisfies Record<string, unknown>,
    };
  }

  private async processSession(input: {
    bundle: PersistedRequestBundle;
    session: PersistedRequestBundle["sessions"][number];
    promptMessages: GenerationPromptMessage[];
  }) {
    const { bundle, session, promptMessages } = input;
    const abortController = new AbortController();
    const sessionStartedAt = this.now();
    const resolvedRoute = await this.resolveSessionRoute({ bundle, session });
    const resolvedModelId = resolvedRoute.selectedModelId;
    const resolvedSession = { ...session, modelId: resolvedModelId };
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
        signal: abortController.signal,
      })) {
        accumulated += delta;
        firstTokenAt ??= this.now();

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
      });
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
    } catch (error) {
      if (abortController.signal.aborted) {
        return;
      }

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
