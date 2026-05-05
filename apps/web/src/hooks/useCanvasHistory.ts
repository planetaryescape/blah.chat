import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

interface CanvasDocument {
  _id: string;
  title: string;
  content: string;
  version: number;
}

interface DocumentRevision {
  _id: string;
  documentId: string;
  version: number;
  content: string;
  diffSummary?: string;
  source: "user_edit" | "ai_edit" | "conflict_resolution" | "restore";
  createdAt: number;
}

/**
 * Hook for managing document version history. Reads document + revisions
 * from the REST surface and exposes undo/redo/jumpToVersion. Restore goes
 * through POST /api/v1/documents/[id]/restore so it's recorded as a new
 * revision (never destructive). Undo/redo also append a new revision via
 * the standard PATCH path with source=user_edit so they're indistinguishable
 * from manual edits in the timeline.
 */
export function useCanvasHistory(documentId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: document } = useQuery<CanvasDocument | null>({
    queryKey: ["canvas-document", documentId],
    enabled: !!documentId,
    queryFn: async () => {
      if (!documentId) return null;
      const res = await fetch(
        `/api/v1/documents/${encodeURIComponent(documentId)}`,
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json.data ?? null;
    },
  });

  const { data: history } = useQuery<DocumentRevision[] | undefined>({
    queryKey: ["canvas-history", documentId],
    enabled: !!documentId,
    queryFn: async () => {
      if (!documentId) return undefined;
      const res = await fetch(
        `/api/v1/documents/${encodeURIComponent(documentId)}/history?order=asc&limit=200`,
      );
      if (!res.ok) return undefined;
      const json = await res.json();
      return (json.data ?? undefined) as DocumentRevision[] | undefined;
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["canvas-document", documentId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["canvas-history", documentId],
    });
  }, [queryClient, documentId]);

  const updateContentMutation = useMutation({
    mutationFn: async (args: {
      documentId: string;
      content: string;
      source: "user_edit" | "ai_edit" | "conflict_resolution" | "restore";
      diff?: string;
    }) => {
      const res = await fetch(
        `/api/v1/documents/${encodeURIComponent(args.documentId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: args.content,
            source: args.source,
            diffSummary: args.diff,
          }),
        },
      );
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      return res.json();
    },
    onSuccess: invalidate,
  });

  const restoreMutation = useMutation({
    mutationFn: async (args: { documentId: string; revisionId: string }) => {
      const res = await fetch(
        `/api/v1/documents/${encodeURIComponent(args.documentId)}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revisionId: args.revisionId }),
        },
      );
      if (!res.ok) throw new Error(`Restore failed (${res.status})`);
      return res.json();
    },
    onSuccess: invalidate,
  });

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
    await updateContentMutation.mutateAsync({
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
    await updateContentMutation.mutateAsync({
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
        return;
      }

      if (!targetEntry.content) {
        toast.error("Version has no content saved");
        return;
      }

      setIsRestoring(true);
      try {
        // Use the dedicated /restore endpoint so the server records source="restore".
        await restoreMutation.mutateAsync({
          documentId,
          revisionId: targetEntry._id,
        });
        toast.success(`Restored to v${targetVersion}`);
      } catch (error) {
        toast.error(
          `Restore failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        setIsRestoring(false);
      }
    },
    [documentId, history, restoreMutation],
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
