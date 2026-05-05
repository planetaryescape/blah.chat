"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { editor } from "monaco-editor";
import { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useCanvasContext } from "@/contexts/CanvasContext";
import { CanvasEditor } from "./CanvasEditor";
import { ConflictDialog, mergeContents } from "./ConflictDialog";
import { VersionHistoryPanel } from "./VersionHistoryPanel";

interface CanvasPanelProps {
  documentId: string;
  onClose: () => void;
}

interface CanvasDocument {
  _id: string;
  title: string;
  content: string;
  documentType: "code" | "prose";
  language?: string;
  version: number;
}

export function CanvasPanel({ documentId, onClose }: CanvasPanelProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const queryClient = useQueryClient();
  const { pendingConflict, setPendingConflict, showHistoryPanel } =
    useCanvasContext();

  const { data: document } = useQuery<CanvasDocument | null>({
    queryKey: ["canvas-document", documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/documents/${encodeURIComponent(documentId)}`,
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.data ?? null;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (args: {
      documentId: string;
      content?: string;
      title?: string;
      expectedVersion?: number;
      source?: "user_edit" | "ai_edit" | "conflict_resolution" | "restore";
      diff?: string;
      messageId?: string;
    }) => {
      const res = await fetch(
        `/api/v1/documents/${encodeURIComponent(args.documentId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: args.content,
            title: args.title,
            expectedVersion: args.expectedVersion,
            source: args.source,
            diffSummary: args.diff,
            messageId: args.messageId,
          }),
        },
      );
      if (!res.ok) throw await res.json().catch(() => ({ status: res.status }));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["canvas-document", documentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["canvas-history", documentId],
      });
    },
  });

  const updateContent = updateMutation.mutateAsync;

  const handleConflictResolve = useCallback(
    async (choice: "user" | "ai" | "merge") => {
      if (!pendingConflict || !document) return;

      let resolvedContent: string;

      switch (choice) {
        case "user":
          // Keep user's version - no changes needed
          resolvedContent = pendingConflict.userContent;
          break;
        case "ai":
          // Use AI's version
          resolvedContent = pendingConflict.aiContent;
          break;
        case "merge":
          // Merge both with separator
          resolvedContent = mergeContents(
            pendingConflict.userContent,
            pendingConflict.aiContent,
          );
          break;
      }

      await updateContent({
        documentId: pendingConflict.documentId,
        content: resolvedContent,
        source: "conflict_resolution",
        diff: `Conflict resolved: ${choice}`,
      });

      setPendingConflict(null);
    },
    [pendingConflict, document, updateContent, setPendingConflict],
  );

  if (!document) {
    return (
      <div className="h-full border-l bg-card flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full border-l bg-card flex">
      {/* Main Editor Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-sm truncate">{document.title}</h3>
            {document.language && (
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                {document.language}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <CanvasEditor
            document={document}
            onEditorReady={(ed) => {
              editorRef.current = ed;
            }}
          />
        </div>

        {/* Footer with version info */}
        <div className="p-4 border-t text-xs text-muted-foreground">
          Version {document.version} • {document.documentType}
        </div>
      </div>

      {/* Version History Panel (conditional) */}
      {showHistoryPanel && (
        <div className="w-64 shrink-0">
          <VersionHistoryPanel documentId={documentId as any} />
        </div>
      )}

      {/* Conflict Resolution Dialog */}
      {pendingConflict && (
        <ConflictDialog
          open={!!pendingConflict}
          onClose={() => setPendingConflict(null)}
          conflict={{
            description: pendingConflict.description,
            userContent: pendingConflict.userContent,
            aiContent: pendingConflict.aiContent,
            lineRange: pendingConflict.lineRange,
          }}
          onResolve={handleConflictResolve}
        />
      )}
    </div>
  );
}
