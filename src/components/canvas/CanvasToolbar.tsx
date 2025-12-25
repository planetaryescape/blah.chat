"use client";

import { useQuery } from "convex/react";
import {
  Check,
  Copy,
  Download,
  History,
  MoreHorizontal,
  Redo2,
  RefreshCw,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCanvasHistory } from "@/hooks/useCanvasHistory";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
  documentId: Id<"canvasDocuments"> | null;
  isSaving?: boolean;
  className?: string;
  onDelete?: () => void;
}

export function CanvasToolbar({
  documentId,
  isSaving = false,
  className,
  onDelete,
}: CanvasToolbarProps) {
  const { setShowHistoryPanel } = useCanvasContext();
  const [copied, setCopied] = useState(false);

  // @ts-ignore - Type depth exceeded
  const document = useQuery(
    api.canvas.documents.get,
    documentId ? { documentId } : "skip",
  );

  const {
    canUndo,
    canRedo,
    undo,
    redo,
    currentVersion,
    latestVersion,
    isViewingOldVersion,
    jumpToVersion,
  } = useCanvasHistory(documentId ?? undefined);

  const handleCopy = async () => {
    if (document?.content) {
      await navigator.clipboard.writeText(document.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!document) return;

    const extension = getFileExtension(document.language);
    const blob = new Blob([document.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.title}${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 border-b border-border bg-muted/30",
        className,
      )}
    >
      {/* Document info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {document?.documentType === "code"
            ? (document.language ?? "plaintext")
            : "Document"}
        </span>
        <span className="text-muted-foreground/50">|</span>
        <span className={isViewingOldVersion ? "text-amber-500" : ""}>
          v{currentVersion}
          {isViewingOldVersion && ` of ${latestVersion}`}
        </span>
      </div>

      {/* Jump to Latest - shown when viewing old version */}
      {isViewingOldVersion && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs ml-2 gap-1"
              onClick={() => jumpToVersion(latestVersion)}
            >
              <RefreshCw className="h-3 w-3" />
              Latest
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Jump to latest version (v{latestVersion})
          </TooltipContent>
        </Tooltip>
      )}

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5 ml-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={!canUndo}
              onClick={undo}
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo version</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={!canRedo}
              onClick={redo}
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo version</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1" />

      {/* Save status */}
      <span
        className={cn(
          "text-xs mr-2",
          isSaving ? "text-muted-foreground animate-pulse" : "text-green-500",
        )}
      >
        {isSaving ? "Saving..." : "Saved"}
      </span>

      {/* Actions */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {copied ? "Copied!" : "Copy to clipboard"}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDownload}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Download file</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowHistoryPanel(true)}
          >
            <History className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View history</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowHistoryPanel(true)}>
            <History className="h-4 w-4 mr-2" />
            View history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function getFileExtension(language?: string): string {
  const extensions: Record<string, string> = {
    typescript: ".ts",
    javascript: ".js",
    python: ".py",
    rust: ".rs",
    go: ".go",
    java: ".java",
    csharp: ".cs",
    cpp: ".cpp",
    c: ".c",
    html: ".html",
    css: ".css",
    json: ".json",
    yaml: ".yaml",
    markdown: ".md",
    sql: ".sql",
    shell: ".sh",
    bash: ".sh",
  };
  return extensions[language ?? ""] ?? ".txt";
}
