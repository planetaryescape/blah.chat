"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BranchBadgeProps {
  conversationId: Id<"conversations">;
}

export function BranchBadge({ conversationId }: BranchBadgeProps) {
  const router = useRouter();

  // Validate conversationId (could be string "undefined" from bad routing)
  const isInvalidConversationId =
    !conversationId || String(conversationId) === "undefined";

  if (isInvalidConversationId && process.env.NODE_ENV !== "production") {
    // Log to help identify upstream routing issues
    console.error("BranchBadge received invalid conversationId", {
      conversationId,
    });
  }

  const validId = isInvalidConversationId ? null : conversationId;

  // Legacy: child conversations (conversation-based branching)
  const childBranches = useQuery(
    api.conversations.getChildBranches,
    validId ? { conversationId: validId } : "skip",
  );

  // P7: Tree-based branch info
  const branchInfo = useQuery(
    api.messages.getBranchInfo,
    validId ? { conversationId: validId } : "skip",
  );

  // Total branches: legacy child conversations + P7 tree branches (minus 1 for main path)
  const legacyCount = childBranches?.length ?? 0;
  const treeCount = Math.max(0, (branchInfo?.branchCount ?? 1) - 1);
  const totalBranches = legacyCount + treeCount;

  if (totalBranches === 0) {
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
            {totalBranches}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">
            Branches ({totalBranches})
          </p>

          {/* P7: Tree branch info */}
          {treeCount > 0 && (
            <div className="px-2 py-1.5 bg-muted/50 rounded text-xs text-muted-foreground">
              <p>
                {branchInfo?.branchPoints?.length ?? 0} branch point(s) in this
                conversation
              </p>
              <p className="text-[10px] mt-0.5">
                Use the branch navigator on messages to switch paths
              </p>
            </div>
          )}

          {/* Legacy: child conversations */}
          {legacyCount > 0 && (
            <div className="space-y-0.5 mt-2">
              <p className="text-[10px] font-medium text-muted-foreground px-2">
                Branched conversations
              </p>
              {childBranches?.map(
                (branch: { _id: string; title: string; createdAt: number }) => (
                  <Button
                    key={branch._id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-auto py-2 px-2 text-left font-normal"
                    onClick={() => {
                      router.push(`/chat/${branch._id}`);
                    }}
                  >
                    <div className="flex items-start gap-2 w-full min-w-0">
                      <GitBranch className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{branch.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(branch.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                  </Button>
                ),
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
