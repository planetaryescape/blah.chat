# Phase 4: Hierarchical Slide Image Generation

## Context: What We're Building

This is the **core visual generation phase** where we transform text outlines into professional slide images using Gemini's image generation capabilities. The key innovation is **hierarchical generation** with design system context.

**Why Hierarchical Generation:**
- Title slide sets visual foundation
- Section slides build on title slide aesthetics
- Content slides maintain consistency with all previous context
- Each batch uses design system + previous slides for visual coherence

**Image Generation Models:**
- **Gemini 2.5 Flash Image**: Cost-effective ($0.075/M input), fast, great quality
- **Gemini 3 Pro Image**: Premium ($1.25/M input), advanced reasoning, highest quality
- User selects model during outline approval

---

## Overall Architecture

**Full Slides Pipeline:**
```
Outline → Design System → [Phase 4: Image Generation] → Preview → Export
```

**Hierarchical Generation Flow:**
```
Design System Complete (Phase 3)
  ↓
Batch 1: Generate Title Slide
  - Context: Design system only
  - Wait for completion
  ↓
Batch 2: Generate Section Slides (Parallel)
  - Context: Design system + title slide image
  - All sections generate simultaneously
  - Wait for all to complete
  ↓
Batch 3: Generate Content Slides (Parallel with batching)
  - Context: Design system + title + first 3 sections
  - Generate in sub-batches if >15 slides (Convex concurrency limits)
  - Progressive UI updates
  ↓
All Slides Complete → Update Status → Ready for Preview (Phase 5)
```

---

## Phase 4 Scope

After completion:
- ✅ Title slide generated with design system context
- ✅ Section slides generated with visual consistency
- ✅ Content slides generated maintaining design language
- ✅ All slide images stored in Convex storage
- ✅ Progress tracking updates in real-time
- ✅ Cost and token usage recorded per slide
- ✅ Ready for preview interface (Phase 5)

**What This Phase Does NOT Include:**
- ❌ Preview UI (Phase 5)
- ❌ Individual slide regeneration (Phase 7)
- ❌ PPTX export (Phase 6)

---

## Technical Foundation

### Gemini Image Generation

**Existing Pattern:** blah.chat already has image generation in `convex/generation/image.ts`

**Key Implementation Details:**
- Uses Vercel AI SDK `generateText` with image-capable models
- Extracts image from response (base64 or file format)
- Stores in Convex storage
- Tracks cost and tokens
- Handles reasoning tokens (for Gemini 3 Pro)

**Reference Files:**
- `convex/generation/image.ts` - Existing image generation pattern
- `src/lib/ai/models.ts` - Model configurations
- `convex/generation.ts` - Main generation action (for resilient pattern)

### Context Preservation Strategy

**Problem:** How do we ensure slide 15 matches the visual style of slide 1?

**Solution:** Pass previous slide images as context in prompts.

**Implementation:**
1. Store image URLs after each generation
2. Include references in subsequent prompts
3. Gemini's vision capabilities understand visual context
4. Design system JSON provides text-based guidance

**Prompt Structure:**
```
DESIGN SYSTEM:
{JSON design system}

SLIDE CONTENT:
Title: {slide title}
{slide content bullets}

VISUAL CONTEXT (maintain consistency with):
- Title slide: [image URL or description]
- Section slides: [image URLs or descriptions]

REQUIREMENTS:
- Follow design system exactly (colors, fonts, layout principles)
- Maintain visual consistency with context slides
- Create 16:9 slide image with professional design
```

---

## Implementation Steps

### Step 1: Create Slide Image Generation Prompt Builder

**File:** `src/lib/prompts/slides.ts` (MODIFY)

**Add these exports:**
```typescript
export interface SlideImageContext {
  slideType: "title" | "section" | "content";
  title: string;
  content: string;
  designSystem: any; // Design system object
  contextSlides?: Array<{
    type: string;
    title: string;
    // Could include image URL for vision models
  }>;
}

export function buildSlideImagePrompt(context: SlideImageContext): string {
  const { slideType, title, content, designSystem, contextSlides = [] } = context;

  // Base requirements by slide type
  const typeRequirements =
    slideType === "title"
      ? "Bold, impactful title design. Large typography. Establish visual foundation for entire deck."
      : slideType === "section"
        ? "Section divider style. Minimal text. Visual transition between topics. Use geometric shapes or backgrounds."
        : "Clear content hierarchy: title → bullet points. Readable at distance (5-7 words per bullet). Balance text with visual elements.";

  // Build context description
  const contextDescription =
    contextSlides.length > 0
      ? `\nVISUAL CONTEXT (maintain consistency):\n${contextSlides
          .map((s) => `- ${s.type} slide: "${s.title}"`)
          .join("\n")}\n`
      : "";

  return `
Generate a professional presentation slide (16:9 aspect ratio) following this design system:

DESIGN SYSTEM:
Theme: ${designSystem.theme}
Primary Color: ${designSystem.primaryColor}
Secondary Color: ${designSystem.secondaryColor}
Accent Color: ${designSystem.accentColor}
Background: ${designSystem.backgroundColor}
Font Pairing: ${designSystem.fontPairings.heading} (heading) + ${designSystem.fontPairings.body} (body)
Visual Style: ${designSystem.visualStyle}
Layout Principles: ${designSystem.layoutPrinciples.join(", ")}
Icon Style: ${designSystem.iconStyle}
Design Inspiration: ${designSystem.designInspiration}

IMAGE GUIDELINES:
${designSystem.imageGuidelines}

SLIDE CONTENT:
Type: ${slideType.toUpperCase()}
Title: ${title}
${content ? `Content:\n${content}` : ""}
${contextDescription}

REQUIREMENTS:
${typeRequirements}

CRITICAL DESIGN RULES:
- Follow design system colors, fonts, and visual style EXACTLY
- Maintain visual consistency with context slides (if provided)
- Use high-quality, professional design
- Ensure text is readable (good contrast, appropriate sizing)
- Include visual elements (shapes, graphics, icons) per design system
- 16:9 aspect ratio (1920x1080 or similar)
- Export-ready quality (will be used in PowerPoint)

OUTPUT:
Generate ONLY the slide image. No additional text, explanation, or markup.
`.trim();
}
```

### Step 2: Create Single Slide Image Generation Function

**File:** `convex/generation/slideImage.ts` (NEW)

**Purpose:** Generate a single slide image (reuses pattern from `generation/image.ts`).

**Code:**
```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { generateText } from "ai";
import { aiGateway } from "../../src/lib/ai/gateway";
import { buildSlideImagePrompt } from "../../src/lib/prompts/slides";
import { calculateCost } from "../../src/lib/ai/utils";

export const generateSlideImage = internalAction({
  args: {
    slideId: v.id("slides"),
    modelId: v.string(), // "google:gemini-2.5-flash-image" or "google:gemini-3-pro-image"
    designSystem: v.any(),
    contextSlides: v.optional(
      v.array(
        v.object({
          type: v.string(),
          title: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    try {
      // Get slide
      const slide = await ctx.runQuery(internal.presentations.getSlideInternal, {
        slideId: args.slideId,
      });

      if (!slide) {
        throw new Error("Slide not found");
      }

      // Update status to generating
      await ctx.runMutation(internal.presentations.updateSlideImageStatus, {
        slideId: args.slideId,
        imageStatus: "generating",
      });

      // Build prompt
      const prompt = buildSlideImagePrompt({
        slideType: slide.slideType,
        title: slide.title,
        content: slide.content,
        designSystem: args.designSystem,
        contextSlides: args.contextSlides,
      });

      // Store prompt for debugging
      await ctx.runMutation(internal.presentations.updateSlidePrompt, {
        slideId: args.slideId,
        imagePrompt: prompt,
      });

      // Generate image using Gemini
      const startTime = Date.now();

      const result = await generateText({
        model: aiGateway(args.modelId),
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7, // Balanced creativity
      });

      const generationTime = Date.now() - startTime;

      // Extract image from response
      // (Pattern from convex/generation/image.ts)
      let imageData: Uint8Array | null = null;

      // Wait for files if available
      if (result.files && result.files.length > 0) {
        imageData = result.files[0];
      } else {
        // Fallback: try parsing base64 from text
        const base64Match = result.text.match(/data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)/);
        if (base64Match) {
          const base64Data = base64Match[2];
          imageData = Uint8Array.from(Buffer.from(base64Data, "base64"));
        }
      }

      if (!imageData) {
        throw new Error("No image data found in response");
      }

      // Store image in Convex storage
      const blob = new Blob([imageData], { type: "image/png" });
      const storageId = await ctx.storage.store(blob);

      // Calculate cost
      const cost = calculateCost(args.modelId, {
        inputTokens: result.usage?.promptTokens || 0,
        outputTokens: result.usage?.completionTokens || 0,
        reasoningTokens: result.usage?.reasoningTokens || 0,
      });

      // Update slide with image
      await ctx.runMutation(internal.presentations.updateSlideImage, {
        slideId: args.slideId,
        imageStorageId: storageId,
        imageStatus: "complete",
        generationCost: cost,
        inputTokens: result.usage?.promptTokens || 0,
        outputTokens: result.usage?.completionTokens || 0,
      });

      // Record usage
      await ctx.runMutation(internal.usage.mutations.recordImageGeneration, {
        userId: slide.userId,
        model: args.modelId,
        cost,
        metadata: {
          presentationId: slide.presentationId,
          slideType: slide.slideType,
          generationTime,
        },
      });

      return { success: true, storageId, cost };
    } catch (error) {
      console.error("Slide image generation error:", error);

      // Update status to error
      await ctx.runMutation(internal.presentations.updateSlideImageStatus, {
        slideId: args.slideId,
        imageStatus: "error",
        imageError: String(error),
      });

      throw error;
    }
  },
});
```

### Step 3: Create Hierarchical Generation Orchestrator

**File:** `convex/presentations/generateSlides.ts` (NEW)

**Purpose:** Orchestrate hierarchical slide generation (title → sections → content).

**Code:**
```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

export const generateSlides = internalAction({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    try {
      // Get presentation
      const presentation = await ctx.runQuery(internal.presentations.get, {
        presentationId: args.presentationId,
      });

      if (!presentation) {
        throw new Error("Presentation not found");
      }

      if (!presentation.designSystem) {
        throw new Error("Design system not found - run Phase 3 first");
      }

      // Update status
      await ctx.runMutation(internal.presentations.updateStatus, {
        presentationId: args.presentationId,
        status: "slides_generating",
      });

      // Get all slides
      const allSlides = await ctx.runQuery(internal.presentations.getSlides, {
        presentationId: args.presentationId,
      });

      if (allSlides.length === 0) {
        throw new Error("No slides found");
      }

      // Separate by type
      const titleSlides = allSlides.filter((s) => s.slideType === "title");
      const sectionSlides = allSlides.filter((s) => s.slideType === "section");
      const contentSlides = allSlides.filter((s) => s.slideType === "content");

      console.log(
        `Generating ${allSlides.length} slides: ${titleSlides.length} title, ${sectionSlides.length} section, ${contentSlides.length} content`
      );

      // ===== BATCH 1: Title Slide =====
      console.log("Batch 1: Generating title slide...");

      if (titleSlides.length > 0) {
        const titleSlide = titleSlides[0];

        await ctx.runAction(internal.generation.slideImage.generateSlideImage, {
          slideId: titleSlide._id,
          modelId: presentation.imageModel,
          designSystem: presentation.designSystem,
          contextSlides: [], // No context for first slide
        });

        // Increment progress
        await ctx.runMutation(internal.presentations.incrementProgress, {
          presentationId: args.presentationId,
        });

        console.log("Title slide complete");
      }

      // ===== BATCH 2: Section Slides (Parallel) =====
      if (sectionSlides.length > 0) {
        console.log(`Batch 2: Generating ${sectionSlides.length} section slides in parallel...`);

        // Context: title slide
        const titleContext =
          titleSlides.length > 0
            ? [{ type: "title", title: titleSlides[0].title }]
            : [];

        // Generate all sections in parallel
        const sectionPromises = sectionSlides.map((slide) =>
          ctx.runAction(internal.generation.slideImage.generateSlideImage, {
            slideId: slide._id,
            modelId: presentation.imageModel,
            designSystem: presentation.designSystem,
            contextSlides: titleContext,
          })
        );

        await Promise.all(sectionPromises);

        // Increment progress for each section
        for (let i = 0; i < sectionSlides.length; i++) {
          await ctx.runMutation(internal.presentations.incrementProgress, {
            presentationId: args.presentationId,
          });
        }

        console.log("Section slides complete");
      }

      // ===== BATCH 3: Content Slides (Parallel with sub-batching) =====
      if (contentSlides.length > 0) {
        console.log(`Batch 3: Generating ${contentSlides.length} content slides...`);

        // Context: title + first 3 sections
        const contentContext = [
          ...titleSlides.slice(0, 1).map((s) => ({ type: "title", title: s.title })),
          ...sectionSlides.slice(0, 3).map((s) => ({ type: "section", title: s.title })),
        ];

        // Sub-batch if too many slides (Convex concurrency limit ~10-15)
        const BATCH_SIZE = 10;
        const batches: typeof contentSlides[] = [];

        for (let i = 0; i < contentSlides.length; i += BATCH_SIZE) {
          batches.push(contentSlides.slice(i, i + BATCH_SIZE));
        }

        // Process each sub-batch
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          console.log(`  Sub-batch ${batchIndex + 1}/${batches.length}: ${batch.length} slides`);

          const batchPromises = batch.map((slide) =>
            ctx.runAction(internal.generation.slideImage.generateSlideImage, {
              slideId: slide._id,
              modelId: presentation.imageModel,
              designSystem: presentation.designSystem,
              contextSlides: contentContext,
            })
          );

          await Promise.all(batchPromises);

          // Increment progress for each slide in batch
          for (let i = 0; i < batch.length; i++) {
            await ctx.runMutation(internal.presentations.incrementProgress, {
              presentationId: args.presentationId,
            });
          }
        }

        console.log("Content slides complete");
      }

      // ===== ALL COMPLETE =====
      await ctx.runMutation(internal.presentations.updateStatus, {
        presentationId: args.presentationId,
        status: "slides_complete",
      });

      console.log(`Presentation ${args.presentationId} generation complete!`);

      return { success: true };
    } catch (error) {
      console.error("Slide generation error:", error);

      // Update status to error
      await ctx.runMutation(internal.presentations.updateStatus, {
        presentationId: args.presentationId,
        status: "error",
      });

      throw error;
    }
  },
});
```

### Step 4: Add Supporting Mutations

**File:** `convex/presentations.ts` (MODIFY)

**Add these mutations:**
```typescript
export const incrementProgress = mutation({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation) {
      throw new Error("Presentation not found");
    }

    await ctx.db.patch(args.presentationId, {
      generatedSlideCount: presentation.generatedSlideCount + 1,
      updatedAt: Date.now(),
    });
  },
});

export const updateSlidePrompt = mutation({
  args: {
    slideId: v.id("slides"),
    imagePrompt: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.slideId, {
      imagePrompt: args.imagePrompt,
      updatedAt: Date.now(),
    });
  },
});

export const updateSlideImage = mutation({
  args: {
    slideId: v.id("slides"),
    imageStorageId: v.id("_storage"),
    imageStatus: v.union(v.literal("pending"), v.literal("generating"), v.literal("complete"), v.literal("error")),
    generationCost: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      imageStorageId: args.imageStorageId,
      imageStatus: args.imageStatus,
      updatedAt: Date.now(),
    };

    if (args.generationCost !== undefined) {
      updates.generationCost = args.generationCost;
    }
    if (args.inputTokens !== undefined) {
      updates.inputTokens = args.inputTokens;
    }
    if (args.outputTokens !== undefined) {
      updates.outputTokens = args.outputTokens;
    }

    await ctx.db.patch(args.slideId, updates);
  },
});

// Internal query exports
export const getSlideInternal = internalQuery({
  args: { slideId: v.id("slides") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.slideId);
  },
});
```

### Step 5: Add Model Selection to Outline Approval

**File:** `src/app/(main)/slides/[id]/outline/page.tsx` (MODIFY)

**Add model selector before approval button:**
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Add state
const [selectedModel, setSelectedModel] = useState("google:gemini-2.5-flash-image");

// Update approve handler
const handleApprove = async () => {
  // ... existing code ...

  // Set model before approval
  await updateModel({
    presentationId,
    imageModel: selectedModel,
  });

  await approveOutline({
    presentationId,
    finalOutlineMessageId: lastAssistantMessage._id,
  });

  // ... rest of code ...
};

// Add in UI (before approval button)
<div className="space-y-2">
  <Label>Image Generation Model</Label>
  <Select value={selectedModel} onValueChange={setSelectedModel}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="google:gemini-2.5-flash-image">
        Gemini 2.5 Flash (Recommended) - $3/deck
      </SelectItem>
      <SelectItem value="google:gemini-3-pro-image">
        Gemini 3 Pro (Premium) - $30/deck
      </SelectItem>
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground">
    Flash is cost-effective and great quality. Pro uses advanced reasoning for complex designs.
  </p>
</div>
```

**Add mutation:**
```typescript
// convex/presentations.ts
export const updateModel = mutation({
  args: {
    presentationId: v.id("presentations"),
    imageModel: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.presentationId, {
      imageModel: args.imageModel,
      updatedAt: Date.now(),
    });
  },
});
```

---

## Testing Steps

### 1. Test Title Slide Generation

1. Complete Phases 1-3 (outline + design system)
2. Trigger Phase 4
3. Monitor Convex logs for title slide generation
4. Verify image stored in Convex storage
5. Check image quality and design system adherence

### 2. Test Hierarchical Generation

1. Create presentation with multiple slide types
2. Verify generation order: title → sections → content
3. Check that each batch waits for previous
4. Verify context passed correctly

### 3. Test Progress Tracking

1. Watch `generatedSlideCount` increment in real-time
2. Verify frontend updates (if preview page exists)
3. Test with large deck (20+ slides)

### 4. Test Error Handling

1. Simulate image generation failure
2. Verify slide status updated to "error"
3. Verify presentation status updated
4. Check that subsequent slides still generate

### 5. Test Cost Tracking

1. Generate presentation with both models
2. Verify cost calculated correctly per slide
3. Check total cost matches expected
4. Verify usage records created

---

## Success Criteria

- ✅ Title slide generates first with design system context
- ✅ Section slides generate in parallel after title
- ✅ Content slides generate in parallel after sections
- ✅ All slides use design system consistently
- ✅ Visual consistency maintained across slides
- ✅ Images stored in Convex storage (PNG format)
- ✅ Progress tracking updates in real-time
- ✅ Cost and tokens recorded per slide
- ✅ Error handling works (individual slide failures)
- ✅ Large decks (20+ slides) complete successfully
- ✅ Status transitions: slides_generating → slides_complete
- ✅ Gemini 2.5 Flash and 3 Pro both work

---

## Files Created/Modified

### Modified:
- ✏️ `src/lib/prompts/slides.ts` - Added slide image prompt builder
- ✏️ `convex/presentations.ts` - Added progress, image update mutations
- ✏️ `src/app/(main)/slides/[id]/outline/page.tsx` - Added model selector

### Created:
- 🆕 `convex/generation/slideImage.ts` - Single slide generation action
- 🆕 `convex/presentations/generateSlides.ts` - Hierarchical orchestrator

---

## Dependencies

None - reuses existing Gemini integration.

---

## Cost Estimation

**Per 20-Slide Deck:**

**Gemini 2.5 Flash Image:**
- Input: ~1,500 tokens/slide × 20 = 30,000 tokens
- Output: ~500 tokens/slide × 20 = 10,000 tokens
- Cost: (30k × $0.075/M) + (10k × $0.30/M) = **$2.25 + $3.00 = $5.25**

**Gemini 3 Pro Image:**
- Input: ~1,500 tokens/slide × 20 = 30,000 tokens
- Output: ~500 tokens/slide × 20 = 10,000 tokens
- Reasoning: ~1,000 tokens/slide × 20 = 20,000 tokens
- Cost: (30k × $1.25/M) + (10k × $5/M) + (20k × $3.5/M) = **$37.50 + $50 + $70 = $157.50**

*Note: Actual costs may be lower with prompt optimization.*

**Total cost so far (Phases 2 + 3 + 4):**
- Flash: $0.017 + $5.25 = **$5.27**
- Pro: $0.017 + $157.50 = **$157.52**

---

## Performance Considerations

**Generation Time:**
- Title: ~10-15 seconds
- Sections (parallel): ~10-15 seconds total
- Content (parallel batches): ~30-60 seconds total
- **Total: 1-2 minutes for 20-slide deck**

**Convex Limits:**
- Action timeout: 10 minutes (plenty of headroom)
- Concurrent actions: ~10-15 (hence sub-batching)
- Storage: Unlimited (images stored efficiently)

---

## Next Phase

**Phase 5: Preview Interface** will build the PowerPoint-like UI for viewing generated slides (thumbnails, main preview, navigation).
