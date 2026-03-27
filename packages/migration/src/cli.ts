#!/usr/bin/env node
import { createPersistenceDatabase } from "@blah-chat/persistence-postgres";
import { Command } from "commander";
import { runPipeline } from "./load/pipeline";
import { checkParity } from "./validate/parity";
import { formatParityReport, formatTreeReport } from "./validate/report";
import { checkTreeIntegrity } from "./validate/tree-integrity";

const program = new Command();

program
  .name("migrate")
  .description("Convex -> Postgres historical data migration")
  .version("0.1.0");

program
  .command("run")
  .description("Run the full migration pipeline")
  .requiredOption("--input <path>", "Path to Convex export ZIP")
  .requiredOption("--database-url <url>", "Postgres connection string")
  .option("--bucket <name>", "R2 bucket name", "blah-chat-uploads")
  .option("--dry-run", "Transform only, no DB writes", false)
  .option("--batch-size <n>", "Insert batch size", "500")
  .action(async (opts) => {
    const db = createPersistenceDatabase(opts.databaseUrl);

    console.log(
      opts.dryRun ? "[DRY RUN] " : "",
      `Migrating from ${opts.input}...`,
    );

    const result = await runPipeline(db, {
      inputZip: opts.input,
      bucket: opts.bucket,
      dryRun: opts.dryRun,
      batchSize: Number.parseInt(opts.batchSize, 10),
      onProgress: (table, count) => {
        console.log(`  ${table}: ${count} rows`);
      },
    });

    console.log("\n=== Migration Complete ===");
    for (const [table, count] of Object.entries(result.counts)) {
      console.log(`  ${table}: ${count}`);
    }

    if (result.errors.length > 0) {
      console.log(`\n${result.errors.length} error(s):`);
      for (const err of result.errors) {
        console.log(`  - ${err}`);
      }
    }
  });

program
  .command("validate")
  .description("Run parity and tree integrity checks")
  .requiredOption("--input <path>", "Path to Convex export ZIP")
  .requiredOption("--database-url <url>", "Postgres connection string")
  .action(async (opts) => {
    const db = createPersistenceDatabase(opts.databaseUrl);

    console.log("Running parity checks...");
    const parity = await checkParity(db, opts.input);
    console.log(formatParityReport(parity));

    console.log("\nRunning tree integrity checks...");
    const tree = await checkTreeIntegrity(db);
    console.log(formatTreeReport(tree));

    const passed = parity.failed === 0 && tree.passed;
    process.exit(passed ? 0 : 1);
  });

program.parse();
