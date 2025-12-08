# Phase 2A: Core Chat - Resilient Generation

**Goal**: Send message → get AI response that **survives page refresh/tab close**.

**Status**: Ready to start
**Dependencies**: Phase 1 (auth + Convex)
**Estimated Effort**: Critical phase, ~2-3 days

---

## Overview

This is THE most critical feature. LLM generation must continue server-side even if client disconnects. When user returns, completed response is there.

**Test**: Send message → close tab → open tab → response completed ✓

---

## Architecture

```
User sends message
    ↓
Mutation: Insert user message + pending assistant message
    ↓
Schedule Action (ctx.scheduler.runAfter)
    ↓
Action: Call LLM, stream, update DB progressively (every 200ms)
    ↓
Client subscribes to message via reactive query
    ↓
Updates appear automatically (Convex websocket)
    ↓
Client can disconnect/reconnect anytime
    ↓
Action completes: status = "complete", store tokens/cost
```

---

## Schema Updates

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  conversations: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    model: v.string(), // Last used model
    archived: v.boolean(),
    pinned: v.optional(v.boolean()),
    starred: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "archived"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    model: v.optional(v.string()), // Model used for this response

    // Resilient generation
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("complete"),
      v.literal("error")
    ),
    partialContent: v.optional(v.string()), // Progressive saves
    error: v.optional(v.string()),
    generationStartedAt: v.optional(v.number()),
    generationCompletedAt: v.optional(v.number()),

    // Cost tracking
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    cachedTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    cost: v.optional(v.number()), // USD

    // Branching (Phase 8)
    parentMessageId: v.optional(v.id("messages")),
    branchLabel: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_status", ["status"])
    .index("by_conversation_status", ["conversationId", "status"]),
});
```

---

## Task 1: Vercel AI SDK Setup

**Install**:
```bash
npm install ai @ai-sdk/openai
```

**Create provider registry**:

```typescript
// lib/ai/registry.ts
import { createOpenAI } from '@ai-sdk/openai';
import { createProviderRegistry } from 'ai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const registry = createProviderRegistry({
  openai,
});

// Default model for Phase 2A
export const DEFAULT_MODEL = 'openai:gpt-4o-mini';
```

**Environment variable**:
```bash
# .env.local
OPENAI_API_KEY=sk-...
```

---

## Task 2: Model Configuration

```typescript
// lib/ai/models.ts
export interface ModelConfig {
  id: string;
  provider: 'openai' | 'anthropic' | 'google' | 'ollama';
  name: string;
  contextWindow: number;
  pricing: {
    input: number; // per 1M tokens
    output: number;
    cached?: number;
    reasoning?: number;
  };
  capabilities: ('vision' | 'function-calling' | 'thinking')[];
}

export const MODEL_CONFIG: Record<string, ModelConfig> = {
  'openai:gpt-4o': {
    id: 'openai:gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    contextWindow: 128000,
    pricing: {
      input: 2.50,
      output: 10.00,
      cached: 1.25,
    },
    capabilities: ['vision', 'function-calling'],
  },
  'openai:gpt-4o-mini': {
    id: 'openai:gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    contextWindow: 128000,
    pricing: {
      input: 0.15,
      output: 0.60,
      cached: 0.075,
    },
    capabilities: ['vision', 'function-calling'],
  },
  // More models added in Phase 3
};

export function calculateCost(
  model: string,
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens?: number;
    reasoningTokens?: number;
  }
): number {
  const config = MODEL_CONFIG[model];
  if (!config) return 0;

  const inputCost = (usage.inputTokens / 1_000_000) * config.pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * config.pricing.output;
  const cachedCost =
    ((usage.cachedTokens || 0) / 1_000_000) * (config.pricing.cached || 0);
  const reasoningCost =
    ((usage.reasoningTokens || 0) / 1_000_000) *
    (config.pricing.reasoning || 0);

  return inputCost + outputCost + cachedCost + reasoningCost;
}
```

---

## Task 3: Convex Mutations (Create Conversation & Message)

```typescript
// convex/conversations.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const conversationId = await ctx.db.insert("conversations", {
      userId: user._id,
      model: args.model,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return conversationId;
  },
});

export const get = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    return conversation;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user_archived", (q) =>
        q.eq("userId", user._id).eq("archived", false)
      )
      .order("desc")
      .collect();

    return conversations;
  },
});
```

```typescript
// convex/messages.ts
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

export const addUserMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      status: "complete",
      createdAt: Date.now(),
    });

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
    });

    return messageId;
  },
});

export const createPendingAssistantMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: "",
      model: args.model,
      status: "pending",
      createdAt: Date.now(),
    });

    return messageId;
  },
});

export const updatePartialContent = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      partialContent: args.content,
      status: "generating",
    });
  },
});

export const completeMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cachedTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      content: args.content,
      partialContent: undefined,
      status: "complete",
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      cachedTokens: args.cachedTokens,
      reasoningTokens: args.reasoningTokens,
      cost: args.cost,
      generationCompletedAt: Date.now(),
    });
  },
});

export const markError = internalMutation({
  args: {
    messageId: v.id("messages"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "error",
      error: args.error,
      generationCompletedAt: Date.now(),
    });
  },
});

export const listByConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    return messages;
  },
});

export const getMessage = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    return message;
  },
});
```

---

## Task 4: Generation Action (The Core)

```typescript
// convex/generation.ts
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { streamText } from "ai";
import { registry } from "../lib/ai/registry";
import { calculateCost } from "../lib/ai/models";

export const generateResponse = internalAction({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get conversation history
      const messages = await ctx.runQuery(internal.messages.listByConversation, {
        conversationId: args.conversationId,
      });

      // Filter out the pending message we're generating
      const historyMessages = messages
        .filter((m) => m._id !== args.messageId && m.status === "complete")
        .map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }));

      // Update status to generating
      await ctx.runMutation(internal.messages.updatePartialContent, {
        messageId: args.messageId,
        content: "",
      });

      // Start generation
      const result = streamText({
        model: registry.languageModel(args.model),
        messages: historyMessages,
      });

      // Buffer for progressive updates
      let buffer = "";
      let lastUpdateTime = Date.now();
      const UPDATE_INTERVAL = 200; // ms

      // Stream and save progressively
      for await (const chunk of result.textStream) {
        buffer += chunk;

        // Update DB every 200ms
        if (Date.now() - lastUpdateTime > UPDATE_INTERVAL) {
          await ctx.runMutation(internal.messages.updatePartialContent, {
            messageId: args.messageId,
            content: buffer,
          });
          lastUpdateTime = Date.now();
        }
      }

      // Get final usage
      const usage = await result.usage;
      const cost = calculateCost(args.model, {
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        cachedTokens: (usage as any).cachedPromptTokens || 0,
      });

      // Mark complete
      await ctx.runMutation(internal.messages.completeMessage, {
        messageId: args.messageId,
        content: buffer,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        cachedTokens: (usage as any).cachedPromptTokens,
        cost,
      });
    } catch (error) {
      console.error("Generation error:", error);

      await ctx.runMutation(internal.messages.markError, {
        messageId: args.messageId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});
```

---

## Task 5: Orchestration Mutation

```typescript
// convex/chat.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 1. Add user message
    const userMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      status: "complete",
      createdAt: Date.now(),
    });

    // 2. Create pending assistant message
    const assistantMessageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: "",
      model: args.model,
      status: "pending",
      generationStartedAt: Date.now(),
      createdAt: Date.now(),
    });

    // 3. Schedule action to generate response
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      messageId: assistantMessageId,
      conversationId: args.conversationId,
      model: args.model,
    });

    // 4. Update conversation
    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
      model: args.model,
    });

    return {
      userMessageId,
      assistantMessageId,
    };
  },
});
```

---

## Task 6: Client Components

**Chat container**:

```typescript
// app/(main)/chat/[conversationId]/page.tsx
'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { DEFAULT_MODEL } from '@/lib/ai/registry';

export default function ChatPage({
  params,
}: {
  params: { conversationId: Id<'conversations'> };
}) {
  const messages = useQuery(api.messages.listByConversation, {
    conversationId: params.conversationId,
  });

  const sendMessage = useMutation(api.chat.sendMessage);

  const handleSend = async (content: string) => {
    await sendMessage({
      conversationId: params.conversationId,
      content,
      model: DEFAULT_MODEL,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages || []} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}
```

**Message list**:

```typescript
// components/chat/MessageList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
import type { Doc } from '@/convex/_generated/dataModel';

interface MessageListProps {
  messages: Doc<'messages'>[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p>No messages yet. Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageItem key={message._id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
```

**Message item**:

```typescript
// components/chat/MessageItem.tsx
'use client';

import { cn } from '@/lib/utils';
import type { Doc } from '@/convex/_generated/dataModel';
import { Loader2 } from 'lucide-react';

interface MessageItemProps {
  message: Doc<'messages'>;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isGenerating = message.status === 'generating' || message.status === 'pending';
  const isError = message.status === 'error';

  const displayContent = message.partialContent || message.content;

  return (
    <div
      className={cn(
        'flex',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-2',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted',
          isError && 'bg-destructive/10 text-destructive'
        )}
      >
        {isError ? (
          <div className="flex items-center gap-2">
            <span>Error: {message.error}</span>
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap">{displayContent}</div>
            {isGenerating && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Generating...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

**Chat input**:

```typescript
// components/chat/ChatInput.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="resize-none"
          rows={3}
        />
        <Button type="submit" size="icon" disabled={!input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
```

---

## Task 7: New Chat Flow

```typescript
// app/(main)/chat/page.tsx
'use client';

import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DEFAULT_MODEL } from '@/lib/ai/registry';

export default function NewChatPage() {
  const createConversation = useMutation(api.conversations.create);
  const router = useRouter();

  useEffect(() => {
    const create = async () => {
      const conversationId = await createConversation({
        model: DEFAULT_MODEL,
      });
      router.push(`/chat/${conversationId}`);
    };

    create();
  }, [createConversation, router]);

  return (
    <div className="flex items-center justify-center h-full">
      <p>Creating conversation...</p>
    </div>
  );
}
```

---

## Testing Resilient Generation

**Critical test**:

1. Start conversation: `/chat`
2. Send message: "Write a long story"
3. Wait 2 seconds (generation starts)
4. **Close browser tab**
5. Wait 10 seconds
6. **Open browser, navigate back to chat**
7. **Verify**: Response is complete or still generating

**Expected behavior**:
- Generation continues on server
- On reconnect, see partial content if still generating
- See complete response if done
- No data loss

**Test different scenarios**:
- Refresh mid-generation
- Close tab mid-generation
- Navigate away mid-generation
- Network disconnect (simulate offline)

---

## Deliverables

1. Convex schema with resilient generation fields
2. Vercel AI SDK configured with OpenAI
3. Generation action with progressive updates
4. Convex mutations for chat orchestration
5. Client components: MessageList, MessageItem, ChatInput
6. New chat flow
7. Cost calculation working
8. **Refresh test passes** ✓

---

## Acceptance Criteria

- [ ] User can send message
- [ ] AI response streams in
- [ ] Response survives page refresh
- [ ] Response survives tab close
- [ ] Partial content visible during generation
- [ ] Status indicators work (pending → generating → complete)
- [ ] Error handling works
- [ ] Token counts stored correctly
- [ ] Cost calculated and stored
- [ ] No TypeScript errors
- [ ] No console errors

---

## Next Steps

Phase 2B: Polish chat UX (markdown, code blocks, actions)

---

## Troubleshooting

**Action timeout after 10 minutes**:
- Convex actions have 10-min limit
- For longer generations, implement chunking or switch to external job queue

**Streaming not working**:
- Verify Vercel AI SDK version (5.x+)
- Check model supports streaming
- Verify OpenAI API key valid

**Progressive updates not appearing**:
- Check Convex dashboard → Functions → generation action logs
- Verify `updatePartialContent` mutation being called
- Check client is subscribed to message via `useQuery`

**Cost calculation wrong**:
- Verify pricing in `MODEL_CONFIG`
- Check usage object structure from AI SDK
- Log usage values to debug
