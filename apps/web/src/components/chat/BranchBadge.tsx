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
  const validId =
    conversationId && String(conversationId) !== "undefined"
      ? conversationId
      : null;

  const childBranches = useQuery(
    api.conversations.getChildBranches,
    validId ? { conversationId: validId } : "skip",
  );

  if (!childBranches || childBranches.length === 0) {
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
            {childBranches.length}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">
            Branched conversations ({childBranches.length})
          </p>
          <div className="space-y-0.5">
            {childBranches.map(
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
