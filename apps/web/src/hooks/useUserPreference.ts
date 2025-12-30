/**
 * Phase 4: User Preferences React Hooks
 *
 * Custom hooks for accessing user preferences from the flat key-value table.
 * Uses Dexie cache for instant reads, synced from single Convex subscription.
 */

import { api } from "@blah-chat/backend/convex/_generated/api";
import { PREFERENCE_DEFAULTS } from "@blah-chat/backend/convex/users/constants";
import { useQuery } from "convex/react";
import { usePreferenceCacheSync } from "./useCacheSync";

/**
 * Get a single user preference by key
 *
 * @param key - Preference key (e.g., "theme", "defaultModel")
 * @returns Preference value or default if not set
 *
 * @example
 * const theme = useUserPreference("theme");
 * const defaultModel = useUserPreference("defaultModel");
 */
export function useUserPreference<K extends keyof typeof PREFERENCE_DEFAULTS>(
  key: K,
): (typeof PREFERENCE_DEFAULTS)[K] {
  const { preferences } = usePreferenceCacheSync();
  return (
    (preferences[key] as (typeof PREFERENCE_DEFAULTS)[K]) ??
    PREFERENCE_DEFAULTS[key]
  );
}

/**
 * Get all user preferences (flattened into single object)
 *
 * @returns Object with all 35 preference fields
 *
 * @example
 * const preferences = useUserPreferences();
 * console.log(preferences.theme, preferences.defaultModel);
 */
export function useUserPreferences() {
  const { preferences } = usePreferenceCacheSync();
  return preferences;
}

/**
 * Get all preferences in a specific category
 *
 * @param category - Category name (e.g., "appearance", "models", "chat")
 * @returns Object with all preferences in that category
 *
 * @example
 * const audioPrefs = useUserPreferencesByCategory("audio");
 * console.log(audioPrefs.ttsEnabled, audioPrefs.ttsVoice);
 */
export function useUserPreferencesByCategory(category: string) {
  // Keep direct query - category filtering happens server-side
  // @ts-ignore - Type depth exceeded with Convex modules
  const prefs = useQuery(api.users.getUserPreferencesByCategory, { category });

  return prefs ?? {};
}
