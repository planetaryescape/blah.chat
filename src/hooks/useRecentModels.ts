"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
// import { toast } from "sonner"; // Optional notification on error

export function useRecentModels() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePrefs = useMutation(api.users.updatePreferences);

  const [localRecents, setLocalRecents] = useState<string[]>([]);

  // Sync from Convex on load
  useEffect(() => {
    if (user?.preferences?.recentModels) {
      setLocalRecents(user.preferences.recentModels);
    }
  }, [user?.preferences?.recentModels]);

  const addRecent = async (modelId: string) => {
    // If it's already the most recent, do nothing
    if (localRecents[0] === modelId) return;

    const current = localRecents;

    // Remove if exists, prepend new, limit to 3
    const filtered = current.filter((id) => id !== modelId);
    const updated = [modelId, ...filtered].slice(0, 3);

    // Optimistic update
    setLocalRecents(updated);

    // Persist
    try {
      await updatePrefs({ preferences: { recentModels: updated } });
    } catch (err) {
      setLocalRecents(current); // Rollback
      console.error("Failed to update recent models", err);
    }
  };

  return { recents: localRecents, addRecent };
}
