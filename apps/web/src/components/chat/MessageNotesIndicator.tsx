"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MessageNotesIndicatorProps {
  messageId: Id<"messages">;
}

export function MessageNotesIndicator({
  messageId,
}: MessageNotesIndicatorProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if this is a temporary optimistic message (not yet persisted)
  const isTempMessage =
    typeof messageId === "string" && messageId.startsWith("temp-");

  // Skip query for temporary optimistic messages
  const notes = useQuery(
    api.notes.getNotesFromMessage,
    isTempMessage ? "skip" : { messageId },
  );

  // Don't reserve space - most messages don't have notes
  if (!notes || notes.length === 0) {
    return null;
  }

  return (
    <div className="my-3">
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
        aria-label={`${notes.length} note${notes.length === 1 ? "" : "s"} from this message`}
      >
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          Notes ({notes.length})
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
              {notes.map(
                (note: { _id: string; title: string; createdAt: number }) => (
                  <Button
                    key={note._id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-auto py-2 px-2 text-left font-normal hover:bg-accent/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/notes?note=${note._id}`);
                    }}
                  >
                    <div className="flex items-start gap-2 w-full min-w-0">
                      <FileText className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{note.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(note.createdAt).toLocaleDateString(
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
