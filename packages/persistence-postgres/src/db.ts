import type { PGlite } from "@electric-sql/pglite";
import { neon } from "@neondatabase/serverless";
import {
  drizzle as drizzleNeon,
  type NeonHttpDatabase,
} from "drizzle-orm/neon-http";
import {
  drizzle as drizzlePglite,
  type PgliteDatabase,
} from "drizzle-orm/pglite";
import * as schema from "./schema";

export type PersistenceDb =
  | NeonHttpDatabase<typeof schema>
  | PgliteDatabase<typeof schema>;

export function createPgliteDatabase(
  client: PGlite,
): PgliteDatabase<typeof schema> {
  return drizzlePglite(client, { schema });
}

export function createNeonDatabase(
  databaseUrl: string,
): NeonHttpDatabase<typeof schema> {
  const client = neon(databaseUrl);
  return drizzleNeon(client, { schema });
}
