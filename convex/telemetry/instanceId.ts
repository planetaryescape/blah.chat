import { internalMutation, internalQuery } from "../_generated/server";
import { nanoid } from "nanoid";

/**
 * Get instance ID (read-only)
 */
export const getInstanceId = internalQuery({
  handler: async (ctx) => {
    const settings = await ctx.db.query("adminSettings").first();
    // @ts-ignore - instanceId may not exist on type yet
    return settings?.instanceId as string | undefined;
  },
});

/**
 * Create instance ID (write operation)
 */
export const createInstanceId = internalMutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("adminSettings").first();
    const instanceId = nanoid(21);

    if (existing) {
      await ctx.db.patch(existing._id, {
        // @ts-ignore - adding new field to existing schema
        instanceId,
      });
    }

    return instanceId;
  },
});

/**
 * Get or create unique instance ID for self-hosted telemetry
 * This ID is anonymous and not linked to users
 */
export const getOrCreateInstanceId = internalQuery({
  handler: async (ctx) => {
    const existing = await ctx.db.query("adminSettings").first();

    // @ts-ignore - instanceId may not exist on type yet
    if (existing?.instanceId) {
      // @ts-ignore
      return existing.instanceId as string;
    }

    // If no instance ID exists, we need to create it via mutation
    // This will be handled by the action calling this
    return undefined;
  },
});
