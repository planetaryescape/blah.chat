import {
  createNeonDatabase,
  createRedisClient,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";
import { AiSdkGenerationProvider } from "./provider";
import { GenerationV2Service } from "./service";
import { UpstashGenerationEventStore } from "./store";

declare global {
  // eslint-disable-next-line no-var
  var __blahGenerationV2Service: GenerationV2Service | undefined;
}

export function getGenerationV2Service() {
  if (globalThis.__blahGenerationV2Service) {
    return globalThis.__blahGenerationV2Service;
  }

  const env = parsePersistenceEnv(process.env);
  const db = createNeonDatabase(env.databaseUrl);
  const redis = createRedisClient(env);
  const store = new UpstashGenerationEventStore(redis);
  const provider = new AiSdkGenerationProvider();

  const service = new GenerationV2Service(db, store, provider);
  globalThis.__blahGenerationV2Service = service;
  return service;
}
