"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

export function ChatUsageReceipt({ messageId }: { messageId: Id<"messages"> }) {
  // @ts-ignore - Convex API type depth in the 90+ module backend
  const receipt = useQuery(api.chatSettlement.getReceipt, { messageId });
  if (!receipt) return null;

  const cost = receipt.costUsd;
  const amount =
    cost === undefined || (cost === 0 && receipt.hasUnknownCost)
      ? "Cost unresolved"
      : `≈$${cost.toFixed(6)} USD`;
  const coverage =
    receipt.unresolvedDispatchCount > 0
      ? `${receipt.unresolvedDispatchCount} dispatch${receipt.unresolvedDispatchCount === 1 ? "" : "es"} unresolved`
      : receipt.estimatedDispatchCount > 0
        ? `${receipt.estimatedDispatchCount} estimated`
        : `${receipt.reportedDispatchCount} dispatch${receipt.reportedDispatchCount === 1 ? "" : "es"} reported`;

  return (
    <details className="mt-1 text-xs text-muted-foreground">
      <summary className="w-fit cursor-pointer select-none">
        Usage receipt · {amount}
        {receipt.hasUnknownCost ? " + unresolved cost" : ""}
      </summary>
      <p className="mt-1">
        Recorded: {receipt.inputTokens.toLocaleString()} input /{" "}
        {receipt.outputTokens.toLocaleString()} output tokens · {coverage}
      </p>
      {receipt.hasUnknownUsage && (
        <p>Token counts cover received evidence; some usage is unresolved.</p>
      )}
      <p>Catalog estimates are not provider invoices.</p>
      {receipt.hasUnknownCost && (
        <p>
          The amount includes known costs only. Missing usage or rates are not
          zero.
        </p>
      )}
    </details>
  );
}
