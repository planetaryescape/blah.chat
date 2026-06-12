import { calculateCost } from "@blah-chat/ai";
import {
  conversations,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import type { GenerationEvent } from "@blah-chat/streaming-core";
import { eq } from "drizzle-orm";
import logger from "@/lib/logger";
import type { MetricsCollector } from "@/lib/observability/metrics";
import { persistMessageSources } from "@/lib/persistence/sources";
import { createComposioTools } from "./composioTools";
import { createGenerationV2Repository } from "./repository";
import { resolveSessionRoute } from "./service-routing";
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
const STALL_TIMEOUT_MS = 90_000;
const STALL_CHECK_INTERVAL_MS = 1_000;

const terminalStatuses = new Set(["complete", "cancelled", "error"]);

type ByokKeys = Awaited<ReturnType<ResolveByokKeysFn>>;

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

function providerFromModelId(modelId: string) {
  return modelId.split(":")[0] ?? modelId;
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

    // Re-entrancy guard: a running request is owned by the worker that won the
    // pending->running CAS. Recovery reruns reset the request to pending first,
    // so claiming is the only legitimate way into session processing.
    if (bundle.requestStatus === "running") {
      const currentStatus =
        (await this.repository.getRequestStatus(requestId)) ??
        bundle.requestStatus;
      await this.store.setRequestStatus(requestId, currentStatus);
      return currentStatus;
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
    let byokKeys: ByokKeys = { enabled: false };
    if (this._resolveByokKeysFn) {
      try {
        byokKeys = await this._resolveByokKeysFn(bundle.userId);
      } catch (error) {
        return this.failBeforeProviderCall(bundle, error);
      }
    }

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

  /**
   * Emit a single transient ack event for the given request. The ack is a
   * fast "I hear you" signal produced by a small model so the UI feels
   * responsive while the heavy generation is still spinning up. Not
   * persisted; not part of the heavy-model context.
   */
  async dispatchAck(input: {
    requestId: string;
    assistantMessageId: string;
    modelId: string;
    text: string;
  }) {
    const trimmed = input.text.trim();
    if (!trimmed) return;
    await this.emit(input.requestId, {
      requestId: input.requestId,
      sessionId: `${input.requestId}:ack`,
      assistantMessageId: input.assistantMessageId,
      modelId: input.modelId,
      seq: 0,
      ts: this.now(),
      type: "ack",
      text: trimmed,
    });
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

  private async failBeforeProviderCall(
    bundle: PersistedRequestBundle,
    _error: unknown,
  ) {
    const clientMessage = "Failed to resolve BYOK credentials";

    await Promise.all(
      bundle.sessions.map(async (session) => {
        await this.repository.updateSessionStatus(session.sessionId, "error");
        await this.repository.updateAssistantMessage({
          assistantMessageId: session.assistantMessageId,
          content: "",
          status: "error",
        });
        await this.emit(bundle.requestId, {
          requestId: bundle.requestId,
          sessionId: session.sessionId,
          assistantMessageId: session.assistantMessageId,
          modelId: session.modelId,
          seq: 0,
          ts: this.now(),
          type: "error",
          error: clientMessage,
        });
      }),
    );

    const status = await this.repository.refreshRequestStatus(bundle.requestId);
    await this.store.setRequestStatus(bundle.requestId, status);
    return status;
  }

  private async processSession(input: {
    bundle: PersistedRequestBundle;
    session: PersistedRequestBundle["sessions"][number];
    promptMessages: GenerationPromptMessage[];
    collector?: MetricsCollector;
    byokKeys?: ByokKeys;
  }) {
    const { bundle, session, promptMessages, collector, byokKeys } = input;

    // A session that already reached a terminal state (e.g. via a concurrent
    // worker or cancellation) must never be re-streamed or overwritten.
    if (terminalStatuses.has(session.status)) {
      return;
    }

    const abortController = new AbortController();
    const sessionStartedAt = this.now();
    const routerStartedAt = this.now();
    const resolvedRoute = await resolveSessionRoute(this.repository, {
      bundle,
      session,
    });
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
    let stalled = false;

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
          .catch((error: unknown) => {
            // Non-critical — don't fail the generation
            logger.warn(
              { err: error, requestId: bundle.requestId },
              "Failed to record model-switch routing feedback",
            );
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
      const stream = this.provider.streamText({
        modelId: resolvedModelId,
        userId: bundle.userId,
        conversationId: bundle.conversationId,
        requestId: bundle.requestId,
        sessionId: session.sessionId,
        messages: promptMessages,
        integrations: bundle.integrations,
        tools:
          Object.keys(composioTools).length > 0 ? composioTools : undefined,
        thinkingEffort: bundle.thinkingEffort,
        signal: abortController.signal,
        byokGatewayKey:
          byokKeys?.enabled && byokKeys.gatewayKey
            ? byokKeys.gatewayKey
            : undefined,
        byokOpenRouterKey:
          byokKeys?.enabled && byokKeys.openRouterKey
            ? byokKeys.openRouterKey
            : undefined,
      });
      const iterator = stream[Symbol.asyncIterator]();
      let lastDeltaAt = this.now();

      while (true) {
        const result = await this.nextDeltaOrStall(
          iterator.next(),
          () => lastDeltaAt,
        );
        if (result === "stalled") {
          stalled = true;
          abortController.abort();
          throw new Error(
            `Generation stalled: no output received for ${STALL_TIMEOUT_MS / 1000} seconds`,
          );
        }
        if (result.done) {
          break;
        }

        const delta = result.value;
        lastDeltaAt = this.now();
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

      // Embed the completed assistant message for search. The enqueue is a
      // cheap HTTP call to Trigger; await it but never fail the generation.
      try {
        await this.backgroundTasks.embedMessage?.(session.assistantMessageId);
      } catch (error) {
        logger.warn(
          {
            err: error,
            requestId: bundle.requestId,
            assistantMessageId: session.assistantMessageId,
          },
          "Failed to enqueue message embedding",
        );
      }
    } catch (error) {
      if (abortController.signal.aborted && !stalled) {
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

  private async nextDeltaOrStall(
    next: Promise<IteratorResult<string, unknown>>,
    lastDeltaAt: () => number,
  ): Promise<IteratorResult<string, unknown> | "stalled"> {
    while (true) {
      const winner = await Promise.race([
        next.then((result) => ({ result })),
        this.sleep(STALL_CHECK_INTERVAL_MS).then(() => null),
      ]);
      if (winner) {
        return winner.result;
      }
      if (this.now() - lastDeltaAt() >= STALL_TIMEOUT_MS) {
        return "stalled";
      }
      // Yield to the macrotask queue so provider I/O can settle when an
      // injected sleep resolves synchronously (tests), instead of starving
      // pending timers with a microtask-only race loop.
      await new Promise((resolve) => setTimeout(resolve, 0));
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
    } catch (error) {
      // Non-critical: generation completion must stay green if tool metadata persistence fails.
      logger.warn(
        { err: error, requestId: input.requestId, sessionId: input.sessionId },
        "Failed to persist assistant tool calls",
      );
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
      requestId,
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
    } catch (error) {
      // Non-critical background task: generation completion must stay green.
      logger.warn(
        { err: error, conversationId },
        "Failed to enqueue conversation auto-title",
      );
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
    } catch (error) {
      // Non-critical background task: generation completion must stay green.
      logger.warn(
        {
          err: error,
          requestId: bundle.requestId,
          conversationId: bundle.conversationId,
        },
        "Failed to enqueue model-fit analysis",
      );
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
    } catch (error) {
      // Non-critical background task: generation completion must stay green.
      logger.warn(
        { err: error, requestId: input.requestId, sessionId: input.sessionId },
        "Failed to persist sources or enqueue metadata enrichment",
      );
    }
  }
}
