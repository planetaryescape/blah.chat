"use client";

import { useQuery } from "convex/react";
import type { editor } from "monaco-editor";
import { X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CanvasEditor } from "./CanvasEditor";

interface CanvasPanelProps {
  documentId: Id<"canvasDocuments">;
  onClose: () => void;
}

export function CanvasPanel({ documentId, onClose }: CanvasPanelProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  // @ts-ignore - Type depth exceeded
  const document = useQuery(api.canvas.documents.get, { documentId });

  if (!document) {
    return (
      <div className="w-[360px] border-l bg-card flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-[360px] border-l bg-card flex flex-col h-full">
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
  );
}
