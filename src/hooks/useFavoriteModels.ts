"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";

export function useFavoriteModels() {
  const user = useQuery(api.users.getCurrentUser);
  const updatePrefs = useMutation(api.users.updatePreferences);

  const [localFavorites, setLocalFavorites] = useState<string[]>([]);

  // Sync from Convex on load
  useEffect(() => {
    if (user?.preferences?.favoriteModels) {
      setLocalFavorites(user.preferences.favoriteModels);
    }
  }, [user?.preferences?.favoriteModels]);

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
