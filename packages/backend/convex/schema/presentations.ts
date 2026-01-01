/**
 * Presentations table module (Slides feature)
 * Included in BYOD schema
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const presentationsTable = defineTable({
  userId: v.id("users"),
  conversationId: v.optional(v.id("conversations")),
  title: v.string(),
  description: v.optional(v.string()),
  status: v.union(
    v.literal("outline_pending"),
    v.literal("outline_generating"),
    v.literal("outline_complete"),
    v.literal("design_generating"),
    v.literal("design_complete"),
    v.literal("slides_generating"),
    v.literal("slides_complete"),
    v.literal("stopped"),
    v.literal("error"),
  ),
  designSystem: v.optional(
    v.object({
      theme: v.string(),
      themeRationale: v.string(),
      primaryColor: v.string(),
      secondaryColor: v.string(),
      accentColor: v.string(),
      backgroundColor: v.string(),
      fontPairings: v.object({
        heading: v.string(),
        body: v.string(),
      }),
      visualStyle: v.string(),
      layoutPrinciples: v.array(v.string()),
      iconStyle: v.string(),
      imageGuidelines: v.string(),
      designInspiration: v.string(),
    }),
  ),
  imageModel: v.string(),
  slideStyle: v.optional(
    v.union(v.literal("wordy"), v.literal("illustrative")),
  ),
  templateId: v.optional(v.id("designTemplates")),
  totalSlides: v.number(),
  generatedSlideCount: v.number(),
  aspectRatio: v.optional(
    v.union(v.literal("16:9"), v.literal("1:1"), v.literal("9:16")),
  ),
  imageStyle: v.optional(v.string()),
  pptxStorageId: v.optional(v.id("_storage")),
  pptxGeneratedAt: v.optional(v.number()),
  pdfStorageId: v.optional(v.id("_storage")),
  pdfGeneratedAt: v.optional(v.number()),
  imagesZipStorageId: v.optional(v.id("_storage")),
  imagesZipGeneratedAt: v.optional(v.number()),
  overallFeedback: v.optional(v.string()),
  currentOutlineVersion: v.optional(v.number()),
  outlineStatus: v.optional(
    v.union(
      v.literal("draft"),
      v.literal("feedback_pending"),
      v.literal("regenerating"),
      v.literal("ready"),
    ),
  ),
  starred: v.optional(v.boolean()),
  pinned: v.optional(v.boolean()),
  embedding: v.optional(v.array(v.float64())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_conversation", ["conversationId"])
  .index("by_user_status", ["userId", "status"])
  .index("by_user_pinned", ["userId", "pinned"])
  .searchIndex("search_title", {
    searchField: "title",
    filterFields: ["userId"],
  })
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["userId"],
  });

const slideTypeUnion = v.union(
  v.literal("title"),
  v.literal("section"),
  v.literal("content"),
  v.literal("hook"),
  v.literal("rehook"),
  v.literal("value"),
  v.literal("cta"),
  v.literal("context"),
  v.literal("validation"),
  v.literal("reality"),
  v.literal("emotional"),
  v.literal("reframe"),
  v.literal("affirmation"),
);

export const slidesTable = defineTable({
  presentationId: v.id("presentations"),
  userId: v.id("users"),
  position: v.number(),
  slideType: slideTypeUnion,
  title: v.string(),
  content: v.string(),
  speakerNotes: v.optional(v.string()),
  visualDirection: v.optional(v.string()),
  imageStatus: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("complete"),
    v.literal("error"),
  ),
  imageStorageId: v.optional(v.id("_storage")),
  imagePrompt: v.optional(v.string()),
  imageError: v.optional(v.string()),
  hasEmbeddedText: v.optional(v.boolean()),
  generationCost: v.optional(v.number()),
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_presentation", ["presentationId"])
  .index("by_presentation_position", ["presentationId", "position"])
  .index("by_presentation_type", ["presentationId", "slideType"])
  .index("by_user", ["userId"])
  .index("by_image_status", ["imageStatus"]);

export const outlineItemsTable = defineTable({
  presentationId: v.id("presentations"),
  userId: v.id("users"),
  position: v.number(),
  slideType: slideTypeUnion,
  title: v.string(),
  content: v.string(),
  speakerNotes: v.optional(v.string()),
  visualDirection: v.optional(v.string()),
  feedback: v.optional(v.string()),
  version: v.number(),
  status: v.optional(v.union(v.literal("partial"), v.literal("complete"))),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_presentation", ["presentationId"])
  .index("by_presentation_position", ["presentationId", "position"])
  .index("by_presentation_version", ["presentationId", "version"])
  .index("by_presentation_status", ["presentationId", "status"]);

export const designTemplatesTable = defineTable({
  userId: v.id("users"),
  name: v.string(),
  description: v.optional(v.string()),
  sourceFiles: v.array(
    v.object({
      storageId: v.id("_storage"),
      name: v.string(),
      mimeType: v.string(),
      type: v.union(v.literal("pdf"), v.literal("pptx"), v.literal("image")),
    }),
  ),
  extractedDesign: v.optional(
    v.object({
      colors: v.object({
        primary: v.string(),
        secondary: v.string(),
        accent: v.optional(v.string()),
        background: v.string(),
        text: v.string(),
      }),
      fonts: v.object({
        heading: v.string(),
        body: v.string(),
        fallbackHeading: v.optional(v.string()),
        fallbackBody: v.optional(v.string()),
      }),
      logoGuidelines: v.optional(
        v.object({
          position: v.string(),
          size: v.string(),
          description: v.optional(v.string()),
        }),
      ),
      layoutPatterns: v.array(v.string()),
      visualStyle: v.string(),
      iconStyle: v.optional(v.string()),
      analysisNotes: v.string(),
    }),
  ),
  logoStorageId: v.optional(v.id("_storage")),
  status: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("complete"),
    v.literal("error"),
  ),
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_status", ["userId", "status"]);

export const presentationSessionsTable = defineTable({
  presentationId: v.id("presentations"),
  userId: v.id("users"),
  sessionCode: v.string(),
  sessionCodeExpiresAt: v.number(),
  isActive: v.boolean(),
  currentSlide: v.number(),
  totalSlides: v.number(),
  timerStartedAt: v.optional(v.number()),
  timerPausedAt: v.optional(v.number()),
  timerElapsed: v.optional(v.number()),
  laserEnabled: v.optional(v.boolean()),
  drawingEnabled: v.optional(v.boolean()),
  lastPresenterPingAt: v.optional(v.number()),
  lastRemotePingAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_session_code", ["sessionCode", "isActive"])
  .index("by_presentation", ["presentationId", "isActive"])
  .index("by_user", ["userId"])
  .index("by_user_active", ["userId", "isActive"]);
