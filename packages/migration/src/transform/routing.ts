import type { IdMap } from "../id-map";
import type { ConvexMessage, ConvexRoutingExample } from "../types";
import { ts } from "./utils";

export interface PgRoutingDecisionRow {
  id: string;
  policyId: string | null;
  generationRequestId: string | null;
  conversationId: string | null;
  userId: string | null;
  routeLabel: string | null;
  selectedModelId: string;
  previousModelId: string | null;
  reasoning: string | null;
  input: unknown;
  createdAt: number;
}

export interface PgRoutingExampleRow {
  id: string;
  text: string;
  routeLabel: string;
  complexity: string | null;
  source: string;
  embedding: string | null;
  metadata: unknown;
  createdAt: number;
}

/**
 * Extract a routing decision from a Convex message's embedded routingDecision.
 * Returns null if no routing decision present.
 */
export function transformRoutingDecisionFromMessage(
  doc: ConvexMessage,
  idMap: IdMap,
): PgRoutingDecisionRow | null {
  if (!doc.routingDecision) return null;

  const rd = doc.routingDecision;
  return {
    id: idMap.get("routingDecisions", `${doc._id}_rd`),
    policyId: null,
    generationRequestId: null,
    conversationId:
      idMap.getOptional("conversations", doc.conversationId) ?? null,
    userId: idMap.getOptional("users", doc.userId) ?? null,
    routeLabel: rd.routeLabel ?? null,
    selectedModelId: rd.selectedModelId,
    previousModelId: null,
    reasoning: rd.reasoning ?? null,
    input: {
      classification: rd.classification,
      trace: rd.trace,
      isSticky: rd.isSticky,
      classifierVersion: rd.classifierVersion,
    },
    createdAt: ts(doc.createdAt),
  };
}

export function transformRoutingExample(
  doc: ConvexRoutingExample,
  idMap: IdMap,
): PgRoutingExampleRow {
  return {
    id: idMap.get("routingExamples", doc._id),
    text: doc.text,
    routeLabel: doc.route_label,
    complexity: doc.complexity ?? null,
    source: doc.source,
    embedding:
      doc.embedding && doc.embedding.length > 0
        ? `[${doc.embedding.join(",")}]`
        : null,
    metadata: doc.metadata ?? null,
    createdAt: ts(doc.createdAt),
  };
}
