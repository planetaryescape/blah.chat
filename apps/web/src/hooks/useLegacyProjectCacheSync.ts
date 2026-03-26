"use client";

import { useProjects } from "@/lib/hooks/queries/useProjects";

/**
 * @deprecated Thin wrapper over REST hook. Use `useProjects()` directly.
 */
export function useProjectCacheSync() {
  const { data: projects, isLoading } = useProjects();

  return {
    projects: projects ?? [],
    isLoading,
  };
}
