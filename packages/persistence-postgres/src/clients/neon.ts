import { createNeonDatabase as createDb } from "../db";
import type { PersistenceEnv } from "../env";

export function createNeonClient(env: Pick<PersistenceEnv, "databaseUrl">) {
  return createDb(env.databaseUrl);
}
