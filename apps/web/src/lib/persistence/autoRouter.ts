import {
  type AutoRouterConfigValue,
  autoRouterConfig,
  DEFAULT_AUTO_ROUTER_CONFIG,
  mergeAutoRouterConfig,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";
import "server-only";

export const AUTO_ROUTER_CONFIG_TAG = "auto-router-config";
const SINGLETON_ID = "global";

export const getAutoRouterConfig = unstable_cache(
  async (): Promise<AutoRouterConfigValue> => {
    const db = getPersistenceDb();
    const row = await db.query.autoRouterConfig.findFirst({
      where: eq(autoRouterConfig.id, SINGLETON_ID),
    });
    return mergeAutoRouterConfig(row?.value);
  },
  [AUTO_ROUTER_CONFIG_TAG],
  { tags: [AUTO_ROUTER_CONFIG_TAG], revalidate: 300 },
);

export async function updateAutoRouterConfig(
  clerkUserId: string,
  patch: Partial<AutoRouterConfigValue>,
): Promise<AutoRouterConfigValue> {
  const db = getPersistenceDb();
  const actor = await ensureCurrentPersistenceUser(clerkUserId);

  const existing = await db.query.autoRouterConfig.findFirst({
    where: eq(autoRouterConfig.id, SINGLETON_ID),
  });

  const current = existing?.value ?? DEFAULT_AUTO_ROUTER_CONFIG;
  const next: AutoRouterConfigValue = mergeAutoRouterConfig({
    ...current,
    ...patch,
  });

  if (existing) {
    await db
      .update(autoRouterConfig)
      .set({ value: next, updatedBy: actor.id, updatedAt: Date.now() })
      .where(eq(autoRouterConfig.id, SINGLETON_ID));
  } else {
    await db.insert(autoRouterConfig).values({
      id: SINGLETON_ID,
      value: next,
      updatedBy: actor.id,
      updatedAt: Date.now(),
    });
  }

  revalidateTag(AUTO_ROUTER_CONFIG_TAG, { expire: 0 });
  return next;
}
