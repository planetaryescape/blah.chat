"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { cache } from "@/lib/cache";

export function useProjectCacheSync() {
  const projects = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query
    api.projects.list,
  );

  useEffect(() => {
    if (projects === undefined) return;

    const syncCache = async () => {
      const convexIds = new Set(projects.map((project) => project._id));
      const dexieRecords = await cache.projects.toArray();

      const orphanIds = dexieRecords
        .filter((record) => !convexIds.has(record._id))
        .map((record) => record._id);

      if (orphanIds.length > 0) {
        await cache.projects.bulkDelete(orphanIds);
      }

      if (projects.length > 0) {
        await cache.projects.bulkPut(projects);
      }
    };

    syncCache().catch(console.error);
  }, [projects]);

  const cachedProjects = useLiveQuery(
    () => cache.projects.toArray(),
    [],
    [] as Doc<"projects">[],
  );

  return {
    projects: cachedProjects,
    isLoading: projects === undefined && cachedProjects.length === 0,
  };
}
