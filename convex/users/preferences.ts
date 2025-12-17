/**
 * Phase 4: User Preferences Helper Functions
 *
 * Core API for reading and writing user preferences in the flat key-value table.
 */

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { PREFERENCE_CATEGORIES, PREFERENCE_DEFAULTS } from "./constants";

/**
 * Get single preference with fallback to default
 *
 * @param ctx - Query context
 * @param userId - User ID
 * @param key - Preference key (e.g., "theme", "defaultModel")
 * @returns Preference value or default if not set
 */
export async function getUserPreference(
  ctx: QueryCtx,
  userId: Id<"users">,
  key: keyof typeof PREFERENCE_DEFAULTS,
): Promise<any> {
  const pref = await ctx.db
    .query("userPreferences")
    .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", key))
    .first();

  return pref?.value ?? PREFERENCE_DEFAULTS[key];
}

/**
 * Get all preferences in a category
 *
 * @param ctx - Query context
 * @param userId - User ID
 * @param category - Category name (e.g., "appearance", "models")
 * @returns Object with all preferences in category (with defaults)
 */
export async function getUserPreferencesByCategory(
  ctx: QueryCtx,
  userId: Id<"users">,
  category: string,
): Promise<Record<string, any>> {
  const prefs = await ctx.db
    .query("userPreferences")
    .withIndex("by_user_category", (q) =>
      q.eq("userId", userId).eq("category", category as any),
    )
    .collect();

  const result: Record<string, any> = {};

  // Map stored preferences
  for (const pref of prefs) {
    result[pref.key] = pref.value;
  }

  // Fill in defaults for missing keys in this category
  for (const [key, cat] of Object.entries(PREFERENCE_CATEGORIES)) {
    if (cat === category && !(key in result)) {
      result[key] =
        PREFERENCE_DEFAULTS[key as keyof typeof PREFERENCE_DEFAULTS];
    }
  }

  return result;
}

/**
 * Get all user preferences (flattened into single object)
 *
 * @param ctx - Query context
 * @param userId - User ID
 * @returns Object with all 35 preference fields
 */
export async function getAllUserPreferences(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Record<string, any>> {
  const prefs = await ctx.db
    .query("userPreferences")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  // Start with all defaults
  const result: Record<string, any> = { ...PREFERENCE_DEFAULTS };

  // Overlay user's stored preferences
  for (const pref of prefs) {
    result[pref.key] = pref.value;
  }

  return result;
}

/**
 * Update single preference
 *
 * Writes to userPreferences table (Phase 4: flat key-value storage).
 *
 * @param ctx - Mutation context
 * @param userId - User ID
 * @param key - Preference key
 * @param value - Preference value
 */
export async function updateUserPreference(
  ctx: MutationCtx,
  userId: Id<"users">,
  key: string,
  value: any,
): Promise<void> {
  const now = Date.now();
  const category = PREFERENCE_CATEGORIES[key];

  if (!category) {
    throw new Error(`Unknown preference key: ${key}`);
  }

  // Validate value before writing
  validatePreference(key, value);

  // WRITE 1: New table (fail fast on errors)
  const existing = await ctx.db
    .query("userPreferences")
    .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", key))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, { value, updatedAt: now });
  } else {
    await ctx.db.insert("userPreferences", {
      userId,
      category: category as any,
      key,
      value,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Validate preference value based on key
 *
 * @param key - Preference key
 * @param value - Value to validate
 * @throws Error if validation fails
 */
function validatePreference(key: string, value: any): void {
  switch (key) {
    case "theme":
      if (!["light", "dark"].includes(value)) {
        throw new Error("theme must be 'light' or 'dark'");
      }
      break;

    case "chatWidth":
      if (!["narrow", "standard", "wide", "full"].includes(value)) {
        throw new Error(
          "chatWidth must be 'narrow', 'standard', 'wide', or 'full'",
        );
      }
      break;

    case "newChatModelSelection":
      if (!["fixed", "recent"].includes(value)) {
        throw new Error("newChatModelSelection must be 'fixed' or 'recent'");
      }
      break;

    case "sttProvider":
      if (!["openai", "deepgram", "assemblyai", "groq"].includes(value)) {
        throw new Error(
          "sttProvider must be 'openai', 'deepgram', 'assemblyai', or 'groq'",
        );
      }
      break;

    case "ttsSpeed":
      if (typeof value !== "number" || value < 0.25 || value > 4.0) {
        throw new Error("ttsSpeed must be a number between 0.25 and 4.0");
      }
      break;

    case "defaultModel":
      if (typeof value !== "string" || value.length === 0) {
        throw new Error("defaultModel must be a non-empty string");
      }
      break;

    case "favoriteModels":
    case "recentModels":
      if (!Array.isArray(value)) {
        throw new Error(`${key} must be an array`);
      }
      break;

    case "customInstructions":
      if (typeof value !== "object" || value === null) {
        throw new Error("customInstructions must be an object");
      }
      // Validate nested fields if present
      if (value.aboutUser && value.aboutUser.length > 3000) {
        throw new Error("customInstructions.aboutUser max 3000 characters");
      }
      if (value.responseStyle && value.responseStyle.length > 3000) {
        throw new Error("customInstructions.responseStyle max 3000 characters");
      }
      if (value.nickname && value.nickname.length > 100) {
        throw new Error("customInstructions.nickname max 100 characters");
      }
      if (value.occupation && value.occupation.length > 200) {
        throw new Error("customInstructions.occupation max 200 characters");
      }
      if (value.moreAboutYou && value.moreAboutYou.length > 3000) {
        throw new Error("customInstructions.moreAboutYou max 3000 characters");
      }
      break;

    case "reasoning":
      if (typeof value !== "object" || value === null) {
        throw new Error("reasoning must be an object");
      }
      break;

    // Boolean preferences
    case "sendOnEnter":
    case "alwaysShowMessageActions":
    case "showMessageStatistics":
    case "showComparisonStatistics":
    case "enableHybridSearch":
    case "showModelNamesDuringComparison":
    case "sttEnabled":
    case "ttsEnabled":
    case "ttsAutoRead":
    case "showNotes":
    case "showTemplates":
    case "showProjects":
    case "showBookmarks":
      if (typeof value !== "boolean") {
        throw new Error(`${key} must be a boolean`);
      }
      break;

    // String preferences (no specific validation beyond type)
    case "fontSize":
    case "codeTheme":
    case "ttsProvider":
    case "ttsVoice":
      if (typeof value !== "string") {
        throw new Error(`${key} must be a string`);
      }
      break;
  }
}
