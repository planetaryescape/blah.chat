import type { Template } from "@blah-chat/api-client";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

export type MobileTemplate = Template;

export function useTemplates() {
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["mobile", "templates"],
    staleTime: 60_000,
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.listTemplates();
    },
  });

  return (query.data ?? []) as MobileTemplate[];
}
