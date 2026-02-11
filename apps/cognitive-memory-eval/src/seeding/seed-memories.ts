import { loadConfig } from "../config";
import { parseCommonFlags } from "../utils/cli";
import { ensureDir, fileExists, readJson, writeJsonAtomic } from "../utils/fs";
import { log } from "../utils/log";
import { dataPath, resultsPath } from "../utils/paths";
import { seedAdapters } from "./core";

type SeedSummary = {
  at: number;
  personas: number;
  counts: Record<"basic" | "cognitive", number>;
  byPersona: Record<string, { basic: number; cognitive: number }>;
};

async function main() {
  const flags = parseCommonFlags(process.argv.slice(2));
  const cfg = loadConfig();

  log(
    `seed start sample=${flags.sample ?? "all"} force=${flags.force} dryRun=${flags.dryRun}`,
  );
  const outPath = resultsPath("seeding-summary.json");
  if (fileExists(outPath) && !flags.force) {
    log(`seed skip (exists) ${outPath}`);
    if (flags.dryRun) return;
    return;
  }
  if (flags.dryRun && !fileExists(outPath)) {
    throw new Error("dry-run: missing test-results/seeding-summary.json");
  }

  const personasPath = dataPath("personas.json");
  if (!fileExists(personasPath))
    throw new Error("Missing test-data/personas.json; run gen first");

  const personas = readJson<Array<{ id: string }>>(personasPath);
  const slice = flags.sample
    ? personas.slice(0, flags.sample)
    : personas.slice(0, cfg.sizes.personas);
  const personaIds = slice.map((p) => p.id);

  await ensureDir(resultsPath());
  const seeded = await seedAdapters({ personaIds, dryRun: flags.dryRun });
  log(
    `seeded basic=${seeded.counts.basic} cognitive=${seeded.counts.cognitive}`,
  );

  const summary: SeedSummary = {
    at: Date.now(),
    personas: personaIds.length,
    counts: seeded.counts,
    byPersona: seeded.byPersona,
  };

  await writeJsonAtomic(resultsPath("seeding-summary.json"), summary);
  await writeJsonAtomic(resultsPath("seed-state.json"), {
    at: Date.now(),
    personas: personaIds,
    note: "Adapters are in-memory only; other scripts re-seed as needed.",
  });
  log("seed done");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
