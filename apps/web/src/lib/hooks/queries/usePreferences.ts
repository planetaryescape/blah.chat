import { useQuery } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

export function usePreferences() {
  const sdk = useSDKClient();

  const restQuery = useQuery({
    queryKey: ["preferences"],
    queryFn: () => sdk.getPreferences(),
    staleTime: 60 * 60 * 1000,
  });

  return {
    data: restQuery.data,
    isLoading: restQuery.isLoading,
    error: restQuery.error,
    refetch: restQuery.refetch,
  };
}
