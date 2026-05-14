import {
  createNeonDatabase,
  type PersistenceDb,
} from "@blah-chat/persistence-postgres";
import { schedules } from "@trigger.dev/sdk";
import { cleanupStaleIncognito } from "./cleanup-stale-incognito";
import { extractInactiveConversations } from "./extract-inactive-conversations";
import { getDatabaseUrl, runMaintenanceStep } from "./maintenance-utils";
import { markExpiredMemories } from "./mark-expired-memories";

export const MEMORY_MAINTENANCE_CRON = {
  pattern: "0 * * * *",
  timezone: "UTC",
  environments: ["PRODUCTION"] as Array<"PRODUCTION">,
};

function isDailyMaintenanceWindow(now: number) {
  const date = new Date(now);
  return date.getUTCHours() === 3;
}

export async function runMemoryMaintenance(
  deps: {
    db?: PersistenceDb;
    enqueueExtraction?: (conversationId: string) => Promise<void>;
    now?: number;
  } = {},
) {
  const db = deps.db ?? createNeonDatabase(getDatabaseUrl());
  const now = deps.now ?? Date.now();

  return {
    cleanupStaleIncognito: await runMaintenanceStep(() =>
      cleanupStaleIncognito({ db, now }),
    ),
    extractInactiveConversations: await runMaintenanceStep(() =>
      extractInactiveConversations({
        db,
        now,
        enqueueExtraction: deps.enqueueExtraction,
      }),
    ),
    markExpiredMemories: isDailyMaintenanceWindow(now)
      ? await runMaintenanceStep(() => markExpiredMemories({ db, now }))
      : ({ ok: true, value: { skipped: true } } as const),
  };
}

export const memoryMaintenanceTask = schedules.task({
  id: "memory-maintenance",
  cron: MEMORY_MAINTENANCE_CRON,
  maxDuration: 300,
  retry: { maxAttempts: 1 },
  run: async () => runMemoryMaintenance(),
});
