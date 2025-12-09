"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Bug, ChevronLeft, Heart, Lightbulb, MessageCircle, MessageSquare } from "lucide-react";
import { Suspense, useState } from "react";

type FeedbackStatus = "new" | "in-progress" | "resolved" | "wont-fix";
type FeedbackType = "bug" | "feature" | "praise" | "other";

const statusColors: Record<FeedbackStatus, string> = {
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "in-progress": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  resolved: "bg-green-500/10 text-green-500 border-green-500/20",
  "wont-fix": "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const statusLabels: Record<FeedbackStatus, string> = {
  new: "New",
  "in-progress": "In Progress",
  resolved: "Resolved",
  "wont-fix": "Won't Fix",
};

const typeConfig: Record<FeedbackType, { label: string; icon: React.ReactNode; color: string }> = {
  bug: { label: "Bug", icon: <Bug className="h-3 w-3" />, color: "bg-red-500/10 text-red-500" },
  feature: { label: "Feature", icon: <Lightbulb className="h-3 w-3" />, color: "bg-purple-500/10 text-purple-500" },
  praise: { label: "Praise", icon: <Heart className="h-3 w-3" />, color: "bg-pink-500/10 text-pink-500" },
  other: { label: "Other", icon: <MessageCircle className="h-3 w-3" />, color: "bg-gray-500/10 text-gray-500" },
};

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
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const { isMobile } = useMobileDetect();

  // @ts-ignore - Convex type depth issue
  const feedbackList = useQuery(api.feedback.listFeedback, {
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // @ts-ignore - Convex type depth issue
  const feedbackCounts = useQuery(api.feedback.getFeedbackCounts, {});

  // @ts-ignore - Convex type depth issue
  const selectedFeedback = useQuery(
    api.feedback.getFeedback,
    selectedId ? { feedbackId: selectedId } : "skip",
  );

  const updateStatus = useMutation(api.feedback.updateFeedbackStatus);

  const handleStatusChange = async (newStatus: FeedbackStatus) => {
    if (!selectedId) return;
    await updateStatus({ feedbackId: selectedId, status: newStatus });
  };

  const handleSelect = (id: Id<"feedback">) => {
    setSelectedId(id);
    if (isMobile) setMobileView("detail");
  };

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
          <StatusFilter value={statusFilter} onChange={setStatusFilter} counts={feedbackCounts} />
        </div>
        <div className="flex-1 overflow-auto">
          {feedbackList === undefined ? (
            <FeedbackListSkeleton />
          ) : feedbackList.length === 0 ? (
            <EmptyState />
          ) : (
            <FeedbackList
              items={feedbackList}
              selectedId={selectedId}
              onSelect={handleSelect}
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
      <aside className="w-80 border-r bg-muted/10 flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Feedback</h1>
            {feedbackCounts && (
              <Badge variant="secondary">{feedbackCounts.total} total</Badge>
            )}
          </div>
          <StatusFilter value={statusFilter} onChange={setStatusFilter} counts={feedbackCounts} />
        </div>
        <div className="flex-1 overflow-auto">
          {feedbackList === undefined ? (
            <FeedbackListSkeleton />
          ) : feedbackList.length === 0 ? (
            <EmptyState />
          ) : (
            <FeedbackList
              items={feedbackList}
              selectedId={selectedId}
              onSelect={setSelectedId}
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

function StatusFilter({
  value,
  onChange,
  counts,
}: {
  value: FeedbackStatus | "all";
  onChange: (v: FeedbackStatus | "all") => void;
  counts?: Record<string, number>;
}) {
  return (
    <Select value={value} onValueChange={onChange as any}>
      <SelectTrigger>
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {counts?.total ? `(${counts.total})` : ""}</SelectItem>
        <SelectItem value="new">New {counts?.new ? `(${counts.new})` : ""}</SelectItem>
        <SelectItem value="in-progress">In Progress {counts?.["in-progress"] ? `(${counts["in-progress"]})` : ""}</SelectItem>
        <SelectItem value="resolved">Resolved {counts?.resolved ? `(${counts.resolved})` : ""}</SelectItem>
        <SelectItem value="wont-fix">Won't Fix {counts?.["wont-fix"] ? `(${counts["wont-fix"]})` : ""}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function FeedbackList({
  items,
  selectedId,
  onSelect,
}: {
  items: any[];
  selectedId: Id<"feedback"> | null;
  onSelect: (id: Id<"feedback">) => void;
}) {
  return (
    <div className="divide-y">
      {items.map((item) => (
        <button
          key={item._id}
          onClick={() => onSelect(item._id)}
          className={cn(
            "w-full text-left p-4 hover:bg-muted/50 transition-colors",
            selectedId === item._id && "bg-muted",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{item.userName}</p>
                {item.feedbackType && (
                  <Badge variant="outline" className={cn("shrink-0 gap-1", typeConfig[item.feedbackType as FeedbackType]?.color)}>
                    {typeConfig[item.feedbackType as FeedbackType]?.icon}
                    {typeConfig[item.feedbackType as FeedbackType]?.label}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{item.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(item.createdAt, { addSuffix: true })}
              </p>
            </div>
            <Badge className={cn("shrink-0", statusColors[item.status as FeedbackStatus])}>
              {statusLabels[item.status as FeedbackStatus]}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}

function FeedbackDetail({
  feedback,
  onStatusChange,
}: {
  feedback: any;
  onStatusChange: (status: FeedbackStatus) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{feedback.userName}</h2>
            {feedback.feedbackType && (
              <Badge variant="outline" className={cn("gap-1", typeConfig[feedback.feedbackType as FeedbackType]?.color)}>
                {typeConfig[feedback.feedbackType as FeedbackType]?.icon}
                {typeConfig[feedback.feedbackType as FeedbackType]?.label}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{feedback.userEmail}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Submitted {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
          </p>
        </div>
        <Select value={feedback.status} onValueChange={onStatusChange as any}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="wont-fix">Won't Fix</SelectItem>
          </SelectContent>
        </Select>
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

      {/* Description */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">Feedback</h3>
        <p className="whitespace-pre-wrap">{feedback.description}</p>
      </div>

      {/* What they did */}
      {feedback.whatTheyDid && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">What they were trying to do</h3>
          <p className="whitespace-pre-wrap">{feedback.whatTheyDid}</p>
        </div>
      )}

      {/* What they saw */}
      {feedback.whatTheySaw && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">What they saw</h3>
          <p className="whitespace-pre-wrap">{feedback.whatTheySaw}</p>
        </div>
      )}

      {/* What they expected */}
      {feedback.whatTheyExpected && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">What they expected</h3>
          <p className="whitespace-pre-wrap">{feedback.whatTheyExpected}</p>
        </div>
      )}

      {/* Screenshot */}
      {feedback.screenshotUrl ? (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Screenshot</h3>
          <a href={feedback.screenshotUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={feedback.screenshotUrl}
              alt="Feedback screenshot"
              className="max-w-full rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            />
          </a>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          <p>No screenshot attached</p>
          <p className="text-xs mt-1">
            Storage ID: {feedback.screenshotStorageId || "none"}
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <MessageSquare className="h-12 w-12 mb-4" />
      <p>No feedback yet</p>
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
