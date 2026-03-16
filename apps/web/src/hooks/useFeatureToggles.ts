import { PREFERENCE_DEFAULTS } from "@blah-chat/shared/preferences";
import { usePreferenceSnapshot } from "./useUserPreference";

export function useFeatureToggles() {
  const { preferences: prefs, isLoading } = usePreferenceSnapshot();

  return {
    isLoading,
    showNotes: prefs.showNotes ?? PREFERENCE_DEFAULTS.showNotes,
    showTemplates: prefs.showTemplates ?? PREFERENCE_DEFAULTS.showTemplates,
    showProjects: prefs.showProjects ?? PREFERENCE_DEFAULTS.showProjects,
    showBookmarks: prefs.showBookmarks ?? PREFERENCE_DEFAULTS.showBookmarks,
  };
}
