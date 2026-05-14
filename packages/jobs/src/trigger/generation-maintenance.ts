import {
  createNeonDatabase,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { schedules } from "@trigger.dev/sdk";
import { cleanupStaleGenerationSessions } from "./cleanup-stale-generation-sessions";
import { getDatabaseUrl, runMaintenanceStep } from "./maintenance-utils";
import { recoverStuckGenerations } from "./recover-stuck-generations";
import { recoverStuckMessages } from "./recover-stuck-messages";

export const GENERATION_MAINTENANCE_CRON = {
  pattern: "*/5 * * * *",
  timezone: "UTC",
  environments: ["PRODUCTION"] as Array<"PRODUCTION">,
};

export async function runGenerationMaintenance(
  deps: {
    db?: PersistenceDb;
    enqueueRecoveredGeneration?: (requestId: string) => Promise<void>;
    now?: number;
  } = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();

  return {
    recoverStuckGenerations: await runMaintenanceStep(() =>
      recoverStuckGenerations({
        db,
        now,
        enqueue: deps.enqueueRecoveredGeneration,
      }),
    ),
    cleanupStaleGenerationSessions: await runMaintenanceStep(() =>
      cleanupStaleGenerationSessions({ db, now }),
    ),
    recoverStuckMessages: await runMaintenanceStep(() =>
      recoverStuckMessages({ db, now }),
    ),
  };
}

export const generationMaintenanceTask = schedules.task({
  id: "generation-maintenance",
  cron: GENERATION_MAINTENANCE_CRON,
  maxDuration: 300,
  retry: { maxAttempts: 1 },
  run: async () => runGenerationMaintenance(),
});
