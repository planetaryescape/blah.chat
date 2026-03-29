import {
  createPersistenceDatabase,
  type PersistenceDb,
  parseDatabaseEnv,
} from "@blah-chat/persistence-postgres";
import { ConfigurationError } from "@/lib/api/errors";
import logger from "@/lib/logger";

declare global {
  // eslint-disable-next-line no-var
  var __blahPersistenceDb: PersistenceDb | undefined;
}

export function getPersistenceDb() {
  if (globalThis.__blahPersistenceDb) {
    return globalThis.__blahPersistenceDb;
  }

  try {
    const env = parseDatabaseEnv(process.env);
    const db = createPersistenceDatabase(env.databaseUrl);
    globalThis.__blahPersistenceDb = db;
    return db;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "issues" in error &&
      Array.isArray(error.issues)
    ) {
      const missingKeys = error.issues
        .map((issue: { path?: Array<string | number> }) =>
          Array.isArray(issue.path) ? issue.path.join(".") : "",
        )
        .filter(Boolean);

      logger.error(
        { missingKeys },
        "Persistence database configuration is invalid",
      );
      throw new ConfigurationError("Persistence database is not configured");
    }

    throw error;
  }
}
