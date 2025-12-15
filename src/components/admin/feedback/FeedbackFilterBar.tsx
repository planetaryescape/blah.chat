"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    FeedbackType,
    STATUS_BY_TYPE,
    STATUS_LABELS,
} from "@/lib/constants/feedback";
import {
    ArrowDown,
    ArrowUp,
    Bug,
    Heart,
    Lightbulb,
    MessageCircle,
    Search,
    X,
} from "lucide-react";
import { useMemo } from "react";

interface FeedbackFilterBarProps {
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
}

export function FeedbackFilterBar({
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
}: FeedbackFilterBarProps) {
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
                {counts?.type_bug ? `(${counts.type_bug})` : ""}
              </span>
            </SelectItem>
            <SelectItem value="feature">
              <span className="flex items-center gap-1">
                <Lightbulb className="h-3 w-3" /> Feature{" "}
                {counts?.type_feature ? `(${counts.type_feature})` : ""}
              </span>
            </SelectItem>
            <SelectItem value="praise">
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" /> Praise{" "}
                {counts?.type_praise ? `(${counts.type_praise})` : ""}
              </span>
            </SelectItem>
            <SelectItem value="other">
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" /> Other{" "}
                {counts?.type_other ? `(${counts.type_other})` : ""}
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
