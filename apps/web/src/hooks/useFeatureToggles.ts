import { api } from "@blah-chat/backend/convex/_generated/api";
import { PREFERENCE_DEFAULTS } from "@blah-chat/backend/convex/users/constants";
import { useQuery } from "convex/react";

/**
 * Custom hook for accessing feature visibility preferences.
 * Returns feature toggles with safe defaults (all enabled) and loading state.
 *
 * @returns Feature toggle states and loading indicator
 */
export function useFeatureToggles() {
  // @ts-ignore - Type depth exceeded with Convex modules
  const prefs = useQuery(api.users.getAllUserPreferences);

  // True while preferences are being fetched from server
  const isLoading = prefs === undefined;

  return {
    isLoading,
    showNotes: prefs?.showNotes ?? PREFERENCE_DEFAULTS.showNotes,
    showTemplates: prefs?.showTemplates ?? PREFERENCE_DEFAULTS.showTemplates,
    showProjects: prefs?.showProjects ?? PREFERENCE_DEFAULTS.showProjects,
    showBookmarks: prefs?.showBookmarks ?? PREFERENCE_DEFAULTS.showBookmarks,
  };
}
