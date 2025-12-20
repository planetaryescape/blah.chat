"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/useDebounce";

interface CanvasEditorProps {
  document: Doc<"canvasDocuments">;
  onEditorReady?: (editor: editor.IStandaloneCodeEditor) => void;
}

export function CanvasEditor({ document, onEditorReady }: CanvasEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  // @ts-ignore - Type depth exceeded
  const updateContent = useMutation(api.canvas.documents.updateContent);

  // Local content for immediate UI
  const [localContent, setLocalContent] = useState(document.content);
  const debouncedContent = useDebounce(localContent, 500);

  // Sync external changes (LLM diffs) to editor
  useEffect(() => {
    if (document.content !== localContent && editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== document.content) {
        editorRef.current.setValue(document.content);
        setLocalContent(document.content);
      }
    }
  }, [document.content, localContent]);

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

  const handleMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;
      onEditorReady?.(editor);
    },
    [onEditorReady],
  );

  const isSaving = localContent !== document.content;

  return (
    <div className="h-full flex flex-col">
      {/* Minimal toolbar */}
      <div className="h-8 px-3 flex items-center justify-between border-b border-border bg-muted/30 text-xs">
        <span className="text-muted-foreground">
          {document.documentType === "code"
            ? (document.language ?? "plaintext")
            : "Document"}
        </span>
        <span
          className={
            isSaving ? "text-muted-foreground animate-pulse" : "text-green-500"
          }
        >
          {isSaving ? "Saving..." : "Saved"}
        </span>
      </div>

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
  );
}
