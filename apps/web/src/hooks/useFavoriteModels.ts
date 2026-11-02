"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUserPreference } from "./useUserPreference";

export function useFavoriteModels() {
  const favoriteModels = useUserPreference("favoriteModels");
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePrefs = useMutation(api.users.updatePreferences);

  const [localFavorites, setLocalFavorites] = useState<string[]>([]);

  // Sync from Convex on load (ensure always array)
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

    // Optimistic update
    setLocalFavorites(updated);

    // Persist
    try {
      await updatePrefs({ preferences: { favoriteModels: updated } });
    } catch (_err) {
      setLocalFavorites(current); // Rollback
      toast.error("Failed to update favorites");
    }
  };

  const isFavorite = (modelId: string) => localFavorites.includes(modelId);

  return { favorites: localFavorites, toggleFavorite, isFavorite };
}
