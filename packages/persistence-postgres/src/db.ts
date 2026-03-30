import type { PGlite } from "@electric-sql/pglite";
import { neon } from "@neondatabase/serverless";
import {
  drizzle as drizzleNeon,
  type NeonHttpDatabase,
} from "drizzle-orm/neon-http";
import {
  drizzle as drizzleNodePg,
  type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import {
  drizzle as drizzlePglite,
  type PgliteDatabase,
} from "drizzle-orm/pglite";
import { Pool } from "pg";
import * as schema from "./schema";

export type PersistenceDb =
  | NeonHttpDatabase<typeof schema>
  | NodePgDatabase<typeof schema>
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

export function createPostgresDatabase(
  databaseUrl: string,
): NodePgDatabase<typeof schema> {
  if (typeof process === "undefined") {
    throw new Error(
      "Standard Postgres connections are only available in a Node.js runtime",
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });
  return drizzleNodePg(pool, { schema });
}

export function isNeonDatabaseUrl(databaseUrl: string): boolean {
  const hostname = new URL(databaseUrl).hostname.toLowerCase();
  return hostname.includes("neon.tech");
}

export function createPersistenceDatabase(databaseUrl: string): PersistenceDb {
  return isNeonDatabaseUrl(databaseUrl)
    ? createNeonDatabase(databaseUrl)
    : createPostgresDatabase(databaseUrl);
}
