"use client";

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMemo } from "react";
import { useCachedToolCalls } from "@/hooks/useCacheSync";
import { cn } from "@/lib/utils";
import { ArtifactCard } from "./ArtifactCard";

type ArtifactToolCall = {
  id?: string;
  toolCallId?: string;
  name?: string;
  toolName?: string;
  arguments?: string;
  args?: unknown;
  result?: unknown;
};

function parseObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function getDocumentArtifacts(toolCalls: ArtifactToolCall[]) {
  return toolCalls.flatMap((tc) => {
    const toolName = tc.toolName ?? tc.name;
    if (!["createDocument", "updateDocument"].includes(toolName ?? "")) {
      return [];
    }
    const args = parseObject(tc.args ?? tc.arguments) ?? {};
    const result = parseObject(tc.result);
    if (result?.success !== true || typeof result.documentId !== "string") {
      return [];
    }
    return [
      {
        id: tc.id ?? tc.toolCallId ?? "",
        toolName,
        documentId: result.documentId as Id<"canvasDocuments">,
        title: typeof args.title === "string" ? args.title : "Document",
        documentType:
          args.documentType === "code" ? ("code" as const) : ("prose" as const),
        language: typeof args.language === "string" ? args.language : undefined,
        version: typeof result.newVersion === "number" ? result.newVersion : 1,
        lineCount:
          typeof result.lineCount === "number" ? result.lineCount : undefined,
      },
    ];
  });
}

interface ArtifactListProps {
  messageId: Id<"messages">;
  className?: string;
}

/**
 * Displays artifact cards for canvas documents created/updated in a message.
 * Renders in the message body, separate from the collapsible tool call area.
 */
export function ArtifactList({ messageId, className }: ArtifactListProps) {
  // Read from local cache (instant) - synced by useMetadataCacheSync in VirtualizedMessageList
  const toolCalls = useCachedToolCalls(messageId);

  // Filter for document-related tools with successful results
  const documentArtifacts = useMemo(() => {
    if (!toolCalls) return [];

    return getDocumentArtifacts(
      toolCalls.map((toolCall) => ({
        id: toolCall.toolCallId,
        toolName: toolCall.toolName,
        args: toolCall.args,
        result: toolCall.result,
      })),
    );
  }, [toolCalls]);

  // Don't reserve space - most messages don't have artifacts
  if (documentArtifacts.length === 0) return null;

  return (
    <div className={cn("mt-3 flex flex-wrap gap-2", className)}>
      {documentArtifacts.map((artifact) => (
        <ArtifactCard
          key={artifact.id}
          documentId={artifact.documentId}
          title={artifact.title}
          documentType={artifact.documentType}
          language={artifact.language}
          version={artifact.version}
          lineCount={artifact.lineCount}
        />
      ))}
    </div>
  );
}
