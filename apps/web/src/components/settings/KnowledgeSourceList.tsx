"use client";

import { BookOpen, Loader2 } from "lucide-react";
import type { KnowledgeSource } from "@/components/knowledge/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KnowledgeSourceRow } from "./KnowledgeSourceRow";

export function KnowledgeSourceList({
  sources,
  isLoading,
  onDelete,
  onReprocess,
}: {
  sources: KnowledgeSource[];
  isLoading: boolean;
  onDelete: (sourceId: string) => void;
  onReprocess: (sourceId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <Alert>
        <BookOpen className="h-4 w-4" />
        <AlertDescription>
          No sources yet. Add documents, web pages, or videos for the AI to
          reference.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {sources.map((source) => (
        <KnowledgeSourceRow
          key={source._id}
          source={source}
          onDelete={onDelete}
          onReprocess={onReprocess}
        />
      ))}
    </div>
  );
}
