"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/useDebounce";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { Priority } from "@/lib/constants/feedback";
import { useMutation, useQuery } from "convex/react";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function useFeedbackAdmin() {
  const [selectedId, setSelectedId] = useState<Id<"feedback"> | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const { isMobile } = useMobileDetect();

  // URL-persisted filters
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

  // Debounced search
  const searchQuery = useDebounce(searchParam, 300);

  // Keyboard navigation index
  const [_keyboardIndex, setKeyboardIndex] = useState(-1);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelectionMode = selectedIds.size > 0;

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    statusFilter || typeFilter || priorityFilter || searchParam,
  );

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter(null);
    setTypeFilter(null);
    setPriorityFilter(null);
    setSearchParam("");
  };

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const feedbackList = useQuery(api.feedback.listFeedback, {
    status: (statusFilter as any) || undefined,
    feedbackType: (typeFilter as any) || undefined,
    priority: (priorityFilter as any) || undefined,
    searchQuery: searchQuery || undefined,
    sortBy: (sortBy as any) || "createdAt",
    sortOrder: (sortOrder as any) || "desc",
  });

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const feedbackCounts = useQuery(api.feedback.getFeedbackCounts, {});

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const selectedFeedback = useQuery(
    api.feedback.getFeedback,
    selectedId ? { feedbackId: selectedId } : "skip",
  );

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateStatus = useMutation(api.feedback.updateFeedbackStatus);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePriority = useMutation(api.feedback.updateFeedbackPriority);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const bulkUpdateStatus = useMutation(api.feedback.bulkUpdateStatus);

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const archiveFeedback = useMutation(api.feedback.archiveFeedback);
  const acceptTriage = useMutation(
    (api.feedback as any).triage.acceptTriageSuggestion,
  );

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedId) return;
    await updateStatus({ feedbackId: selectedId, status: newStatus as any });
  };

  const handlePriorityChange = async (newPriority: Priority) => {
    if (!selectedId) return;
    await updatePriority({ feedbackId: selectedId, priority: newPriority });
  };

  const handleSelect = (id: Id<"feedback">) => {
    setSelectedId(id);
    if (isMobile) setMobileView("detail");
  };

  // Bulk selection handlers
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
    if (feedbackList) {
      setSelectedIds(new Set(feedbackList.map((f: any) => f._id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkStatusChange = async (status: string) => {
    if (selectedIds.size === 0) return;
    try {
      await bulkUpdateStatus({
        feedbackIds: Array.from(selectedIds) as Id<"feedback">[],
        status: status as any,
      });
      toast.success(`Updated ${selectedIds.size} items`);
      clearSelection();
    } catch (_error) {
      toast.error("Failed to update status");
    }
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    try {
      if (!confirm("Are you sure you want to archive these items?")) return;

      for (const id of selectedIds) {
        await archiveFeedback({ feedbackId: id as Id<"feedback"> });
      }
      toast.success(`Archived ${selectedIds.size} items`);
      clearSelection();
    } catch (_error) {
      toast.error("Failed to archive items");
    }
  };

  const handleAcceptTriage = async (args: {
    acceptPriority?: boolean;
    acceptTags?: boolean;
  }) => {
    if (!selectedId) return;
    try {
      await acceptTriage({
        feedbackId: selectedId,
        ...args,
      });
      toast.success("Applied AI suggestion");
    } catch (_error) {
      toast.error("Failed to apply suggestion");
    }
  };

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  }, [sortOrder, setSortOrder]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const list = feedbackList || [];

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
  }, [feedbackList]);

  // Sync keyboard index when selection changes
  useEffect(() => {
    if (selectedId && feedbackList) {
      const index = feedbackList.findIndex((f: any) => f._id === selectedId);
      if (index !== -1) setKeyboardIndex(index);
    }
  }, [selectedId, feedbackList]);

  return {
    state: {
      selectedId,
      setSelectedId, // Exposed for manual clearing
      mobileView,
      setMobileView, // Exposed for back button
      isMobile,
      statusFilter,
      typeFilter,
      priorityFilter,
      searchParam,
      sortBy,
      sortOrder,
      feedbackList,
      feedbackCounts,
      selectedFeedback,
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
