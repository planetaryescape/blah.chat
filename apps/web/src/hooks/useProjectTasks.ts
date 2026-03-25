import type { Task } from "@blah-chat/api-client";
import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
} from "@/lib/hooks/mutations/useTaskMutations";
import { useTasks } from "@/lib/hooks/queries/useTasks";

export type ProjectTask = Task;

export function useProjectTasks(projectId: string | null) {
  const query = useTasks({ projectId });
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createTask: (payload: {
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
    }) => {
      if (!projectId) {
        return Promise.reject(new Error("Project ID required"));
      }
      return createMutation.mutateAsync({ ...payload, projectId });
    },
    updateTask: updateMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
