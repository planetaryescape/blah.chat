# Phase 7: Slide Regeneration

## Context: What We're Building

Sometimes users want to **refine individual slides** without regenerating the entire presentation. This phase adds the ability to regenerate a single slide with an optional custom prompt for tweaks.

**Use Cases:**
- "Make this slide more visual, less text"
- "Use different colors on this specific slide"
- "Add more technical detail to slide 5"
- "Regenerate with better composition"
- Fix slides that didn't generate well initially

**Key Features:**
- Regenerate any individual slide
- Optional custom prompt override
- Maintains design system consistency
- Uses same context (previous slides) as original generation
- Real-time preview updates
- Cost tracking per regeneration

---

## Overall Architecture

**Full Slides Pipeline:**
```
Outline → Design System → Image Generation → Preview → Export → [Phase 7: Regeneration]
```

**Regeneration Flow:**
```
User Clicks "Regenerate" on Slide
  ↓
Modal Opens
  ├─ Shows current slide
  ├─ Text input for custom prompt (optional)
  └─ "Regenerate" button
  ↓
User Submits (with or without custom prompt)
  ↓
Mark slide as "generating"
  ↓
Trigger single slide generation action
  ├─ Use same design system
  ├─ Use same context slides
  ├─ Merge custom prompt if provided
  ├─ Generate new image
  └─ Replace old image
  ↓
Update slide with new image
  ↓
Preview auto-updates (Convex reactivity)
  ↓
User sees new slide immediately
```

---

## Phase 7 Scope

After completion:
- ✅ "Regenerate" button on each slide
- ✅ Modal for custom prompt input
- ✅ Single slide regeneration works
- ✅ Custom prompts modify generation
- ✅ Design system maintained
- ✅ Context preserved (previous slides)
- ✅ Real-time preview updates
- ✅ Cost tracked per regeneration
- ✅ History of prompts stored (for debugging)

**What This Phase Does NOT Include:**
- ❌ Regeneration history/undo (future enhancement)
- ❌ Batch regeneration (multiple slides at once)
- ❌ Prompt templates/suggestions

---

## Technical Foundation

### Existing Infrastructure

**Already Implemented (Phase 4):**
- `convex/generation/slideImage.ts` - Single slide generation
- Context preservation logic
- Design system integration
- Cost tracking

**What We're Adding:**
- Regeneration UI (modal, button)
- Custom prompt merging logic
- Public mutation to trigger regeneration

**Pattern:** Reuse Phase 4's single slide generation, just trigger it from UI with custom prompt.

---

## Implementation Steps

### Step 1: Create Regeneration Modal Component

**File:** `src/components/slides/RegenerateSlideModal.tsx` (NEW)

**Purpose:** Modal for regenerating slide with optional custom prompt.

**Code:**
```typescript
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";

interface Props {
  slide: Doc<"slides">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegenerateSlideModal({ slide, open, onOpenChange }: Props) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const regenerateSlide = useMutation(api.presentations.regenerateSlide);
  const imageUrl = slide.imageStorageId
    ? useQuery(api.storage.getUrl, { storageId: slide.imageStorageId })
    : null;

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      await regenerateSlide({
        slideId: slide._id,
        customPrompt: customPrompt.trim() || undefined,
      });

      // Close modal
      onOpenChange(false);
      setCustomPrompt("");
    } catch (error) {
      console.error("Regeneration error:", error);
      alert("Failed to regenerate slide. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Regenerate Slide</DialogTitle>
          <DialogDescription>
            Optionally provide instructions to customize the regeneration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Slide Preview */}
          <div>
            <Label className="text-sm font-medium">Current Slide</Label>
            <div className="mt-2 aspect-video bg-muted rounded-lg overflow-hidden relative">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={slide.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 768px"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <Label htmlFor="customPrompt">
              Custom Instructions (Optional)
            </Label>
            <Textarea
              id="customPrompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="E.g., 'Make this slide more visual with icons', 'Use warmer colors', 'Add more whitespace', etc."
              rows={4}
              className="mt-2"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to regenerate with the same prompt. Add instructions to customize the design.
            </p>
          </div>

          {/* Slide Info */}
          <div className="text-sm text-muted-foreground">
            <p><strong>Title:</strong> {slide.title}</p>
            <p><strong>Type:</strong> {slide.slideType}</p>
            {slide.generationCost && (
              <p><strong>Original cost:</strong> ${slide.generationCost.toFixed(4)}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Slide
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 2: Add Regenerate Button to Slide Details

**File:** `src/components/slides/SlideDetails.tsx` (MODIFY)

**Update actions section:**
```typescript
import { useState } from "react";
import { RegenerateSlideModal } from "./RegenerateSlideModal";

// Add state
const [regenerateOpen, setRegenerateOpen] = useState(false);

// Update button in actions section
<Button
  variant="outline"
  className="w-full"
  onClick={() => setRegenerateOpen(true)}
  disabled={slide.imageStatus === "generating"}
>
  <RefreshCw className="h-4 w-4 mr-2" />
  Regenerate Slide
</Button>

{/* Add modal */}
<RegenerateSlideModal
  slide={slide}
  open={regenerateOpen}
  onOpenChange={setRegenerateOpen}
/>
```

### Step 3: Create Regeneration Mutation

**File:** `convex/presentations.ts` (MODIFY)

**Add public mutation:**
```typescript
export const regenerateSlide = mutation({
  args: {
    slideId: v.id("slides"),
    customPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get slide
    const slide = await ctx.db.get(args.slideId);
    if (!slide) {
      throw new Error("Slide not found");
    }

    // Get presentation (for design system and model)
    const presentation = await ctx.db.get(slide.presentationId);
    if (!presentation) {
      throw new Error("Presentation not found");
    }

    // Mark slide as generating
    await ctx.db.patch(args.slideId, {
      imageStatus: "generating",
      updatedAt: Date.now(),
    });

    // Get context slides (same as original generation)
    const allSlides = await ctx.db
      .query("slides")
      .withIndex("by_presentation_position", (q) =>
        q.eq("presentationId", slide.presentationId)
      )
      .collect();

    // Build context based on slide type
    let contextSlides: Array<{ type: string; title: string }> = [];

    if (slide.slideType === "section" || slide.slideType === "content") {
      // Include title slide
      const titleSlides = allSlides.filter((s) => s.slideType === "title");
      if (titleSlides.length > 0) {
        contextSlides.push({ type: "title", title: titleSlides[0].title });
      }
    }

    if (slide.slideType === "content") {
      // Include first 3 section slides
      const sectionSlides = allSlides
        .filter((s) => s.slideType === "section")
        .slice(0, 3);
      contextSlides.push(
        ...sectionSlides.map((s) => ({ type: "section", title: s.title }))
      );
    }

    // Trigger regeneration action
    await ctx.scheduler.runAfter(
      0,
      internal.presentations.generateSlideInternal,
      {
        slideId: args.slideId,
        modelId: presentation.imageModel,
        designSystem: presentation.designSystem,
        contextSlides,
        customPrompt: args.customPrompt,
      }
    );

    return { success: true };
  },
});
```

### Step 4: Create Internal Regeneration Action

**File:** `convex/presentations/regenerateSlide.ts` (NEW)

**Purpose:** Internal action for single slide regeneration with custom prompt support.

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

export const generateSlideInternal = internalAction({
  args: {
    slideId: v.id("slides"),
    modelId: v.string(),
    designSystem: v.any(),
    contextSlides: v.array(
      v.object({
        type: v.string(),
        title: v.string(),
      })
    ),
    customPrompt: v.optional(v.string()),
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

      // Build base prompt
      let prompt = buildSlideImagePrompt({
        slideType: slide.slideType,
        title: slide.title,
        content: slide.content,
        designSystem: args.designSystem,
        contextSlides: args.contextSlides,
      });

      // Merge custom prompt if provided
      if (args.customPrompt) {
        prompt += `\n\nADDITIONAL CUSTOM INSTRUCTIONS:\n${args.customPrompt}`;
      }

      // Store prompt (for debugging/history)
      await ctx.runMutation(internal.presentations.updateSlidePrompt, {
        slideId: args.slideId,
        imagePrompt: prompt,
      });

      // Generate image
      const result = await generateText({
        model: aiGateway(args.modelId),
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      // Extract image (same pattern as Phase 4)
      let imageData: Uint8Array | null = null;

      if (result.files && result.files.length > 0) {
        imageData = result.files[0];
      } else {
        const base64Match = result.text.match(/data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)/);
        if (base64Match) {
          const base64Data = base64Match[2];
          imageData = Uint8Array.from(Buffer.from(base64Data, "base64"));
        }
      }

      if (!imageData) {
        throw new Error("No image data found in response");
      }

      // Delete old image from storage (if exists)
      if (slide.imageStorageId) {
        try {
          await ctx.storage.delete(slide.imageStorageId);
        } catch (error) {
          console.error("Failed to delete old image:", error);
          // Continue anyway
        }
      }

      // Store new image
      const blob = new Blob([imageData], { type: "image/png" });
      const storageId = await ctx.storage.store(blob);

      // Calculate cost
      const cost = calculateCost(args.modelId, {
        inputTokens: result.usage?.promptTokens || 0,
        outputTokens: result.usage?.completionTokens || 0,
        reasoningTokens: result.usage?.reasoningTokens || 0,
      });

      // Update slide
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
          regeneration: true,
          customPrompt: args.customPrompt,
        },
      });

      // Invalidate PPTX cache (needs regeneration)
      const presentation = await ctx.runQuery(internal.presentations.get, {
        presentationId: slide.presentationId,
      });

      if (presentation?.pptxStorageId) {
        await ctx.runMutation(internal.presentations.clearPPTXCache, {
          presentationId: slide.presentationId,
        });
      }

      return { success: true, storageId, cost };
    } catch (error) {
      console.error("Slide regeneration error:", error);

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

### Step 5: Add PPTX Cache Clearing Mutation

**File:** `convex/presentations.ts` (MODIFY)

**Add mutation:**
```typescript
export const clearPPTXCache = mutation({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    const presentation = await ctx.db.get(args.presentationId);

    if (presentation?.pptxStorageId) {
      // Delete old PPTX from storage
      try {
        await ctx.storage.delete(presentation.pptxStorageId);
      } catch (error) {
        console.error("Failed to delete cached PPTX:", error);
      }

      // Clear cache reference
      await ctx.db.patch(args.presentationId, {
        pptxStorageId: undefined,
        pptxGeneratedAt: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});
```

### Step 6: Add Visual Feedback to Thumbnail

**File:** `src/components/slides/SlideThumbnail.tsx` (MODIFY)

**Add regeneration indicator:**
```typescript
{/* Regenerating indicator */}
{slide.imageStatus === "generating" && (
  <div className="absolute top-2 left-2">
    <Badge variant="secondary" className="text-xs">
      Regenerating...
    </Badge>
  </div>
)}
```

---

## Testing Steps

### 1. Test Basic Regeneration

1. Navigate to preview page
2. Click "Regenerate" on any slide
3. Don't enter custom prompt
4. Click "Regenerate Slide"
5. Verify:
   - Modal closes
   - Slide status changes to "generating"
   - Loading spinner appears in thumbnail
   - New image appears after ~10-15 seconds
   - Preview auto-updates

### 2. Test Custom Prompt

1. Click "Regenerate" on slide
2. Enter custom prompt: "Make this slide more visual with icons"
3. Click "Regenerate Slide"
4. Verify:
   - New image reflects custom instructions
   - Design system still maintained
   - Context still preserved

### 3. Test Multiple Regenerations

1. Regenerate same slide 3 times with different prompts
2. Verify each regeneration works
3. Check cost accumulates correctly
4. Verify old images deleted from storage (no bloat)

### 4. Test PPTX Cache Invalidation

1. Download PPTX (creates cache)
2. Regenerate a slide
3. Download PPTX again
4. Verify new PPTX includes regenerated slide (not cached version)

### 5. Test Error Handling

1. Simulate regeneration failure
2. Verify error status shown
3. Verify user can retry

---

## Success Criteria

- ✅ "Regenerate" button works on all slides
- ✅ Modal opens with current slide preview
- ✅ Can regenerate without custom prompt (uses original)
- ✅ Custom prompts modify generation appropriately
- ✅ Design system maintained across regenerations
- ✅ Context slides preserved
- ✅ Real-time preview updates (Convex reactivity)
- ✅ Old images deleted (no storage bloat)
- ✅ Cost tracked per regeneration
- ✅ PPTX cache invalidated after regeneration
- ✅ Loading states show during regeneration
- ✅ Error states handled gracefully

---

## Files Created/Modified

### Modified:
- ✏️ `convex/presentations.ts` - Added `regenerateSlide`, `clearPPTXCache`, internal exports
- ✏️ `src/components/slides/SlideDetails.tsx` - Added regenerate button and modal
- ✏️ `src/components/slides/SlideThumbnail.tsx` - Added regeneration indicator

### Created:
- 🆕 `src/components/slides/RegenerateSlideModal.tsx` - Regeneration modal UI
- 🆕 `convex/presentations/regenerateSlide.ts` - Internal regeneration action

---

## Dependencies

None - reuses existing infrastructure.

---

## Cost Considerations

**Per Regeneration:**
- Same cost as initial generation (~$0.15-$1.50 depending on model)
- Track regenerations separately in usage metadata
- Users should be aware of costs (show in UI)

**Optimization:**
- Limit regenerations per slide (e.g., max 5) - future enhancement
- Show cost estimate before regeneration - future enhancement

---

## Future Enhancements

**Regeneration History:**
- Store previous versions of slides
- Allow "undo" to previous version
- Show history in modal

**Batch Regeneration:**
- Regenerate multiple slides at once
- Useful for theme changes

**Prompt Templates:**
- Pre-made prompt suggestions
- "More visual", "Less text", "Different colors", etc.
- One-click refinements

**A/B Testing:**
- Generate 2-3 variations
- Let user pick best one
- Learn from preferences

---

## Completion

**All Phases Complete!**

The Slides feature is now fully implemented:
- ✅ Phase 1: Schema & Infrastructure
- ✅ Phase 2: Outline Generation
- ✅ Phase 3: Design System Generation
- ✅ Phase 4: Slide Image Generation
- ✅ Phase 5: Preview Interface
- ✅ Phase 6: PPTX Export
- ✅ Phase 7: Slide Regeneration

**Users can now:**
1. Create presentations from prompts/documents/outlines
2. Iterate on outlines via chat
3. Get AI-generated design systems
4. Generate professional slide images
5. Preview slides in PowerPoint-like interface
6. Download as PPTX files
7. Regenerate individual slides with custom prompts

**Next Steps:**
- Deploy to production
- Monitor usage and costs
- Gather user feedback
- Iterate on features
- Consider future enhancements (editing, templates, collaboration)
