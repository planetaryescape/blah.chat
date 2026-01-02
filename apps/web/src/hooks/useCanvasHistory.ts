import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Hook for managing document version history
 * Extracts undo/redo logic from CanvasEditor for reusability
 */
export function useCanvasHistory(
  documentId: Id<"canvasDocuments"> | undefined,
) {
  // @ts-ignore - Type depth exceeded
  const document = useQuery(
    api.canvas.documents.get,
    documentId ? { documentId } : "skip",
  );

  const history = useQuery(
    // @ts-ignore - Type depth exceeded with 94+ Convex modules
    api.canvas.history.getHistory,
    documentId ? { documentId, limit: 50 } : "skip",
  );

  // @ts-ignore - Type depth exceeded
  const updateContentMutation = useMutation(api.canvas.documents.updateContent);

  const currentVersion = document?.version ?? 0;

  const latestVersion = useMemo(() => {
    if (!history?.length) return currentVersion;
    return Math.max(...history.map((v) => v.version));
  }, [history, currentVersion]);

  const canUndo = currentVersion > 1;
  const canRedo = currentVersion < latestVersion;
  const isViewingOldVersion = currentVersion < latestVersion;

  const undo = useCallback(async () => {
    if (!documentId || currentVersion <= 1 || !history) return;

    const prevVersion = history.find((h) => h.version === currentVersion - 1);
    if (!prevVersion) return;

    await updateContentMutation({
      documentId,
      content: prevVersion.content,
      source: "user_edit",
      diff: "Undo",
    });
  }, [documentId, currentVersion, history, updateContentMutation]);

  const redo = useCallback(async () => {
    if (!documentId || !history?.length) return;

    const maxVersion = Math.max(...history.map((v) => v.version));
    if (currentVersion >= maxVersion) return;

    const nextVersion = history.find((h) => h.version === currentVersion + 1);
    if (!nextVersion) return;

    await updateContentMutation({
      documentId,
      content: nextVersion.content,
      source: "user_edit",
      diff: "Redo",
    });
  }, [documentId, currentVersion, history, updateContentMutation]);

  const [isRestoring, setIsRestoring] = useState(false);

  const jumpToVersion = useCallback(
    async (targetVersion: number) => {
      if (!documentId || !history) {
        toast.error("Cannot restore: document or history not available");
        return;
      }

      const targetEntry = history.find((h) => h.version === targetVersion);
      if (!targetEntry) {
        toast.error(`Version ${targetVersion} not found`);
        console.error(
          "[useCanvasHistory] Version not found. Available:",
          history.map((h) => h.version),
        );
        return;
      }

      if (!targetEntry.content) {
        toast.error("Version has no content saved");
        return;
      }

      setIsRestoring(true);
      try {
        await updateContentMutation({
          documentId,
          content: targetEntry.content,
          source: "user_edit",
          diff: `Restore v${targetVersion}`,
        });
        toast.success(`Restored to v${targetVersion}`);
      } catch (error) {
        console.error("[useCanvasHistory] Restore failed:", error);
        toast.error(
          `Restore failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        setIsRestoring(false);
      }
    },
    [documentId, history, updateContentMutation],
  );

  return {
    history,
    currentVersion,
    latestVersion,
    isViewingOldVersion,
    canUndo,
    canRedo,
    isRestoring,
    undo,
    redo,
    jumpToVersion,
  };
}
