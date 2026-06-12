import {
  type AdminSettingsValue,
  adminSettings,
  DEFAULT_ADMIN_SETTINGS,
  mergeAdminSettings,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { revalidateTag, unstable_cache } from "next/cache";
import { ensureCurrentPersistenceUser } from "./current-user";
import { getPersistenceDb } from "./server";
import "server-only";

export const ADMIN_SETTINGS_TAG = "admin-settings";
const SINGLETON_ID = "global";

/**
 * Read merged admin settings (DB row deep-merged onto code defaults).
 * Cached via unstable_cache; bust via revalidateTag(ADMIN_SETTINGS_TAG).
 */
export const getAdminSettings = unstable_cache(
  async (): Promise<AdminSettingsValue> => {
    const db = getPersistenceDb();
    const row = await db.query.adminSettings.findFirst({
      where: eq(adminSettings.id, SINGLETON_ID),
    });
    return mergeAdminSettings(row?.value);
  },
  [ADMIN_SETTINGS_TAG],
  { tags: [ADMIN_SETTINGS_TAG], revalidate: 300 },
);

/**
 * Apply a partial admin settings update. Deep-merges with current value.
 * Inserts the singleton if it doesn't exist (defensive — migration seeds it).
 * Busts the unstable_cache tag so the next read sees the new value.
 */
export async function updateAdminSettings(
  clerkUserId: string,
  patch: Partial<AdminSettingsValue>,
): Promise<AdminSettingsValue> {
  const db = getPersistenceDb();
  const actor = await ensureCurrentPersistenceUser(clerkUserId);

  const existing = await db.query.adminSettings.findFirst({
    where: eq(adminSettings.id, SINGLETON_ID),
  });

  // Two-level deep merge: top-level namespaces are replaced wholesale only
  // when the patch includes them; otherwise existing nested fields survive.
  const current = existing?.value ?? DEFAULT_ADMIN_SETTINGS;
  const next: AdminSettingsValue = mergeAdminSettings({
    ...current,
    ...patch,
    limits: { ...current.limits, ...(patch.limits ?? {}) },
    proTier: { ...current.proTier, ...(patch.proTier ?? {}) },
    search: { ...current.search, ...(patch.search ?? {}) },
    memory: { ...current.memory, ...(patch.memory ?? {}) },
    transcriptProvider: {
      ...current.transcriptProvider,
      ...(patch.transcriptProvider ?? {}),
    },
  });

  if (existing) {
    await db
      .update(adminSettings)
      .set({ value: next, updatedBy: actor.id, updatedAt: Date.now() })
      .where(eq(adminSettings.id, SINGLETON_ID));
  } else {
    await db.insert(adminSettings).values({
      id: SINGLETON_ID,
      value: next,
      updatedBy: actor.id,
      updatedAt: Date.now(),
    });
  }

  revalidateTag(ADMIN_SETTINGS_TAG, { expire: 0 });
  return next;
}
