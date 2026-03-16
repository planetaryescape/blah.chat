import type { PersistenceDb } from "@blah-chat/persistence-postgres";
import type { GenerationEvent } from "@blah-chat/streaming-core";
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
  ) {
    this.repository = createGenerationV2Repository(db);
  }

  async start(input: StartGenerationInput): Promise<StartedGeneration> {
    return this.repository.createRequest(input);
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
    return status;
  }

  async stop(requestId: string) {
    await this.store.setCancelled(requestId, true);
    await this.store.setRequestStatus(requestId, "cancelling");
  }

  async stopSession(requestId: string, sessionId: string) {
    await this.store.setSessionCancelled(sessionId, true);
    await this.store.setRequestStatus(requestId, "cancelling");
  }

  async streamToSse(
    requestId: string,
    signal: AbortSignal,
    send: (event: string, data: unknown) => Promise<void>,
  ) {
    let cursor = -1;

    while (!signal.aborted) {
      const { events, nextCursor } = await this.store.read(requestId, cursor);
      cursor = nextCursor;

      for (const event of events) {
        await send("generation", event);
      }

      const status = await this.store.getRequestStatus(requestId);
      if (status && terminalStatuses.has(status)) {
        break;
      }

      await this.sleep(100);
    }
  }

  private async processSession(input: {
    bundle: PersistedRequestBundle;
    session: PersistedRequestBundle["sessions"][number];
    promptMessages: GenerationPromptMessage[];
  }) {
    const { bundle, session, promptMessages } = input;
    const abortController = new AbortController();
    let lastStopCheck = 0;
    let lastCheckpointAt = this.now();
    let lastCheckpointLength = 0;
    let sequence = 0;
    let accumulated = "";

    await this.repository.updateSessionStatus(
      session.sessionId,
      "running",
      this.provider.constructor.name,
    );
    await this.repository.updateAssistantMessage({
      assistantMessageId: session.assistantMessageId,
      content: "",
      status: "streaming",
    });

    await this.emit(bundle.requestId, {
      requestId: bundle.requestId,
      sessionId: session.sessionId,
      assistantMessageId: session.assistantMessageId,
      modelId: session.modelId,
      seq: sequence++,
      ts: this.now(),
      type: "start",
    });

    try {
      for await (const delta of this.provider.streamText({
        modelId: session.modelId,
        userId: bundle.userId,
        conversationId: bundle.conversationId,
        requestId: bundle.requestId,
        sessionId: session.sessionId,
        messages: promptMessages,
        signal: abortController.signal,
      })) {
        accumulated += delta;

        await this.emit(bundle.requestId, {
          requestId: bundle.requestId,
          sessionId: session.sessionId,
          assistantMessageId: session.assistantMessageId,
          modelId: session.modelId,
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
              bundle.requestId,
              session.sessionId,
              session.assistantMessageId,
              session.modelId,
              sequence,
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
            session,
            accumulated,
            sequence++,
            "streaming",
          );
        }
      }
      await this.repository.updateSessionStatus(session.sessionId, "complete");
      await this.checkpoint(
        bundle.requestId,
        session,
        accumulated,
        sequence++,
        "complete",
      );

      await this.emit(bundle.requestId, {
        requestId: bundle.requestId,
        sessionId: session.sessionId,
        assistantMessageId: session.assistantMessageId,
        modelId: session.modelId,
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
      await this.repository.updateAssistantMessage({
        assistantMessageId: session.assistantMessageId,
        content: accumulated,
        status: "error",
      });

      await this.emit(bundle.requestId, {
        requestId: bundle.requestId,
        sessionId: session.sessionId,
        assistantMessageId: session.assistantMessageId,
        modelId: session.modelId,
        seq: sequence++,
        ts: this.now(),
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
    status: "streaming" | "complete" = "streaming",
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
    requestId: string,
    sessionId: string,
    assistantMessageId: string,
    modelId: string,
    sequence: number,
  ) {
    await this.repository.updateSessionStatus(sessionId, "cancelled");
    await this.repository.updateAssistantMessage({
      assistantMessageId,
      content: "",
      status: "cancelled",
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
}
