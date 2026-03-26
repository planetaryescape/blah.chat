import { useQuery } from "@tanstack/react-query";
import { useSDKClient } from "@/lib/api/sdkClient";

export function useTemplates(category?: string) {
  const sdk = useSDKClient();

  return useQuery({
    queryKey: ["templates", category],
    staleTime: 15_000,
    queryFn: () =>
      sdk.listTemplates(category && category !== "all" ? { category } : {}),
  });
}
