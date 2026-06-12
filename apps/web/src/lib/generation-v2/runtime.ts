import {
  createRedisClient,
  createTriggerClient,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import { resolveByokKeys } from "@/lib/persistence/byok-resolver";
import { getPersistenceDb } from "@/lib/persistence/server";
import { AiSdkGenerationProvider } from "./provider";
import { GenerationV2Service } from "./service";
import { RedisGenerationEventStore } from "./store";

declare global {
  // eslint-disable-next-line no-var
  var __blahGenerationV2Service: GenerationV2Service | undefined;
  // eslint-disable-next-line no-var
  var __blahGenerationV2EnqueueProcess:
    | ((requestId: string) => Promise<void>)
    | undefined;
}

export function getEnqueueGenerationProcessing() {
  if (globalThis.__blahGenerationV2EnqueueProcess) {
    return globalThis.__blahGenerationV2EnqueueProcess;
  }
  const env = parsePersistenceEnv(process.env);
  const trigger = createTriggerClient(env);
  const fn = async (requestId: string) => {
    // Dedupe duplicate enqueues (double-submit, retried API calls) for the
    // same request; recovery reruns bypass this by invoking the task directly.
    await trigger.triggerTask(
      "process-generation",
      { requestId },
      { idempotencyKey: requestId, idempotencyKeyTTL: "1h" },
    );
  };
  globalThis.__blahGenerationV2EnqueueProcess = fn;
  return fn;
}

export function getGenerationV2Service() {
  if (globalThis.__blahGenerationV2Service) {
    return globalThis.__blahGenerationV2Service;
  }

  const env = parsePersistenceEnv(process.env);
  const db = getPersistenceDb();
  const redis = createRedisClient(env);
  const trigger = createTriggerClient(env);
  const store = new RedisGenerationEventStore(redis);
  const provider = new AiSdkGenerationProvider();

  const service = new GenerationV2Service(
    db,
    store,
    provider,
    undefined,
    undefined,
    {
      embedMessage: async (messageId: string) => {
        await trigger.triggerTask(
          "embed-message",
          { messageId },
          { idempotencyKey: messageId, idempotencyKeyTTL: "10m" },
        );
      },
      autoTitleConversation: async (conversationId: string) => {
        await trigger.triggerTask(
          "generate-title",
          { conversationId },
          { concurrencyKey: conversationId },
        );
      },
      analyzeModelFit: async (input) => {
        await trigger.triggerTask("analyze-model-fit", input);
      },
      enrichSourceMetadata: async (input) => {
        await trigger.triggerTask("enrich-source-metadata", input);
      },
    },
    undefined,
    (userId: string) => resolveByokKeys(db, userId),
  );
  globalThis.__blahGenerationV2Service = service;
  return service;
}
