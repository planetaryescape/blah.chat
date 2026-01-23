"use client";

import { DEFAULT_MODEL_ID } from "@/lib/ai/operational-models";
import { useRecentModels } from "./useRecentModels";
import { useUserPreference } from "./useUserPreference";

/**
 * Hook to get the appropriate model for new chat creation.
 * Respects user's preference for "fixed" (default model) or "recent" (last used model).
 *
 * Phase 4: Now reads from userPreferences table via useUserPreference hooks.
 */
export function useNewChatModel() {
  // Phase 4: Read from userPreferences table
  const mode = useUserPreference("newChatModelSelection") ?? "fixed";
  const defaultModel = useUserPreference("defaultModel") ?? DEFAULT_MODEL_ID;

  const { recents } = useRecentModels();
  const recentModel = recents?.[0]; // Most recently used (defensive)

  // Return model based on user's preference
  // Falls back to default if no recent model exists
  const newChatModel =
    mode === "recent" && recentModel ? recentModel : defaultModel;

  return {
    newChatModel,
    mode,
    isLoading: mode === undefined || defaultModel === undefined,
  };
}
