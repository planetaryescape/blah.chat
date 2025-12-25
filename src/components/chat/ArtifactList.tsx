"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ArtifactCard } from "./ArtifactCard";

interface ArtifactListProps {
  messageId: Id<"messages">;
  className?: string;
}

/**
 * Displays artifact cards for canvas documents created/updated in a message.
 * Renders in the message body, separate from the collapsible tool call area.
 */
export function ArtifactList({ messageId, className }: ArtifactListProps) {
  // Skip query for temporary optimistic messages
  const isTempMessage =
    typeof messageId === "string" && messageId.startsWith("temp-");

  // Query tool calls for this message
  const toolCalls = useQuery(
    // @ts-ignore - Type depth exceeded with complex Convex query
    api.messages.toolCalls.getToolCalls,
    isTempMessage ? "skip" : { messageId },
  );

  // Filter for document-related tools with successful results
  const documentArtifacts = useMemo(() => {
    if (!toolCalls) return [];

    return toolCalls
      .filter((tc: any) => {
        // Only createDocument and updateDocument tools
        if (!["createDocument", "updateDocument"].includes(tc.name)) {
          return false;
        }

        // Parse result and check for success
        try {
          const result = tc.result ? JSON.parse(tc.result) : null;
          return result?.success && result?.documentId;
        } catch {
          return false;
        }
      })
      .map((tc: any) => {
        const args = tc.arguments ? JSON.parse(tc.arguments) : {};
        const result = tc.result ? JSON.parse(tc.result) : {};

        return {
          id: tc.id,
          toolName: tc.name,
          documentId: result.documentId as Id<"canvasDocuments">,
          title: args.title ?? "Document",
          documentType: args.documentType ?? "prose",
          language: args.language,
          version: result.newVersion ?? 1,
          lineCount: result.lineCount,
        };
      });
  }, [toolCalls]);

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
