import type { IdMap } from "../id-map";
import type { ConvexFeedback } from "../types";
import { ts, tsOpt } from "./utils";

export interface PgFeedbackEntryRow {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  page: string;
  feedbackType: string;
  description: string;
  whatTheyDid: string | null;
  whatTheySaw: string | null;
  whatTheyExpected: string | null;
  screenshotKey: string | null;
  userSuggestedUrgency: string | null;
  status: string;
  priority: string;
  tags: string[];
  aiTriage: unknown;
  errorContext: unknown;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export function transformFeedback(
  doc: ConvexFeedback,
  idMap: IdMap,
): PgFeedbackEntryRow {
  // Transform aiTriage shape: Convex has possibleDuplicateId, PG has summary/category/actionable/sentiment
  const aiTriage = doc.aiTriage
    ? {
        suggestedPriority: doc.aiTriage.suggestedPriority,
        suggestedTags: doc.aiTriage.suggestedTags,
        triageNotes: doc.aiTriage.triageNotes,
        createdAt: doc.aiTriage.createdAt,
      }
    : null;

  return {
    id: idMap.get("feedbackEntries", doc._id),
    userId: idMap.get("users", doc.userId),
    userEmail: doc.userEmail,
    userName: doc.userName,
    page: doc.page,
    feedbackType: doc.feedbackType,
    description: doc.description,
    whatTheyDid: doc.whatTheyDid ?? null,
    whatTheySaw: doc.whatTheySaw ?? null,
    whatTheyExpected: doc.whatTheyExpected ?? null,
    screenshotKey: doc.screenshotStorageId
      ? `migration/feedback/${doc.screenshotStorageId}`
      : null,
    userSuggestedUrgency: doc.userSuggestedUrgency ?? null,
    status: doc.status,
    priority: doc.priority ?? "none",
    tags: doc.tags ?? [],
    aiTriage,
    errorContext: doc.errorContext ?? null,
    archivedAt: tsOpt(doc.archivedAt),
    createdAt: ts(doc.createdAt),
    updatedAt: ts(doc.updatedAt),
  };
}
