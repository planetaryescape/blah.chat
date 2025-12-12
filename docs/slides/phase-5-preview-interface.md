# Phase 5: Preview Interface

## Context: What We're Building

After slides are generated, users need a **PowerPoint-like interface** to view and navigate their presentation. This phase builds the preview UI with thumbnails, full-screen preview, slide details, and keyboard navigation.

**User Experience:**
- Familiar PowerPoint/Keynote-style layout
- Thumbnail sidebar for quick navigation
- Full-size slide preview in center
- Details panel showing slide content and speaker notes
- Keyboard shortcuts (arrow keys, number keys)
- Real-time updates during generation (progressive loading)

---

## Overall Architecture

**Full Slides Pipeline:**
```
Outline → Design System → Image Generation → [Phase 5: Preview] → Export
```

**Preview Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [← Back]  Presentation Title      [Download PPTX]      │
├───────────┬─────────────────────────────┬───────────────┤
│           │                             │               │
│ Thumbnail │     Main Preview Area       │    Details    │
│  Sidebar  │   (Full-size slide image)   │     Panel     │
│           │                             │               │
│  [1] ✓    │                             │  Slide 1/20   │
│  [2] ⟳    │   [Slide Image Display]     │  Title: ...   │
│  [3] ...  │   or [Loading Animation]    │  Content: ... │
│  [4] ...  │                             │  Notes: ...   │
│           │                             │               │
│           │                             │ [Regenerate]  │
└───────────┴─────────────────────────────┴───────────────┘
```

---

## Phase 5 Scope

After completion:
- ✅ Preview interface accessible at `/slides/[id]/preview`
- ✅ Thumbnail sidebar shows all slides (clickable)
- ✅ Main preview area displays full-size slide image
- ✅ Details panel shows slide text, notes, metadata
- ✅ Keyboard navigation works (← → arrows, number keys)
- ✅ Real-time updates during generation (progressive loading)
- ✅ Loading states for generating slides
- ✅ Error states for failed slides
- ✅ Download button (triggers Phase 6)

**What This Phase Does NOT Include:**
- ❌ Slide regeneration functionality (Phase 7)
- ❌ PPTX export (Phase 6)
- ❌ Slide editing (future enhancement)

---

## Technical Foundation

### blah.chat UI Patterns

**Existing Pattern Reference:**
- Notes page: Two-column layout (list + editor)
- Projects page: Card-based grid
- Chat page: Message list with sidebar

**Key Components Available:**
- shadcn/ui: Card, Button, Dialog, Tabs, ScrollArea
- Framer Motion: Animations, transitions
- Lucide icons: Arrow navigation, download, refresh icons
- nuqs: URL state persistence

**Relevant Files:**
- `src/app/(main)/notes/page.tsx` - Two-column layout pattern
- `src/components/ui/` - shadcn components
- `src/lib/utils.ts` - Utility functions (cn, etc.)

### Real-Time Updates with Convex

**Pattern:** Subscribe to presentation + slides queries

**Reactive Updates:**
```typescript
const presentation = useQuery(api.presentations.get, { presentationId });
const slides = useQuery(api.presentations.getSlides, { presentationId });

// Automatically re-renders when:
// - Slide imageStatus changes (pending → generating → complete)
// - Slide images are stored
// - generatedSlideCount updates
```

**Progressive Loading:**
- Show loading spinner for slides with `imageStatus === "generating"`
- Show error state for `imageStatus === "error"`
- Show image when `imageStatus === "complete"`

---

## Implementation Steps

### Step 1: Create Preview Page Route

**File:** `src/app/(main)/slides/[id]/preview/page.tsx` (NEW)

**Purpose:** Main preview interface.

**Code:**
```typescript
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { SlideThumbnail } from "@/components/slides/SlideThumbnail";
import { SlidePreview } from "@/components/slides/SlidePreview";
import { SlideDetails } from "@/components/slides/SlideDetails";
import { Progress } from "@/components/ui/progress";

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const presentationId = params.id as Id<"presentations">;

  const presentation = useQuery(api.presentations.get, { presentationId });
  const slides = useQuery(api.presentations.getSlides, { presentationId });

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!slides) return;

      switch (e.key) {
        case "ArrowRight":
          setCurrentSlideIndex((prev) => Math.min(prev + 1, slides.length - 1));
          break;
        case "ArrowLeft":
          setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
          break;
        default:
          // Number keys (1-9, 0)
          if (e.key >= "1" && e.key <= "9") {
            const index = parseInt(e.key) - 1;
            if (index < slides.length) {
              setCurrentSlideIndex(index);
            }
          }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides]);

  if (!presentation || !slides) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];
  const progress = presentation.totalSlides > 0
    ? (presentation.generatedSlideCount / presentation.totalSlides) * 100
    : 0;

  const isGenerating = presentation.status === "slides_generating";

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/slides")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{presentation.title}</h1>
            {isGenerating && (
              <p className="text-sm text-muted-foreground">
                Generating... {presentation.generatedSlideCount}/{presentation.totalSlides} slides
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={() => router.push(`/slides/${presentationId}/download`)}
          disabled={presentation.status !== "slides_complete"}
        >
          <Download className="h-4 w-4 mr-2" />
          Download PPTX
        </Button>
      </div>

      {/* Progress bar (only shown during generation) */}
      {isGenerating && (
        <div className="px-6 py-2 border-b">
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Thumbnail Sidebar */}
        <div className="w-64 border-r bg-muted/30 overflow-y-auto">
          <div className="p-4 space-y-2">
            {slides.map((slide, index) => (
              <SlideThumbnail
                key={slide._id}
                slide={slide}
                isActive={index === currentSlideIndex}
                onClick={() => setCurrentSlideIndex(index)}
              />
            ))}
          </div>
        </div>

        {/* CENTER: Main Preview */}
        <div className="flex-1 flex items-center justify-center bg-gray-100 p-8">
          <SlidePreview slide={currentSlide} />
        </div>

        {/* RIGHT: Details Panel */}
        <div className="w-80 border-l bg-background overflow-y-auto">
          <SlideDetails
            slide={currentSlide}
            slideNumber={currentSlideIndex + 1}
            totalSlides={slides.length}
          />
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Create Thumbnail Component

**File:** `src/components/slides/SlideThumbnail.tsx` (NEW)

**Purpose:** Thumbnail preview with loading/error states.

**Code:**
```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import Image from "next/image";

interface Props {
  slide: Doc<"slides">;
  isActive: boolean;
  onClick: () => void;
}

export function SlideThumbnail({ slide, isActive, onClick }: Props) {
  const imageUrl = slide.imageStorageId
    ? useQuery(api.storage.getUrl, { storageId: slide.imageStorageId })
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border-2 transition-all overflow-hidden group",
        isActive ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/20"
      )}
    >
      <div className="aspect-video bg-muted relative">
        {/* Loading State */}
        {slide.imageStatus === "generating" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {slide.imageStatus === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive">
            <AlertCircle className="h-6 w-6 mb-1" />
            <span className="text-xs">Failed</span>
          </div>
        )}

        {/* Complete State */}
        {slide.imageStatus === "complete" && imageUrl && (
          <>
            <Image
              src={imageUrl}
              alt={slide.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 256px"
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </>
        )}

        {/* Pending State */}
        {slide.imageStatus === "pending" && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <span className="text-xs">Pending</span>
          </div>
        )}
      </div>

      <div className="p-2">
        <p className="text-xs font-medium truncate">
          {slide.position}. {slide.title}
        </p>
        <p className="text-xs text-muted-foreground capitalize">
          {slide.slideType}
        </p>
      </div>
    </button>
  );
}
```

### Step 3: Create Main Preview Component

**File:** `src/components/slides/SlidePreview.tsx` (NEW)

**Purpose:** Full-size slide display with zoom capability.

**Code:**
```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Loader2, AlertCircle, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  slide: Doc<"slides">;
}

export function SlidePreview({ slide }: Props) {
  const [zoomOpen, setZoomOpen] = useState(false);

  const imageUrl = slide.imageStorageId
    ? useQuery(api.storage.getUrl, { storageId: slide.imageStorageId })
    : null;

  // Loading State
  if (slide.imageStatus === "generating") {
    return (
      <div className="w-full max-w-4xl aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium">Generating slide...</p>
          <p className="text-sm text-muted-foreground">{slide.title}</p>
        </div>
      </div>
    );
  }

  // Error State
  if (slide.imageStatus === "error") {
    return (
      <div className="w-full max-w-4xl aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-4 border-2 border-destructive/50">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <p className="font-medium text-destructive">Generation Failed</p>
          <p className="text-sm text-muted-foreground">{slide.imageError || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  // Pending State
  if (slide.imageStatus === "pending") {
    return (
      <div className="w-full max-w-4xl aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Waiting to generate...</p>
      </div>
    );
  }

  // Complete State
  if (!imageUrl) {
    return (
      <div className="w-full max-w-4xl aspect-video bg-muted rounded-lg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-4xl relative group">
        <div className="aspect-video relative rounded-lg overflow-hidden shadow-2xl">
          <Image
            src={imageUrl}
            alt={slide.title}
            fill
            className="object-contain bg-white"
            priority
            sizes="(max-width: 1200px) 100vw, 1200px"
          />

          {/* Zoom button */}
          <button
            onClick={() => setZoomOpen(true)}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Zoom Dialog */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-7xl w-[95vw] h-[95vh] p-0">
          <div className="relative w-full h-full">
            <Image
              src={imageUrl}
              alt={slide.title}
              fill
              className="object-contain"
              sizes="95vw"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Step 4: Create Details Panel Component

**File:** `src/components/slides/SlideDetails.tsx` (NEW)

**Purpose:** Show slide metadata, content, and actions.

**Code:**
```typescript
import { Doc } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Props {
  slide: Doc<"slides">;
  slideNumber: number;
  totalSlides: number;
}

export function SlideDetails({ slide, slideNumber, totalSlides }: Props) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Slide {slideNumber} of {totalSlides}
          </h2>
          <Badge variant="secondary" className="capitalize">
            {slide.slideType}
          </Badge>
        </div>
        <h3 className="text-xl font-semibold">{slide.title}</h3>
      </div>

      <Separator />

      {/* Content */}
      {slide.content && (
        <div>
          <h4 className="text-sm font-medium mb-2">Content</h4>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {slide.content}
          </div>
        </div>
      )}

      {/* Speaker Notes */}
      {slide.speakerNotes && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-2">Speaker Notes</h4>
            <p className="text-sm text-muted-foreground">{slide.speakerNotes}</p>
          </div>
        </>
      )}

      {/* Metadata */}
      <Separator />
      <div>
        <h4 className="text-sm font-medium mb-3">Metadata</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <Badge
              variant={
                slide.imageStatus === "complete"
                  ? "default"
                  : slide.imageStatus === "error"
                    ? "destructive"
                    : "secondary"
              }
              className="capitalize"
            >
              {slide.imageStatus}
            </Badge>
          </div>

          {slide.generationCost !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cost:</span>
              <span className="font-mono">${slide.generationCost.toFixed(4)}</span>
            </div>
          )}

          {slide.inputTokens !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tokens:</span>
              <span className="font-mono">
                {slide.inputTokens.toLocaleString()} in / {slide.outputTokens?.toLocaleString()} out
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <Separator />
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          disabled={slide.imageStatus !== "complete"}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate Slide
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Available in Phase 7
        </p>
      </div>
    </div>
  );
}
```

### Step 5: Add Storage URL Query (if not already present)

**File:** `convex/storage.ts` (NEW or VERIFY)

**Purpose:** Get public URLs for stored images.

**Code:**
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
```

---

## Testing Steps

### 1. Test Preview Page Access

1. Navigate to `/slides/[id]/preview` after Phase 4 completes
2. Verify all three panels render correctly
3. Check layout responsiveness

### 2. Test Real-Time Updates

1. Trigger slide generation (Phase 4)
2. Watch preview page during generation
3. Verify:
   - Progress bar updates
   - Thumbnails show loading spinners
   - Slides appear as they complete
   - generatedSlideCount increments

### 3. Test Navigation

1. Click thumbnails → verify main preview updates
2. Press → arrow → moves to next slide
3. Press ← arrow → moves to previous slide
4. Press number keys (1-9) → jumps to specific slides
5. Test edge cases (first slide ←, last slide →)

### 4. Test Zoom

1. Hover over slide in main preview
2. Click zoom icon
3. Verify full-screen dialog opens
4. Close dialog

### 5. Test Error States

1. Simulate slide generation failure
2. Verify error icon in thumbnail
3. Verify error message in main preview
4. Verify error badge in details panel

---

## Success Criteria

- ✅ Preview page accessible at `/slides/[id]/preview`
- ✅ Three-panel layout renders correctly
- ✅ Thumbnail sidebar shows all slides
- ✅ Main preview displays full-size image
- ✅ Details panel shows metadata
- ✅ Keyboard navigation works (←, →, numbers)
- ✅ Real-time updates during generation
- ✅ Progress bar shows generation status
- ✅ Loading states render correctly
- ✅ Error states render correctly
- ✅ Zoom functionality works
- ✅ Download button present (disabled until complete)

---

## Files Created

### Created:
- 🆕 `src/app/(main)/slides/[id]/preview/page.tsx` - Preview page
- 🆕 `src/components/slides/SlideThumbnail.tsx` - Thumbnail component
- 🆕 `src/components/slides/SlidePreview.tsx` - Main preview component
- 🆕 `src/components/slides/SlideDetails.tsx` - Details panel
- 🆕 `convex/storage.ts` - Storage URL query (if not already present)

---

## Dependencies

None - uses existing UI components (shadcn/ui).

---

## Next Phase

**Phase 6: PPTX Export** will implement on-demand PowerPoint file generation using PptxGenJS with server-side rendering and caching.
