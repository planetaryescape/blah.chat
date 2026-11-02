import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function requireOwnedAudio(
  ctx: QueryCtx,
  userId: Id<"users">,
  storageId: Id<"_storage">,
) {
  const file = await ctx.db
    .query("files")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("storageId"), storageId))
    .first();
  // Restored attachments may predate file metadata registration.
  const attachment = file
    ? null
    : await ctx.db
        .query("attachments")
        .withIndex("by_storage", (q) => q.eq("storageId", storageId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
  const record = file ?? attachment;
  const metadata = record ? await ctx.db.system.get(storageId) : null;
  if (!record || !metadata) throw new Error("Audio file not found");
  if (metadata.size > 24 * 1024 * 1024) throw new Error("Audio file too large");
  return record;
}
