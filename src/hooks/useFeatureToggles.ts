import { useUserPreference } from "./useUserPreference";

/**
 * Custom hook for accessing feature visibility preferences.
 * Returns feature toggles with safe defaults (all enabled).
 *
 * @returns Feature toggle states
 */
export function useFeatureToggles() {
  const showNotes = useUserPreference("showNotes");
  const showTemplates = useUserPreference("showTemplates");
  const showProjects = useUserPreference("showProjects");
  const showBookmarks = useUserPreference("showBookmarks");
  const showSlides = useUserPreference("showSlides");

  return {
    showNotes,
    showTemplates,
    showProjects,
    showBookmarks,
    showSlides,
  };
}
