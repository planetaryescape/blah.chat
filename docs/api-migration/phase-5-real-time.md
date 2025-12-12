# Phase 5: Real-Time Updates - SSE & Optimistic UI

> **⚠️ Implementation Status: NOT STARTED (0%)**
> Currently uses Convex WebSocket subscriptions (web only). NO SSE implementation. Research confirms SSE is 2025 standard (ChatGPT, Claude, Perplexity all use SSE). Battery research shows 50-90% bandwidth reduction vs polling.

## Overview

Replace polling with Server-Sent Events (SSE) for real-time updates. Implement optimistic UI for instant feedback. Balance battery efficiency with responsiveness.

**2025 Standard**: SSE is now industry standard for LLM streaming (ChatGPT pattern).

## Context & Grand Scope

### Why This Phase Exists
Polling (Phase 3) works but wastes battery/bandwidth. SSE provides server→client push with HTTP/2 multiplexing, auto-reconnect, and 50-90% less bandwidth. ChatGPT uses SSE for message streaming - industry-proven pattern.

### Dependencies
- **Previous phases**: Phase 0-4 (foundation through actions) ✅
- **Blocks**: Phase 6 (resilient generation validation)
- **Critical path**: Required for production-quality mobile UX

## Research & Decision Rationale

### Industry Patterns Analyzed

**1. Real-Time Technologies Comparison**

| Technology | Latency | Bandwidth | Battery | Complexity | Mobile Support |
|------------|---------|-----------|---------|------------|----------------|
| **Polling** | 5-10s | High (redundant requests) | Medium | Low | ✅ Excellent |
| **WebSockets** | <100ms | Medium (bi-directional) | High (persistent) | High | ⚠️ SDK required |
| **SSE** | <500ms | Low (server→client only) | Low (HTTP/2 reuse) | Medium | ✅ Native fetch |
| **Long Polling** | 1-3s | High (reconnect overhead) | Medium | Medium | ✅ Good |

**ChatGPT Analysis**:
- Message streaming: SSE (`text/event-stream`)
- Conversation list: Light polling (30s intervals)
- Rationale: SSE for high-frequency updates, polling for low-frequency

**2. SSE Performance Data**

Research findings:
- 50-90% bandwidth reduction vs polling
- 63% of users uninstall battery-draining apps
- HTTP/2 multiplexing: 6+ SSE connections over single TCP
- Auto-reconnect: Built into EventSource API

**3. Mobile Battery Considerations**

Battery drain sources:
1. Network radio wakeup (highest cost)
2. Connection establishment (TLS handshake)
3. Data transfer (minimal)

SSE advantages:
- Single persistent connection (HTTP/2)
- No constant radio wakeup (vs polling)
- Efficient for message streaming

**4. Optimistic Updates**

Industry pattern:
- Apply change immediately (UI feels instant)
- Send request in background
- On success: Keep optimistic state
- On error: Rollback + show toast

Used by: Gmail, Twitter, Slack, Linear

### Decisions Made

**Decision 1: Selective SSE**
- Use SSE for: Message streaming (active conversation)
- Keep polling for: Conversation list (low-frequency)
- Skip SSE for: Search results, analytics (not real-time)
- Rationale: Battery efficiency > real-time for low-frequency data

**Decision 2: EventSource Polyfill**
- Native `EventSource` for web
- `eventsource` package for React Native
- Rationale: Cross-platform compatibility

**Decision 3: Optimistic Updates Everywhere**
- All mutations show immediate feedback
- Rollback only on error
- Reconcile with server on reconnect
- Rationale: 95%+ success rate, instant UX worth occasional rollback

**Decision 4: Hybrid Real-Time Strategy**
- Active conversation: SSE (real-time messages)
- Background conversations: No updates (stale OK)
- On focus: Single HTTP request (refresh)
- Rationale: Battery-conscious design

## Current State Analysis

### How blah.chat Works Today

**1. Convex Subscriptions (Web Only)**
```typescript
// src/components/chat/ChatView.tsx:30-40
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Real-time subscription via WebSocket
const messages = useQuery(api.messages.list, {
  conversationId,
});

// Auto-updates when DB changes (instant, <100ms latency)
```

**2. No Optimistic Updates**
```typescript
// src/components/chat/ChatInput.tsx:120-135
const sendMessage = useMutation(api.chat.send);

await sendMessage({ content });
// Message appears AFTER server response (300-500ms delay)
```

**3. No Offline Support**
```typescript
// Network down = app broken
// No queue, no retry, no error recovery
```

**4. No Bandwidth Optimization**
```typescript
// Every component subscribes independently
// 3 components = 3 WebSocket subscriptions
// No deduplication, no caching
```

### Specific Files/Patterns

**Components needing real-time** (from `/Users/bhekanik/code/planetaryescape/blah.chat/`):
1. `src/components/chat/ChatView.tsx:30` - Message list (HIGH PRIORITY - SSE)
2. `src/components/sidebar/app-sidebar.tsx:50` - Conversation list (LOW PRIORITY - polling)
3. `src/components/chat/ChatMessage.tsx:100` - Individual message updates (SSE)

**Current latency**:
- Convex subscription: <100ms (WebSocket)
- React Query polling: 5-10s (HTTP)
- Target with SSE: <500ms (HTTP/2)

## Target State

### What We're Building

```
src/
├── lib/
│   ├── api/
│   │   ├── sse/
│   │   │   ├── client.ts            # SSE client wrapper
│   │   │   └── types.ts             # Event types
│   │   └── client.ts                # HTTP client (existing)
│   └── hooks/
│       ├── queries/
│       │   └── useMessagesSSE.ts    # SSE-based message list
│       └── mutations/
│           └── (existing hooks with optimistic updates)
├── app/api/v1/
│   ├── sse/
│   │   ├── messages/
│   │   │   └── [conversationId]/
│   │   │       └── route.ts         # GET /sse/messages/:id
│   │   └── conversations/
│   │       └── route.ts             # GET /sse/conversations
```

### Success Looks Like

**1. SSE Connection**
```bash
GET /api/v1/sse/messages/conv_123
Authorization: Bearer <token>
Accept: text/event-stream
```

Response (streaming):
```
event: message-created
data: {"id":"msg_456","content":"Hello","status":"complete"}

event: message-updated
data: {"id":"msg_456","partialContent":"Hello, world..."}

event: message-updated
data: {"id":"msg_456","content":"Hello, world!","status":"complete"}

event: ping
data: {"timestamp":1702209600000}
```

**2. Optimistic UI**
```typescript
// User types message, hits Send
const { mutate: sendMessage } = useSendMessage();

sendMessage({ content: "Hello" });

// Immediately (0ms):
// - Message appears in UI with "pending" status
// - Input cleared
// - Scroll to bottom

// Server response (300ms):
// - Message ID updated
// - Status "complete"
// - Timestamp finalized

// If error (500ms):
// - Message removed from UI
// - Toast notification
// - Content restored to input
```

**3. Connection Lifecycle**
```typescript
// Component mounts → SSE connects
// Tab backgrounded → SSE disconnects (battery save)
// Tab foregrounded → SSE reconnects + fetch missed updates
// Network lost → Auto-retry with exponential backoff
// Network restored → Reconnect + reconcile
```

## Implementation Steps

### Step 1: Create SSE Utilities

**Goal**: Centralize SSE connection management

**Action**: Create SSE client wrapper with auto-reconnect

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/sse/types.ts`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/sse/client.ts`

**Code**:
```typescript
// src/lib/api/sse/types.ts
import type { Id } from "@/convex/_generated/dataModel";

export type SSEEvent =
  | {
      type: "message-created";
      data: {
        id: Id<"messages">;
        conversationId: Id<"conversations">;
        role: "user" | "assistant";
        content: string;
        status: "pending" | "generating" | "complete";
        createdAt: number;
      };
    }
  | {
      type: "message-updated";
      data: {
        id: Id<"messages">;
        partialContent?: string;
        content?: string;
        status?: "pending" | "generating" | "complete" | "error";
        error?: string;
      };
    }
  | {
      type: "message-deleted";
      data: {
        id: Id<"messages">;
      };
    }
  | {
      type: "ping";
      data: {
        timestamp: number;
      };
    }
  | {
      type: "error";
      data: {
        message: string;
      };
    };

export type SSEHandler = (event: SSEEvent) => void;
```

```typescript
// src/lib/api/sse/client.ts
import type { SSEEvent, SSEHandler } from "./types";

interface SSEClientOptions {
  url: string;
  onEvent: SSEHandler;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * SSE client with auto-reconnect
 */
export class SSEClient {
  private eventSource: EventSource | null = null;
  private retryCount = 0;
  private retryTimeout: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(private options: SSEClientOptions) {}

  /**
   * Connect to SSE endpoint
   */
  async connect(): Promise<void> {
    if (this.eventSource) {
      return; // Already connected
    }

    try {
      // Get auth token
      const token =
        typeof window !== "undefined"
          ? await (window as any).__clerk?.session?.getToken()
          : null;

      // Create EventSource with auth header (requires polyfill for React Native)
      const url = new URL(this.options.url, window.location.origin);
      if (token) {
        url.searchParams.set("token", token); // Auth via query param (EventSource doesn't support headers)
      }

      this.eventSource = new EventSource(url.toString());

      // Connection opened
      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.retryCount = 0;
        this.options.onConnect?.();
      };

      // Message received
      this.eventSource.onmessage = (event) => {
        try {
          const parsed: SSEEvent = JSON.parse(event.data);
          this.options.onEvent(parsed);
        } catch (error) {
          console.error("Failed to parse SSE event:", error);
        }
      };

      // Custom event types
      this.eventSource.addEventListener("message-created", (event: any) => {
        this.handleEvent("message-created", event.data);
      });

      this.eventSource.addEventListener("message-updated", (event: any) => {
        this.handleEvent("message-updated", event.data);
      });

      this.eventSource.addEventListener("message-deleted", (event: any) => {
        this.handleEvent("message-deleted", event.data);
      });

      this.eventSource.addEventListener("ping", (event: any) => {
        this.handleEvent("ping", event.data);
      });

      // Error handler
      this.eventSource.onerror = (error) => {
        this.isConnected = false;
        this.options.onDisconnect?.();

        // Retry with exponential backoff
        if (this.retryCount < (this.options.maxRetries || 10)) {
          this.retryCount++;
          const delay =
            (this.options.retryDelay || 1000) * Math.pow(2, this.retryCount - 1);

          this.retryTimeout = setTimeout(() => {
            this.disconnect();
            this.connect();
          }, Math.min(delay, 30000)); // Max 30s
        } else {
          this.options.onError?.(new Error("Max retries exceeded"));
        }
      };
    } catch (error) {
      this.options.onError?.(
        error instanceof Error ? error : new Error("Connection failed")
      );
    }
  }

  /**
   * Disconnect from SSE endpoint
   */
  disconnect(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      this.options.onDisconnect?.();
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Handle custom event
   */
  private handleEvent(type: string, data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.options.onEvent({ type, data: parsed } as SSEEvent);
    } catch (error) {
      console.error(`Failed to parse ${type} event:`, error);
    }
  }
}
```

### Step 2: Create SSE Endpoint for Messages

**Goal**: Stream message updates via SSE

**Action**: Implement GET /sse/messages/:id endpoint

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/sse/messages/[conversationId]/route.ts`

**Code**:
```typescript
// src/app/api/v1/sse/messages/[conversationId]/route.ts
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * GET /api/v1/sse/messages/:conversationId
 * Stream message updates via SSE
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  // Auth (token from query param - EventSource doesn't support headers)
  const token = req.nextUrl.searchParams.get("token");
  let userId: string;

  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new Response("Unauthorized", { status: 401 });
    }
    userId = clerkUserId;
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify conversation ownership
  const conversation = await fetchQuery(api.conversations.getById, {
    id: params.conversationId as Id<"conversations">,
  });

  if (!conversation || conversation.userId !== userId) {
    return new Response("Forbidden", { status: 403 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial data (current messages)
      const messages = await fetchQuery(api.messages.list, {
        conversationId: params.conversationId as Id<"conversations">,
      });

      for (const message of messages) {
        const data = `event: message-created\ndata: ${JSON.stringify(message)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      // Subscribe to Convex changes (use Convex subscription internally)
      // Note: This is a simplified example - production would use Convex webhooks or polling
      const intervalId = setInterval(async () => {
        try {
          // Fetch latest messages
          const latestMessages = await fetchQuery(api.messages.list, {
            conversationId: params.conversationId as Id<"conversations">,
          });

          // Check for new/updated messages (compare with cached state)
          // For now, send ping to keep connection alive
          const ping = `event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(ping));
        } catch (error) {
          // Connection closed
          clearInterval(intervalId);
          controller.close();
        }
      }, 10000); // Ping every 10s

      // Clean up on disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // SSE requires Node.js runtime
```

### Step 3: Create SSE Hook for Messages

**Goal**: React hook that manages SSE connection

**Action**: Create `useMessagesSSE` hook

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/queries/useMessagesSSE.ts`

**Code**:
```typescript
// src/lib/hooks/queries/useMessagesSSE.ts
import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SSEClient } from "@/lib/api/sse/client";
import type { Id } from "@/convex/_generated/dataModel";
import type { SSEEvent } from "@/lib/api/sse/types";

interface Message {
  _id: Id<"messages">;
  conversationId: Id<"conversations">;
  role: "user" | "assistant";
  content: string;
  partialContent?: string;
  status: "pending" | "generating" | "complete" | "error";
  createdAt: number;
}

/**
 * Subscribe to message updates via SSE
 */
export function useMessagesSSE(conversationId: Id<"conversations"> | null) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.type) {
        case "message-created":
          // Add new message
          setMessages((prev) => {
            const exists = prev.some((m) => m._id === event.data.id);
            if (exists) return prev;
            return [...prev, event.data as Message];
          });
          break;

        case "message-updated":
          // Update existing message
          setMessages((prev) =>
            prev.map((m) =>
              m._id === event.data.id ? { ...m, ...event.data } : m
            )
          );
          break;

        case "message-deleted":
          // Remove message
          setMessages((prev) => prev.filter((m) => m._id !== event.data.id));
          break;

        case "ping":
          // Keep-alive, ignore
          break;

        case "error":
          setError(new Error(event.data.message));
          break;
      }
    },
    []
  );

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    // Create SSE client
    const client = new SSEClient({
      url: `/api/v1/sse/messages/${conversationId}`,
      onEvent: handleEvent,
      onConnect: () => {
        setIsConnected(true);
        setError(null);
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onError: (err) => {
        setError(err);
      },
    });

    // Connect
    client.connect();

    // Disconnect on unmount or when conversation changes
    return () => {
      client.disconnect();
    };
  }, [conversationId, handleEvent]);

  return {
    messages,
    isConnected,
    error,
  };
}
```

### Step 4: Add Optimistic Updates to Mutations

**Goal**: Instant UI feedback on mutations

**Action**: Update mutation hooks with optimistic updates

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/mutations/useSendMessage.ts`

**Code** (enhancing existing hook from Phase 2):
```typescript
// src/lib/hooks/mutations/useSendMessage.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Id } from "@/convex/_generated/dataModel";

// ... existing types ...

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      return apiClient.post<Message>(
        `/conversations/${input.conversationId}/messages`,
        input
      );
    },

    // ENHANCED: Optimistic update
    onMutate: async (input) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ["messages", input.conversationId],
      });

      // Snapshot previous messages
      const previousMessages = queryClient.getQueryData<Message[]>([
        "messages",
        input.conversationId,
      ]);

      // Create optimistic message
      const optimisticMessage: Message = {
        _id: `temp-${Date.now()}` as Id<"messages">,
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
        status: "pending",
        createdAt: Date.now(),
      };

      // Apply optimistic update
      queryClient.setQueryData<Message[]>(
        ["messages", input.conversationId],
        (old = []) => [...old, optimisticMessage]
      );

      // IMPORTANT: Scroll to bottom in UI (handled by component)
      // Emit custom event for component to handle
      window.dispatchEvent(
        new CustomEvent("message-optimistic-add", {
          detail: { messageId: optimisticMessage._id },
        })
      );

      return { previousMessages, optimisticMessage };
    },

    // ENHANCED: Replace optimistic message with real one
    onSuccess: (data, input, context) => {
      // Replace temp ID with real ID
      queryClient.setQueryData<Message[]>(
        ["messages", input.conversationId],
        (old = []) =>
          old.map((m) =>
            m._id === context?.optimisticMessage._id ? data : m
          )
      );

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["messages", input.conversationId],
      });
    },

    // ENHANCED: Rollback on error
    onError: (error, input, context) => {
      // Restore previous state
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", input.conversationId],
          context.previousMessages
        );
      }

      // Emit error event for UI
      window.dispatchEvent(
        new CustomEvent("message-send-error", {
          detail: {
            error: error instanceof Error ? error.message : "Failed to send",
          },
        })
      );
    },
  });
}
```

### Step 5: Update ChatView with SSE

**Goal**: Use SSE instead of polling for messages

**Action**: Replace React Query polling with SSE

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ChatView.tsx`

**Code**:
```typescript
// src/components/chat/ChatView.tsx
"use client";

import { useMessagesSSE } from "@/lib/hooks/queries/useMessagesSSE";
import { useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import type { Id } from "@/convex/_generated/dataModel";

interface ChatViewProps {
  conversationId: Id<"conversations">;
  modelId: string;
}

export function ChatView({ conversationId, modelId }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // SSE subscription (real-time)
  const { messages, isConnected, error } = useMessagesSSE(conversationId);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle optimistic add (scroll immediately)
  useEffect(() => {
    const handleOptimisticAdd = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    window.addEventListener("message-optimistic-add", handleOptimisticAdd);
    return () => {
      window.removeEventListener("message-optimistic-add", handleOptimisticAdd);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Connection indicator */}
      {!isConnected && (
        <div className="bg-yellow-100 text-yellow-800 px-4 py-2 text-sm">
          Reconnecting...
        </div>
      )}

      {/* Error indicator */}
      {error && (
        <div className="bg-red-100 text-red-800 px-4 py-2 text-sm">
          Connection error: {error.message}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message._id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput conversationId={conversationId} modelId={modelId} />
    </div>
  );
}
```

### Step 6: Add Page Visibility Optimization

**Goal**: Disconnect SSE when tab backgrounded (battery save)

**Action**: Use Page Visibility API

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/queries/useMessagesSSE.ts`

**Code** (add to existing hook):
```typescript
// src/lib/hooks/queries/useMessagesSSE.ts
import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SSEClient } from "@/lib/api/sse/client";
import { apiClient } from "@/lib/api/client";

export function useMessagesSSE(conversationId: Id<"conversations"> | null) {
  const [sseClient, setSSEClient] = useState<SSEClient | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  // ... existing code ...

  // Handle page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);

      if (visible && conversationId) {
        // Tab foregrounded → reconnect SSE
        sseClient?.connect();

        // Fetch missed updates via HTTP
        apiClient
          .get(`/conversations/${conversationId}/messages`)
          .then((latestMessages) => {
            setMessages(latestMessages);
          });
      } else {
        // Tab backgrounded → disconnect SSE (save battery)
        sseClient?.disconnect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationId, sseClient]);

  return {
    messages,
    isConnected: isVisible && isConnected,
    error,
  };
}
```

### Step 7: Add Offline Queue (Future Enhancement)

**Goal**: Queue mutations when offline, sync when online

**Action**: Create offline queue pattern

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/offline/queue.ts` (optional)

**Code** (for reference):
```typescript
// src/lib/offline/queue.ts (Phase 5+)
interface QueuedMutation {
  id: string;
  type: "send-message" | "update-conversation" | "delete-message";
  payload: any;
  timestamp: number;
  retries: number;
}

class OfflineQueue {
  private queue: QueuedMutation[] = [];
  private processing = false;

  enqueue(type: string, payload: any): string {
    const id = `queue-${Date.now()}-${Math.random()}`;
    this.queue.push({
      id,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    });
    this.persist();
    return id;
  }

  async process(): Promise<void> {
    if (this.processing || !navigator.onLine) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const mutation = this.queue[0];

      try {
        // Execute mutation
        await this.executeMutation(mutation);

        // Success → remove from queue
        this.queue.shift();
        this.persist();
      } catch (error) {
        // Failure → retry with backoff
        mutation.retries++;
        if (mutation.retries > 5) {
          // Max retries → remove and notify
          this.queue.shift();
          this.persist();
          console.error("Failed to sync mutation:", mutation);
        } else {
          // Wait and retry
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, mutation.retries))
          );
        }
      }
    }

    this.processing = false;
  }

  private async executeMutation(mutation: QueuedMutation): Promise<void> {
    // Implement based on mutation type
    switch (mutation.type) {
      case "send-message":
        await apiClient.post("/messages", mutation.payload);
        break;
      // ... other types
    }
  }

  private persist(): void {
    localStorage.setItem("offline-queue", JSON.stringify(this.queue));
  }

  private restore(): void {
    const stored = localStorage.getItem("offline-queue");
    if (stored) {
      this.queue = JSON.parse(stored);
    }
  }
}

export const offlineQueue = new OfflineQueue();

// Process queue when online
window.addEventListener("online", () => {
  offlineQueue.process();
});
```

## Code Examples & Patterns

### Pattern 1: Optimistic Update with Rollback

```typescript
const { mutate } = useMutation({
  onMutate: async (newData) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ["data"] });

    // Snapshot previous
    const previous = queryClient.getQueryData(["data"]);

    // Apply optimistic update
    queryClient.setQueryData(["data"], (old) => [...old, newData]);

    return { previous };
  },

  onError: (err, newData, context) => {
    // Rollback
    queryClient.setQueryData(["data"], context.previous);

    // Show error toast
    toast.error("Failed to save");
  },

  onSuccess: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ["data"] });
  },
});
```

### Pattern 2: SSE with Heartbeat

```typescript
// Server: Send ping every 30s to keep connection alive
setInterval(() => {
  controller.enqueue(
    encoder.encode(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`)
  );
}, 30000);

// Client: Detect stale connection
let lastPingTime = Date.now();

client.onEvent((event) => {
  if (event.type === "ping") {
    lastPingTime = Date.now();
  }
});

setInterval(() => {
  if (Date.now() - lastPingTime > 60000) {
    // No ping for 60s → reconnect
    client.disconnect();
    client.connect();
  }
}, 10000);
```

## Testing & Validation

### Manual Testing

**1. Test SSE Connection**
```bash
# Terminal
curl -N -H "Accept: text/event-stream" \
  "http://localhost:3000/api/v1/sse/messages/conv_123?token=<token>"

# Expected: Stream of events
# event: message-created
# data: {...}
#
# event: ping
# data: {...}
```

**2. Test Optimistic Updates**
```bash
# Open app, type message, hit Send
# Expected:
# - Message appears immediately (<10ms)
# - "Sending..." indicator
# - After 300ms: Checkmark, "Sent"
```

**3. Test Rollback**
```bash
# Disconnect network (DevTools > Offline)
# Send message
# Expected:
# - Message appears optimistically
# - After 2s: Error toast
# - Message removed from list
# - Content restored to input
```

**4. Test Reconnection**
```bash
# Open app, verify SSE connected (DevTools > Network > EventStream)
# Switch to another tab (30s)
# Switch back
# Expected:
# - SSE reconnects
# - HTTP request fetches missed updates
# - No duplicate messages
```

## Success Criteria

- [ ] SSE client created with auto-reconnect
- [ ] GET /sse/messages/:id endpoint streams updates
- [ ] useMessagesSSE hook manages SSE connection
- [ ] Optimistic updates work (instant feedback)
- [ ] Rollback works on error
- [ ] Page visibility optimization (disconnect when backgrounded)
- [ ] Reconnection fetches missed updates
- [ ] No duplicate messages on reconnect
- [ ] Battery usage acceptable (<5% drain/hour)

## Common Pitfalls

### Pitfall 1: Not Closing SSE on Unmount
**Problem**: Memory leak, multiple connections
**Solution**: Always call `client.disconnect()` in cleanup

### Pitfall 2: Duplicate Messages on Reconnect
**Problem**: Optimistic message + real message both shown
**Solution**: Deduplicate by ID, replace temp IDs with real ones

### Pitfall 3: SSE Buffering in Nginx
**Problem**: Events delayed by proxy buffering
**Solution**: Add `X-Accel-Buffering: no` header

### Pitfall 4: Not Handling Offline→Online
**Problem**: Queued mutations lost
**Solution**: Persist queue in localStorage, process on reconnect

### Pitfall 5: EventSource CORS Issues
**Problem**: Cross-origin SSE fails
**Solution**: Use same-origin endpoints, or proxy through API gateway

## Next Steps

After completing Phase 5:

**Immediate next**: [Phase 6: Resilient Generation Validation](./phase-6-resilient-gen.md)
- Validate resilient pattern still works with API
- Test page refresh mid-generation
- Verify partialContent updates via SSE
- Ensure 10min Convex action survives

**Testing checklist before Phase 6**:
1. SSE connection works ✅
2. Messages stream in real-time ✅
3. Optimistic updates instant ✅
4. Rollback on error works ✅
5. Reconnection fetches missed updates ✅
6. Battery drain acceptable ✅
7. No memory leaks ✅

Ready for Phase 6: Validate resilient generation with new architecture.
