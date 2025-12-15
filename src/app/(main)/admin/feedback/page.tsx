"use client";

import {
    BulkActionBar,
    EmptyState,
    FeedbackDetail,
    FeedbackFilterBar,
    FeedbackList,
    FeedbackListSkeleton,
} from "@/components/admin/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeedbackAdmin } from "@/hooks/useFeedbackAdmin";
import { ChevronLeft, MessageSquare } from "lucide-react";

export default function FeedbackPageContent() {
  const { state, actions } = useFeedbackAdmin();
  const {
    selectedId,
    mobileView,
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
    hasActiveFilters,
    isSelectionMode,
  } = state;

  const {
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
  } = actions;

  // Mobile view
  if (isMobile) {
    if (mobileView === "detail" && selectedFeedback) {
      return (
        <div className="flex flex-col h-[100dvh]">
          <div className="border-b p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => state.setMobileView("list")}
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
          <FeedbackFilterBar
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
          <FeedbackFilterBar
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
              onSelect={state.setSelectedId}
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
