import {
  PREFERENCE_CATEGORIES,
  PREFERENCE_DEFAULTS,
} from "@blah-chat/shared/preferences";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { useApiClient } from "@/lib/api/client";
import { cache } from "@/lib/cache";
import { queryKeys } from "@/lib/query/keys";

type UserPreferences = typeof PREFERENCE_DEFAULTS;

function mergePreferences(preferences?: Partial<UserPreferences> | null) {
  return {
    ...PREFERENCE_DEFAULTS,
    ...(preferences ?? {}),
  } satisfies UserPreferences;
}

function usePreferencesQuery() {
  const apiClient = useApiClient();

  return useQuery({
    queryKey: queryKeys.preferences.all,
    queryFn: () =>
      apiClient.get<Partial<UserPreferences>>("/api/v1/preferences"),
    staleTime: 30_000,
  });
}

export function usePreferenceSnapshot() {
  const cachedPreferences = useLiveQuery(
    () => cache.userPreferences.get("current"),
    [],
    null,
  );
  const preferencesQuery = usePreferencesQuery();

  useEffect(() => {
    if (!preferencesQuery.data) {
      return;
    }

    const nextPreferences = mergePreferences(preferencesQuery.data);

    void cache.userPreferences
      .get("current")
      .then((current) => {
        if (
          JSON.stringify(current?.data ?? null) ===
          JSON.stringify(nextPreferences)
        ) {
          return;
        }

        return cache.userPreferences.put({
          _id: "current",
          data: nextPreferences,
        });
      })
      .catch(console.error);
  }, [preferencesQuery.data]);

  return {
    preferences: mergePreferences(
      (cachedPreferences?.data as Partial<UserPreferences> | undefined) ??
        preferencesQuery.data,
    ),
    isLoading:
      cachedPreferences?.data === undefined && preferencesQuery.isLoading,
  };
}

export function useUserPreference<K extends keyof UserPreferences>(key: K) {
  const { preferences } = usePreferenceSnapshot();
  return preferences[key];
}

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

export function useUserPreferences() {
  const { preferences } = usePreferenceSnapshot();
  return preferences;
}

export function useUserPreferencesByCategory(category: string) {
  const { preferences } = usePreferenceSnapshot();

  return Object.fromEntries(
    Object.entries(preferences).filter(
      ([key]) => PREFERENCE_CATEGORIES[key] === category,
    ),
  );
}
