"use client";

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Bot, Clock, Undo2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { useCanvasHistory } from "@/hooks/useCanvasHistory";
import { cn } from "@/lib/utils";

interface VersionHistoryPanelProps {
  documentId: Id<"canvasDocuments">;
}

export function VersionHistoryPanel({ documentId }: VersionHistoryPanelProps) {
  const { setShowHistoryPanel } = useCanvasContext();
  const { history, currentVersion, jumpToVersion } =
    useCanvasHistory(documentId);

  if (!history) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-muted-foreground text-sm">
        Loading history...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-l border-border bg-muted/20">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="font-medium text-sm">Version History</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowHistoryPanel(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {history.map((entry) => (
            <div
              key={entry._id}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                entry.version === currentVersion
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:bg-muted/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    {entry.source === "llm_diff" ? (
                      <Bot className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <User className="w-4 h-4 shrink-0" />
                    )}
                    <span className="font-medium">v{entry.version}</span>
                    {entry.version === currentVersion && (
                      <span className="text-xs text-primary">(current)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
                  </div>
                  {entry.diff && (
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {getChangeDescription(entry.diff)}
                    </p>
                  )}
                </div>

                {entry.version !== currentVersion && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => jumpToVersion(entry.version)}
                    title={`Restore v${entry.version}`}
                  >
                    <Undo2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {history.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No history available
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function getChangeDescription(diff: string): string {
  try {
    const parsed = JSON.parse(diff);
    if (typeof parsed === "string") return parsed;
    if (parsed.changeDescription) return parsed.changeDescription;
    if (parsed.operations?.length) {
      return `${parsed.operations.length} change(s)`;
    }
    return "Changes applied";
  } catch {
    return typeof diff === "string" ? diff : "Changes applied";
  }
}
