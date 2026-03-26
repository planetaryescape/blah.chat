import type { Project, ProjectStats } from "@blah-chat/api-client";
import { useQuery } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

export function useProjects() {
  const sdk = useSDKClient();

  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => sdk.listProjects(),
    staleTime: 10_000,
  });
}

export function useProject(projectId: string | null | undefined) {
  const sdk = useSDKClient();

  return useQuery<Project>({
    queryKey: ["projects", projectId],
    queryFn: () => sdk.getProject(projectId!),
    enabled: !!projectId,
    staleTime: 10_000,
  });
}

export function useProjectStats(projectId: string | null | undefined) {
  const sdk = useSDKClient();

  return useQuery<ProjectStats>({
    queryKey: ["projects", projectId, "stats"],
    queryFn: () => sdk.getProjectStats(projectId!),
    enabled: !!projectId,
    staleTime: 10_000,
  });
}
