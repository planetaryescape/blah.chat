"use client";

import { formatDistanceToNow } from "date-fns";
import { Calendar, ExternalLink, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface Memory {
  _id: string;
  content: string;
  createdAt: number;
  sourceMessageId?: string;
  sourceMessageIds?: string[];
  conversationId?: string;
  metadata?: {
    importance?: number;
    reasoning?: string;
    confidence?: number;
    expiresAt?: number;
    version?: number;
    category?: string;
  };
}

interface MemoryItemProps {
  memory: Memory;
  showReasoning: boolean;
  onDelete: (id: string) => void;
  onNavigateToSource: (conversationId: string, messageId: string) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

/**
 * Get importance badge color based on score.
 */
function getImportanceBadge(importance: number): string {
  if (importance >= 9) {
    return "bg-orange-500/20 text-orange-700 dark:text-orange-300";
  }
  if (importance >= 7) {
    return "bg-blue-500/20 text-blue-700 dark:text-blue-300";
  }
  return "bg-gray-500/20 text-gray-700 dark:text-gray-300";
}

/**
 * Individual memory item in the list.
 */
export function MemoryItem({
  memory,
  showReasoning,
  onDelete,
  onNavigateToSource,
  isSelected,
  onToggleSelect,
}: MemoryItemProps) {
  const importance = memory.metadata?.importance || 0;
  const reasoning = memory.metadata?.reasoning;
  const messageId = memory.sourceMessageId || memory.sourceMessageIds?.[0];
  const canNavigate = memory.conversationId && messageId;

  return (
    <div className="group flex items-start justify-between gap-4 p-4 hover:bg-muted/40 transition-colors">
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="mt-0.5 shrink-0"
              aria-label={`Select memory: ${memory.content.slice(0, 50)}`}
            />
          )}
          <span
            className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-medium ${getImportanceBadge(importance)}`}
            title={`Importance: ${importance}/10`}
          >
            {importance}
          </span>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm text-foreground/90 leading-relaxed break-words">
              {memory.content}
            </p>

            {showReasoning && reasoning && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-border/60 pl-2 ml-0.5">
                "{reasoning}"
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Confidence badge - show if < 0.8 */}
              {memory.metadata?.confidence &&
                memory.metadata.confidence < 0.8 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                    {Math.round(memory.metadata.confidence * 100)}% conf.
                  </span>
                )}

              {/* Expiration date badge */}
              {memory.metadata?.expiresAt && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-500 border border-orange-500/20">
                  Exp:{" "}
                  {new Date(memory.metadata.expiresAt).toLocaleDateString()}
                </span>
              )}

              {/* Version badge - show if > 1 */}
              {memory.metadata?.version && memory.metadata.version > 1 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-500 border border-blue-500/20">
                  v{memory.metadata.version}
                </span>
              )}

              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(memory.createdAt, { addSuffix: true })}
              </span>

              {/* View source button */}
              {canNavigate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] text-muted-foreground/60 hover:text-foreground -ml-1"
                  onClick={() =>
                    onNavigateToSource(memory.conversationId!, messageId!)
                  }
                >
                  <ExternalLink className="h-2.5 w-2.5 mr-1" />
                  Source
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete memory?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this memory. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(memory._id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
