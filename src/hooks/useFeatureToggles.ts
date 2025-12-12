import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Custom hook for accessing feature visibility preferences.
 * Returns feature toggles with safe defaults (all enabled).
 *
 * @returns Feature toggle states and loading status
 */
export function useFeatureToggles() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);

  return {
    showNotes: user?.preferences?.showNotes ?? true,
    showTemplates: user?.preferences?.showTemplates ?? true,
    showProjects: user?.preferences?.showProjects ?? true,
    showBookmarks: user?.preferences?.showBookmarks ?? true,
    isLoading: user === undefined,
  };
}
