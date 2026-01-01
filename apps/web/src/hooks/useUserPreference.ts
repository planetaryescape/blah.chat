/**
 * Phase 4: User Preferences React Hooks
 *
 * Custom hooks for accessing user preferences from the flat key-value table.
 * Provides reactivity and automatic fallback to defaults.
 * Uses Dexie cache for instant reads, synced from Convex.
 */

import { api } from "@blah-chat/backend/convex/_generated/api";
import { PREFERENCE_DEFAULTS } from "@blah-chat/backend/convex/users/constants";
import { useQuery } from "convex/react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { cache } from "@/lib/cache";

/**
 * Get a single user preference by key
 *
 * Cache strategy:
 * 1. Return cached value for instant UI (no flash)
 * 2. Convex query runs in background
 * 3. When Convex returns, sync to cache
 * 4. useLiveQuery triggers re-render with fresh value
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
  // @ts-ignore - Type depth exceeded with Convex modules
  const convexValue = useQuery(api.users.getUserPreference, { key });

  // Read from Dexie cache (reactive via useLiveQuery)
  const cachedPreferences = useLiveQuery(
    () => cache.userPreferences.get("current"),
    [],
    null,
  );

  // Sync Convex → Dexie when Convex value changes
  useEffect(() => {
    if (convexValue === undefined) return; // Still loading

    const syncToCache = async () => {
      const current = await cache.userPreferences.get("current");
      const existingData = current?.data ?? {};

      // Only update if value actually changed
      if (existingData[key] !== convexValue) {
        await cache.userPreferences.put({
          _id: "current",
          data: { ...existingData, [key]: convexValue },
        });
      }
    };

    syncToCache().catch(console.error);
  }, [convexValue, key]);

  // Priority: cached (instant) → convex (reactive) → defaults
  if (cachedPreferences?.data?.[key] !== undefined) {
    return cachedPreferences.data[key] as (typeof PREFERENCE_DEFAULTS)[K];
  }
  return convexValue ?? PREFERENCE_DEFAULTS[key];
}

/**
 * Update preference cache optimistically.
 * Call this immediately when updating preferences for instant UI response.
 *
 * @example
 * await updatePreferenceCache("showMessageStatistics", true);
 * await updatePreferences({ preferences: { showMessageStatistics: true } });
 */
export async function updatePreferenceCache(
  key: string,
  value: unknown,
): Promise<void> {
  const current = await cache.userPreferences.get("current");
  const existingData = current?.data ?? {};
  await cache.userPreferences.put({
    _id: "current",
    data: { ...existingData, [key]: value },
  });
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
  // @ts-ignore - Type depth exceeded with Convex modules
  const preferences = useQuery(api.users.getAllUserPreferences);

  return preferences ?? PREFERENCE_DEFAULTS;
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
