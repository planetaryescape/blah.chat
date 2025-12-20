# Phase 3: Design System Generation

**STATUS: ✅ IMPLEMENTED**

## Context: What We're Building

After users approve their slide outline, we need to create a **comprehensive design system** that will guide all slide image generation. This phase uses GLM-4.6 to analyze the presentation content and generate a distinctive visual language.

**Why Design System First:**
- Ensures visual consistency across all slides
- Content-aware design (extracts theme from outline)
- Creative, distinctive aesthetics (not generic templates)
- Single source of truth for all image generation prompts

**Example:** A presentation about peptides would get a biotech-inspired design (molecular structures, scientific palette), while a startup pitch gets bold, confident visuals.

---

## Overall Architecture

**Full Slides Pipeline:**
```
Outline → [Phase 3: Design System] → Hierarchical Image Generation → Preview → Export
```

**This Phase:**
```
Outline Approved (Phase 2)
  ↓
Analyze All Slide Content
  ↓
GLM-4.6 Generates Design System (theme, colors, fonts, visual style)
  ↓
Store in presentations.designSystem
  ↓
Update Status → Trigger Image Generation (Phase 4)
```

---

## Phase 3 Scope

After completion:
- ✅ GLM-4.6 analyzes presentation content
- ✅ Generates comprehensive design system JSON
- ✅ Design system stored in database
- ✅ Ready for hierarchical slide generation (Phase 4)

**What This Phase Does NOT Include:**
- ❌ Slide image generation
- ❌ Preview interface
- ❌ User customization of design system (future enhancement)

---

## Design System Structure

### What Makes a Good Design System

**Components:**
1. **Theme** - Extracted from content (e.g., "peptides-biotech", "startup-pitch")
2. **Color Palette** - Primary, secondary, accent, background
3. **Typography** - Font pairings (heading + body)
4. **Visual Style** - Geometric, organic, minimal, illustrative, data-driven
5. **Layout Principles** - Asymmetric, bold typography, high contrast, etc.
6. **Icon Style** - Line, solid, duotone, abstract
7. **Image Guidelines** - Detailed visual direction for image generation
8. **Design Inspiration** - Reference to design movements (Swiss modernism, Bauhaus, etc.)

### Example Design Systems

**Biotech Presentation:**
```json
{
  "theme": "peptides-biotech",
  "themeRationale": "Scientific content about molecular structures and medical applications",
  "primaryColor": "#1A5490",
  "secondaryColor": "#4A90C4",
  "accentColor": "#00D4AA",
  "backgroundColor": "#F8FAFB",
  "fontPairings": {
    "heading": "Barlow Semi Condensed",
    "body": "Inter"
  },
  "visualStyle": "data-driven",
  "layoutPrinciples": ["clean-hierarchy", "whitespace-driven", "scientific-precision"],
  "iconStyle": "line",
  "imageGuidelines": "Molecular structure visualizations, abstract peptide bonds, clean scientific diagrams. Cool color palette emphasizing blues and teals. High contrast for clarity. Avoid stock imagery - focus on diagrammatic representations.",
  "designInspiration": "Swiss modernism with scientific data visualization aesthetics"
}
```

**Startup Pitch:**
```json
{
  "theme": "startup-pitch-bold",
  "themeRationale": "High-energy pitch deck requiring confident, attention-grabbing visuals",
  "primaryColor": "#0F172A",
  "secondaryColor": "#7C3AED",
  "accentColor": "#F59E0B",
  "backgroundColor": "#FFFFFF",
  "fontPairings": {
    "heading": "Cabinet Grotesk",
    "body": "Inter"
  },
  "visualStyle": "geometric",
  "layoutPrinciples": ["asymmetric", "bold-typography", "high-contrast"],
  "iconStyle": "solid",
  "imageGuidelines": "Bold geometric shapes, gradient accents, dynamic diagonals. Use primary black with purple and gold accents. Energy and momentum. Avoid corporate-safe aesthetics.",
  "designInspiration": "Y Combinator pitch deck style meets Brutalist web design"
}
```

---

## Implementation Steps

### Step 1: Create Design System Prompt

**File:** `src/lib/prompts/slides.ts` (MODIFY)

**Add this export:**
```typescript
export const DESIGN_SYSTEM_PROMPT = `
You are a professional design system architect. Analyze this presentation outline and create a comprehensive visual design system.

OUTLINE:
{OUTLINE_CONTENT}

YOUR TASK:
1. Extract the CORE THEME from the content (what is this presentation fundamentally about?)
2. Design a visual language that reflects the content's essence
3. Be CREATIVE and DISTINCTIVE - avoid generic corporate templates
4. Match the content tone (technical/business/academic/creative/scientific)
5. Use colors, fonts, and visual style that reinforce the message

EXAMPLES OF GOOD THEME EXTRACTION:
- Peptides in medicine → "peptides-biotech" (molecular, scientific, precise)
- Climate change solutions → "climate-action" (earth tones, urgent, hopeful)
- Startup funding pitch → "startup-pitch-bold" (confident, energetic, modern)
- Academic research → "academic-rigorous" (clean, authoritative, scholarly)

VISUAL STYLE GUIDELINES:
- Technical/Scientific → Clean layouts, data viz style, blue/teal palette, geometric
- Business/Professional → Confident colors, asymmetric layouts, bold typography
- Creative/Artistic → Unexpected color combos, organic shapes, artistic elements
- Academic → Scholarly palette, traditional hierarchy, serif fonts

OUTPUT FORMAT (JSON):
{
  "theme": "Concise theme extracted from content (e.g., 'peptides-biotech')",
  "themeRationale": "1-2 sentences explaining why this theme matches the content",
  "primaryColor": "#HEX (dominant color)",
  "secondaryColor": "#HEX (supporting color)",
  "accentColor": "#HEX (highlight color)",
  "backgroundColor": "#HEX (slide background)",
  "fontPairings": {
    "heading": "Font name for titles (creative choice that fits theme)",
    "body": "Font name for content (readable, complements heading)"
  },
  "visualStyle": "geometric|organic|minimal|illustrative|data-driven|artistic",
  "layoutPrinciples": ["Array of 2-4 principles: 'asymmetric', 'bold-typography', 'high-contrast', 'whitespace-driven', 'scientific-precision', 'dynamic-diagonals']",
  "iconStyle": "line|solid|duotone|abstract",
  "imageGuidelines": "Detailed visual direction: mood, style, elements to include/avoid, color usage, composition guidelines. Be specific and actionable for image generation.",
  "designInspiration": "Reference design styles or movements (e.g., 'Swiss modernism', 'Memphis design', 'Brutalism', 'Bauhaus', 'Y Combinator pitch style', 'Scientific data visualization')"
}

CRITICAL REQUIREMENTS:
- BE BOLD AND CREATIVE
- Avoid generic corporate blue/gray templates
- Color choices must have rationale (not arbitrary)
- Font pairings must complement each other
- Image guidelines must be detailed enough to guide AI image generation
- Design inspiration should reference real design movements/styles

Think deeply about what makes this presentation unique. What visual language will make it memorable and effective?
`;

export function buildDesignSystemPrompt(outlineContent: string): string {
  return DESIGN_SYSTEM_PROMPT.replace("{OUTLINE_CONTENT}", outlineContent);
}
```

### Step 2: Create Design System Generation Action

**File:** `convex/presentations/designSystem.ts` (NEW)

**Purpose:** Convex action to generate design system using GLM-4.6.

**Code:**
```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { buildDesignSystemPrompt } from "../../src/lib/prompts/slides";
import { generateText } from "ai";
import { aiGateway } from "../../src/lib/ai/gateway";

export const generateDesignSystem = internalAction({
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

      // Update status
      await ctx.runMutation(internal.presentations.updateStatus, {
        presentationId: args.presentationId,
        status: "design_generating",
      });

      // Get all slides to analyze content
      const slides = await ctx.runQuery(internal.presentations.getSlides, {
        presentationId: args.presentationId,
      });

      if (slides.length === 0) {
        throw new Error("No slides found for presentation");
      }

      // Build outline content string
      const outlineContent = slides
        .map((slide) => {
          const typeLabel =
            slide.slideType === "title"
              ? "TITLE SLIDE"
              : slide.slideType === "section"
                ? "SECTION"
                : "CONTENT SLIDE";

          return `
# ${typeLabel}: ${slide.title}
${slide.content}
${slide.speakerNotes ? `Speaker Notes: ${slide.speakerNotes}` : ""}
`;
        })
        .join("\n");

      // Generate design system using GLM-4.6
      const prompt = buildDesignSystemPrompt(outlineContent);

      const result = await generateText({
        model: aiGateway("glm-4.6"),
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.9, // Higher creativity for design
      });

      // Parse JSON response
      const responseText = result.text.trim();
      let designSystem;

      try {
        // Extract JSON if wrapped in markdown code blocks
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        designSystem = JSON.parse(jsonText);
      } catch (parseError) {
        console.error("Failed to parse design system JSON:", responseText);
        throw new Error("Invalid design system format from AI");
      }

      // Validate required fields
      const requiredFields = [
        "theme",
        "themeRationale",
        "primaryColor",
        "secondaryColor",
        "accentColor",
        "backgroundColor",
        "fontPairings",
        "visualStyle",
        "layoutPrinciples",
        "iconStyle",
        "imageGuidelines",
        "designInspiration",
      ];

      for (const field of requiredFields) {
        if (!designSystem[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Store design system
      await ctx.runMutation(internal.presentations.saveDesignSystem, {
        presentationId: args.presentationId,
        designSystem,
      });

      // Update status to design_complete
      await ctx.runMutation(internal.presentations.updateStatus, {
        presentationId: args.presentationId,
        status: "design_complete",
      });

      // Trigger hierarchical slide generation (Phase 4)
      await ctx.scheduler.runAfter(0, internal.presentations.generateSlides, {
        presentationId: args.presentationId,
      });

      return { success: true, designSystem };
    } catch (error) {
      console.error("Design system generation error:", error);

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

### Step 3: Add Design System Save Mutation

**File:** `convex/presentations.ts` (MODIFY)

**Add these mutations:**
```typescript
export const saveDesignSystem = mutation({
  args: {
    presentationId: v.id("presentations"),
    designSystem: v.object({
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.presentationId, {
      designSystem: args.designSystem,
      updatedAt: Date.now(),
    });
  },
});
```

### Step 4: Export Internal API

**File:** `convex/presentations.ts` (MODIFY)

**Add at top of file:**
```typescript
import { internalMutation, internalQuery } from "./_generated/server";

// Export internal versions for actions
export const getInternal = internalQuery(get);
export const getSlidesInternal = internalQuery(getSlides);
export const updateStatusInternal = internalMutation(updateStatus);
export const saveDesignSystemInternal = internalMutation(saveDesignSystem);
```

### Step 5: Add GLM-4.6 to Model Config (if not already present)

**File:** `src/lib/ai/models.ts` (VERIFY/ADD)

**Ensure GLM-4.6 is configured:**
```typescript
"glm-4.6": {
  id: "glm-4.6",
  name: "GLM-4.6",
  provider: "glm",
  contextWindow: 128000,
  maxOutputTokens: 8192,
  capabilities: ["chat"],
  pricing: {
    input: 0.30,
    output: 1.20,
  },
  knowledgeCutoff: "2024-10",
  description: "Creative, cost-effective model for content generation",
},
```

### Step 6: Create Design System Preview Component (Optional UI)

**File:** `src/components/slides/DesignSystemPreview.tsx` (NEW)

**Purpose:** Visual preview of generated design system (shown during generation).

**Code:**
```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DesignSystem {
  theme: string;
  themeRationale: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontPairings: {
    heading: string;
    body: string;
  };
  visualStyle: string;
  layoutPrinciples: string[];
  iconStyle: string;
  imageGuidelines: string;
  designInspiration: string;
}

interface Props {
  designSystem: DesignSystem;
}

export function DesignSystemPreview({ designSystem }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Design System
          <Badge variant="secondary">{designSystem.theme}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{designSystem.themeRationale}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Palette */}
        <div>
          <h3 className="font-medium mb-3">Color Palette</h3>
          <div className="flex gap-3">
            {[
              { label: "Primary", color: designSystem.primaryColor },
              { label: "Secondary", color: designSystem.secondaryColor },
              { label: "Accent", color: designSystem.accentColor },
              { label: "Background", color: designSystem.backgroundColor },
            ].map(({ label, color }) => (
              <div key={label} className="flex-1">
                <div
                  className="h-16 rounded-md border"
                  style={{ backgroundColor: color }}
                />
                <p className="text-xs mt-1 text-center">{label}</p>
                <p className="text-xs text-center text-muted-foreground">{color}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div>
          <h3 className="font-medium mb-3">Typography</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Heading</p>
              <p className="text-lg font-semibold">{designSystem.fontPairings.heading}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Body</p>
              <p>{designSystem.fontPairings.body}</p>
            </div>
          </div>
        </div>

        {/* Visual Style */}
        <div>
          <h3 className="font-medium mb-3">Visual Style</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{designSystem.visualStyle}</Badge>
            <Badge variant="outline">{designSystem.iconStyle} icons</Badge>
            {designSystem.layoutPrinciples.map((principle) => (
              <Badge key={principle} variant="secondary">
                {principle}
              </Badge>
            ))}
          </div>
        </div>

        {/* Image Guidelines */}
        <div>
          <h3 className="font-medium mb-3">Image Guidelines</h3>
          <p className="text-sm text-muted-foreground">{designSystem.imageGuidelines}</p>
        </div>

        {/* Design Inspiration */}
        <div>
          <h3 className="font-medium mb-3">Design Inspiration</h3>
          <p className="text-sm italic text-muted-foreground">
            {designSystem.designInspiration}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Testing Steps

### 1. Test Design System Generation

1. Complete Phase 2 (approve outline)
2. Verify design system generation triggered automatically
3. Check Convex logs for GLM-4.6 API call
4. Verify design system JSON stored in database

### 2. Test Design System Quality

1. Create presentations with different content themes:
   - Scientific/technical content
   - Business pitch
   - Creative/artistic topic
   - Academic research
2. Verify each gets distinctive, appropriate design system
3. Check that theme extraction makes sense

### 3. Test Error Handling

1. Test with invalid outline content
2. Verify error status updated
3. Test JSON parsing fallback (if AI returns markdown-wrapped JSON)

### 4. Test Design System Preview (Optional)

1. Add preview component to outline approval page
2. Show design system after generation
3. Allow user to regenerate if not satisfied (future enhancement)

---

## Success Criteria

- ✅ Design system generates automatically after outline approval
- ✅ GLM-4.6 analyzes content and extracts theme
- ✅ Design system JSON includes all required fields
- ✅ Colors, fonts, and style appropriate for content
- ✅ Image guidelines detailed and actionable
- ✅ Design inspiration references real movements/styles
- ✅ Status transitions: design_generating → design_complete
- ✅ Slide generation (Phase 4) triggered automatically
- ✅ Error handling works (updates status to "error")

---

## Files Created/Modified

### Modified:
- ✏️ `src/lib/prompts/slides.ts` - Added `DESIGN_SYSTEM_PROMPT` and builder function
- ✏️ `convex/presentations.ts` - Added `saveDesignSystem` mutation and internal exports

### Created:
- 🆕 `convex/presentations/designSystem.ts` - Design system generation action
- 🆕 `src/components/slides/DesignSystemPreview.tsx` - Preview component (optional)

---

## Dependencies

None - reuses existing AI infrastructure (GLM-4.6 via Vercel AI SDK).

---

## Cost Estimation

**Per Presentation:**
- Input: ~3,000 tokens (full outline content + prompt)
- Output: ~500 tokens (JSON design system)
- Cost: (3000 × $0.30/M) + (500 × $1.20/M) = **$0.0015**

**Total cost so far (Phases 2 + 3): ~$0.017 per presentation**

---

## Next Phase

**Phase 4: Hierarchical Slide Image Generation** will use the design system to generate slide images in batches (title → sections → content) using Gemini 2.5 Flash or 3 Pro.
