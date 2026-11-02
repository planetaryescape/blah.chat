"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";
import { useEffect, useState } from "react";
import { useAccessibilitySettings } from "@/hooks/useAccessibilitySettings";
import { cleanupOldData } from "@/lib/cache/cleanup";
import { UserCacheContext } from "@/lib/cache/context";
import { BlahChatCache, setActiveCache } from "@/lib/cache/db";

export function CacheProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isLoaded && userId && isAuthenticated && !isLoading ? {} : "skip",
  );

  // Fail closed while Clerk/Convex disagree, including an account switch.
  if (!isLoaded || isLoading) return null;
  if (!userId)
    return (
      <IdentityCache
        key="signed-out"
        userId={`signed-out-${crypto.randomUUID()}`}
      >
        {children}
      </IdentityCache>
    );
  if (
    !isAuthenticated ||
    user === undefined ||
    (user && user.clerkId !== userId)
  ) {
    return null;
  }

  return (
    <IdentityCache key={userId} userId={userId}>
      {children}
    </IdentityCache>
  );
}

function IdentityCache({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [cache] = useState(() => new BlahChatCache(userId));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setActiveCache(cache);
    setReady(true);
    cleanupOldData(cache).catch(console.error);
    return () => setActiveCache(null);
  }, [cache]);

  if (!ready) return null;
  return (
    <UserCacheContext.Provider value={cache}>
      <ConvexQueryCacheProvider expiration={60000} maxIdleEntries={100}>
        <CacheSettings>{children}</CacheSettings>
      </ConvexQueryCacheProvider>
    </UserCacheContext.Provider>
  );
}

function CacheSettings({ children }: { children: React.ReactNode }) {
  useAccessibilitySettings();
  return <>{children}</>;
}
