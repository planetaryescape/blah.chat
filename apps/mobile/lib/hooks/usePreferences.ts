import { PREFERENCE_DEFAULTS } from "@blah-chat/shared";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";
import { createMobileSdkClient } from "@/lib/transport/httpClient";

export type Preferences = typeof PREFERENCE_DEFAULTS;

export function usePreferences(): Preferences | undefined {
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["mobile", "preferences"],
    staleTime: 30_000,
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.getPreferences();
    },
  });

  if (!query.data) {
    return undefined;
  }

  return { ...PREFERENCE_DEFAULTS, ...query.data } as Preferences;
}
