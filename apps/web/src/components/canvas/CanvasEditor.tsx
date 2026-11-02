"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import type { editor } from "monaco-editor";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import { CanvasToolbar } from "./CanvasToolbar";

// Dynamic import Monaco to reduce initial bundle size (~75MB -> 0 on initial load)
const Editor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading editor...
        </div>
      </div>
    ),
  },
);

interface CanvasEditorProps {
  document: Doc<"canvasDocuments">;
  onEditorReady?: (editor: editor.IStandaloneCodeEditor) => void;
  onDelete?: () => void;
}

export function CanvasEditor({
  document,
  onEditorReady,
  onDelete,
}: CanvasEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  // @ts-ignore - Type depth exceeded
  const updateContent = useMutation(api.canvas.documents.updateContent);

  // Local content for immediate UI
  const [localContent, setLocalContent] = useState(document.content);
  const [debouncedContent] = useDebounceValue(localContent, 500);

  // Track previous server content to detect server-initiated changes only
  const prevDocumentContentRef = useRef(document.content);

  // Sync external changes (LLM diffs) to editor - only when SERVER value changes
  useEffect(() => {
    if (document.content !== prevDocumentContentRef.current) {
      // Server value changed (AI edit or external update)
      if (editorRef.current) {
        editorRef.current.setValue(document.content);
      }
      setLocalContent(document.content);
      prevDocumentContentRef.current = document.content;
    }
  }, [document.content]);

  // Persist debounced changes
  useEffect(() => {
    if (debouncedContent !== document.content) {
      updateContent({
        documentId: document._id,
        content: debouncedContent,
        source: "user_edit",
      }).catch(console.error);
    }
  }, [debouncedContent, document._id, document.content, updateContent]);

  const handleMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor) => {
      editorRef.current = editorInstance;
      onEditorReady?.(editorInstance);
    },
    [onEditorReady],
  );

  const isSaving = localContent !== document.content;

  return (
    <CanvasErrorBoundary>
      <div className="h-full flex flex-col">
        {/* Enhanced Toolbar */}
        <CanvasToolbar
          documentId={document._id}
          isSaving={isSaving}
          onDelete={onDelete}
        />

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={
              document.language ??
              (document.documentType === "prose" ? "markdown" : "typescript")
            }
            value={localContent}
            onChange={(value) => setLocalContent(value ?? "")}
            onMount={handleMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              lineNumbers: "on",
              minimap: { enabled: document.documentType === "code" },
              wordWrap: document.documentType === "prose" ? "on" : "off",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              codeLens: false,
              inlayHints: { enabled: "off" },
            }}
            loading={
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Loading editor...
              </div>
            }
          />
        </div>
      </div>
    </CanvasErrorBoundary>
  );
}
