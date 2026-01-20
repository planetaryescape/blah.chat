"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitBranch,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useCachedChildBranches,
  useCachedChildMessages,
  useCachedSiblings,
} from "@/hooks/useCacheSync";

interface MessageBranchIndicatorProps {
  messageId: Id<"messages">;
  conversationId: Id<"conversations">;
}

/**
 * Shows branch indicators for a message in the tree architecture.
 * Supports both:
 * 1. Legacy branches (child conversations)
 * 2. P7 tree branches (sibling messages with same parent)
 */
export function MessageBranchIndicator({
  messageId,
  conversationId,
}: MessageBranchIndicatorProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  // Legacy: child conversations
  const childConversations = useCachedChildBranches(messageId);

  // P7 Tree: child messages (branches at this point)
  const childMessages = useCachedChildMessages(messageId);

  // P7 Tree: sibling messages (for switching between branches)
  const siblings = useCachedSiblings(messageId);

  // Mutation for branch switching
  const switchBranch = useMutation(api.chat.switchBranch);

  // Combine both types of branches
  const hasLegacyBranches = childConversations && childConversations.length > 0;
  const hasTreeBranches = childMessages && childMessages.length > 1;
  const hasSiblings = siblings && siblings.length > 1;

  // Find current sibling index
  const currentSiblingIndex = siblings?.findIndex((s) => s._id === messageId);
  const totalSiblings = siblings?.length ?? 0;

  // Don't render if no branches or siblings
  if (!hasLegacyBranches && !hasTreeBranches && !hasSiblings) {
    return null;
  }

  const handleSwitchToBranch = async (targetMessageId: Id<"messages">) => {
    try {
      await switchBranch({ conversationId, targetMessageId });
    } catch (error) {
      console.error("Failed to switch branch:", error);
    }
  };

  return (
    <div className="my-2">
      {/* Sibling navigation (for P7 tree branches) */}
      {hasSiblings && currentSiblingIndex !== undefined && (
        <div className="flex items-center justify-center gap-1 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={currentSiblingIndex === 0}
            onClick={() => {
              const prevSibling = siblings[currentSiblingIndex - 1];
              if (prevSibling) {
                handleSwitchToBranch(prevSibling._id);
              }
            }}
            aria-label="Previous version"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
            {currentSiblingIndex + 1} / {totalSiblings}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={currentSiblingIndex === totalSiblings - 1}
            onClick={() => {
              const nextSibling = siblings[currentSiblingIndex + 1];
              if (nextSibling) {
                handleSwitchToBranch(nextSibling._id);
              }
            }}
            aria-label="Next version"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Child branches indicator */}
      {(hasLegacyBranches || hasTreeBranches) && (
        <>
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
            aria-label={`${(childConversations?.length ?? 0) + (childMessages?.length ?? 0)} branch(es) from this message`}
          >
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Branches (
              {(childConversations?.length ?? 0) + (childMessages?.length ?? 0)}
              )
            </span>
            <div className="flex-1 border-t border-dashed border-border/40 group-hover:border-border/60 transition-colors" />
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="mt-2 space-y-1 pl-2">
                  {/* Legacy conversation branches */}
                  {childConversations?.map((branch: Doc<"conversations">) => (
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
                  ))}

                  {/* P7 Tree message branches */}
                  {childMessages
                    ?.filter((m) => !m.isActiveBranch)
                    .map((branch: Doc<"messages">) => (
                      <Button
                        key={branch._id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-auto py-2 px-2 text-left font-normal hover:bg-accent/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitchToBranch(branch._id);
                        }}
                      >
                        <div className="flex items-start gap-2 w-full min-w-0">
                          <GitBranch className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">
                              {branch.forkReason === "regenerate"
                                ? "Regenerated"
                                : branch.forkReason === "edit"
                                  ? "Edited"
                                  : branch.forkReason === "model_compare"
                                    ? branch.model
                                    : "Branch"}
                            </p>
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
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
