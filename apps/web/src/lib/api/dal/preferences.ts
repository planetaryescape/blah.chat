import "server-only";
import { createPreferenceRepository } from "@blah-chat/persistence-postgres";
import { z } from "zod";
import { ensureCurrentPersistenceUser } from "@/lib/persistence/current-user";
import { getPersistenceDb } from "@/lib/persistence/server";
import { formatEntity } from "@/lib/utils/formatEntity";

const MAX_PREFERENCE_VALUE_LENGTH = 16_000;

/**
 * Preference values must be JSON-serializable (rejects functions/undefined)
 * and bounded so a single preference can't store arbitrarily large blobs.
 */
export const preferenceValueSchema = z.unknown().superRefine((value, ctx) => {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "value must be JSON-serializable",
    });
    return;
  }
  if (serialized === undefined) {
    ctx.addIssue({
      code: "custom",
      message: "value must be JSON-serializable",
    });
    return;
  }
  if (serialized.length > MAX_PREFERENCE_VALUE_LENGTH) {
    ctx.addIssue({
      code: "custom",
      message: `value must serialize to at most ${MAX_PREFERENCE_VALUE_LENGTH} characters`,
    });
  }
});

const updatePreferenceSchema = z.object({
  key: z.string().min(1),
  value: preferenceValueSchema,
});

export const preferencesDAL = {
  get: async (userId: string, key: string) => {
    const db = getPersistenceDb();
    await ensureCurrentPersistenceUser(userId);
    const value = await createPreferenceRepository(db).getForClerkId(
      userId,
      key,
    );

    return formatEntity({ key, value }, "preference");
  },

  getAll: async (userId: string) => {
    const db = getPersistenceDb();
    await ensureCurrentPersistenceUser(userId);
    const preferences =
      await createPreferenceRepository(db).getAllForClerkId(userId);

    return formatEntity(preferences, "preferences");
  },

  update: async (
    userId: string,
    data: z.infer<typeof updatePreferenceSchema>,
  ) => {
    const validated = updatePreferenceSchema.parse(data);
    const db = getPersistenceDb();
    const user = await ensureCurrentPersistenceUser(userId);
    await createPreferenceRepository(db).setForUser(
      user.id,
      validated.key,
      validated.value,
    );

    return formatEntity(
      { key: validated.key, value: validated.value },
      "preference",
    );
  },
};
