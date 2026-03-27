"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApiClient } from "@/lib/api/client";

export function useConversationIntegrationSelection(input: {
  conversationId?: string | null;
  initialSelectedIntegrationIds?: string[];
}) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [selectedIntegrationIds, setSelectedIntegrationIds] = useState<
    string[]
  >(input.initialSelectedIntegrationIds ?? []);

  const normalizedInitialSelection = useMemo(
    () => [...new Set(input.initialSelectedIntegrationIds ?? [])].sort(),
    [input.initialSelectedIntegrationIds],
  );

  useEffect(() => {
    setSelectedIntegrationIds(normalizedInitialSelection);
  }, [input.conversationId, normalizedInitialSelection]);

  const mutation = useMutation({
    mutationFn: async (nextSelectedIntegrationIds: string[]) => {
      if (!input.conversationId) {
        return nextSelectedIntegrationIds;
      }

      const result = await apiClient.patch<{
        selectedIntegrationIds?: string[];
      }>(`/api/v1/conversations/${input.conversationId}`, {
        selectedIntegrationIds: nextSelectedIntegrationIds,
      });

      return result.selectedIntegrationIds ?? nextSelectedIntegrationIds;
    },
    onSuccess: (nextSelectedIntegrationIds) => {
      setSelectedIntegrationIds(nextSelectedIntegrationIds);
      if (input.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["conversation-integration-events", input.conversationId],
        });
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update chat integrations",
      );
      setSelectedIntegrationIds(normalizedInitialSelection);
    },
  });

  const setSelection = useCallback(
    (nextSelectedIntegrationIds: string[]) => {
      const normalized = [...new Set(nextSelectedIntegrationIds)].sort();
      const previous = selectedIntegrationIds;
      setSelectedIntegrationIds(normalized);
      mutation.mutate(normalized, {
        onError: () => {
          setSelectedIntegrationIds(previous);
        },
      });
    },
    [mutation, selectedIntegrationIds],
  );

  const toggleIntegration = useCallback(
    (integrationId: string) => {
      if (mutation.isPending) {
        return;
      }

      setSelection(
        selectedIntegrationIds.includes(integrationId)
          ? selectedIntegrationIds.filter((id) => id !== integrationId)
          : [...selectedIntegrationIds, integrationId],
      );
    },
    [mutation.isPending, selectedIntegrationIds, setSelection],
  );

  return {
    selectedIntegrationIds,
    toggleIntegration,
    setSelection,
    isSaving: mutation.isPending,
  };
}
