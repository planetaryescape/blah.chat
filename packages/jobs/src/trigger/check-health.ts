import { schedules } from "@trigger.dev/sdk";
import { callLegacyConvexTrigger } from "./utils";

export const CHECK_HEALTH_CRON = {
  pattern: "0 */6 * * *",
  timezone: "UTC",
  environments: ["PRODUCTION"] as Array<"PRODUCTION">,
};

export const checkHealthTask = schedules.task({
  id: "check-health",
  cron: CHECK_HEALTH_CRON,
  maxDuration: 120,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async () => {
    return callLegacyConvexTrigger<{ success: boolean }>("check-health", {});
  },
});
