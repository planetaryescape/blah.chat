import type { IdMap } from "../id-map";
import type { ConvexConversation } from "../types";
import { ts } from "./utils";

export interface PgConversationRow {
  id: string;
  userId: string;
  title: string;
  model: string;
  modelRecommendation: unknown;
  activeLeafMessageId: string | null;
  projectId: string | null;
  isIncognito: boolean;
  incognitoSettings: unknown;
  pinned: boolean;
  archived: boolean;
  starred: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Transform Convex conversation to PG row.
 *
 * `activeLeafMessageId` is set to null on first pass.
 * A second pass after messages are inserted will UPDATE it via idMap.
 *
 * Drops: messageCount, tokenUsage, cachedMemoryIds, mode, systemPrompt, etc.
 */
export function transformConversation(
  doc: ConvexConversation,
  idMap: IdMap,
  opts?: { resolveActiveLeaf?: boolean },
): PgConversationRow {
  const incognitoSettings = doc.incognitoSettings
    ? {
        enableReadTools: doc.incognitoSettings.enableReadTools,
        applyCustomInstructions: doc.incognitoSettings.applyCustomInstructions,
        inactivityTimeoutMinutes:
          doc.incognitoSettings.inactivityTimeoutMinutes,
        lastActivityAt: doc.incognitoSettings.lastActivityAt,
      }
    : null;

  const modelRecommendation = doc.modelRecommendation
    ? {
        suggestedModelId: doc.modelRecommendation.suggestedModelId,
        currentModelId: doc.modelRecommendation.currentModelId,
        reasoning: doc.modelRecommendation.reasoning,
        estimatedSavings: {
          percentSaved: doc.modelRecommendation.estimatedSavings.percentSaved,
        },
        createdAt: doc.modelRecommendation.createdAt,
        dismissed: doc.modelRecommendation.dismissed,
      }
    : null;

  return {
    id: idMap.get("conversations", doc._id),
    userId: idMap.get("users", doc.userId),
    title: doc.title,
    model: doc.model,
    modelRecommendation,
    activeLeafMessageId:
      opts?.resolveActiveLeaf && doc.activeLeafMessageId
        ? (idMap.getOptional("messages", doc.activeLeafMessageId) ?? null)
        : null,
    projectId: idMap.getOptional("projects", doc.projectId) ?? null,
    isIncognito: doc.isIncognito ?? false,
    incognitoSettings,
    pinned: doc.pinned,
    archived: doc.archived,
    starred: doc.starred,
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };
}
