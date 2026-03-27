import type { IdMap } from "../id-map";
import type { ConvexToolCall } from "../types";
import { intOpt, ts } from "./utils";

export interface PgMessageToolCallRow {
  id: string;
  messageId: string;
  conversationId: string;
  userId: string;
  toolCallId: string;
  toolName: string;
  args: unknown;
  result: unknown;
  textPosition: number | null;
  isPartial: boolean;
  timestamp: number;
  createdAt: number;
}

export function transformToolCall(
  doc: ConvexToolCall,
  idMap: IdMap,
): PgMessageToolCallRow {
  return {
    id: idMap.get("toolCalls", doc._id),
    messageId: idMap.get("messages", doc.messageId),
    conversationId: idMap.get("conversations", doc.conversationId),
    userId: idMap.get("users", doc.userId),
    toolCallId: doc.toolCallId,
    toolName: doc.toolName,
    args: doc.args,
    result: doc.result ?? null,
    textPosition: intOpt(doc.textPosition),
    isPartial: doc.isPartial,
    timestamp: ts(doc.timestamp),
    createdAt: ts(doc.createdAt),
  };
}
