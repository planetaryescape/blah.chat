import type { IdMap } from "../id-map";
import type { ConvexUsageRecord } from "../types";
import { int, intOpt, ts } from "./utils";

export interface PgUsageRecordRow {
  id: string;
  userId: string;
  date: string;
  model: string;
  conversationId: string | null;
  feature: string | null;
  operationType: string | null;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number | null;
  cost: number;
  messageCount: number;
  isByok: boolean | null;
  createdAt: number;
}

export function transformUsageRecord(
  doc: ConvexUsageRecord,
  idMap: IdMap,
): PgUsageRecordRow {
  return {
    id: idMap.get("usageRecords", doc._id),
    userId: idMap.get("users", doc.userId),
    date: doc.date,
    model: doc.model,
    conversationId:
      idMap.getOptional("conversations", doc.conversationId) ?? null,
    feature: doc.feature === "slides" ? "chat" : (doc.feature ?? null),
    operationType: doc.operationType ?? null,
    inputTokens: int(doc.inputTokens),
    outputTokens: int(doc.outputTokens),
    reasoningTokens: intOpt(doc.reasoningTokens),
    cost: doc.cost,
    messageCount: int(doc.messageCount),
    isByok: doc.isByok ?? null,
    createdAt: ts(doc._creationTime),
  };
}
