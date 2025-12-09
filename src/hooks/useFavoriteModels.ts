"use client";

import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function useFavoriteModels() {
  // @ts-ignore - Convex type instantiation depth issue
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
    } catch (err) {
      setLocalFavorites(current); // Rollback
      toast.error("Failed to update favorites");
    }
  };

  const isFavorite = (modelId: string) => localFavorites.includes(modelId);

  return { favorites: localFavorites, toggleFavorite, isFavorite };
}
