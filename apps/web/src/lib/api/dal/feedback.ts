import { z } from "zod";
import {
  acceptFeedbackTriage,
  archiveFeedbackEntry,
  bulkUpdateFeedbackStatus,
  createFeedbackEntry,
  getFeedbackCounts,
  getFeedbackEntry,
  listFeedbackEntries,
  updateFeedbackPriority,
  updateFeedbackStatus,
} from "@/lib/persistence/feedback";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";
import "server-only";

const createFeedbackSchema = z.object({
  feedbackType: z.enum(["bug", "feature", "praise", "other"]),
  description: z.string().min(1),
  page: z.string().min(1),
  whatTheyDid: z.string().optional(),
  whatTheySaw: z.string().optional(),
  whatTheyExpected: z.string().optional(),
  screenshotKey: z.string().optional(),
  userSuggestedUrgency: z.enum(["urgent", "normal", "low"]).optional(),
});

const listFeedbackSchema = z.object({
  status: z.string().optional().nullable(),
  feedbackType: z.string().optional().nullable(),
  priority: z.string().optional().nullable(),
  searchQuery: z.string().optional().nullable(),
  sortBy: z.enum(["createdAt", "updatedAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const updateStatusSchema = z.object({
  status: z.string().min(1),
});

const updatePrioritySchema = z.object({
  priority: z.enum(["critical", "high", "medium", "low", "none"]),
});

const bulkStatusSchema = z.object({
  feedbackIds: z.array(z.string().min(1)).min(1),
  status: z.string().min(1),
});

const acceptTriageSchema = z.object({
  acceptPriority: z.boolean().optional(),
  acceptTags: z.boolean().optional(),
});

export const feedbackDAL = {
  create: async (
    clerkUserId: string,
    payload: z.input<typeof createFeedbackSchema>,
  ) => {
    const validated = createFeedbackSchema.parse(payload);
    const feedback = await createFeedbackEntry(clerkUserId, validated);
    return formatEntity(feedback, "feedback", feedback._id);
  },

  list: async (query: unknown) => {
    const validated = listFeedbackSchema.parse(query);
    const items = await listFeedbackEntries(validated);
    return formatEntityList(
      items.map((item) => ({
        _id: item.id,
        userName: item.userName,
        userEmail: item.userEmail,
        feedbackType: item.feedbackType,
        description: item.description,
        status: item.status,
        priority: item.priority,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      "feedback",
    );
  },

  counts: async () => {
    const counts = await getFeedbackCounts();
    return formatEntity(counts, "feedback");
  },

  getById: async (feedbackId: string) => {
    const feedback = await getFeedbackEntry(feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }
    return formatEntity(feedback, "feedback", feedback._id);
  },

  updateStatus: async (
    feedbackId: string,
    payload: z.input<typeof updateStatusSchema>,
  ) => {
    const validated = updateStatusSchema.parse(payload);
    await updateFeedbackStatus(feedbackId, validated.status);
    const feedback = await getFeedbackEntry(feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }
    return formatEntity(feedback, "feedback", feedback._id);
  },

  updatePriority: async (
    feedbackId: string,
    payload: z.input<typeof updatePrioritySchema>,
  ) => {
    const validated = updatePrioritySchema.parse(payload);
    await updateFeedbackPriority(feedbackId, validated.priority);
    const feedback = await getFeedbackEntry(feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }
    return formatEntity(feedback, "feedback", feedback._id);
  },

  bulkUpdateStatus: async (payload: z.input<typeof bulkStatusSchema>) => {
    const validated = bulkStatusSchema.parse(payload);
    await bulkUpdateFeedbackStatus(validated.feedbackIds, validated.status);
    return formatEntity({ updated: validated.feedbackIds.length }, "feedback");
  },

  archive: async (feedbackId: string) => {
    await archiveFeedbackEntry(feedbackId);
    return formatEntity({ archived: true, feedbackId }, "feedback", feedbackId);
  },

  acceptTriage: async (
    feedbackId: string,
    payload: z.input<typeof acceptTriageSchema>,
  ) => {
    const validated = acceptTriageSchema.parse(payload);
    const feedback = await acceptFeedbackTriage(feedbackId, validated);
    if (!feedback) {
      throw new Error("Feedback not found");
    }
    return formatEntity(feedback, "feedback", feedback._id);
  },
};
