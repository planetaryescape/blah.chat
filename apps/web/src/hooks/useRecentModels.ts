"use client";

import { useEffect, useState } from "react";
import { useSDKClient } from "@/lib/api/sdkClient";
import { useUserPreference } from "./useUserPreference";

export function useRecentModels() {
  const recentModels = useUserPreference("recentModels");
  const sdk = useSDKClient();

  const [localRecents, setLocalRecents] = useState<string[]>([]);

  useEffect(() => {
    if (Array.isArray(recentModels)) {
      setLocalRecents(recentModels);
    }
  }, [recentModels]);

  const addRecent = async (modelId: string) => {
    if (localRecents[0] === modelId) return;

    const current = localRecents;
    const filtered = current.filter((id) => id !== modelId);
    const updated = [modelId, ...filtered].slice(0, 3);

    setLocalRecents(updated);

    try {
      await sdk.updatePreference("recentModels", updated);
    } catch (err) {
      setLocalRecents(current);
      console.error("Failed to update recent models", err);
    }
  };

  return { recents: localRecents, addRecent };
}
