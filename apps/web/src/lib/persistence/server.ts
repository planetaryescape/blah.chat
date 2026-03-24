import {
  createPersistenceDatabase,
  type PersistenceDb,
  parsePersistenceEnv,
} from "@blah-chat/persistence-postgres";

declare global {
  // eslint-disable-next-line no-var
  var __blahPersistenceDb: PersistenceDb | undefined;
}

export function getPersistenceDb() {
  if (globalThis.__blahPersistenceDb) {
    return globalThis.__blahPersistenceDb;
  }

  const env = parsePersistenceEnv(process.env);
  const db = createPersistenceDatabase(env.databaseUrl);
  globalThis.__blahPersistenceDb = db;
  return db;
}
