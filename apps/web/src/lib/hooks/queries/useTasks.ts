import type { Task } from "@blah-chat/api-client";
import { useQuery } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

export function useTasks(params: { projectId?: string | null } = {}) {
  const sdk = useSDKClient();

  return useQuery<Task[]>({
    queryKey: ["tasks", params],
    queryFn: () => sdk.listTasks(params),
    staleTime: 10_000,
  });
}
