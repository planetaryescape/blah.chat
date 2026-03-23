"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import type { Priority } from "@/lib/constants/feedback";

type FeedbackListItem = {
  _id: string;
  userName: string;
  userEmail: string;
  feedbackType: string;
  description: string;
  status: string;
  priority: string;
  createdAt: number;
  updatedAt: number;
};

type FeedbackCounts = Record<string, number>;
type FeedbackDetail = FeedbackListItem & {
  page: string;
  whatTheyDid?: string;
  whatTheySaw?: string;
  whatTheyExpected?: string;
  screenshotKey?: string;
  screenshotUrl?: string;
  userSuggestedUrgency?: string;
  tags?: string[];
  aiTriage?: {
    suggestedPriority?: string;
    suggestedTags?: string[];
    triageNotes?: string;
    sentiment?: string;
    category?: string;
    createdAt: number;
  };
  errorContext?: Record<string, unknown>;
};

async function readEnvelope<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as {
    data?: T;
    error?: string;
  };

  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error || "Request failed");
  }

  return payload.data;
}

export function useFeedbackAdmin() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const { isMobile } = useMobileDetect();

  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString,
  );
  const [typeFilter, setTypeFilter] = useQueryState("type", parseAsString);
  const [priorityFilter, setPriorityFilter] = useQueryState(
    "priority",
    parseAsString,
  );
  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const [sortBy, setSortBy] = useQueryState(
    "sort",
    parseAsString.withDefault("createdAt"),
  );
  const [sortOrder, setSortOrder] = useQueryState(
    "order",
    parseAsString.withDefault("desc"),
  );

  const [searchQuery] = useDebounceValue(searchParam, 300);
  const [_keyboardIndex, setKeyboardIndex] = useState(-1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelectionMode = selectedIds.size > 0;

  const hasActiveFilters = Boolean(
    statusFilter || typeFilter || priorityFilter || searchParam,
  );

  const clearFilters = () => {
    setStatusFilter(null);
    setTypeFilter(null);
    setPriorityFilter(null);
    setSearchParam("");
  };

  const feedbackListQuery = useQuery<FeedbackListItem[]>({
    queryKey: [
      "feedback-list",
      {
        statusFilter,
        typeFilter,
        priorityFilter,
        searchQuery,
        sortBy,
        sortOrder,
      },
    ],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (statusFilter) search.set("status", statusFilter);
      if (typeFilter) search.set("type", typeFilter);
      if (priorityFilter) search.set("priority", priorityFilter);
      if (searchQuery) search.set("q", searchQuery);
      if (sortBy) search.set("sort", sortBy);
      if (sortOrder) search.set("order", sortOrder);
      const response = await fetch(
        `/api/v1/admin/feedback?${search.toString()}`,
      );
      const items =
        await readEnvelope<Array<{ data: FeedbackListItem }>>(response);
      return items.map((item) => item.data);
    },
  });

  const feedbackCountsQuery = useQuery<FeedbackCounts>({
    queryKey: ["feedback-counts"],
    queryFn: async () => {
      const response = await fetch("/api/v1/admin/feedback/counts");
      return readEnvelope<FeedbackCounts>(response);
    },
    staleTime: 10_000,
  });

  const selectedFeedbackQuery = useQuery<FeedbackDetail | null>({
    queryKey: ["feedback-detail", selectedId],
    queryFn: async () => {
      if (!selectedId) {
        return null;
      }
      const response = await fetch(
        `/api/v1/admin/feedback/${encodeURIComponent(selectedId)}`,
      );
      return readEnvelope<FeedbackDetail>(response);
    },
    enabled: Boolean(selectedId),
  });

  const invalidateFeedbackQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["feedback-list"] }),
      queryClient.invalidateQueries({ queryKey: ["feedback-counts"] }),
      selectedId
        ? queryClient.invalidateQueries({
            queryKey: ["feedback-detail", selectedId],
          })
        : Promise.resolve(),
    ]);
  }, [queryClient, selectedId]);

  const postJson = useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      const response = await fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      });
      return readEnvelope<T>(response);
    },
    [],
  );

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedId) return;
    await postJson(`/api/v1/admin/feedback/${selectedId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    await invalidateFeedbackQueries();
  };

  const handlePriorityChange = async (newPriority: Priority) => {
    if (!selectedId) return;
    await postJson(`/api/v1/admin/feedback/${selectedId}/priority`, {
      method: "PATCH",
      body: JSON.stringify({ priority: newPriority }),
    });
    await invalidateFeedbackQueries();
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (isMobile) setMobileView("detail");
  };

  const toggleItemSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (feedbackListQuery.data) {
      setSelectedIds(new Set(feedbackListQuery.data.map((f) => f._id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkStatusChange = async (status: string) => {
    if (selectedIds.size === 0) return;
    try {
      await postJson("/api/v1/admin/feedback/bulk-status", {
        method: "POST",
        body: JSON.stringify({
          feedbackIds: Array.from(selectedIds),
          status,
        }),
      });
      await invalidateFeedbackQueries();
      toast.success(`Updated ${selectedIds.size} items`);
      clearSelection();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          postJson(`/api/v1/admin/feedback/${id}/archive`, {
            method: "POST",
            body: JSON.stringify({}),
          }),
        ),
      );
      await invalidateFeedbackQueries();
      toast.success(`Archived ${selectedIds.size} items`);
      clearSelection();
    } catch {
      toast.error("Failed to archive items");
    }
  };

  const handleAcceptTriage = async (args: {
    acceptPriority?: boolean;
    acceptTags?: boolean;
  }) => {
    if (!selectedId) return;
    try {
      await postJson(`/api/v1/admin/feedback/${selectedId}/accept-triage`, {
        method: "POST",
        body: JSON.stringify(args),
      });
      await invalidateFeedbackQueries();
      toast.success("Applied AI suggestion");
    } catch {
      toast.error("Failed to apply suggestion");
    }
  };

  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  }, [sortOrder, setSortOrder]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const list = feedbackListQuery.data || [];

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setKeyboardIndex((prev) => {
            const next = prev + 1;
            if (next < list.length) {
              setSelectedId(list[next]._id);
              return next;
            }
            return prev;
          });
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setKeyboardIndex((prev) => {
            const next = prev - 1;
            if (next >= 0) {
              setSelectedId(list[next]._id);
              return next;
            }
            return prev;
          });
          break;
        case "Escape":
          setSelectedId(null);
          setKeyboardIndex(-1);
          break;
        case "/":
          e.preventDefault();
          document
            .querySelector<HTMLInputElement>("[data-search-input]")
            ?.focus();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [feedbackListQuery.data]);

  useEffect(() => {
    if (selectedId && feedbackListQuery.data) {
      const index = feedbackListQuery.data.findIndex(
        (f) => f._id === selectedId,
      );
      if (index !== -1) setKeyboardIndex(index);
    }
  }, [selectedId, feedbackListQuery.data]);

  return {
    state: {
      selectedId,
      setSelectedId,
      mobileView,
      setMobileView,
      isMobile,
      statusFilter,
      typeFilter,
      priorityFilter,
      searchParam,
      sortBy,
      sortOrder,
      feedbackList: feedbackListQuery.data,
      feedbackCounts: feedbackCountsQuery.data,
      selectedFeedback: selectedFeedbackQuery.data,
      selectedIds,
      isSelectionMode,
      hasActiveFilters,
    },
    actions: {
      setStatusFilter,
      setTypeFilter,
      setPriorityFilter,
      setSearchParam,
      setSortBy,
      toggleSortOrder,
      clearFilters,
      handleStatusChange,
      handlePriorityChange,
      handleSelect,
      toggleItemSelection,
      selectAll,
      clearSelection,
      handleBulkStatusChange,
      handleBulkArchive,
      handleAcceptTriage,
    },
  };
}
