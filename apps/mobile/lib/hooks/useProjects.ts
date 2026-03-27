import type { Project, ProjectStats } from "@blah-chat/api-client";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import type { Id } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

export function useProjects() {
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["mobile", "projects"],
    staleTime: 30_000,
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.listProjects();
    },
  });

  return query.data as Project[] | undefined;
}

export function useProject(projectId: Id<"projects"> | null) {
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["mobile", "project", projectId],
    enabled: !!projectId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!projectId) {
        return null;
      }

      const client = createMobileSdkClient(() => getToken());
      return client.getProject(projectId);
    },
  });

  return query.data as Project | null | undefined;
}

export function useProjectStats(projectId: Id<"projects"> | null) {
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["mobile", "project-stats", projectId],
    enabled: !!projectId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!projectId) {
        return null;
      }

      const client = createMobileSdkClient(() => getToken());
      return client.getProjectStats(projectId);
    },
  });

  return query.data as ProjectStats | null | undefined;
}
