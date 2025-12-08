import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily at 3 AM UTC to clean up expired memories
crons.daily(
  "mark-expired-memories",
  { hourUTC: 3, minuteUTC: 0 },
  // @ts-ignore - Convex type instantiation depth issue
  internal.memories.expiration.markExpired,
);

// Run every 15 minutes to process inactive conversations
crons.interval(
  "extract-inactive-conversations",
  { minutes: 15 },
  // @ts-ignore - Convex type instantiation depth issue
  internal.memories.extract.processInactiveConversations,
);

// Run monthly on the 1st at 2 AM UTC to rebuild project conversation arrays
crons.monthly(
  "rebuild-project-conversations",
  { day: 1, hourUTC: 2, minuteUTC: 0 },
  // @ts-ignore - Convex type instantiation depth issue
  internal.projects.crons.rebuildAllProjects,
);

export default crons;
