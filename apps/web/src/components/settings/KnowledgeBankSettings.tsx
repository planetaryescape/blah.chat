"use client";

import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { File as FileIcon, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  useKnowledgeSourceCount,
  useKnowledgeSources,
} from "@/hooks/useKnowledgeSources";
import { KnowledgeBankAddSourceDialog } from "./KnowledgeBankAddSourceDialog";
import { KnowledgeSourceList } from "./KnowledgeSourceList";

type RequestPayload<T> = {
  data?: T;
  error?: string;
};

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as RequestPayload<T>;

  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error || "Request failed");
  }

  return payload.data;
}

export function KnowledgeBankSettings() {
  const { isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();

  const { data: sources, isLoading: sourcesLoading } = useKnowledgeSources();
  const { data: sourceCount, isLoading: countLoading } =
    useKnowledgeSourceCount();
  const allSources = sources ?? [];

  const refreshKnowledgeQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["knowledge-sources", null] }),
      queryClient.invalidateQueries({
        queryKey: ["knowledge-sources-count", null],
      }),
    ]);
  }, [queryClient]);

  const handleDelete = (sourceId: string) => {
    void requestJson(
      `/api/v1/knowledge/sources/${encodeURIComponent(sourceId)}`,
      {
        method: "DELETE",
      },
    )
      .then(() => refreshKnowledgeQueries())
      .then(() => {
        toast.success("Source deleted");
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete",
        );
      });
  };

  const handleReprocess = async (sourceId: string) => {
    try {
      await requestJson(
        `/api/v1/knowledge/sources/${encodeURIComponent(sourceId)}/reprocess`,
        {
          method: "POST",
        },
      );
      await refreshKnowledgeQueries();
      toast.success("Reprocessing started");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reprocess",
      );
    }
  };

  // Show loading state while auth is initializing
  if (!isLoaded || countLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Knowledge Bank</h3>
        <p className="text-sm text-muted-foreground">
          Add documents, web pages, and videos for the AI to reference in
          conversations.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{sourceCount ?? 0} / 100 sources</span>
          <span className="text-border">|</span>
          <span>
            {allSources.filter((s) => s.status === "completed").length} indexed
          </span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/knowledge">
            <Search className="h-4 w-4 mr-2" />
            Manage
          </Link>
        </Button>
      </div>

      <KnowledgeBankAddSourceDialog
        userId={userId}
        onAdded={refreshKnowledgeQueries}
      />

      <KnowledgeSourceList
        sources={allSources}
        isLoading={sourcesLoading}
        onDelete={handleDelete}
        onReprocess={handleReprocess}
      />

      <Alert>
        <FileIcon className="h-4 w-4" />
        <AlertDescription>
          <strong>Tip:</strong> Knowledge from your bank is automatically
          searched when you ask questions. The AI will cite sources when using
          this information.
        </AlertDescription>
      </Alert>
    </div>
  );
}
