import {
  createNeonDatabase,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";

declare global {
  // eslint-disable-next-line no-var
  var __blahPersistenceDb: ReturnType<typeof createNeonDatabase> | undefined;
}

export function getPersistenceDb() {
  if (globalThis.__blahPersistenceDb) {
    return globalThis.__blahPersistenceDb;
  }

  const env = parsePersistenceEnv(process.env);
  const db = createNeonDatabase(env.databaseUrl);
  globalThis.__blahPersistenceDb = db;
  return db;
}
