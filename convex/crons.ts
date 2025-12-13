import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily at 3 AM UTC to clean up expired memories
crons.daily(
  "mark-expired-memories",
  { hourUTC: 3, minuteUTC: 0 },
  internal.memories.expiration.markExpired,
);

// Run every 15 minutes to process inactive conversations
crons.interval(
  "extract-inactive-conversations",
  { minutes: 15 },
  internal.memories.extract.processInactiveConversations,
);

// Cleanup expired jobs - every hour at minute 0
crons.hourly(
  "cleanup-expired-jobs",
  { minuteUTC: 0 },
  internal.jobs.crud.cleanupExpired,
);

export default crons;
