# Phase 1: Schema & Infrastructure

## Context: What We're Building

**Slides** is an AI-powered presentation creator for blah.chat that generates professional, design-grade slide decks from user prompts. Unlike traditional presentation tools, it uses AI models to:

1. Generate comprehensive slide outlines through chat-style iteration
2. Create distinctive design systems based on presentation content
3. Generate individual slide images using Gemini image models
4. Export to PowerPoint (PPTX) format

**Key Differentiators:**
- Multi-model AI integration (GLM-4.6 for content, Gemini 2.5/3 for images)
- Content-aware design system generation (extracts theme, creates visual language)
- Hierarchical generation (title → sections → content) with context preservation
- Image-first approach (faster to ship, professional output, editable in PowerPoint)

## Overall Architecture

```
User Input (prompt/document/outline)
  ↓
Outline Generation (GLM-4.6, chat-style iteration)
  ↓
Design System Generation (GLM-4.6, analyzes content theme)
  ↓
Hierarchical Slide Image Generation (Gemini 2.5 Flash or 3 Pro):
  - Title slide (design system context)
  - Section slides in parallel (design system + title slide)
  - Content slides in parallel (design system + title + sections)
  ↓
Preview (PowerPoint-like interface)
  ↓
PPTX Export (PptxGenJS, on-demand with caching)
```

**Generation Flow Insights:**
- Design system generated ONCE, passed to ALL slide generations
- Hierarchical batching ensures visual consistency
- Each batch uses previous slides as visual reference
- Resilient generation pattern (survives page refresh)

---

## Phase 1 Scope

This phase establishes the database foundation for the Slides feature. After completion:
- ✅ Database schema supports presentations and individual slides
- ✅ Basic CRUD operations available
- ✅ Normalized design follows blah.chat patterns
- ✅ Ready for outline generation (Phase 2)

**What This Phase Does NOT Include:**
- ❌ UI components
- ❌ AI generation logic
- ❌ Preview interface
- ❌ Export functionality

---

## Schema Design

### blah.chat Schema Patterns

**Critical Context:** blah.chat uses normalized, SQL-ready schema design (not nested documents). This was a deliberate architectural decision for:
- 40% smaller documents (faster queries, lower storage)
- 10x faster cascade deletes (junction tables vs array scans)
- Queryable relationships (analytics, reporting)
- Atomic updates (change one field without touching others)

**Reference:** See `docs/SCHEMA_NORMALIZATION_GUIDE.md` for migration history and patterns.

**Existing Schema Structure:**
- `users` - User accounts (Clerk integration)
- `conversations` - Chat conversations with AI
- `messages` - Individual messages in conversations
- `attachments` - File attachments (normalized, Phase 1 migration)
- `projects` - User projects
- `notes` - Markdown notes
- `memories` - RAG memory system

### New Tables for Slides

#### 1. `presentations` Table

**Purpose:** Main entity for a slide deck, links to conversation for outline iteration.

**Schema:**
```typescript
presentations: defineTable({
  userId: v.id("users"),
  conversationId: v.id("conversations"), // For outline chat iteration
  title: v.string(),

  // Generation state tracking
  status: v.union(
    v.literal("outline_pending"),
    v.literal("outline_generating"),
    v.literal("outline_complete"),
    v.literal("design_generating"),
    v.literal("design_complete"),
    v.literal("slides_generating"),
    v.literal("slides_complete"),
    v.literal("error")
  ),

  // AI-generated design system (small JSON blob, never queried independently)
  designSystem: v.optional(v.object({
    theme: v.string(), // e.g., "peptides-biotech", "climate-action"
    themeRationale: v.string(),
    primaryColor: v.string(), // HEX
    secondaryColor: v.string(),
    accentColor: v.string(),
    backgroundColor: v.string(),
    fontPairings: v.object({
      heading: v.string(),
      body: v.string(),
    }),
    visualStyle: v.string(), // "geometric" | "organic" | "minimal" | "illustrative"
    layoutPrinciples: v.array(v.string()), // ["asymmetric", "bold-typography"]
    iconStyle: v.string(), // "line" | "solid" | "duotone"
    imageGuidelines: v.string(), // Detailed visual direction
    designInspiration: v.string(), // "Swiss modernism", "Bauhaus", etc.
  })),

  // Model selection (user choice during outline approval)
  imageModel: v.string(), // "google:gemini-2.5-flash-image" | "google:gemini-3-pro-image"

  // Progress tracking
  totalSlides: v.number(),
  generatedSlideCount: v.number(),

  // PPTX export caching
  pptxStorageId: v.optional(v.id("_storage")),
  pptxGeneratedAt: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_conversation", ["conversationId"])
  .index("by_user_status", ["userId", "status"]),
```

**Design Notes:**
- `conversationId` links to chat for outline iteration (reuses existing chat infrastructure)
- `status` tracks progression through generation pipeline
- `designSystem` is nested object (acceptable: small, fixed-size metadata, never queried independently)
- `imageModel` stored for regeneration consistency
- `pptxStorageId` caches generated PPTX to avoid regeneration

#### 2. `slides` Table

**Purpose:** Individual slides within a presentation (normalized for atomic updates, queryable).

**Schema:**
```typescript
slides: defineTable({
  presentationId: v.id("presentations"),
  userId: v.id("users"), // Denormalized for filtering

  position: v.number(), // 1, 2, 3... (slide order)
  slideType: v.union(
    v.literal("title"),
    v.literal("section"),
    v.literal("content")
  ), // Hierarchy marker for generation batching

  // Text content (from outline, editable)
  title: v.string(),
  content: v.string(), // Markdown bullets
  speakerNotes: v.optional(v.string()),

  // Image generation state
  imageStatus: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("complete"),
    v.literal("error")
  ),
  imageStorageId: v.optional(v.id("_storage")),
  imagePrompt: v.optional(v.string()), // Full prompt used (for debugging/regeneration)
  imageError: v.optional(v.string()),

  // Cost tracking (per slide)
  generationCost: v.optional(v.number()),
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_presentation", ["presentationId"])
  .index("by_presentation_position", ["presentationId", "position"]) // Ordered retrieval
  .index("by_presentation_type", ["presentationId", "slideType"]) // Batch queries
  .index("by_user", ["userId"])
  .index("by_image_status", ["imageStatus"]), // Find pending generations
```

**Design Notes:**
- Normalized (not nested array in `presentations`)
- `slideType` enables hierarchical generation batching (title → sections → content)
- `position` maintains slide order
- `imageStatus` tracks generation lifecycle
- `userId` denormalized for efficient filtering
- Multiple indexes support common query patterns

---

## Implementation Steps

### Step 1: Update Schema File

**File:** `convex/schema.ts`

**Action:** Add both tables to the schema definition.

**Location in File:** After existing tables (around line 600+), before `export default defineSchema({...})`

**Code:**
```typescript
// Presentations (AI-generated slide decks)
presentations: defineTable({
  userId: v.id("users"),
  conversationId: v.id("conversations"),
  title: v.string(),
  status: v.union(
    v.literal("outline_pending"),
    v.literal("outline_generating"),
    v.literal("outline_complete"),
    v.literal("design_generating"),
    v.literal("design_complete"),
    v.literal("slides_generating"),
    v.literal("slides_complete"),
    v.literal("error")
  ),
  designSystem: v.optional(v.object({
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
  })),
  imageModel: v.string(),
  totalSlides: v.number(),
  generatedSlideCount: v.number(),
  pptxStorageId: v.optional(v.id("_storage")),
  pptxGeneratedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_conversation", ["conversationId"])
  .index("by_user_status", ["userId", "status"]),

// Individual slides within presentations
slides: defineTable({
  presentationId: v.id("presentations"),
  userId: v.id("users"),
  position: v.number(),
  slideType: v.union(
    v.literal("title"),
    v.literal("section"),
    v.literal("content")
  ),
  title: v.string(),
  content: v.string(),
  speakerNotes: v.optional(v.string()),
  imageStatus: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("complete"),
    v.literal("error")
  ),
  imageStorageId: v.optional(v.id("_storage")),
  imagePrompt: v.optional(v.string()),
  imageError: v.optional(v.string()),
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
  .index("by_image_status", ["imageStatus"]),
```

### Step 2: Create CRUD Mutations/Queries

**File:** `convex/presentations.ts` (NEW)

**Purpose:** Basic database operations for presentations and slides.

**Code:**
```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// ===== PRESENTATIONS =====

export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const presentationId = await ctx.db.insert("presentations", {
      userId: args.userId,
      conversationId: "" as Id<"conversations">, // Will be linked in Phase 2
      title: args.title,
      status: "outline_pending",
      imageModel: "google:gemini-2.5-flash-image", // Default
      totalSlides: 0,
      generatedSlideCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return presentationId;
  },
});

export const get = query({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.presentationId);
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("presentations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const updateStatus = mutation({
  args: {
    presentationId: v.id("presentations"),
    status: v.union(
      v.literal("outline_pending"),
      v.literal("outline_generating"),
      v.literal("outline_complete"),
      v.literal("design_generating"),
      v.literal("design_complete"),
      v.literal("slides_generating"),
      v.literal("slides_complete"),
      v.literal("error")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.presentationId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const deletePresentation = mutation({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    // Delete all slides first (cascade)
    const slides = await ctx.db
      .query("slides")
      .withIndex("by_presentation", (q) => q.eq("presentationId", args.presentationId))
      .collect();

    for (const slide of slides) {
      // Delete slide images from storage
      if (slide.imageStorageId) {
        await ctx.storage.delete(slide.imageStorageId);
      }
      await ctx.db.delete(slide._id);
    }

    // Delete PPTX from storage
    const presentation = await ctx.db.get(args.presentationId);
    if (presentation?.pptxStorageId) {
      await ctx.storage.delete(presentation.pptxStorageId);
    }

    // Delete presentation
    await ctx.db.delete(args.presentationId);
  },
});

// ===== SLIDES =====

export const createSlide = mutation({
  args: {
    presentationId: v.id("presentations"),
    userId: v.id("users"),
    position: v.number(),
    slideType: v.union(v.literal("title"), v.literal("section"), v.literal("content")),
    title: v.string(),
    content: v.string(),
    speakerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slideId = await ctx.db.insert("slides", {
      presentationId: args.presentationId,
      userId: args.userId,
      position: args.position,
      slideType: args.slideType,
      title: args.title,
      content: args.content,
      speakerNotes: args.speakerNotes,
      imageStatus: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return slideId;
  },
});

export const getSlide = query({
  args: { slideId: v.id("slides") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.slideId);
  },
});

export const getSlides = query({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("slides")
      .withIndex("by_presentation_position", (q) =>
        q.eq("presentationId", args.presentationId)
      )
      .collect();
  },
});

export const getSlidesByType = query({
  args: {
    presentationId: v.id("presentations"),
    slideType: v.union(v.literal("title"), v.literal("section"), v.literal("content")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("slides")
      .withIndex("by_presentation_type", (q) =>
        q.eq("presentationId", args.presentationId).eq("slideType", args.slideType)
      )
      .collect();
  },
});

export const updateSlideImageStatus = mutation({
  args: {
    slideId: v.id("slides"),
    imageStatus: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("complete"),
      v.literal("error")
    ),
    imageStorageId: v.optional(v.id("_storage")),
    imageError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Partial<Doc<"slides">> = {
      imageStatus: args.imageStatus,
      updatedAt: Date.now(),
    };

    if (args.imageStorageId !== undefined) {
      updates.imageStorageId = args.imageStorageId;
    }
    if (args.imageError !== undefined) {
      updates.imageError = args.imageError;
    }

    await ctx.db.patch(args.slideId, updates);
  },
});
```

### Step 3: Test Schema & CRUD

**Manual Testing Steps:**

1. **Deploy schema changes:**
   ```bash
   bunx convex deploy
   ```

2. **Test in Convex Dashboard:**
   - Navigate to Functions tab
   - Run `presentations.create` with test data:
     ```json
     {
       "userId": "[copy from users table]",
       "title": "Test Presentation"
     }
     ```
   - Verify presentation created in Data tab
   - Run `presentations.listByUser` to retrieve
   - Create test slides with `createSlide`
   - Verify slides retrieved with `getSlides`

3. **Test cascade delete:**
   - Run `presentations.deletePresentation`
   - Verify all slides deleted

---

## Success Criteria

- ✅ Schema deployed without errors
- ✅ Can create presentations via `presentations.create`
- ✅ Can create slides via `presentations.createSlide`
- ✅ Can query presentations by user
- ✅ Can query slides by presentation (ordered by position)
- ✅ Can query slides by type
- ✅ Can update presentation status
- ✅ Can update slide image status
- ✅ Can delete presentation (cascade deletes slides and storage)
- ✅ All indexes working efficiently

---

## Files Created/Modified

### Modified:
- ✏️ `convex/schema.ts` - Added `presentations` and `slides` tables

### Created:
- 🆕 `convex/presentations.ts` - CRUD mutations and queries

---

## Dependencies

None - uses existing Convex infrastructure.

---

## Next Phase

**Phase 2: Outline Generation** will build the chat-style interface for creating and iterating on slide outlines using GLM-4.6.
