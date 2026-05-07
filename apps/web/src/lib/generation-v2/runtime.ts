import {
  createRedisClient,
  createTriggerClient,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
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
    await trigger.triggerTask("process-generation", { requestId });
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
        await trigger.triggerTask("embed-message", { messageId });
      },
      autoTitleConversation: async (conversationId: string) => {
        await trigger.triggerTask("generate-title", { conversationId });
      },
      analyzeModelFit: async (input) => {
        await trigger.triggerTask("analyze-model-fit", input);
      },
      enrichSourceMetadata: async (input) => {
        await trigger.triggerTask("enrich-source-metadata", input);
      },
    },
  );
  globalThis.__blahGenerationV2Service = service;
  return service;
}
