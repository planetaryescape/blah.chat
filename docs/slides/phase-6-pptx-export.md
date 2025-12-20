# Phase 6: PPTX Export

**STATUS: ✅ IMPLEMENTED**

## Context: What We're Building

This phase implements **PowerPoint (PPTX) file generation** so users can download and edit their presentations in Microsoft PowerPoint, Google Slides, or Keynote. We use **PptxGenJS** for programmatic PPTX creation with on-demand generation and caching.

**Why PPTX Export:**
- Users expect standard presentation formats
- Enables offline editing and sharing
- Compatible with all major presentation software
- Preserves slides as editable (text overlays + background images)

**Key Design Decisions:**
- **On-demand generation** (not pre-generated) - saves storage, only generates when user requests
- **Server-side rendering** (Convex Node runtime) - PptxGenJS requires Node.js
- **Caching** (Convex storage) - avoid regenerating, serve from CDN
- **Text overlays** - slide text remains editable in PowerPoint

---

## Overall Architecture

**Full Slides Pipeline:**
```
Outline → Design System → Image Generation → Preview → [Phase 6: Export]
```

**Export Flow:**
```
User Clicks Download
  ↓
Check if PPTX already cached
  ├─ YES → Return cached URL (instant)
  └─ NO → Generate PPTX
      ↓
      Convex Action (Node runtime)
      ├─ Fetch all slide data
      ├─ Fetch all slide images from storage
      ├─ Create PptxGenJS instance
      ├─ Apply design system to master slide
      ├─ Add each slide:
      │   ├─ Background image
      │   ├─ Title text overlay
      │   ├─ Content text overlay (bullets)
      │   └─ Speaker notes
      ├─ Generate PPTX buffer
      └─ Store in Convex storage
  ↓
Update presentation.pptxStorageId
  ↓
Return download URL → User downloads
```

---

## Phase 6 Scope

After completion:
- ✅ Users can download PPTX files
- ✅ Generated files open in PowerPoint/Google Slides/Keynote
- ✅ Slides maintain design system aesthetics
- ✅ Text is editable (overlays, not baked into images)
- ✅ Speaker notes included
- ✅ On-demand generation with caching
- ✅ Download button triggers export
- ✅ Loading state during generation

**What This Phase Does NOT Include:**
- ❌ PDF export (future enhancement)
- ❌ Google Slides direct export (future enhancement)
- ❌ Customization of export format

---

## Technical Foundation

### PptxGenJS Library

**NPM Package:** `pptxgenjs`

**Features:**
- Programmatic PPTX creation (Node.js or browser)
- Master slides (templates)
- Text, images, shapes, charts
- Speaker notes
- Flexible layouts
- TypeScript definitions included

**Relevant Documentation:**
- Homepage: https://gitbrent.github.io/PptxGenJS/
- API Docs: https://gitbrent.github.io/PptxGenJS/docs/api-text.html
- Examples: https://gitbrent.github.io/PptxGenJS/docs/examples.html

### Convex Node Runtime

**Pattern:** `"use node"` directive enables Node.js features in Convex actions.

**Why Needed:**
- PptxGenJS requires Node.js Buffer API
- Browser version doesn't support all features
- Server-side generation more reliable

**Example:**
```typescript
"use node";

import PptxGenJS from "pptxgenjs";
// Now can use PptxGenJS with full Node.js features
```

**Existing Pattern:** blah.chat likely doesn't have Node runtime usage yet, but it's well-documented in Convex docs.

---

## Implementation Steps

### Step 1: Install Dependency

**Command:**
```bash
bun add pptxgenjs
```

**Note:** PptxGenJS includes TypeScript definitions, no separate `@types` package needed.

### Step 2: Create PPTX Export Action

**File:** `convex/presentations/export.ts` (NEW)

**Purpose:** Generate PPTX file from presentation data.

**Code:**
```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import PptxGenJS from "pptxgenjs";

export const generatePPTX = internalAction({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`Generating PPTX for presentation ${args.presentationId}`);

      // Fetch presentation
      const presentation = await ctx.runQuery(internal.presentations.get, {
        presentationId: args.presentationId,
      });

      if (!presentation) {
        throw new Error("Presentation not found");
      }

      if (presentation.status !== "slides_complete") {
        throw new Error("Slides not fully generated yet");
      }

      // Fetch all slides
      const slides = await ctx.runQuery(internal.presentations.getSlides, {
        presentationId: args.presentationId,
      });

      if (slides.length === 0) {
        throw new Error("No slides found");
      }

      // Initialize PptxGenJS
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      pptx.author = "blah.chat";
      pptx.title = presentation.title;

      // Design system
      const ds = presentation.designSystem;

      // Define Master Slide (template)
      if (ds) {
        pptx.defineSlideMaster({
          title: "MASTER",
          background: { color: ds.backgroundColor.replace("#", "") },
          objects: [
            // Footer with blah.chat branding
            {
              text: {
                text: "Created with blah.chat",
                options: {
                  x: 0.5,
                  y: 7.0,
                  w: 9,
                  h: 0.3,
                  fontSize: 10,
                  color: ds.primaryColor.replace("#", ""),
                  align: "left",
                  valign: "bottom",
                },
              },
            },
          ],
        });
      }

      // Add each slide
      for (const slideData of slides) {
        const slide = pptx.addSlide({ masterName: ds ? "MASTER" : undefined });

        // ===== BACKGROUND IMAGE =====
        if (slideData.imageStorageId) {
          try {
            // Get image URL
            const imageUrl = await ctx.storage.getUrl(slideData.imageStorageId);

            if (imageUrl) {
              // Fetch image data
              const imageResponse = await fetch(imageUrl);
              const imageArrayBuffer = await imageResponse.arrayBuffer();
              const imageBase64 = Buffer.from(imageArrayBuffer).toString("base64");

              // Add as background
              slide.background = {
                data: `data:image/png;base64,${imageBase64}`,
              };
            }
          } catch (error) {
            console.error(`Failed to add background for slide ${slideData.position}:`, error);
            // Continue without background
          }
        }

        // ===== TEXT OVERLAYS =====
        // (Ensures text remains editable in PowerPoint)

        // Title
        if (slideData.title) {
          const titleOptions: any = {
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 1.0,
            fontSize: slideData.slideType === "title" ? 44 : 36,
            bold: true,
            align: "left",
            valign: "top",
          };

          // Apply design system colors if available
          if (ds) {
            titleOptions.color = ds.accentColor.replace("#", "");
            titleOptions.fontFace = ds.fontPairings.heading;
          }

          slide.addText(slideData.title, titleOptions);
        }

        // Content bullets
        if (slideData.content && slideData.slideType === "content") {
          // Parse bullets from markdown
          const bullets = slideData.content
            .split("\n")
            .filter((line) => line.trim().startsWith("- "))
            .map((line) => line.trim().substring(2));

          if (bullets.length > 0) {
            const contentOptions: any = {
              x: 0.5,
              y: 2.0,
              w: 9,
              h: 4.0,
              fontSize: 18,
              bullet: true,
              align: "left",
              valign: "top",
            };

            if (ds) {
              contentOptions.color = "333333"; // Readable dark gray
              contentOptions.fontFace = ds.fontPairings.body;
            }

            slide.addText(bullets, contentOptions);
          }
        }

        // Subtitle (for title slides)
        if (slideData.slideType === "title" && slideData.content) {
          const subtitleOptions: any = {
            x: 0.5,
            y: 1.8,
            w: 9,
            h: 0.6,
            fontSize: 24,
            align: "left",
            valign: "top",
          };

          if (ds) {
            contentOptions.color = ds.secondaryColor.replace("#", "");
            contentOptions.fontFace = ds.fontPairings.body;
          }

          slide.addText(slideData.content, subtitleOptions);
        }

        // ===== SPEAKER NOTES =====
        if (slideData.speakerNotes) {
          slide.addNotes(slideData.speakerNotes);
        }
      }

      // ===== GENERATE PPTX BUFFER =====
      console.log("Generating PPTX buffer...");
      const pptxBuffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

      // ===== STORE IN CONVEX STORAGE =====
      console.log("Storing PPTX in Convex storage...");
      const blob = new Blob([pptxBuffer], {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });

      const storageId = await ctx.storage.store(blob);

      // ===== UPDATE PRESENTATION =====
      await ctx.runMutation(internal.presentations.updatePPTX, {
        presentationId: args.presentationId,
        pptxStorageId: storageId,
        pptxGeneratedAt: Date.now(),
      });

      console.log(`PPTX generated successfully: ${storageId}`);

      return { success: true, storageId };
    } catch (error) {
      console.error("PPTX generation error:", error);
      throw error;
    }
  },
});
```

### Step 3: Add PPTX Update Mutation

**File:** `convex/presentations.ts` (MODIFY)

**Add mutation:**
```typescript
export const updatePPTX = mutation({
  args: {
    presentationId: v.id("presentations"),
    pptxStorageId: v.id("_storage"),
    pptxGeneratedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.presentationId, {
      pptxStorageId: args.pptxStorageId,
      pptxGeneratedAt: args.pptxGeneratedAt,
      updatedAt: Date.now(),
    });
  },
});
```

### Step 4: Create Download Button Component

**File:** `src/components/slides/DownloadButton.tsx` (NEW)

**Purpose:** Download button with loading state.

**Code:**
```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface Props {
  presentationId: Id<"presentations">;
}

export function DownloadButton({ presentationId }: Props) {
  const [loading, setLoading] = useState(false);

  const presentation = useQuery(api.presentations.get, { presentationId });
  const downloadPPTX = useMutation(api.presentations.downloadPPTX);

  const handleDownload = async () => {
    if (!presentation) return;

    setLoading(true);
    try {
      // Check if PPTX already cached
      if (presentation.pptxStorageId) {
        // Get URL directly
        const url = await convex.query(api.storage.getUrl, {
          storageId: presentation.pptxStorageId,
        });

        if (url) {
          // Trigger download
          const a = document.createElement("a");
          a.href = url;
          a.download = `${presentation.title}.pptx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
      }

      // Generate PPTX on-demand
      const result = await downloadPPTX({ presentationId });

      if (result.success && result.url) {
        // Trigger download
        const a = document.createElement("a");
        a.href = result.url;
        a.download = `${presentation.title}.pptx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download presentation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !presentation || presentation.status !== "slides_complete" || loading;

  return (
    <Button
      onClick={handleDownload}
      disabled={isDisabled}
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating PPTX...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download PPTX
        </>
      )}
    </Button>
  );
}
```

### Step 5: Create Download Mutation (Wrapper)

**File:** `convex/presentations.ts` (MODIFY)

**Add public mutation:**
```typescript
export const downloadPPTX = mutation({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    const presentation = await ctx.db.get(args.presentationId);

    if (!presentation) {
      throw new Error("Presentation not found");
    }

    // If already cached, return URL
    if (presentation.pptxStorageId) {
      const url = await ctx.storage.getUrl(presentation.pptxStorageId);
      return { success: true, url };
    }

    // Trigger generation
    await ctx.scheduler.runAfter(0, internal.presentations.export.generatePPTX, {
      presentationId: args.presentationId,
    });

    // Poll for completion (client will poll)
    return { success: true, generating: true };
  },
});
```

### Step 6: Update Preview Page to Use Download Button

**File:** `src/app/(main)/slides/[id]/preview/page.tsx` (MODIFY)

**Replace download button with component:**
```typescript
import { DownloadButton } from "@/components/slides/DownloadButton";

// In header section:
<DownloadButton presentationId={presentationId} />
```

---

## Testing Steps

### 1. Test PPTX Generation

1. Complete Phases 1-5 (full presentation generated)
2. Click "Download PPTX" button
3. Wait for generation (should take 5-10 seconds for 20 slides)
4. Verify PPTX file downloads
5. Open in PowerPoint/Google Slides
6. Verify:
   - All slides present
   - Images display correctly
   - Text is editable
   - Speaker notes included
   - Design looks professional

### 2. Test Caching

1. Download PPTX once
2. Download again immediately
3. Verify second download is instant (cached)
4. Check Convex storage for single PPTX file (not duplicated)

### 3. Test Different Slide Counts

1. Create 5-slide presentation → download
2. Create 30-slide presentation → download
3. Verify both work correctly

### 4. Test Design System Application

1. Create presentation with different themes (technical, business, creative)
2. Verify design system colors/fonts applied to PPTX
3. Check master slide branding

### 5. Test Error Handling

1. Try downloading before slides complete
2. Verify button disabled
3. Simulate generation failure
4. Verify error message shown

---

## Success Criteria

- ✅ PPTX files generate successfully
- ✅ Downloaded files open in PowerPoint/Google Slides/Keynote
- ✅ All slides present in correct order
- ✅ Slide images display as backgrounds
- ✅ Text overlays editable in PowerPoint
- ✅ Speaker notes included
- ✅ Design system colors/fonts applied
- ✅ Master slide with branding present
- ✅ Caching works (instant second download)
- ✅ Download button shows loading state
- ✅ Large presentations (30+ slides) work
- ✅ File size reasonable (<20MB for 20 slides)

---

## Files Created/Modified

### Modified:
- ✏️ `convex/presentations.ts` - Added `updatePPTX` and `downloadPPTX` mutations
- ✏️ `src/app/(main)/slides/[id]/preview/page.tsx` - Integrated download button

### Created:
- 🆕 `convex/presentations/export.ts` - PPTX generation action (Node runtime)
- 🆕 `src/components/slides/DownloadButton.tsx` - Download button component

---

## Dependencies

**Required:**
```bash
bun add pptxgenjs
```

---

## Performance Considerations

**Generation Time:**
- 5 slides: ~2-3 seconds
- 20 slides: ~5-10 seconds
- 50 slides: ~15-20 seconds

**File Size:**
- ~200-500KB per slide with images
- 20-slide deck: ~5-10MB
- Convex storage: Unlimited, CDN-backed

**Optimization Tips:**
- Consider compressing images before adding to PPTX (future enhancement)
- Cache aggressively (already implemented)
- Consider background generation (trigger after Phase 4 completes)

---

## Known Limitations

**Color Format:**
- PptxGenJS uses hex without `#` symbol (e.g., "1A5490" not "#1A5490")
- Code includes `.replace("#", "")` conversion

**Font Embedding:**
- PowerPoint must have fonts installed to display correctly
- Fallback to system fonts if unavailable
- Future: embed fonts in PPTX (PptxGenJS supports this)

**Image Quality:**
- PNG images can be large
- Future: optimize with JPEG compression for non-transparent elements

---

## Next Phase

**Phase 7: Slide Regeneration** will allow users to regenerate individual slides with custom prompts for refinement.
