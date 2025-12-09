"use client";

import { api } from "@/convex/_generated/api";
import { DEFAULT_MODEL_ID } from "@/lib/ai/operational-models";
import { useQuery } from "convex/react";
import { useRecentModels } from "./useRecentModels";

/**
 * Hook to get the appropriate model for new chat creation.
 * Respects user's preference for "fixed" (default model) or "recent" (last used model).
 */
export function useNewChatModel() {
  // @ts-ignore - Convex type instantiation depth issue
  const user = useQuery(api.users.getCurrentUser);
  const { recents } = useRecentModels();

  const mode = user?.preferences?.newChatModelSelection ?? "fixed";
  const defaultModel = user?.preferences?.defaultModel ?? DEFAULT_MODEL_ID;
  const recentModel = recents[0]; // Most recently used

  // Return model based on user's preference
  // Falls back to default if no recent model exists
  const newChatModel =
    mode === "recent" && recentModel ? recentModel : defaultModel;

  return {
    newChatModel,
    mode,
    isLoading: user === undefined,
  };
}
