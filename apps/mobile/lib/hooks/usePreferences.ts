import { PREFERENCE_DEFAULTS } from "@blah-chat/shared";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery as useTanstackQuery } from "@tanstack/react-query";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "@/lib/convex";
import { createMobileSdkClient } from "@/lib/transport/httpClient";
import { shouldUseConvexTransport } from "@/lib/transport/mode";

export type Preferences = typeof PREFERENCE_DEFAULTS;

export function usePreferences(): Preferences | undefined {
  const useConvexMode = shouldUseConvexTransport();
  const { getToken } = useAuth();

  const convexData = useConvexQuery(
    api.users.getAllUserPreferences,
    useConvexMode ? {} : "skip",
  );

  const httpQuery = useTanstackQuery({
    queryKey: ["mobile", "preferences"],
    enabled: !useConvexMode,
    staleTime: 30_000,
    queryFn: async () => {
      const client = createMobileSdkClient(() => getToken());
      return client.getPreferences();
    },
  });

  const raw = useConvexMode ? convexData : httpQuery.data;
  if (!raw) return undefined;

  return { ...PREFERENCE_DEFAULTS, ...raw } as Preferences;
}
