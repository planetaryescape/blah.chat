import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectTask } from "./useProjectTasks";

export type { ProjectTask };

async function readEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as {
    data?: T;
    error?: string;
  };

  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error || "Request failed");
  }

  return payload.data;
}

async function listTasks() {
  const response = await fetch("/api/v1/tasks", { method: "GET" });
  const items = await readEnvelope<Array<{ data: ProjectTask }>>(response);
  return items.map((item) => item.data);
}

export function useTasks() {
  const queryClient = useQueryClient();
  const queryKey = ["tasks"];
  const query = useQuery<ProjectTask[]>({
    queryKey,
    queryFn: listTasks,
    staleTime: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      status?:
        | "suggested"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled";
      urgency?: "low" | "medium" | "high" | "urgent";
      deadline?: number;
      deadlineSource?: string;
      tags?: string[];
      projectId?: string | null;
    }) => {
      const response = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return readEnvelope<ProjectTask>(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      taskId,
      ...payload
    }: {
      taskId: string;
      title?: string;
      description?: string;
      status?:
        | "suggested"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled";
      urgency?: "low" | "medium" | "high" | "urgent";
      deadline?: number;
      deadlineSource?: string;
      tags?: string[];
    }) => {
      const response = await fetch(
        `/api/v1/tasks/${encodeURIComponent(taskId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      return readEnvelope<ProjectTask>(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(
        `/api/v1/tasks/${encodeURIComponent(taskId)}`,
        {
          method: "DELETE",
        },
      );
      return readEnvelope<{ deleted: boolean; taskId: string }>(response);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createTask: createMutation.mutateAsync,
    updateTask: updateMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
