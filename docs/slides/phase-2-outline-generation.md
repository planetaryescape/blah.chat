# Phase 2: Outline Generation (Chat-Based)

**STATUS: ✅ IMPLEMENTED**

## Context: What We're Building

**Slides** is an AI-powered presentation creator that generates professional slide decks from user prompts. This phase implements the **outline generation and iteration** system, where users:

1. Provide input (prompt, document, or existing outline)
2. GLM-4.6 generates a structured slide outline
3. User iterates via chat to refine the outline
4. User approves the final outline → triggers design system generation

**Why Chat-Style Iteration:**
- Reuses blah.chat's proven chat infrastructure
- Natural refinement workflow ("make slide 3 more concise", "add a slide about X")
- Leverages resilient generation pattern (survives page refresh)
- Familiar UX for users

---

## Overall Architecture

**Full Slides Pipeline:**
```
[Phase 2: Outline] → Design System → Hierarchical Image Generation → Preview → Export
```

**This Phase:**
```
User Input (prompt/document/outline)
  ↓
Create Presentation Record
  ↓
Create Linked Conversation (special system prompt)
  ↓
Send Initial Message (GLM-4.6 generates outline)
  ↓
User Iterates in Chat Interface
  ↓
User Approves → Parse Outline → Create Slide Records → Trigger Phase 3
```

---

## Phase 2 Scope

After completion:
- ✅ Users can create presentations from /slides/new page
- ✅ GLM-4.6 generates structured outlines
- ✅ Users iterate on outlines via chat
- ✅ Outline parsed into individual slide records
- ✅ Ready for design system generation (Phase 3)

**What This Phase Does NOT Include:**
- ❌ Design system generation
- ❌ Slide image generation
- ❌ Preview interface
- ❌ PPTX export

---

## Technical Foundation

### blah.chat Chat Architecture

**Resilient Generation Pattern:**
1. User message → immediate DB insert (`status: "pending"`)
2. Trigger Convex action (server-side, up to 10min)
3. Action streams from LLM, periodically updates `partialContent`
4. Client subscribes via reactive query → auto-updates
5. On page refresh: sees partial/complete response from DB

**Key Tables:**
- `conversations` - Chat sessions with system prompts
- `messages` - Individual messages (`role`, `content`, `partialContent`, `status`)
- `attachments` - File uploads (normalized)

**Relevant Files:**
- `convex/generation.ts` - Main generation action
- `convex/chat.ts` - Conversation CRUD
- `convex/messages.ts` - Message operations
- `src/components/chat/ChatMessage.tsx` - Message rendering
- `src/lib/prompts/base.ts` - Base system prompt structure

### GLM-4.6 Integration

**Model:** `glm-4.6` (via Vercel AI Gateway)

**Pricing:** $0.30/M input, $1.20/M output

**Why GLM-4.6 for Outlines:**
- Cost-effective ($0.15 vs $0.50 for GPT-5.1 per outline)
- Creative, high-quality content generation
- Fast response times
- Excellent at structured output

**Configuration in `src/lib/ai/models.ts`:**
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
},
```

---

## Implementation Steps

### Step 1: Create System Prompt

**File:** `src/lib/prompts/slides.ts` (NEW)

**Purpose:** Centralized prompts for slides feature (follows blah.chat pattern).

**Code:**
```typescript
export const SLIDES_OUTLINE_SYSTEM_PROMPT = `
You are a professional presentation designer. Generate slide outlines in this structured format:

# TITLE SLIDE
Title: [Main Title - concise, impactful]
Subtitle: [Supporting subtitle or tagline]
Type: title

# SECTION: [Section Name]
Title: [Section Title]
Type: section

# Slide N: [Slide Title]
- [Bullet point 1: 5-7 words]
- [Bullet point 2: 5-7 words]
- [Bullet point 3: 5-7 words]
Type: content
Speaker Notes: [Optional notes for presenter]

DESIGN PRINCIPLES:
- 5-7 words per bullet (readable at distance)
- One key idea per slide
- Clear visual hierarchy (title → bullets → notes)
- Professional, compelling language
- Logical flow with section dividers

OUTPUT FORMAT:
- Use exactly this markdown structure
- Include Type field for each slide
- Maximum 3-4 bullets per content slide
- Add speaker notes for complex concepts

Generate 10-15 slides for a standard presentation.
`;

export function buildOutlinePrompt(input: string, inputType: "prompt" | "document" | "outline"): string {
  switch (inputType) {
    case "prompt":
      return `Create a professional slide deck outline for the following topic:\n\n"${input}"\n\nGenerate a complete structured outline with title slide, sections, and content slides.`;

    case "document":
      return `Convert this document into a structured slide deck outline:\n\n${input}\n\nExtract key points, create logical sections, and design a clear visual flow. Focus on the most important concepts.`;

    case "outline":
      return `Refine and structure this outline into professional presentation slides:\n\n${input}\n\nImprove clarity, add structure, ensure consistent formatting, and optimize for visual presentation.`;
  }
}
```

**Key Design Decisions:**
- Explicit format specification (markdown structure)
- Type field for each slide (enables hierarchical generation in Phase 4)
- Bullet point guidelines (5-7 words = readable)
- Speaker notes support

### Step 2: Create Outline Parser

**File:** `convex/lib/slides/parseOutline.ts` (NEW)

**Purpose:** Parse markdown outline into structured slide data.

**Code:**
```typescript
import { Id } from "../../_generated/dataModel";

export interface ParsedSlide {
  position: number;
  slideType: "title" | "section" | "content";
  title: string;
  content: string;
  speakerNotes?: string;
}

export function parseOutlineMarkdown(content: string): ParsedSlide[] {
  const slides: ParsedSlide[] = [];
  let currentSlide: Partial<ParsedSlide> | null = null;
  let position = 0;

  // Split by lines
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Slide header (starts with #)
    if (trimmed.startsWith("# ")) {
      // Save previous slide if exists
      if (currentSlide && currentSlide.title) {
        slides.push({
          position: ++position,
          slideType: currentSlide.slideType!,
          title: currentSlide.title,
          content: currentSlide.content || "",
          speakerNotes: currentSlide.speakerNotes,
        });
      }

      // Start new slide
      const titleText = trimmed.substring(2).trim();
      currentSlide = {
        title: titleText.replace(/^(TITLE SLIDE|SECTION:|Slide \d+:)\s*/i, ""),
        content: "",
        slideType: "content", // Default, will be overridden
      };

      // Determine type from header
      if (trimmed.toLowerCase().includes("title slide")) {
        currentSlide.slideType = "title";
      } else if (trimmed.toLowerCase().startsWith("# section:")) {
        currentSlide.slideType = "section";
      }
    }
    // Title field
    else if (trimmed.startsWith("Title:")) {
      if (currentSlide) {
        currentSlide.title = trimmed.substring(6).trim();
      }
    }
    // Subtitle field (append to content for title slides)
    else if (trimmed.startsWith("Subtitle:")) {
      if (currentSlide && currentSlide.slideType === "title") {
        const subtitle = trimmed.substring(9).trim();
        currentSlide.content = subtitle;
      }
    }
    // Type field
    else if (trimmed.startsWith("Type:")) {
      const typeValue = trimmed.substring(5).trim().toLowerCase();
      if (currentSlide && ["title", "section", "content"].includes(typeValue)) {
        currentSlide.slideType = typeValue as "title" | "section" | "content";
      }
    }
    // Speaker Notes field
    else if (trimmed.startsWith("Speaker Notes:")) {
      if (currentSlide) {
        currentSlide.speakerNotes = trimmed.substring(14).trim();
      }
    }
    // Bullet point
    else if (trimmed.startsWith("- ")) {
      if (currentSlide) {
        const bullet = trimmed.substring(2).trim();
        currentSlide.content = currentSlide.content
          ? `${currentSlide.content}\n- ${bullet}`
          : `- ${bullet}`;
      }
    }
  }

  // Add final slide
  if (currentSlide && currentSlide.title) {
    slides.push({
      position: ++position,
      slideType: currentSlide.slideType!,
      title: currentSlide.title,
      content: currentSlide.content || "",
      speakerNotes: currentSlide.speakerNotes,
    });
  }

  return slides;
}
```

### Step 3: Create Presentation Creation API

**File:** `src/app/api/slides/create/route.ts` (NEW)

**Purpose:** API endpoint to create presentation + linked conversation.

**Code:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from Convex
    const user = await fetchQuery(api.users.getCurrentUser, {});
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const { title, input, inputType } = await req.json();

    // Validate input
    if (!title || !input || !inputType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["prompt", "document", "outline"].includes(inputType)) {
      return NextResponse.json(
        { error: "Invalid inputType" },
        { status: 400 }
      );
    }

    // Create presentation record
    const presentationId = await fetchMutation(api.presentations.create, {
      userId: user._id,
      title,
    });

    // Create linked conversation
    const conversationId = await fetchMutation(api.chat.create, {
      title: `Outline: ${title}`,
      model: "glm-4.6",
      systemPrompt: SLIDES_OUTLINE_SYSTEM_PROMPT, // Import from lib/prompts/slides
    });

    // Link conversation to presentation
    await fetchMutation(api.presentations.linkConversation, {
      presentationId,
      conversationId,
    });

    // Update presentation status
    await fetchMutation(api.presentations.updateStatus, {
      presentationId,
      status: "outline_generating",
    });

    // Send initial message to generate outline
    await fetchMutation(api.chat.sendMessage, {
      conversationId,
      content: buildOutlinePrompt(input, inputType), // Import from lib/prompts/slides
      modelId: "glm-4.6",
    });

    return NextResponse.json({
      success: true,
      presentationId,
      conversationId,
    });
  } catch (error) {
    console.error("Error creating presentation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Step 4: Add Conversation Linking Mutation

**File:** `convex/presentations.ts` (MODIFY)

**Add this mutation:**
```typescript
export const linkConversation = mutation({
  args: {
    presentationId: v.id("presentations"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.presentationId, {
      conversationId: args.conversationId,
      updatedAt: Date.now(),
    });
  },
});
```

### Step 5: Create Input Form UI

**File:** `src/app/(main)/slides/new/page.tsx` (NEW)

**Purpose:** Form to create new presentation with three input modes.

**Code:**
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Lightbulb, List } from "lucide-react";

export default function NewSlidesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inputType, setInputType] = useState<"prompt" | "document" | "outline">("prompt");
  const [title, setTitle] = useState("");
  const [input, setInput] = useState("");

  const handleCreate = async () => {
    if (!title.trim() || !input.trim()) {
      alert("Please provide both a title and input");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/slides/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          input: input.trim(),
          inputType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create presentation");
      }

      const data = await response.json();

      // Redirect to outline editor
      router.push(`/slides/${data.presentationId}/outline`);
    } catch (error) {
      console.error("Error creating presentation:", error);
      alert("Failed to create presentation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create New Presentation</h1>
          <p className="text-muted-foreground mt-2">
            Generate professional slides with AI in seconds
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Presentation Details</CardTitle>
            <CardDescription>
              Provide a title and choose how you'd like to create your slides
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="title">Presentation Title</Label>
              <Input
                id="title"
                placeholder="e.g., Q4 Business Review, Product Launch, Research Findings"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Input Tabs */}
            <Tabs value={inputType} onValueChange={(v) => setInputType(v as typeof inputType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="prompt">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  From Prompt
                </TabsTrigger>
                <TabsTrigger value="document">
                  <FileText className="h-4 w-4 mr-2" />
                  From Document
                </TabsTrigger>
                <TabsTrigger value="outline">
                  <List className="h-4 w-4 mr-2" />
                  From Outline
                </TabsTrigger>
              </TabsList>

              <TabsContent value="prompt" className="space-y-2 mt-4">
                <Label htmlFor="prompt">Describe your presentation</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe what you want to present. Be specific about topics, audience, and key messages.&#10;&#10;Example: 'Create a presentation about peptides in modern medicine, covering their structure, function, and therapeutic applications. Target audience is healthcare professionals.'"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  rows={8}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  AI will generate a complete outline based on your description
                </p>
              </TabsContent>

              <TabsContent value="document" className="space-y-2 mt-4">
                <Label htmlFor="document">Paste your document</Label>
                <Textarea
                  id="document"
                  placeholder="Paste your document text here. Can be a research paper, article, notes, or any text you want to convert into slides."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  rows={12}
                  className="resize-none font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  AI will extract key points and structure them into slides
                </p>
              </TabsContent>

              <TabsContent value="outline" className="space-y-2 mt-4">
                <Label htmlFor="outline">Paste your outline</Label>
                <Textarea
                  id="outline"
                  placeholder="Paste your existing outline. Can be bullet points, sections, or rough structure.&#10;&#10;Example:&#10;- Introduction to topic&#10;- Problem statement&#10;- Proposed solution&#10;- Benefits&#10;- Conclusion"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  rows={12}
                  className="resize-none font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  AI will refine and structure your outline into professional slides
                </p>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleCreate}
              disabled={loading || !title.trim() || !input.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? "Creating..." : "Generate Outline"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### Step 6: Create Outline Editor Page

**File:** `src/app/(main)/slides/[id]/outline/page.tsx` (NEW)

**Purpose:** Chat-style editor for outline iteration with approval button.

**Code:**
```typescript
"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConversationView } from "@/components/chat/ConversationView"; // Reuse existing component
import { Check, Loader2 } from "lucide-react";

export default function OutlineEditorPage() {
  const params = useParams();
  const router = useRouter();
  const presentationId = params.id as Id<"presentations">;

  const presentation = useQuery(api.presentations.get, { presentationId });
  const approveOutline = useMutation(api.presentations.approveOutline);

  const handleApprove = async () => {
    if (!presentation?.conversationId) return;

    // Find the last assistant message (contains final outline)
    const messages = await convex.query(api.messages.list, {
      conversationId: presentation.conversationId,
    });

    const lastAssistantMessage = messages
      .filter((m) => m.role === "assistant" && m.status === "complete")
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!lastAssistantMessage) {
      alert("No outline generated yet");
      return;
    }

    await approveOutline({
      presentationId,
      finalOutlineMessageId: lastAssistantMessage._id,
    });

    // Redirect to design system generation status page
    router.push(`/slides/${presentationId}/preview`);
  };

  if (!presentation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* LEFT: Chat-style outline iteration */}
      <div className="flex-1">
        <ConversationView conversationId={presentation.conversationId} />
      </div>

      {/* RIGHT: Outline preview + approval */}
      <div className="w-96 border-l bg-muted/50 p-6 flex flex-col">
        <div className="space-y-4 flex-1">
          <div>
            <h2 className="text-xl font-semibold">{presentation.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Refine your outline through chat, then approve to generate slides
            </p>
          </div>

          <Card className="p-4 bg-background">
            <h3 className="font-medium mb-2">How it works</h3>
            <ol className="text-sm space-y-2 text-muted-foreground">
              <li>1. Review the generated outline</li>
              <li>2. Ask for changes via chat</li>
              <li>3. Approve when ready</li>
              <li>4. AI creates design system & slides</li>
            </ol>
          </Card>
        </div>

        <Button
          onClick={handleApprove}
          size="lg"
          className="w-full"
          disabled={presentation.status !== "outline_complete"}
        >
          <Check className="mr-2 h-4 w-4" />
          Approve & Generate Slides
        </Button>
      </div>
    </div>
  );
}
```

### Step 7: Create Outline Approval Mutation

**File:** `convex/presentations.ts` (MODIFY)

**Add this mutation:**
```typescript
import { parseOutlineMarkdown } from "./lib/slides/parseOutline";

export const approveOutline = mutation({
  args: {
    presentationId: v.id("presentations"),
    finalOutlineMessageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    // Get message with final outline
    const message = await ctx.db.get(args.finalOutlineMessageId);
    if (!message || message.role !== "assistant") {
      throw new Error("Invalid outline message");
    }

    // Parse outline into slides
    const parsedSlides = parseOutlineMarkdown(message.content);

    if (parsedSlides.length === 0) {
      throw new Error("Failed to parse outline - no slides found");
    }

    // Get presentation
    const presentation = await ctx.db.get(args.presentationId);
    if (!presentation) {
      throw new Error("Presentation not found");
    }

    // Create slide records
    for (const slideData of parsedSlides) {
      await ctx.db.insert("slides", {
        presentationId: args.presentationId,
        userId: presentation.userId,
        position: slideData.position,
        slideType: slideData.slideType,
        title: slideData.title,
        content: slideData.content,
        speakerNotes: slideData.speakerNotes,
        imageStatus: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Update presentation
    await ctx.db.patch(args.presentationId, {
      status: "outline_complete",
      totalSlides: parsedSlides.length,
      generatedSlideCount: 0,
      updatedAt: Date.now(),
    });

    // Trigger design system generation (Phase 3)
    await ctx.scheduler.runAfter(
      0,
      internal.presentations.generateDesignSystem,
      { presentationId: args.presentationId }
    );
  },
});
```

---

## Testing Steps

### 1. Test Outline Generation

1. Navigate to `/slides/new`
2. Enter title: "Test Presentation"
3. Enter prompt: "Create a presentation about AI in healthcare"
4. Click "Generate Outline"
5. Verify:
   - Redirects to `/slides/[id]/outline`
   - GLM-4.6 generates structured outline
   - Outline follows format (title slide, sections, content slides)

### 2. Test Chat Iteration

1. In outline editor, send message: "Make the introduction more concise"
2. Verify GLM-4.6 regenerates outline
3. Test multiple iterations
4. Verify resilient generation (refresh page mid-generation)

### 3. Test Outline Approval

1. Click "Approve & Generate Slides"
2. Verify:
   - Outline parsed correctly
   - Slide records created in DB
   - Presentation status updated to "outline_complete"
   - Design system generation scheduled (Phase 3 will implement)

### 4. Test Different Input Types

1. Test "From Document" tab with research paper text
2. Test "From Outline" tab with bullet points
3. Verify each generates appropriate slide structure

---

## Success Criteria

- ✅ Can create presentation from /slides/new
- ✅ GLM-4.6 generates structured outlines
- ✅ Outline follows markdown format specification
- ✅ Can iterate on outline via chat
- ✅ Chat iteration works smoothly (reuses existing chat UI)
- ✅ Can approve outline
- ✅ Outline correctly parsed into slide records
- ✅ All slide types present (title, section, content)
- ✅ Speaker notes preserved
- ✅ Presentation status transitions correctly
- ✅ Resilient generation works (page refresh)

---

## Files Created/Modified

### Modified:
- ✏️ `convex/presentations.ts` - Added `linkConversation` and `approveOutline` mutations

### Created:
- 🆕 `src/lib/prompts/slides.ts` - System prompt and prompt builder
- 🆕 `convex/lib/slides/parseOutline.ts` - Outline parser
- 🆕 `src/app/api/slides/create/route.ts` - API endpoint
- 🆕 `src/app/(main)/slides/new/page.tsx` - Input form
- 🆕 `src/app/(main)/slides/[id]/outline/page.tsx` - Outline editor

---

## Dependencies

None - reuses existing chat infrastructure.

---

## Cost Estimation

**Per Presentation:**
- Outline generation: ~5,000 tokens input + ~2,000 output
- Cost: (5000 × $0.30/M) + (2000 × $1.20/M) = **$0.004**
- Iterations (3-5 refinements): ~$0.012 additional
- **Total Phase 2 cost: ~$0.015 per presentation**

---

## Next Phase

**Phase 3: Design System Generation** will analyze the outline content and create a comprehensive, content-aware design system using GLM-4.6.
