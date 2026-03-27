/**
 * Run migration against a database.
 * Uses node-postgres directly to avoid ESM __dirname issues.
 * Loads .env.local from project root for DATABASE_URL.
 */

import fs from "node:fs";
import path from "node:path";
import * as schema from "@blah-chat/persistence-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// Load .env.local manually (handles unquoted & in values)
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Walk up to find project root
let dir = import.meta.dirname ?? process.cwd();
for (let i = 0; i < 5; i++) {
  const envPath = path.join(dir, ".env.local");
  if (fs.existsSync(envPath)) {
    loadEnvFile(envPath);
    break;
  }
  dir = path.dirname(dir);
}

import { runPipeline } from "./load/pipeline";
import { checkParity } from "./validate/parity";
import { formatParityReport, formatTreeReport } from "./validate/report";
import { checkTreeIntegrity } from "./validate/tree-integrity";

const DATABASE_URL = process.env.DATABASE_URL!;
const INPUT_ZIP = process.env.INPUT_ZIP ?? "/tmp/convex-export-dir";
const BUCKET = process.env.BUCKET ?? "blah-chat-dev";
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  // Strip channel_binding param that pg driver doesn't support
  const connStr = DATABASE_URL.replace(/&channel_binding=[^&]*/g, "");
  const masked = connStr.replace(/:([^@]+)@/, ":***@");
  console.log(`Connecting to ${masked}...`);
  const pool = new pg.Pool({ connectionString: connStr });
  const db = drizzle(pool, { schema });

  console.log(DRY_RUN ? "[DRY RUN] " : "", `Migrating from ${INPUT_ZIP}...`);
  console.log(`Bucket: ${BUCKET}\n`);

  const result = await runPipeline(db, {
    inputZip: INPUT_ZIP,
    bucket: BUCKET,
    dryRun: DRY_RUN,
    batchSize: 100,
    onProgress: (table, count) => {
      console.log(`  ${table}: ${count} rows`);
    },
  });

  console.log("\n=== Migration Complete ===");
  for (const [table, count] of Object.entries(result.counts).sort()) {
    console.log(`  ${table}: ${count}`);
  }

  if (result.errors.length > 0) {
    console.log(`\n${result.errors.length} error(s):`);
    for (const err of result.errors) {
      console.log(`  - ${err}`);
    }
  }

  // Run validation
  if (!DRY_RUN) {
    console.log("\n--- Validation ---\n");

    console.log("Parity check...");
    const parity = await checkParity(db, INPUT_ZIP);
    console.log(formatParityReport(parity));

    console.log("\nTree integrity check...");
    const tree = await checkTreeIntegrity(db);
    console.log(formatTreeReport(tree));
  }

  console.log("\nID map stats:");
  const mapJson = result.idMap.toJSON();
  for (const [ns, entries] of Object.entries(mapJson)) {
    console.log(`  ${ns}: ${Object.keys(entries).length} mappings`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
