"use client";

import { AlertTriangle, Bot, FileText, GitMerge } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConflictDialogProps {
  open: boolean;
  onClose: () => void;
  conflict: {
    description: string;
    userContent: string;
    aiContent: string;
    lineRange?: { start: number; end: number };
  };
  onResolve: (choice: "user" | "ai" | "merge") => void;
}

export function ConflictDialog({
  open,
  onClose,
  conflict,
  onResolve,
}: ConflictDialogProps) {
  const [showComparison, setShowComparison] = useState(false);

  const handleResolve = (choice: "user" | "ai" | "merge") => {
    onResolve(choice);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Edit Conflict Detected
          </DialogTitle>
          <DialogDescription>
            {conflict.description}
            {conflict.lineRange && (
              <span className="block mt-1 text-xs">
                Lines {conflict.lineRange.start}-{conflict.lineRange.end}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {showComparison && (
          <div className="grid grid-cols-2 gap-4 my-4">
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <FileText className="w-4 h-4" />
                Your Version
              </div>
              <pre className="p-3 rounded bg-muted text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                {conflict.userContent || "(empty)"}
              </pre>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <Bot className="w-4 h-4" />
                AI Version
              </div>
              <pre className="p-3 rounded bg-muted text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                {conflict.aiContent || "(empty)"}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComparison(!showComparison)}
          >
            {showComparison ? "Hide" : "Show"} Comparison
          </Button>

          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolve("user")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Keep Mine
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolve("ai")}
            >
              <Bot className="w-4 h-4 mr-2" />
              Use AI's
            </Button>
            <Button size="sm" onClick={() => handleResolve("merge")}>
              <GitMerge className="w-4 h-4 mr-2" />
              Merge Both
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Merge user and AI content with separator
 */
export function mergeContents(userContent: string, aiContent: string): string {
  return `${userContent}\n\n---\n\n${aiContent}`;
}
