"use client";

import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Bug,
  CheckSquare,
  ChevronLeft,
  Filter,
  Heart,
  Lightbulb,
  MessageCircle,
  MessageSquare,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/useDebounce";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES & CONFIGURATIONS
// ============================================================================

type FeedbackType = "bug" | "feature" | "praise" | "other";
type Priority = "critical" | "high" | "medium" | "low" | "none";

// Status values by type for the dropdown
const STATUS_BY_TYPE: Record<FeedbackType, string[]> = {
  bug: [
    "new",
    "triaging",
    "in-progress",
    "resolved",
    "verified",
    "closed",
    "wont-fix",
    "duplicate",
    "cannot-reproduce",
  ],
  feature: [
    "submitted",
    "under-review",
    "planned",
    "in-progress",
    "shipped",
    "declined",
    "maybe-later",
  ],
  praise: ["received", "acknowledged", "shared"],
  other: ["new", "reviewed", "actioned", "closed"],
};

// Human-readable status labels
const STATUS_LABELS: Record<string, string> = {
  new: "New",
  triaging: "Triaging",
  "in-progress": "In Progress",
  resolved: "Resolved",
  verified: "Verified",
  closed: "Closed",
  "wont-fix": "Won't Fix",
  duplicate: "Duplicate",
  "cannot-reproduce": "Cannot Reproduce",
  submitted: "Submitted",
  "under-review": "Under Review",
  planned: "Planned",
  shipped: "Shipped",
  declined: "Declined",
  "maybe-later": "Maybe Later",
  received: "Received",
  acknowledged: "Acknowledged",
  shared: "Shared",
  reviewed: "Reviewed",
  actioned: "Actioned",
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
  // Bug statuses
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  triaging: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "in-progress": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  resolved: "bg-green-500/10 text-green-500 border-green-500/20",
  verified: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  "wont-fix": "bg-gray-500/10 text-gray-500 border-gray-500/20",
  duplicate: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "cannot-reproduce": "bg-gray-500/10 text-gray-500 border-gray-500/20",
  // Feature statuses
  submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "under-review": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  planned: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  shipped: "bg-green-500/10 text-green-500 border-green-500/20",
  declined: "bg-red-500/10 text-red-500 border-red-500/20",
  "maybe-later": "bg-gray-500/10 text-gray-500 border-gray-500/20",
  // Praise statuses
  received: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  acknowledged: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  shared: "bg-green-500/10 text-green-500 border-green-500/20",
  // General
  reviewed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  actioned: "bg-green-500/10 text-green-500 border-green-500/20",
};

const TYPE_CONFIG: Record<
  FeedbackType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  bug: {
    label: "Bug",
    icon: <Bug className="h-3 w-3" />,
    color: "bg-red-500/10 text-red-500",
  },
  feature: {
    label: "Feature",
    icon: <Lightbulb className="h-3 w-3" />,
    color: "bg-purple-500/10 text-purple-500",
  },
  praise: {
    label: "Praise",
    icon: <Heart className="h-3 w-3" />,
    color: "bg-pink-500/10 text-pink-500",
  },
  other: {
    label: "Other",
    icon: <MessageCircle className="h-3 w-3" />,
    color: "bg-gray-500/10 text-gray-500",
  },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  critical: {
    label: "Critical",
    color: "bg-red-500/10 text-red-500 border-red-500",
  },
  high: {
    label: "High",
    color: "bg-orange-500/10 text-orange-500 border-orange-500",
  },
  medium: {
    label: "Medium",
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500",
  },
  low: {
    label: "Low",
    color: "bg-green-500/10 text-green-500 border-green-500",
  },
  none: {
    label: "None",
    color: "bg-gray-500/10 text-gray-500 border-gray-500",
  },
};

// ============================================================================
// COMPONENTS
// ============================================================================

function FeedbackListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-3 border rounded-lg space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function FeedbackPageContent() {
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
  const [keyboardIndex, setKeyboardIndex] = useState(-1);

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

  const feedbackList = useQuery(api.feedback.listFeedback, {
    status: (statusFilter as any) || undefined,
    feedbackType: (typeFilter as any) || undefined,
    priority: (priorityFilter as any) || undefined,
    searchQuery: searchQuery || undefined,
    sortBy: (sortBy as any) || "createdAt",
    sortOrder: (sortOrder as any) || "desc",
  });

  const feedbackCounts = useQuery(api.feedback.getFeedbackCounts, {});

  const selectedFeedback = useQuery(
    api.feedback.getFeedback,
    selectedId ? { feedbackId: selectedId } : "skip",
  );

  const updateStatus = useMutation(api.feedback.updateFeedbackStatus);
  const updatePriority = useMutation(api.feedback.updateFeedbackPriority);
  const bulkUpdateStatus = useMutation(api.feedback.bulkUpdateStatus);

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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

  // Mobile view
  if (isMobile) {
    if (mobileView === "detail" && selectedFeedback) {
      return (
        <div className="flex flex-col h-[100dvh]">
          <div className="border-b p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileView("list")}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Feedback
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <FeedbackDetail
              feedback={selectedFeedback}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onAcceptTriage={handleAcceptTriage}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[100dvh]">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Feedback</h1>
            {feedbackCounts && (
              <Badge variant="secondary">{feedbackCounts.total} total</Badge>
            )}
          </div>
          <FilterBar
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            searchParam={searchParam}
            setSearchParam={setSearchParam}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            toggleSortOrder={toggleSortOrder}
            counts={feedbackCounts}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
          />
        </div>
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={feedbackList?.length || 0}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkArchive={handleBulkArchive}
        />
        <div className="flex-1 overflow-auto">
          {feedbackList === undefined ? (
            <FeedbackListSkeleton />
          ) : feedbackList.length === 0 ? (
            <EmptyState hasFilters={hasActiveFilters} />
          ) : (
            <FeedbackList
              items={feedbackList}
              selectedId={selectedId}
              onSelect={handleSelect}
              selectedIds={selectedIds}
              onToggleSelection={toggleItemSelection}
              isSelectionMode={isSelectionMode}
            />
          )}
        </div>
      </div>
    );
  }

  // Desktop: Two-column layout
  return (
    <div className="flex h-screen">
      {/* Left Sidebar: Feedback List */}
      <aside className="w-96 border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Feedback</h1>
            {feedbackCounts && (
              <Badge variant="secondary">{feedbackCounts.total} total</Badge>
            )}
          </div>
          <FilterBar
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            searchParam={searchParam}
            setSearchParam={setSearchParam}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            toggleSortOrder={toggleSortOrder}
            counts={feedbackCounts}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
          />
        </div>
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={feedbackList?.length || 0}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkArchive={handleBulkArchive}
        />
        <div className="flex-1 overflow-auto">
          {feedbackList === undefined ? (
            <FeedbackListSkeleton />
          ) : feedbackList.length === 0 ? (
            <EmptyState hasFilters={hasActiveFilters} />
          ) : (
            <FeedbackList
              items={feedbackList}
              selectedId={selectedId}
              onSelect={setSelectedId}
              selectedIds={selectedIds}
              onToggleSelection={toggleItemSelection}
              isSelectionMode={isSelectionMode}
            />
          )}
        </div>
      </aside>

      {/* Main Content: Detail View */}
      <main className="flex-1 overflow-auto p-6">
        {selectedFeedback ? (
          <FeedbackDetail
            feedback={selectedFeedback}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onAcceptTriage={handleAcceptTriage}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4" />
            <p>Select a feedback item to view details</p>
          </div>
        )}
      </main>
    </div>
  );
}

function FilterBar({
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  priorityFilter,
  setPriorityFilter,
  searchParam,
  setSearchParam,
  sortBy,
  setSortBy,
  sortOrder,
  toggleSortOrder,
  counts,
  hasActiveFilters,
  clearFilters,
}: {
  statusFilter: string | null;
  setStatusFilter: (v: string | null) => void;
  typeFilter: string | null;
  setTypeFilter: (v: string | null) => void;
  priorityFilter: string | null;
  setPriorityFilter: (v: string | null) => void;
  searchParam: string;
  setSearchParam: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  sortOrder: string;
  toggleSortOrder: () => void;
  counts?: Record<string, number>;
  hasActiveFilters: boolean;
  clearFilters: () => void;
}) {
  // Get all unique statuses based on selected type or all types
  const availableStatuses = useMemo(() => {
    if (typeFilter) {
      return STATUS_BY_TYPE[typeFilter as FeedbackType] || [];
    }
    // Return all unique statuses
    return [...new Set(Object.values(STATUS_BY_TYPE).flat())];
  }, [typeFilter]);

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search feedback... (press / to focus)"
          value={searchParam}
          onChange={(e) => setSearchParam(e.target.value)}
          className="pl-8 h-9"
          data-search-input
        />
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-2">
        {/* Type filter */}
        <Select
          value={typeFilter || "all"}
          onValueChange={(v) => setTypeFilter(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="bug">
              <span className="flex items-center gap-1">
                <Bug className="h-3 w-3" /> Bug{" "}
                {counts?.[`type_bug`] ? `(${counts[`type_bug`]})` : ""}
              </span>
            </SelectItem>
            <SelectItem value="feature">
              <span className="flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Feature{" "}
                {counts?.[`type_feature`] ? `(${counts[`type_feature`]})` : ""}
              </span>
            </SelectItem>
            <SelectItem value="praise">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" /> Praise{" "}
                {counts?.[`type_praise`] ? `(${counts[`type_praise`]})` : ""}
              </span>
            </SelectItem>
            <SelectItem value="other">
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" /> Other{" "}
                {counts?.[`type_other`] ? `(${counts[`type_other`]})` : ""}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {availableStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status] || status}{" "}
                {counts?.[status] ? `(${counts[status]})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select
          value={priorityFilter || "all"}
          onValueChange={(v) => setPriorityFilter(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">🔴 Critical</SelectItem>
            <SelectItem value="high">🟠 High</SelectItem>
            <SelectItem value="medium">🟡 Medium</SelectItem>
            <SelectItem value="low">🟢 Low</SelectItem>
            <SelectItem value="none">⚪ None</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort controls */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="updatedAt">Updated</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSortOrder}
          className="h-8 px-2"
          title={sortOrder === "desc" ? "Newest first" : "Oldest first"}
        >
          {sortOrder === "desc" ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

function FeedbackList({
  items,
  selectedId,
  onSelect,
  selectedIds,
  onToggleSelection,
  isSelectionMode,
}: {
  items: any[];
  selectedId: Id<"feedback"> | null;
  onSelect: (id: Id<"feedback">) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  isSelectionMode: boolean;
}) {
  return (
    <div className="divide-y">
      {items.map((item) => (
        <div
          key={item._id}
          className={cn(
            "flex items-start gap-2 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
            selectedId === item._id && "bg-muted",
            selectedIds.has(item._id) && "bg-primary/5",
          )}
        >
          {/* Checkbox */}
          <Checkbox
            checked={selectedIds.has(item._id)}
            onCheckedChange={() => onToggleSelection(item._id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 shrink-0"
          />

          {/* Content - clickable to view details */}
          <button
            onClick={() => onSelect(item._id)}
            className="flex-1 text-left min-w-0"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{item.userName}</p>
                  {item.feedbackType && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 gap-1 text-[10px]",
                        TYPE_CONFIG[item.feedbackType as FeedbackType]?.color,
                      )}
                    >
                      {TYPE_CONFIG[item.feedbackType as FeedbackType]?.icon}
                      {TYPE_CONFIG[item.feedbackType as FeedbackType]?.label}
                    </Badge>
                  )}
                  {item.priority && item.priority !== "none" && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-[10px]",
                        PRIORITY_CONFIG[item.priority as Priority]?.color,
                      )}
                    >
                      {PRIORITY_CONFIG[item.priority as Priority]?.label}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {item.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                </p>
              </div>
              <Badge
                className={cn(
                  "shrink-0 text-[10px]",
                  STATUS_COLORS[item.status],
                )}
              >
                {STATUS_LABELS[item.status] || item.status}
              </Badge>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}

// Bulk Action Bar Component
function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkStatusChange,
  onBulkArchive,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkStatusChange: (status: string) => void;
  onBulkArchive: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 p-2 bg-primary/10 border-b">
      <span className="text-sm font-medium">{selectedCount} selected</span>

      <Button
        variant="ghost"
        size="sm"
        onClick={selectedCount === totalCount ? onClearSelection : onSelectAll}
        className="h-7 text-xs"
      >
        {selectedCount === totalCount ? (
          <>
            <X className="h-3 w-3 mr-1" />
            Clear
          </>
        ) : (
          <>
            <CheckSquare className="h-3 w-3 mr-1" />
            Select All
          </>
        )}
      </Button>

      <Select onValueChange={onBulkStatusChange}>
        <SelectTrigger className="w-32 h-7 text-xs">
          <SelectValue placeholder="Set Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="new">New</SelectItem>
          <SelectItem value="in-progress">In Progress</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="wont-fix">Won't Fix</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        onClick={onBulkArchive}
        className="h-7 text-xs text-destructive hover:text-destructive"
      >
        <Archive className="h-3 w-3 mr-1" />
        Archive
      </Button>
    </div>
  );
}

// Triage Panel Component
function TriagePanel({
  feedback,
  onAcceptTriage,
}: {
  feedback: any;
  onAcceptTriage: (args: {
    acceptPriority?: boolean;
    acceptTags?: boolean;
  }) => void;
}) {
  const triage = feedback.aiTriage;
  if (!triage) return null;

  return (
    <div className="bg-muted/30 border rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-violet-500 fill-violet-500/10" />
        <h3 className="font-medium text-sm">AI Triage Suggestion</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatDistanceToNow(triage.createdAt, { addSuffix: true })}
        </span>
      </div>

      <div className="grid gap-3 text-sm">
        {/* Priority Suggestion */}
        {triage.suggestedPriority &&
          triage.suggestedPriority !== feedback.priority && (
            <div className="flex items-center justify-between bg-background p-2 rounded border">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Priority:</span>
                <Badge
                  variant="outline"
                  className={
                    PRIORITY_CONFIG[triage.suggestedPriority as Priority]?.color
                  }
                >
                  {PRIORITY_CONFIG[triage.suggestedPriority as Priority]?.label}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-6 text-xs hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-300"
                onClick={() => onAcceptTriage({ acceptPriority: true })}
              >
                Accept
              </Button>
            </div>
          )}

        {/* Tags Suggestion */}
        {triage.suggestedTags && triage.suggestedTags.length > 0 && (
          <div className="flex items-start justify-between bg-background p-2 rounded border">
            <div className="flex-1">
              <span className="text-muted-foreground block mb-1 text-xs">
                Suggested Tags:
              </span>
              <div className="flex flex-wrap gap-1">
                {triage.suggestedTags.map((tag: string) => {
                  const isExisting = feedback.tags?.includes(tag);
                  return (
                    <Badge
                      key={tag}
                      variant={isExisting ? "secondary" : "outline"}
                      className={cn("text-[10px]", isExisting && "opacity-50")}
                    >
                      {tag}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="h-6 text-xs mt-1 shrink-0 ml-2 hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/30 dark:hover:text-violet-300"
              onClick={() => onAcceptTriage({ acceptTags: true })}
            >
              Add Tags
            </Button>
          </div>
        )}

        {/* Analysis */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          {triage.sentiment && (
            <div className="bg-background p-2 rounded border">
              <span className="text-[10px] text-muted-foreground block uppercase tracking-wider">
                Sentiment
              </span>
              <span className="capitalize">{triage.sentiment}</span>
            </div>
          )}
          {triage.category && (
            <div className="bg-background p-2 rounded border">
              <span className="text-[10px] text-muted-foreground block uppercase tracking-wider">
                Category
              </span>
              <span className="capitalize">{triage.category}</span>
            </div>
          )}
        </div>

        {/* Triage Notes */}
        {triage.triageNotes && (
          <div className="bg-background p-2 rounded border text-muted-foreground text-xs leading-relaxed">
            {triage.triageNotes.split(" | ").map((note: string, i: number) => (
              <p key={i} className="mb-1 last:mb-0">
                {note}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackDetail({
  feedback,
  onStatusChange,
  onPriorityChange,
  onAcceptTriage,
}: {
  feedback: any;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: Priority) => void;
  onAcceptTriage: (args: {
    acceptPriority?: boolean;
    acceptTags?: boolean;
  }) => void;
}) {
  const feedbackType = feedback.feedbackType as FeedbackType;
  const availableStatuses = STATUS_BY_TYPE[feedbackType] || [];

  return (
    <div className="space-y-6">
      {/* AI Triage Panel */}
      <TriagePanel feedback={feedback} onAcceptTriage={onAcceptTriage} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">{feedback.userName}</h2>
            {feedback.feedbackType && (
              <Badge
                variant="outline"
                className={cn("gap-1", TYPE_CONFIG[feedbackType]?.color)}
              >
                {TYPE_CONFIG[feedbackType]?.icon}
                {TYPE_CONFIG[feedbackType]?.label}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{feedback.userEmail}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Submitted{" "}
            {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
          </p>
        </div>

        {/* Status & Priority controls */}
        <div className="flex gap-2">
          <Select
            value={feedback.priority || "none"}
            onValueChange={onPriorityChange as any}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">🔴 Critical</SelectItem>
              <SelectItem value="high">🟠 High</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="low">🟢 Low</SelectItem>
              <SelectItem value="none">⚪ None</SelectItem>
            </SelectContent>
          </Select>

          <Select value={feedback.status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status] || status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Page */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">Page</h3>
        <a
          href={feedback.page}
          className="text-sm text-primary hover:underline"
        >
          {feedback.page}
        </a>
      </div>

      {/* User suggested urgency */}
      {feedback.userSuggestedUrgency && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            User Suggested Urgency
          </h3>
          <Badge variant="outline">{feedback.userSuggestedUrgency}</Badge>
        </div>
      )}

      {/* Description */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          Feedback
        </h3>
        <p className="whitespace-pre-wrap">{feedback.description}</p>
      </div>

      {/* What they did */}
      {feedback.whatTheyDid && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            What they were trying to do
          </h3>
          <p className="whitespace-pre-wrap">{feedback.whatTheyDid}</p>
        </div>
      )}

      {/* What they saw */}
      {feedback.whatTheySaw && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            What they saw
          </h3>
          <p className="whitespace-pre-wrap">{feedback.whatTheySaw}</p>
        </div>
      )}

      {/* What they expected */}
      {feedback.whatTheyExpected && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            What they expected
          </h3>
          <p className="whitespace-pre-wrap">{feedback.whatTheyExpected}</p>
        </div>
      )}

      {/* Tags */}
      {feedback.tags && feedback.tags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1">
            {feedback.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Screenshot */}
      {feedback.screenshotUrl ? (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Screenshot
          </h3>
          <a
            href={feedback.screenshotUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={feedback.screenshotUrl}
              alt="Feedback screenshot"
              className="max-w-full rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            />
          </a>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      {hasFilters ? (
        <>
          <Filter className="h-12 w-12 mb-4" />
          <p>No feedback matches your filters</p>
        </>
      ) : (
        <>
          <MessageSquare className="h-12 w-12 mb-4" />
          <p>No feedback yet</p>
        </>
      )}
    </div>
  );
}

export default function AdminFeedbackPage() {
  return (
    <Suspense fallback={<FeedbackListSkeleton />}>
      <FeedbackPageContent />
    </Suspense>
  );
}
