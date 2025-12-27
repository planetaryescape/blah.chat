"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MessageBranchIndicatorProps {
  messageId: Id<"messages">;
}

export function MessageBranchIndicator({
  messageId,
}: MessageBranchIndicatorProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if this is a temporary optimistic message (not yet persisted)
  const isTempMessage =
    typeof messageId === "string" && messageId.startsWith("temp-");

  // Skip query for temporary optimistic messages
  // @ts-ignore - Type depth exceeded with complex Convex query
  const childBranches = useQuery(
    api.conversations.getChildBranchesFromMessage,
    isTempMessage ? "skip" : { messageId },
  );

  // Don't render if no branches
  if (!childBranches || childBranches.length === 0) {
    return null;
  }

  return (
    <div className="my-3">
      {/* Divider with branch count */}
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`${childBranches.length} branch${childBranches.length === 1 ? "" : "es"} from this message`}
      >
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          Branches ({childBranches.length})
        </span>
        <div className="flex-1 border-t border-dashed border-border/40 group-hover:border-border/60 transition-colors" />
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </div>

      {/* Expandable list of child branches */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1 pl-2">
              {childBranches.map(
                (branch: { _id: string; title: string; createdAt: number }) => (
                  <Button
                    key={branch._id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-auto py-2 px-2 text-left font-normal hover:bg-accent/50"
                    onClick={(e) => {
                      e.stopPropagation();
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
