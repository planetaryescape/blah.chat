import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily at 3 AM UTC to clean up expired memories
crons.daily(
  "mark-expired-memories",
  { hourUTC: 3, minuteUTC: 0 },
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.memories.expiration.markExpired as any,
);

// Run every 15 minutes to process inactive conversations
crons.interval(
  "extract-inactive-conversations",
  { minutes: 15 },
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.memories.extract.processInactiveConversations as any,
);

// Cleanup expired jobs - every hour at minute 0
crons.hourly(
  "cleanup-expired-jobs",
  { minuteUTC: 0 },
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.jobs.crud.cleanupExpired as any,
);

// Send telemetry heartbeat daily at 2 AM UTC (opt-in)
crons.daily(
  "telemetry-heartbeat",
  { hourUTC: 2, minuteUTC: 0 },
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.telemetry.heartbeat.sendDailyHeartbeat as any,
);

export default crons;
