"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cache } from "@/lib/cache";

interface BranchBadgeProps {
  conversationId: string;
}

interface BranchSummary {
  totalBranches: number;
  branchPoints: Array<{
    id: string;
    createdAt: number;
    title: string;
    childCount: number;
  }>;
}

export function summarizeBranches(
  messages: Array<
    Pick<any, "_id" | "content" | "createdAt" | "parentMessageIds">
  >,
): BranchSummary {
  const childCounts = new Map<string, number>();

  for (const message of messages) {
    for (const parentId of message.parentMessageIds ?? []) {
      childCounts.set(parentId, (childCounts.get(parentId) ?? 0) + 1);
    }
  }

  const branchPoints = messages
    .filter((message) => (childCounts.get(message._id) ?? 0) > 1)
    .map((message) => ({
      id: message._id,
      createdAt: message.createdAt,
      title: message.content.trim().slice(0, 72) || "Branch point",
      childCount: childCounts.get(message._id) ?? 0,
    }))
    .sort((a, b) => a.createdAt - b.createdAt);

  const totalBranches = branchPoints.reduce(
    (sum, point) => sum + (point.childCount - 1),
    0,
  );

  return {
    totalBranches,
    branchPoints,
  };
}

export function BranchBadge({ conversationId }: BranchBadgeProps) {
  const isInvalidConversationId =
    !conversationId || String(conversationId) === "undefined";

  const messages = useLiveQuery(
    () =>
      isInvalidConversationId
        ? []
        : cache.messages
            .where("conversationId")
            .equals(conversationId)
            .toArray(),
    [conversationId, isInvalidConversationId],
    [] as any[],
  );

  const summary = summarizeBranches(messages);

  if (summary.totalBranches === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs font-medium"
        >
          <GitBranch className="h-3 w-3" />
          <Badge
            variant="secondary"
            className="h-4 min-w-4 px-1 text-[10px] rounded-full"
          >
            {summary.totalBranches}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">
            Branches ({summary.totalBranches})
          </p>
          <div className="px-2 py-1.5 bg-muted/50 rounded text-xs text-muted-foreground">
            <p>{summary.branchPoints.length} branch point(s) in this chat</p>
            <p className="text-[10px] mt-0.5">
              Use the branch navigator on messages to switch paths
            </p>
          </div>
          <div className="space-y-0.5 mt-2">
            {summary.branchPoints.map((branchPoint) => (
              <div
                key={branchPoint.id}
                className="rounded px-2 py-1.5 text-left text-xs bg-muted/30"
              >
                <p className="truncate">{branchPoint.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {branchPoint.childCount} branches
                </p>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
