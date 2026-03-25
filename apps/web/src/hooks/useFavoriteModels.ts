"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSDKClient } from "@/lib/api/sdkClient";
import { useUserPreference } from "./useUserPreference";

export function useFavoriteModels() {
  const favoriteModels = useUserPreference("favoriteModels");
  const sdk = useSDKClient();

  const [localFavorites, setLocalFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (Array.isArray(favoriteModels)) {
      setLocalFavorites(favoriteModels);
    }
  }, [favoriteModels]);

  const toggleFavorite = async (modelId: string) => {
    const current = localFavorites;
    const updated = current.includes(modelId)
      ? current.filter((id) => id !== modelId)
      : [...current, modelId];

    setLocalFavorites(updated);

    try {
      await sdk.updatePreference("favoriteModels", updated);
    } catch (_err) {
      setLocalFavorites(current);
      toast.error("Failed to update favorites");
    }
  };

  const isFavorite = (modelId: string) => localFavorites.includes(modelId);

  return { favorites: localFavorites, toggleFavorite, isFavorite };
}
