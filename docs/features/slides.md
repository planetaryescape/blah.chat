# Slides Feature Architecture

This document captures the architectural decisions, implementation patterns, and maintenance guidance for the AI-powered presentation generator in blah.chat.

## Overview

The Slides feature generates professional slide decks from user prompts using multi-model AI:
- **GLM-4.6** for content (outlines, design systems)
- **Gemini 2.5 Flash / 3 Pro** for slide images

### Key Differentiators

1. **Content-aware design systems** - AI extracts theme from content and generates distinctive visual language (not generic templates)
2. **Hierarchical generation** - Title → sections → content with context preservation for visual consistency
3. **Image-first approach** - AI-generated images, not WYSIWYG editor. Faster to ship, professional output, users edit in PowerPoint
4. **Resilient generation** - Survives page refresh using Convex actions with persistent DB updates

## Architecture

```
User Input (prompt/document/outline)
  ↓
Outline Generation (GLM-4.6, chat-style iteration)
  ↓
Design System Generation (GLM-4.6, analyzes content theme)
  ↓
Hierarchical Slide Image Generation:
  - Title slide (design system context only)
  - Section slides in parallel (design system + title)
  - Content slides in parallel (design system + title + sections)
  ↓
Preview Interface (PowerPoint-like UI)
  ↓
PPTX Export (PptxGenJS, on-demand with caching)
  ↓
Slide Regeneration (individual slides with custom prompts)
```

## Key Design Decisions

### 1. Normalized Schema (Not Nested)

We use separate `presentations` and `slides` tables instead of nesting slides in a presentation document.

**Why:**
- 40% smaller documents (faster queries, lower storage)
- 10x faster cascade deletes (indexed junction queries vs array scans)
- Atomic updates (change one slide without touching presentation)
- Queryable relationships (analytics, reporting)

**Pattern:**
```typescript
// presentations table
presentations: defineTable({
  userId, title, status, designSystem, imageModel,
  totalSlides, generatedSlideCount,
  pptxStorageId, pptxGeneratedAt, // Caching
  ...
})

// slides table (normalized)
slides: defineTable({
  presentationId, userId, position, slideType,
  title, content, speakerNotes,
  imageStatus, imageStorageId, imageError,
  generationCost, inputTokens, outputTokens,
  ...
})
```

### 2. Linked Conversation for Outline Iteration

Presentations link to a conversation (`conversationId`) for chat-style outline refinement.

**Why:**
- Reuses existing chat infrastructure (resilient generation, UI)
- Natural refinement workflow ("make slide 3 more concise")
- No duplicate code

### 3. Design System First

Before generating any slides, we analyze content and create a comprehensive design system JSON.

**Components:**
- Theme extracted from content (e.g., "peptides-biotech", "startup-pitch-bold")
- Color palette (primary, secondary, accent, background)
- Typography pairings (heading + body fonts)
- Visual style (geometric, organic, minimal, illustrative, data-driven)
- Layout principles (asymmetric, bold-typography, high-contrast)
- Icon style (line, solid, duotone)
- Detailed image guidelines for Gemini
- Design inspiration (Swiss modernism, Bauhaus, etc.)

**Why:**
- Ensures visual consistency across all slides
- Single source of truth for image generation prompts
- Creative, distinctive aesthetics (not generic)

### 4. Hierarchical Image Generation

Slides are generated in batches with context preservation:

```
Batch 1: Title slide (design system only)
  ↓ wait for completion
Batch 2: Section slides in parallel (design system + title slide context)
  ↓ wait for completion
Batch 3: Content slides in parallel (design system + title + first 3 sections)
```

**Why:**
- Visual consistency (each batch uses previous slides as reference)
- Performance (parallel within batches, ~1-2 min for 20 slides)
- Context preservation without sending all images (too expensive)

### 5. On-Demand PPTX with Caching

PPTX files are generated when user requests download, then cached in Convex storage.

**Why:**
- Storage efficient (not pre-generating for every presentation)
- CDN-backed for fast delivery
- Cache invalidated on slide regeneration

### 6. Text Overlays in PPTX

Slide images become backgrounds, with text rendered as overlays.

**Why:**
- Text remains editable in PowerPoint
- Users can tweak content without regenerating
- Speaker notes preserved

## Implementation Patterns

### Convex Action Structure

Long-running operations (image generation, PPTX export) use Convex actions with Node runtime:

```typescript
"use node";

export const generateSlideImage = internalAction({
  args: { ... },
  handler: async (ctx, args) => {
    // 1. Update status to "generating"
    await ctx.runMutation(internal.presentations.updateSlideImageStatus, {...});

    // 2. Call external AI API
    const result = await generateText({...});

    // 3. Store result
    const storageId = await ctx.storage.store(blob);

    // 4. Update DB with result
    await ctx.runMutation(internal.presentations.updateSlideImage, {...});

    // 5. Record usage
    await ctx.runMutation(internal.usage.mutations.recordImageGeneration, {...});
  },
});
```

### Status State Machine

Presentation status progresses through:
```
outline_pending → outline_generating → outline_complete
  → design_generating → design_complete
  → slides_generating → slides_complete
  → error (from any state)
```

Slide image status:
```
pending → generating → complete | error
```

### Context Preservation for Consistency

When generating content slides, pass context from previous slides:

```typescript
const contextSlides = [
  ...titleSlides.slice(0, 1).map(s => ({ type: "title", title: s.title })),
  ...sectionSlides.slice(0, 3).map(s => ({ type: "section", title: s.title })),
];
```

This is included in prompts for Gemini to understand visual consistency requirements without sending actual images (cost prohibitive).

### Resilient Generation

All AI generation uses the resilient pattern:
1. Immediate DB insert with `status: "pending"`
2. Trigger Convex action (runs server-side, up to 10min)
3. Action updates DB with partial/complete results
4. Client subscribes via reactive query → auto-updates
5. On page refresh: sees completed response from DB

### PPTX Generation (Node Runtime)

PptxGenJS requires Node runtime:

```typescript
"use node";

import PptxGenJS from "pptxgenjs";

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_16x9";

// Add slides with background images + text overlays
for (const slide of slides) {
  const pptxSlide = pptx.addSlide();
  pptxSlide.background = { data: base64Image };
  pptxSlide.addText(title, { ...designSystemStyles });
  pptxSlide.addNotes(speakerNotes);
}

const buffer = await pptx.write({ outputType: "nodebuffer" });
```

## Cost Model

**Per 20-Slide Deck:**

| Phase | Model | Cost |
|-------|-------|------|
| Outline | GLM-4.6 | ~$0.015 |
| Design System | GLM-4.6 | ~$0.002 |
| Images (Flash) | Gemini 2.5 Flash | ~$5.25 |
| Images (Pro) | Gemini 3 Pro | ~$157.50 |
| **Total (Flash)** | - | **~$5.27** |
| **Total (Pro)** | - | **~$157.52** |

Default to Flash for cost-effectiveness. Pro is premium option for complex designs.

## Performance

**Generation Times (20-slide deck):**
- Outline: ~5 seconds
- Design system: ~3 seconds
- Images: ~1-2 minutes (hierarchical batching)
- PPTX export: ~5-10 seconds (cached after first)

**Convex Limits:**
- Action timeout: 10 minutes (plenty of headroom)
- Concurrent actions: ~10-15 (hence sub-batching for large decks)
- Storage: Unlimited, CDN-backed

## File Structure

```
convex/
  presentations.ts          # 40+ queries/mutations/actions
  presentations/
    designSystem.ts         # Design system generation
    generateSlides.ts       # Hierarchical image generation
    export.ts               # PPTX generation
    regenerateSlide.ts      # Single slide regeneration
  generation/
    slideImage.ts           # Individual slide image generation
  lib/
    slides/
      parseOutline.ts       # Outline markdown parser

src/
  app/(main)/slides/
    new/page.tsx            # Input form (3 modes)
    [id]/
      outline/page.tsx      # Chat-style outline editor
      preview/page.tsx      # PowerPoint-like preview
      presenter/page.tsx    # Presentation mode
  components/slides/
    SlidePreview.tsx        # Main slide display
    SlideThumbnail.tsx      # Thumbnail grid
    SlideDetails.tsx        # Content panel
    RegenerateSlideModal.tsx
    DownloadButton.tsx
  lib/prompts/
    slides/                 # All slide prompts
```

## Common Pitfalls

### Schema Design
- **Don't** nest slides in presentations array (bloats documents)
- **Do** use normalized tables with proper indexes

### Generation Flow
- **Don't** generate all slides fully in parallel (inconsistent visuals)
- **Do** use hierarchical batching with context preservation

### Cost Management
- **Don't** default to Gemini 3 Pro for all users
- **Do** offer model selection, default to Flash

### PPTX Export
- **Don't** pre-generate PPTX after every slide (wastes storage)
- **Do** generate on-demand with caching

### Error Handling
- **Don't** fail entire presentation if one slide errors
- **Do** mark individual slides as error, continue with others

### Regeneration
- **Don't** keep old slide images in storage (bloat)
- **Do** delete old image before storing new one
- **Do** invalidate PPTX cache after regeneration

## Troubleshooting

**Outline not parsing correctly:**
- Check markdown format in GLM-4.6 output
- Verify Type field present on each slide
- Test parser with sample outlines

**Design system missing fields:**
- Validate JSON parsing (check for markdown code blocks)
- Verify all required fields in schema
- Check GLM-4.6 prompt clarity

**Slide images not generating:**
- Check Gemini API quotas/credits
- Verify image model configured correctly
- Check Convex action logs
- Test with smaller presentation first

**PPTX file corrupted:**
- Verify PptxGenJS version (latest)
- Check image base64 encoding
- Test with simple presentation (no images)
- Color hex format: no # symbol ("1A5490" not "#1A5490")

**Regeneration not working:**
- Check PPTX cache invalidation
- Verify old images deleted
- Check context slides passed correctly

## Future Enhancements

### Near-Term
- Slide templates (pre-made layouts)
- Batch slide regeneration
- Prompt suggestions ("More visual", "Less text")
- Design system preview/customize UI
- Cost estimates before generation

### Medium-Term
- Slide editing (drag-drop, text editing)
- Animations/transitions
- PDF export
- Google Slides direct export
- Collaboration (real-time, comments)

### Long-Term
- Template library
- Brand kits (company colors, logos)
- A/B testing (multiple variations)
- Analytics (views, engagement)
- Presenter mode with timing

## Dependencies

- `pptxgenjs` - PPTX file generation
- Gemini models via Vercel AI SDK
- GLM-4.6 via Vercel AI Gateway
- Convex storage for images and PPTX files

## Related Documentation

- `CLAUDE.md` - Project-wide patterns
- `docs/SCHEMA_NORMALIZATION_GUIDE.md` - Schema design principles
- Convex docs: https://docs.convex.dev
- PptxGenJS: https://gitbrent.github.io/PptxGenJS/
