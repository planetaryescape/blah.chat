import type { editor } from "monaco-editor";
import { useCallback, useEffect, useRef } from "react";
import type { Doc } from "@/convex/_generated/dataModel";
import { computeDiff, type DiffResult } from "@/lib/canvas/diff";

interface DiffTrackerResult {
  hasChanges: boolean;
  diff: DiffResult | null;
  baseContent: string;
  currentContent: string;
}

/**
 * Track user edits in Monaco and compute diffs.
 * Use this to inform the LLM about user changes.
 *
 * @param editorRef - Ref to Monaco editor instance
 * @param document - Canvas document from Convex query
 */
export function useCanvasDiffTracker(
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>,
  document: Doc<"canvasDocuments"> | null | undefined,
) {
  const baseContentRef = useRef<string>("");
  const lastSyncedVersionRef = useRef<number>(0);

  // Update base content when document version changes (LLM updated)
  useEffect(() => {
    if (document && document.version !== lastSyncedVersionRef.current) {
      baseContentRef.current = document.content;
      lastSyncedVersionRef.current = document.version;
    }
  }, [document?.version, document?.content, document]);

  // Get diff between base (last LLM version) and current editor content
  const getUserDiff = useCallback((): DiffTrackerResult => {
    const editorInstance = editorRef.current;
    if (!editorInstance) {
      return {
        hasChanges: false,
        diff: null,
        baseContent: "",
        currentContent: "",
      };
    }

    const currentContent = editorInstance.getValue();
    const baseContent = baseContentRef.current;

    if (currentContent === baseContent) {
      return {
        hasChanges: false,
        diff: null,
        baseContent,
        currentContent,
      };
    }

    return {
      hasChanges: true,
      diff: computeDiff(baseContent, currentContent),
      baseContent,
      currentContent,
    };
  }, [editorRef]);

  // Reset base to current content (call after user diff is processed)
  const resetBase = useCallback(() => {
    const editorInstance = editorRef.current;
    if (editorInstance) {
      baseContentRef.current = editorInstance.getValue();
    }
  }, [editorRef]);

  // Check if there are pending user changes
  const hasPendingChanges = useCallback((): boolean => {
    const editorInstance = editorRef.current;
    if (!editorInstance) return false;
    return editorInstance.getValue() !== baseContentRef.current;
  }, [editorRef]);

  return {
    getUserDiff,
    resetBase,
    hasPendingChanges,
  };
}
