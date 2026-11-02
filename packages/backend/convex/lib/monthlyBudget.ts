import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

// Read inside the scheduling mutation's transaction, not in a separate action:
// Convex retries admission if a concurrent usage write changes this range.
export async function getMonthlySpend(
  ctx: Pick<QueryCtx, "db">,
  userId: Id<"users">,
): Promise<number> {
  const month = new Date().toISOString().slice(0, 7);
  const records = await ctx.db
    .query("usageRecords")
    .withIndex("by_user_date", (q) =>
      q
        .eq("userId", userId)
        .gte("date", `${month}-01`)
        .lte("date", `${month}-31`),
    )
    .collect();
  return records.reduce((sum, record) => sum + record.cost, 0);
}
