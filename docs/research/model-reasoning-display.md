# Model Reasoning Display Research & Implementation Plan

**Date:** December 6, 2025
**Context:** Next.js 15 + React 19 + Convex + Vercel AI SDK chat application
**Focus:** Displaying AI model reasoning/thinking in the chat UI

---

## Executive Summary

Modern reasoning models (OpenAI o1/o3/o4, Claude with extended thinking, DeepSeek R1) produce "thinking" or "reasoning" content alongside their responses. This document outlines how to capture, store, and display this reasoning in blah.chat's UI.

**Recommendation:** Implement a **collapsible reasoning block** that:
- Shows "Thought for X seconds" when collapsed
- Expands to reveal full reasoning content
- Streams reasoning in real-time during generation
- Persists to database (survives page refresh)
- Uses visual differentiation (subtle background, monospace font)

**Key Trade-off:** Balance transparency (showing reasoning) with cognitive load (not overwhelming users). Default to collapsed with easy expansion.

---

## Table of Contents

1. [Current Implementation Analysis](#1-current-implementation-analysis)
2. [State of the Art: How Others Do It](#2-state-of-the-art-how-others-do-it)
3. [Vercel AI SDK Reasoning Support](#3-vercel-ai-sdk-reasoning-support)
4. [Implementation Plan](#4-implementation-plan)
5. [Schema Changes](#5-schema-changes)
6. [Backend Changes](#6-backend-changes)
7. [UI Components](#7-ui-components)
8. [Model-Specific Handling](#8-model-specific-handling)
9. [User Preferences](#9-user-preferences)
10. [Testing Checklist](#10-testing-checklist)
11. [Design Specifications](#11-design-specifications)
12. [Migration & Rollout](#12-migration--rollout)
13. [Sources](#13-sources)

---

## 1. Current Implementation Analysis

### Message Schema (convex/schema.ts)

The current message schema includes fields for resilient generation but **no reasoning field**:

```typescript
messages: defineTable({
  conversationId: v.id("conversations"),
  userId: v.optional(v.id("users")),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  content: v.string(),
  partialContent: v.optional(v.string()),  // Streaming text
  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("complete"),
    v.literal("error")
  ),

  // Token & Cost tracking
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  cost: v.optional(v.number()),

  // Model info
  model: v.optional(v.string()),

  // Generation timing
  generationStartedAt: v.optional(v.number()),
  generationCompletedAt: v.optional(v.number()),

  // Error handling
  error: v.optional(v.string()),
})
```

**Gap:** No `reasoning`, `partialReasoning`, or `thinkingDuration` fields.

### Generation Action (convex/generation.ts)

The generation action already supports thinking effort for reasoning models:

```typescript
// OpenAI o1/o3 reasoning effort
if (args.thinkingEffort && args.modelId.startsWith("openai:o")) {
  options.providerOptions = {
    openai: { reasoningEffort: args.thinkingEffort },
  };
}

// Anthropic extended thinking
if (args.thinkingEffort && modelConfig?.capabilities.includes("extended-thinking")) {
  options.providerOptions = {
    anthropic: {
      thinking: {
        type: "enabled",
        budgetTokens: { low: 5000, medium: 15000, high: 30000 }[args.thinkingEffort],
      },
    },
  };
  options.headers = {
    "anthropic-beta": "interleaved-thinking-2025-05-14",
  };
}
```

**Gap:** The action enables thinking but doesn't capture/store the reasoning output.

### Chat UI (src/components/chat/ChatMessage.tsx)

Current UI shows a "Thinking..." indicator for reasoning models:

```typescript
const isThinkingModel =
  modelConfig?.supportsThinkingEffort ||
  modelConfig?.capabilities?.includes("extended-thinking") ||
  false;

// In render:
{isThinkingModel ? (
  <div>
    <Loader2 className="animate-spin" />
    <span>Thinking...</span>
  </div>
) : (
  <BouncingDots />
)}
```

**Gap:** Shows indicator but doesn't display actual reasoning content.

### Model Configuration (src/lib/ai/models.ts)

Models already have capability flags:

```typescript
{
  id: "openai:o1",
  capabilities: ["thinking", "vision", "function-calling"],
  supportsThinkingEffort: true,
  pricing: { input: 15.0, output: 60.0, reasoning: 15.0 },
}

{
  id: "anthropic:claude-opus-4-5-20251101",
  capabilities: ["vision", "thinking", "extended-thinking"],
  supportsThinkingEffort: true,
}
```

**Available:** `thinking`, `extended-thinking` capabilities already defined.

---

## 2. State of the Art: How Others Do It

### ChatGPT (OpenAI o1/o3/o4 Models)

| Aspect | Implementation |
|--------|----------------|
| **Display** | Collapsible section above response |
| **Trigger** | "Thought for X seconds" with chevron |
| **Content** | Summarized reasoning (not raw tokens) |
| **During Generation** | Shimmer/pulse animation |
| **Expanded** | Shows reasoning steps in list format |
| **User Control** | Reasoning effort selector (low/medium/high) |

**Key Insight:** OpenAI shows a **summary** of reasoning, not the actual reasoning tokens (for safety/IP reasons). The displayed "thinking" is described as a summarized representation.

**UX Pattern:**
```
┌────────────────────────────────────────────┐
│ ◐ Thought for 12 seconds              ▼   │  ← Collapsed
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ ◉ Thought for 12 seconds              ▲   │  ← Expanded
├────────────────────────────────────────────┤
│ • Analyzing the question structure         │
│ • Considering multiple approaches          │
│ • Evaluating trade-offs                    │
│ • Formulating comprehensive response       │
└────────────────────────────────────────────┘
```

### Claude.ai (Extended Thinking)

| Aspect | Implementation |
|--------|----------------|
| **Display** | Expandable "Thinking" section |
| **Trigger** | Timer showing elapsed time during thinking |
| **Content** | Condensed version of thought stream |
| **During Generation** | "Thinking..." with live timer |
| **Expanded** | Full reasoning in scrollable container |
| **User Control** | Toggle in settings (starts new chat) |

**Key Insight:** Claude shows thinking **duration** prominently. Some reasoning may be encrypted/hidden if potentially harmful.

**API Structure:**
```typescript
// Claude API returns separate content blocks
{
  content: [
    { type: "thinking", thinking: "Let me analyze..." },
    { type: "text", text: "The answer is..." }
  ]
}
```

### DeepSeek R1

| Aspect | Implementation |
|--------|----------------|
| **Display** | Most transparent - shows full reasoning |
| **Format** | `<think>...</think>` tags in output |
| **Default** | Collapsed with visual differentiation |
| **Expanded** | Full chain-of-thought visible |
| **User Control** | Auto-expand option in settings |

**Key Insight:** DeepSeek is the most transparent, outputting reasoning as text with special tags. This requires parsing to separate reasoning from response.

**Output Format:**
```
<think>
Let me work through this step by step.
First, I need to consider...
The key insight here is...
</think>

Based on my analysis, the answer is...
```

### Perplexity

| Aspect | Implementation |
|--------|----------------|
| **Display** | "Reasoning" toggle in response header |
| **Default** | Hidden (focus on answer + sources) |
| **Content** | Step-by-step reasoning when enabled |
| **User Control** | Per-response toggle |

### Common Patterns Across All

1. **Collapsed by default** - Don't overwhelm users
2. **Visual differentiation** - Different background, font, or styling
3. **Timer/duration** - Show how long thinking took
4. **One-click expand** - Easy access for interested users
5. **Streaming support** - Show reasoning as it generates (emerging)

---

## 3. Vercel AI SDK Reasoning Support

### Core API (generateText / streamText)

The Vercel AI SDK provides reasoning support via the `reasoning` property:

```typescript
import { streamText } from 'ai';

const result = await streamText({
  model: openai('o1'),
  messages: [{ role: 'user', content: 'Explain quantum entanglement' }],
});

// Access reasoning
const reasoning = await result.reasoning;  // string | undefined
const text = await result.text;            // Main response
```

### Streaming Reasoning

For streaming, reasoning is available via `reasoningStream`:

```typescript
const result = streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages,
  experimental_providerMetadata: {
    anthropic: {
      thinking: { type: 'enabled', budgetTokens: 10000 },
    },
  },
});

// Stream reasoning separately
for await (const chunk of result.reasoningStream) {
  console.log('Reasoning:', chunk);
}

// Stream text separately
for await (const chunk of result.textStream) {
  console.log('Text:', chunk);
}
```

### extractReasoningMiddleware

For models that output reasoning as text (like DeepSeek R1), use middleware:

```typescript
import { streamText, extractReasoningMiddleware } from 'ai';

const result = streamText({
  model: wrapLanguageModel({
    model: deepseek('deepseek-reasoner'),
    middleware: extractReasoningMiddleware({
      tagName: 'think',  // Extracts content from <think>...</think>
    }),
  }),
  messages,
});

// Now reasoning is separated automatically
const reasoning = await result.reasoning;
const text = await result.text;
```

### UI Message Stream Response

For client-side streaming with reasoning:

```typescript
// Server action
const result = streamText({
  model: selectedModel,
  messages,
});

return result.toUIMessageStreamResponse({
  sendReasoning: true,  // Include reasoning in stream
});
```

### Provider-Specific Options

| Provider | Option | Notes |
|----------|--------|-------|
| **OpenAI** | `reasoningEffort: 'low' \| 'medium' \| 'high'` | Controls thinking depth |
| **Anthropic** | `thinking: { type: 'enabled', budgetTokens: N }` | Requires beta header |
| **DeepSeek** | Uses `extractReasoningMiddleware` | Parses `<think>` tags |

---

## 4. Implementation Plan

### Phase 1: Schema & Database (1-2 hours)

**Tasks:**
- [ ] Add `reasoning` field to messages table
- [ ] Add `partialReasoning` field for streaming
- [ ] Add `reasoningTokens` field for cost tracking
- [ ] Add `thinkingStartedAt` / `thinkingCompletedAt` timestamps
- [ ] Run Convex migration

### Phase 2: Backend Generation (2-3 hours)

**Tasks:**
- [ ] Update `generateResponse` action to capture reasoning
- [ ] Implement separate streaming for reasoning vs content
- [ ] Add `updatePartialReasoning` mutation
- [ ] Update `completeMessage` to include reasoning
- [ ] Handle model-specific reasoning extraction (middleware for DeepSeek)
- [ ] Track reasoning tokens for cost calculation

### Phase 3: UI Components (3-4 hours)

**Tasks:**
- [ ] Create `ReasoningBlock` component (collapsible)
- [ ] Create `ReasoningTrigger` subcomponent (header with timer)
- [ ] Create `ReasoningContent` subcomponent (expandable body)
- [ ] Add streaming animation for reasoning
- [ ] Integrate into `ChatMessage` component
- [ ] Style with visual differentiation (following design system)

### Phase 4: Polish & Testing (2-3 hours)

**Tasks:**
- [ ] Test with OpenAI o1/o3 models
- [ ] Test with Claude extended thinking
- [ ] Test with DeepSeek R1
- [ ] Test page refresh during reasoning
- [ ] Test mobile responsiveness
- [ ] Add loading states and error handling

### Phase 5: User Preferences (Optional, 1-2 hours)

**Tasks:**
- [ ] Add reasoning display preferences to user settings
- [ ] Implement show/hide reasoning toggle
- [ ] Implement auto-expand preference
- [ ] Persist preferences in Convex

**Total Estimated Effort:** 9-14 hours

---

## 5. Schema Changes

### Messages Table Update

```typescript
// convex/schema.ts

messages: defineTable({
  // ... existing fields ...

  // NEW: Reasoning/thinking content
  reasoning: v.optional(v.string()),           // Final reasoning content
  partialReasoning: v.optional(v.string()),    // Streaming reasoning
  reasoningTokens: v.optional(v.number()),     // Tokens used for reasoning

  // NEW: Thinking timing (for "Thought for X seconds")
  thinkingStartedAt: v.optional(v.number()),   // When thinking began
  thinkingCompletedAt: v.optional(v.number()), // When thinking ended
})
```

### User Preferences Update (Optional)

```typescript
// convex/schema.ts

users: defineTable({
  // ... existing fields ...

  preferences: v.optional(v.object({
    // ... existing preferences ...

    // NEW: Reasoning display preferences
    reasoning: v.optional(v.object({
      showByDefault: v.optional(v.boolean()),    // Show reasoning sections (default: true)
      autoExpand: v.optional(v.boolean()),       // Auto-expand (default: false)
      showDuringStreaming: v.optional(v.boolean()), // Show while generating (default: true)
    })),
  })),
})
```

---

## 6. Backend Changes

### Generation Action Updates

```typescript
// convex/generation.ts

export const generateResponse = internalAction({
  args: {
    // ... existing args ...
  },
  handler: async (ctx, args) => {
    // Mark thinking started for reasoning models
    const modelConfig = getModelConfig(args.modelId);
    const isReasoningModel = modelConfig?.capabilities?.includes("thinking") ||
                             modelConfig?.capabilities?.includes("extended-thinking");

    if (isReasoningModel && args.thinkingEffort) {
      await ctx.runMutation(internal.messages.markThinkingStarted, {
        messageId: args.assistantMessageId,
      });
    }

    // Build streamText options with reasoning support
    const options = buildStreamTextOptions(args, modelConfig);

    // For DeepSeek, wrap with middleware
    let model = getModel(args.modelId);
    if (args.modelId.includes("deepseek")) {
      model = wrapLanguageModel({
        model,
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });
    }

    const result = streamText({ ...options, model });

    // Stream reasoning separately (if available)
    let accumulatedReasoning = "";
    let lastReasoningUpdate = Date.now();
    const REASONING_UPDATE_INTERVAL = 200;

    if (isReasoningModel) {
      // Note: This is conceptual - actual implementation depends on
      // how Vercel AI SDK exposes reasoning stream for each provider
      try {
        for await (const chunk of result.reasoningStream ?? []) {
          accumulatedReasoning += chunk;

          const now = Date.now();
          if (now - lastReasoningUpdate >= REASONING_UPDATE_INTERVAL) {
            await ctx.runMutation(internal.messages.updatePartialReasoning, {
              messageId: args.assistantMessageId,
              partialReasoning: accumulatedReasoning,
            });
            lastReasoningUpdate = now;
          }
        }
      } catch (e) {
        // Reasoning stream not available for this model
        console.log("No reasoning stream available");
      }

      // Mark thinking completed
      await ctx.runMutation(internal.messages.markThinkingCompleted, {
        messageId: args.assistantMessageId,
      });
    }

    // Stream main content (existing logic)
    let accumulated = "";
    let lastUpdate = Date.now();
    const UPDATE_INTERVAL = 200;

    for await (const chunk of result.textStream) {
      accumulated += chunk;

      const now = Date.now();
      if (now - lastUpdate >= UPDATE_INTERVAL) {
        await ctx.runMutation(internal.messages.updatePartialContent, {
          messageId: args.assistantMessageId,
          partialContent: accumulated,
        });
        lastUpdate = now;
      }
    }

    // Finalize with reasoning
    const usage = await result.usage;
    const reasoning = await result.reasoning;

    await ctx.runMutation(internal.messages.completeMessage, {
      messageId: args.assistantMessageId,
      content: accumulated,
      reasoning: reasoning || accumulatedReasoning || undefined,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      reasoningTokens: usage.reasoningTokens,  // If available
      cost: calculateCost(
        args.modelId,
        usage.promptTokens,
        usage.completionTokens,
        undefined,
        usage.reasoningTokens
      ),
    });
  },
});
```

### New Mutations

```typescript
// convex/messages.ts

export const markThinkingStarted = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      thinkingStartedAt: Date.now(),
      status: "generating",
      updatedAt: Date.now(),
    });
  },
});

export const markThinkingCompleted = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      thinkingCompletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updatePartialReasoning = internalMutation({
  args: {
    messageId: v.id("messages"),
    partialReasoning: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      partialReasoning: args.partialReasoning,
      updatedAt: Date.now(),
    });
  },
});

// Update completeMessage to include reasoning
export const completeMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    reasoning: v.optional(v.string()),           // NEW
    reasoningTokens: v.optional(v.number()),     // NEW
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      content: args.content,
      reasoning: args.reasoning,                  // NEW
      partialContent: undefined,
      partialReasoning: undefined,               // NEW: Clear partial
      status: "complete",
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      reasoningTokens: args.reasoningTokens,     // NEW
      cost: args.cost,
      generationCompletedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule embedding generation...
  },
});
```

---

## 7. UI Components

### ReasoningBlock Component

```typescript
// src/components/chat/ReasoningBlock.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "./MarkdownContent";

interface ReasoningBlockProps {
  reasoning: string | undefined;
  partialReasoning: string | undefined;
  thinkingStartedAt: number | undefined;
  thinkingCompletedAt: number | undefined;
  isGenerating: boolean;
}

export function ReasoningBlock({
  reasoning,
  partialReasoning,
  thinkingStartedAt,
  thinkingCompletedAt,
  isGenerating,
}: ReasoningBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const displayReasoning = reasoning || partialReasoning;
  const isThinking = isGenerating && !thinkingCompletedAt && thinkingStartedAt;

  // Don't render if no reasoning content and not thinking
  if (!displayReasoning && !isThinking) {
    return null;
  }

  // Live timer during thinking
  useEffect(() => {
    if (!isThinking || !thinkingStartedAt) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - thinkingStartedAt) / 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [isThinking, thinkingStartedAt]);

  // Calculate final duration
  const duration = thinkingCompletedAt && thinkingStartedAt
    ? ((thinkingCompletedAt - thinkingStartedAt) / 1000).toFixed(1)
    : elapsedTime;

  // Auto-expand during streaming (optional behavior)
  useEffect(() => {
    if (isThinking && partialReasoning) {
      setIsExpanded(true);
    }
  }, [isThinking, partialReasoning]);

  // Auto-collapse when thinking completes (optional behavior)
  useEffect(() => {
    if (thinkingCompletedAt && !isGenerating) {
      setIsExpanded(false);
    }
  }, [thinkingCompletedAt, isGenerating]);

  return (
    <div className="mb-3">
      {/* Trigger/Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2 rounded-lg",
          "text-sm text-muted-foreground",
          "bg-muted/30 hover:bg-muted/50 transition-colors",
          "border border-border/50",
          isThinking && "animate-pulse"
        )}
      >
        <Brain className={cn(
          "h-4 w-4",
          isThinking && "animate-spin"
        )} />

        <span className="flex-1 text-left">
          {isThinking ? (
            <>Thinking... {elapsedTime}s</>
          ) : (
            <>Thought for {duration}s</>
          )}
        </span>

        <ChevronDown className={cn(
          "h-4 w-4 transition-transform duration-200",
          isExpanded && "rotate-180"
        )} />
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && displayReasoning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "mt-2 px-4 py-3 rounded-lg",
              "bg-muted/20 border border-border/30",
              "text-sm text-muted-foreground",
              "font-mono",  // Monospace for reasoning
              "max-h-[400px] overflow-y-auto"
            )}>
              <MarkdownContent
                content={displayReasoning}
                isStreaming={isThinking}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### ChatMessage Integration

```typescript
// src/components/chat/ChatMessage.tsx

import { ReasoningBlock } from "./ReasoningBlock";

export const ChatMessage = memo(function ChatMessage({
  message,
  nextMessage,
  readOnly,
}: ChatMessageProps) {
  const isGenerating = ["pending", "generating"].includes(message.status);

  // Detect reasoning model
  const modelConfig = message.model ? getModelConfig(message.model) : null;
  const isReasoningModel =
    modelConfig?.supportsThinkingEffort ||
    modelConfig?.capabilities?.includes("extended-thinking") ||
    modelConfig?.capabilities?.includes("thinking") ||
    false;

  const displayContent = message.partialContent || message.content || "";

  return (
    <motion.div className="...">
      {message.role === "assistant" && (
        <>
          {/* Reasoning Block (above response) */}
          {isReasoningModel && (
            <ReasoningBlock
              reasoning={message.reasoning}
              partialReasoning={message.partialReasoning}
              thinkingStartedAt={message.thinkingStartedAt}
              thinkingCompletedAt={message.thinkingCompletedAt}
              isGenerating={isGenerating}
            />
          )}

          {/* Main Response */}
          {displayContent ? (
            <MarkdownContent
              content={displayContent}
              isStreaming={isGenerating}
            />
          ) : isReasoningModel && isGenerating ? (
            // Show nothing while thinking (ReasoningBlock handles it)
            null
          ) : (
            <BouncingDots />
          )}
        </>
      )}
    </motion.div>
  );
});
```

---

## 8. Model-Specific Handling

### OpenAI o1/o3/o4

```typescript
// Provider options
options.providerOptions = {
  openai: {
    reasoningEffort: args.thinkingEffort || "medium",
  },
};

// Reasoning access
const reasoning = await result.reasoning;  // Summary of reasoning
```

**Notes:**
- OpenAI provides summarized reasoning, not raw tokens
- `reasoningTokens` available in usage for cost calculation
- Reasoning effort affects latency and token usage

### Anthropic Claude (Extended Thinking)

```typescript
// Provider options with beta header
options.providerOptions = {
  anthropic: {
    thinking: {
      type: "enabled",
      budgetTokens: {
        low: 5000,
        medium: 15000,
        high: 30000,
      }[args.thinkingEffort || "medium"],
    },
  },
};
options.headers = {
  "anthropic-beta": "interleaved-thinking-2025-05-14",
};

// Reasoning comes in content blocks
// Vercel AI SDK extracts to result.reasoning
```

**Notes:**
- Requires beta header for interleaved thinking
- Budget tokens controls thinking depth
- Some thinking may be encrypted if sensitive

### DeepSeek R1

```typescript
import { wrapLanguageModel, extractReasoningMiddleware } from "ai";

// Wrap model with middleware to extract <think> tags
const wrappedModel = wrapLanguageModel({
  model: deepseek("deepseek-reasoner"),
  middleware: extractReasoningMiddleware({
    tagName: "think",
    separator: "\n",
  }),
});

// Now reasoning is separated automatically
const reasoning = await result.reasoning;  // Content from <think>...</think>
const text = await result.text;            // Content after </think>
```

**Notes:**
- DeepSeek outputs reasoning as text with `<think>` tags
- Middleware parses and separates automatically
- Most transparent reasoning of all providers

### Model Detection Helper

```typescript
// src/lib/ai/reasoning.ts

export function getReasoningConfig(modelId: string) {
  const modelConfig = getModelConfig(modelId);

  return {
    hasReasoning: modelConfig?.capabilities?.includes("thinking") ||
                  modelConfig?.capabilities?.includes("extended-thinking"),
    reasoningType: getReasoningType(modelId),
    supportsEffort: modelConfig?.supportsThinkingEffort || false,
  };
}

function getReasoningType(modelId: string): "native" | "middleware" | "none" {
  if (modelId.startsWith("openai:o")) return "native";
  if (modelId.includes("claude") && modelId.includes("extended-thinking")) return "native";
  if (modelId.includes("deepseek")) return "middleware";
  return "none";
}
```

---

## 9. User Preferences

### Settings UI Component

```typescript
// src/components/settings/ReasoningSettings.tsx

export function ReasoningSettings() {
  const user = useUser();
  const updatePreferences = useMutation(api.users.updatePreferences);

  const reasoningPrefs = user?.preferences?.reasoning ?? {
    showByDefault: true,
    autoExpand: false,
    showDuringStreaming: true,
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Reasoning Display</h3>

      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span>Show reasoning sections</span>
          <Switch
            checked={reasoningPrefs.showByDefault}
            onCheckedChange={(checked) =>
              updatePreferences({
                reasoning: { ...reasoningPrefs, showByDefault: checked },
              })
            }
          />
        </label>

        <label className="flex items-center justify-between">
          <span>Auto-expand reasoning</span>
          <Switch
            checked={reasoningPrefs.autoExpand}
            onCheckedChange={(checked) =>
              updatePreferences({
                reasoning: { ...reasoningPrefs, autoExpand: checked },
              })
            }
          />
        </label>

        <label className="flex items-center justify-between">
          <span>Show reasoning while generating</span>
          <Switch
            checked={reasoningPrefs.showDuringStreaming}
            onCheckedChange={(checked) =>
              updatePreferences({
                reasoning: { ...reasoningPrefs, showDuringStreaming: checked },
              })
            }
          />
        </label>
      </div>
    </div>
  );
}
```

---

## 10. Testing Checklist

### Functional Tests

- [ ] **OpenAI o1 model**
  - [ ] Reasoning captured and stored
  - [ ] Duration calculated correctly
  - [ ] Reasoning tokens tracked for cost
  - [ ] Collapsed/expanded toggle works

- [ ] **Anthropic Claude (extended thinking)**
  - [ ] Extended thinking enabled with correct header
  - [ ] Reasoning content extracted
  - [ ] Different budget levels work (low/medium/high)
  - [ ] Sensitive content handling

- [ ] **DeepSeek R1**
  - [ ] `<think>` tags parsed correctly
  - [ ] Reasoning separated from response
  - [ ] Middleware integration works
  - [ ] No raw tags shown in UI

### Resilience Tests

- [ ] **Page refresh during thinking**
  - [ ] Partial reasoning persisted
  - [ ] Timer continues from correct time
  - [ ] Final reasoning saved on completion

- [ ] **Page refresh during generation**
  - [ ] Both reasoning and content preserved
  - [ ] Status correctly reflects state
  - [ ] UI recovers gracefully

- [ ] **Network interruption**
  - [ ] Partial data saved
  - [ ] Error state handled
  - [ ] Retry works correctly

### UI/UX Tests

- [ ] **Collapse/expand animation**
  - [ ] Smooth height transition
  - [ ] No content flash
  - [ ] Chevron rotates correctly

- [ ] **Streaming reasoning**
  - [ ] Content appears progressively
  - [ ] No excessive re-renders
  - [ ] Scroll position maintained

- [ ] **Mobile responsiveness**
  - [ ] Trigger button full width
  - [ ] Content scrollable
  - [ ] Touch targets adequate (44px+)

### Performance Tests

- [ ] **Long reasoning content**
  - [ ] Renders without lag
  - [ ] Scrolling smooth
  - [ ] Memory usage reasonable

- [ ] **Many messages with reasoning**
  - [ ] List performance OK
  - [ ] Collapsed state doesn't re-render content
  - [ ] Virtualization works if needed

### Accessibility Tests

- [ ] **Keyboard navigation**
  - [ ] Tab to trigger button
  - [ ] Enter/Space to toggle
  - [ ] Focus visible

- [ ] **Screen reader**
  - [ ] Expanded state announced
  - [ ] Content accessible when expanded
  - [ ] Duration announced

---

## 11. Design Specifications

### Visual Design

Following blah.chat's design philosophy: distinctive, not generic AI aesthetic.

**Collapsed State:**
```
┌─────────────────────────────────────────────────────────────┐
│  ◐  Thought for 4.2s                                    ▼  │
└─────────────────────────────────────────────────────────────┘

Background: bg-muted/30 (subtle, layered)
Border: border-border/50 (barely visible)
Text: text-muted-foreground
Icon: Brain icon with subtle animation during thinking
```

**Expanded State:**
```
┌─────────────────────────────────────────────────────────────┐
│  ◉  Thought for 4.2s                                    ▲  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Let me analyze this step by step...                        │
│                                                             │
│  First, I need to consider the key factors:                 │
│  • Factor A: implications and trade-offs                    │
│  • Factor B: technical constraints                          │
│                                                             │
│  The optimal approach seems to be...                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Content Background: bg-muted/20 (even more subtle)
Content Border: border-border/30
Font: font-mono (code-like for reasoning)
Max Height: 400px with overflow-y-auto
```

**Thinking State (Animation):**
```css
/* Pulse animation on trigger during thinking */
@keyframes thinking-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.reasoning-thinking {
  animation: thinking-pulse 1.5s ease-in-out infinite;
}

/* Brain icon spin during thinking */
.reasoning-icon-thinking {
  animation: spin 2s linear infinite;
}
```

### Color Palette

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Trigger BG | `bg-slate-100/50` | `bg-slate-800/30` |
| Trigger Border | `border-slate-200/50` | `border-slate-700/50` |
| Content BG | `bg-slate-50/50` | `bg-slate-900/20` |
| Text | `text-slate-600` | `text-slate-400` |
| Icon | `text-slate-500` | `text-slate-500` |

### Typography

- **Trigger:** `text-sm font-medium`
- **Duration:** `tabular-nums` for stable number width
- **Content:** `font-mono text-sm` for reasoning text
- **Markdown in content:** Prose styles with muted colors

### Spacing

- **Trigger padding:** `px-3 py-2`
- **Content padding:** `px-4 py-3`
- **Gap between trigger and content:** `mt-2`
- **Gap below reasoning block:** `mb-3`
- **Border radius:** `rounded-lg` (8px)

### Motion

```typescript
// Framer Motion variants
const contentVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" }
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.2, ease: "easeInOut" }
  }
};

const chevronVariants = {
  collapsed: { rotate: 0 },
  expanded: { rotate: 180 },
  transition: { duration: 0.2 }
};
```

---

## 12. Migration & Rollout

### Database Migration

1. **Add new fields** (non-breaking, optional fields):
   ```bash
   # Convex handles schema changes automatically
   # Just update schema.ts and push
   npx convex dev
   ```

2. **Existing messages** will have `undefined` for new fields (correct behavior)

3. **No backfill needed** - reasoning only applies to new generations

### Feature Flag (Optional)

```typescript
// src/lib/features.ts
export const FEATURES = {
  SHOW_REASONING: process.env.NEXT_PUBLIC_FEATURE_REASONING === "true",
};

// In component
{FEATURES.SHOW_REASONING && isReasoningModel && (
  <ReasoningBlock ... />
)}
```

### Rollout Plan

1. **Phase 1: Internal testing**
   - Enable for development environment
   - Test all reasoning models
   - Gather feedback

2. **Phase 2: Beta users**
   - Enable via feature flag for beta testers
   - Monitor performance and errors
   - Iterate on UI based on feedback

3. **Phase 3: General availability**
   - Remove feature flag
   - Enable for all users
   - Add to settings

---

## 13. Sources

### Vercel AI SDK Documentation
- [Vercel AI SDK 4.2 Release Notes](https://vercel.com/blog/ai-sdk-4-2) - Reasoning support announcement
- [AI SDK Reasoning Steps Template](https://vercel.com/templates/next.js/reasoning-steps-ai-sdk) - Official example
- [AI SDK Reasoning Starter](https://github.com/vercel-labs/ai-sdk-reasoning-starter) - GitHub repository
- [Reasoning Component - AI SDK](https://ai-sdk.dev/elements/components/reasoning) - UI component docs
- [generateText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) - API documentation

### OpenAI Reasoning Models
- [OpenAI o3 and o4 Explained](https://www.techtarget.com/whatis/feature/OpenAI-o3-explained-Everything-you-need-to-know)
- [OpenAI o1 and o3: How Thinking Models Work](https://blog.lewagon.com/skills/openai-o1-and-o3-explained-how-thinking-models-work/)
- [Reasoning Models - OpenAI API](https://platform.openai.com/docs/guides/reasoning)
- [Reasoning Tokens | OpenRouter](https://openrouter.ai/docs/use-cases/reasoning-tokens)
- [Responses API for Reasoning](https://cookbook.openai.com/examples/responses_api/reasoning_items)

### Claude Extended Thinking
- [Using Extended Thinking | Claude Help Center](https://support.claude.com/en/articles/10574485-using-extended-thinking)
- [Claude's Extended Thinking Announcement](https://www.anthropic.com/news/visible-extended-thinking)
- [Building with Extended Thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- [Toggle Thinking in Claude Code](https://claudelog.com/faqs/how-to-toggle-thinking-in-claude-code/)

### DeepSeek R1
- [DeepSeek R1 Think Block Rendering](https://github.com/open-webui/open-webui/issues/8706)
- [Reasoning Model API Docs](https://api-docs.deepseek.com/guides/reasoning_model)
- [SillyTavern Reasoning Docs](https://docs.sillytavern.app/usage/prompts/reasoning/)

### UX Best Practices
- [How AI Models Show Reasoning in Real-Time](https://www.digestibleux.com/p/how-ai-models-show-their-reasoning)
- [Nine UX Best Practices for AI Chatbots](https://www.mindtheproduct.com/deep-dive-ux-best-practices-for-ai-chatbots/)
- [The Shape of AI | UX Patterns](https://www.shapeof.ai)
- [AI UI Patterns](https://www.patterns.dev/react/ai-ui-patterns/)
- [Design Patterns for AI Interfaces - Smashing Magazine](https://www.smashingmagazine.com/2025/07/design-patterns-ai-interfaces/)

### UI Guidelines
- [OpenAI Developer UI Guidelines](https://developers.openai.com/apps-sdk/concepts/ui-guidelines/)
- [The Great AI UI Unification](https://spyglass.org/chatgpt-ai-ui/)

### Other Platforms
- [Perplexity Reasoning Mode](https://www.perplexity.ai/help-center/en/articles/10738677-what-is-reasoning-mode)
- [ChatGPT vs Perplexity vs Poe Comparison](https://slashdot.org/software/comparison/ChatGPT-vs-Perplexity-AI-vs-Poe/)

### Technical Implementation
- [OpenAI Chat Completion with Reasoning Streaming - vLLM](https://docs.vllm.ai/en/latest/examples/online_serving/openai_chat_completion_with_reasoning_streaming/)
- [Streaming DeepAgents with Real-Time Output](https://medium.com/@dtunai/streaming-deepagents-and-task-delegation-with-real-time-output-023e9ec049ba)

### Loading Animations
- [React AI Loader - shadcn](https://www.shadcn.io/ai/loader)
- [UX Design Patterns for Loading](https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback)
- [Animated Loading Spinner with Tailwind CSS](https://www.braydoncoyer.dev/blog/how-to-create-an-animated-loading-spinner-with-tailwind-css)

---

**Document created:** December 6, 2025
**Status:** Ready for implementation
**Estimated effort:** 9-14 hours
**Priority:** High (reasoning models are increasingly common)
