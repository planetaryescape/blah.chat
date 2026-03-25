import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
  };
}

export function useCreateTask() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateTasks();

  return useMutation({
    mutationFn: (payload: {
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
    }) => sdk.createTask(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTask() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateTasks();

  return useMutation({
    mutationFn: ({
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
    }) => sdk.updateTask(taskId, payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteTask() {
  const sdk = useSDKClient();
  const invalidate = useInvalidateTasks();

  return useMutation({
    mutationFn: (taskId: string) => sdk.deleteTask(taskId),
    onSuccess: () => invalidate(),
  });
}
