import { useQuery } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

export function useCurrentUser(options?: { enabled?: boolean }) {
  const sdk = useSDKClient();

  return useQuery({
    queryKey: ["current-user"],
    queryFn: () => sdk.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled,
  });
}
