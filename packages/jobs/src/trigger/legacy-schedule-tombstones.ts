import { schedules } from "@trigger.dev/sdk";

async function legacyScheduleTombstone() {
  return { skipped: true, reason: "legacy schedule tombstone" };
}

// Keep these no-cron tasks temporarily so Trigger can sync deleted declarative schedules.
export const checkHealthLegacyScheduleTask = schedules.task({
  id: "check-health",
  run: legacyScheduleTombstone,
});

export const checkMetricsThresholdsLegacyScheduleTask = schedules.task({
  id: "check-metrics-thresholds",
  run: legacyScheduleTombstone,
});

export const cleanupStaleGenerationSessionsLegacyScheduleTask = schedules.task({
  id: "cleanup-stale-generation-sessions",
  run: legacyScheduleTombstone,
});

export const extractInactiveConversationsLegacyScheduleTask = schedules.task({
  id: "extract-inactive-conversations",
  run: legacyScheduleTombstone,
});

export const generationMaintenanceLegacyScheduleTask = schedules.task({
  id: "generation-maintenance",
  run: legacyScheduleTombstone,
});

export const markExpiredMemoriesLegacyScheduleTask = schedules.task({
  id: "mark-expired-memories",
  run: legacyScheduleTombstone,
});

export const memoryMaintenanceLegacyScheduleTask = schedules.task({
  id: "memory-maintenance",
  run: legacyScheduleTombstone,
});

export const recoverStuckMessagesLegacyScheduleTask = schedules.task({
  id: "recover-stuck-messages",
  run: legacyScheduleTombstone,
});

export const telemetryHeartbeatLegacyScheduleTask = schedules.task({
  id: "telemetry-heartbeat",
  run: legacyScheduleTombstone,
});
