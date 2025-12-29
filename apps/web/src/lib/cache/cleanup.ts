import { cache } from "./db";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Cleanup old cached data (>30 days)
 * Run on app start, non-blocking
 */
export async function cleanupOldData(): Promise<void> {
  const thirtyDaysAgo = Date.now() - THIRTY_DAYS_MS;

  try {
    // Get old message IDs
    const oldMessageIds = (await cache.messages
      .where("createdAt")
      .below(thirtyDaysAgo)
      .primaryKeys()) as string[];

    if (oldMessageIds.length === 0) return;

    // Delete messages and cascade to related data
    await cache.transaction(
      "rw",
      [cache.messages, cache.attachments, cache.toolCalls, cache.sources],
      async () => {
        await cache.messages.bulkDelete(oldMessageIds);
        await cache.attachments
          .where("messageId")
          .anyOf(oldMessageIds)
          .delete();
        await cache.toolCalls.where("messageId").anyOf(oldMessageIds).delete();
        await cache.sources.where("messageId").anyOf(oldMessageIds).delete();
      },
    );

    // Cleanup old notes (30 days since last update)
    await cache.notes.where("updatedAt").below(thirtyDaysAgo).delete();

    // Cleanup old tasks:
    // - Pending/in-progress tasks: delete after 30 days
    // - Completed tasks: keep longer (90 days) for reference, then delete
    const ninetyDaysAgo = Date.now() - NINETY_DAYS_MS;
    const oldTaskIds = (await cache.tasks
      .filter(
        (task) =>
          (task._creationTime < thirtyDaysAgo && task.status !== "completed") ||
          (task._creationTime < ninetyDaysAgo && task.status === "completed"),
      )
      .primaryKeys()) as string[];
    if (oldTaskIds.length > 0) {
      await cache.tasks.bulkDelete(oldTaskIds);
    }

    console.log(
      `[Cache] Cleaned up ${oldMessageIds.length} old messages, ${oldTaskIds.length} old tasks`,
    );
  } catch (error) {
    console.error("[Cache] Cleanup failed:", error);
  }
}
