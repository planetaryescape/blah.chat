import {
  createR2Client,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";

declare global {
  // eslint-disable-next-line no-var
  var __blahPersistenceEnv: ReturnType<typeof parsePersistenceEnv> | undefined;
  // eslint-disable-next-line no-var
  var __blahPersistenceR2: ReturnType<typeof createR2Client> | undefined;
}

export function getPersistenceEnv() {
  if (globalThis.__blahPersistenceEnv) {
    return globalThis.__blahPersistenceEnv;
  }

  const env = parsePersistenceEnv(process.env);
  globalThis.__blahPersistenceEnv = env;
  return env;
}

export function getPersistenceR2Client() {
  if (globalThis.__blahPersistenceR2) {
    return globalThis.__blahPersistenceR2;
  }

  const client = createR2Client(getPersistenceEnv());
  globalThis.__blahPersistenceR2 = client;
  return client;
}
