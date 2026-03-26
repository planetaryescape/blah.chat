import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

function useInvalidateProjects() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };
}

export function useCreateProject() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateProjects();

  return useMutation({
    mutationFn: (payload: {
      name: string;
      description?: string;
      systemPrompt?: string;
      isTemplate?: boolean;
    }) => sdk.createProject(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateProject() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateProjects();

  return useMutation({
    mutationFn: ({
      projectId,
      ...payload
    }: {
      projectId: string;
      name?: string;
      description?: string;
      systemPrompt?: string;
    }) => sdk.updateProject(projectId, payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteProject() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateProjects();

  return useMutation({
    mutationFn: (projectId: string) => sdk.deleteProject(projectId),
    onSuccess: () => invalidate(),
  });
}

export function useAssignConversations() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateProjects();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      ...payload
    }: {
      projectId: string;
      conversationIds: string[];
      targetProjectId?: string | null;
    }) =>
      sdk.assignConversationsToProject(projectId, {
        projectId: payload.targetProjectId ?? projectId,
        conversationIds: payload.conversationIds,
      }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
