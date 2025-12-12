# Phase 2: React Query Integration

> **⚠️ Implementation Status: NOT STARTED (0%)**
> React Query is NOT installed. Package.json verification shows no `@tanstack/react-query` dependency. All 223 data fetching hooks currently use Convex. This phase requires React Query v5 (latest 2025 release).

## Overview

Replace Convex React hooks (`useQuery`, `useMutation`) with `@tanstack/react-query` v5 hooks calling REST API endpoints. Enables mobile compatibility while maintaining web reactivity.

## Context & Grand Scope

### Why This Phase Exists
Convex React hooks only work with Convex client SDK (web only). Mobile apps need standard HTTP client (fetch/axios). React Query provides unified interface: web and mobile both use `useMutation`/`useQuery`, just pointing at different transports.

### Dependencies
- **Previous phases**: Phase 0 (foundation), Phase 1 (mutation endpoints) ✅
- **Blocks**: Phase 3 (query endpoints - React Query queries need GET routes)
- **Critical path**: Must complete before components can call API

## Research & Decision Rationale

### Industry Patterns Analyzed

**1. React Query Adoption**
- Used by: Vercel, GitHub, Linear, Stripe Dashboard
- 44k+ GitHub stars, industry standard for server state
- Benefits: caching, deduplication, optimistic updates, retry logic

**2. State Management Philosophy**
- Server state (DB data) ≠ Client state (UI state)
- React Query manages server state
- zustand/Jotai for client state (if needed)
- blah.chat: Minimal client state, mostly server state

**3. Migration Strategies**

**Option A: Big Bang** (replace all at once)
- Pros: Clean cutover, no hybrid state
- Cons: High risk, hard to test incrementally

**Option B: Gradual** (feature-by-feature)
- Pros: Low risk, test each component
- Cons: Hybrid state (Convex + React Query coexist)

**Option C: Parallel** (build new, switch feature flag)
- Pros: Rollback easily, A/B test
- Cons: Duplicate code, maintenance burden

**Decision: Option B (Gradual)**
- Migrate chat first (highest priority)
- Keep Convex for reads until Phase 3
- Low risk, incremental validation

**4. Caching Strategy**
- Stale-while-revalidate: Show cached, fetch fresh in background
- Optimistic updates: Apply change immediately, rollback on error
- Deduplication: Multiple components request same data, single network call

### Decisions Made

**Decision 1: React Query v5**
- Latest stable version
- TypeScript-first
- Smaller bundle than v4

**Decision 2: Separate Query Client Per Environment**
- Web: Longer cache times (data changes via Convex subscription)
- Mobile: Shorter cache times (polling-based)
- Configuration in `QueryProvider`

**Decision 3: Optimistic Updates for Mutations**
- Update UI immediately (better UX)
- Rollback on error (show toast notification)
- Pattern: `onMutate`, `onError`, `onSuccess`

**Decision 4: Keep Convex for Reads (Phase 2)**
- Only migrate mutations in Phase 2
- Queries migrate in Phase 3
- Reason: Convex subscriptions work great for web, avoid breaking

## Current State Analysis

### How blah.chat Works Today

**1. Convex Mutations (Components)**
```typescript
// src/components/chat/ChatInput.tsx:120-135
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const sendMessage = useMutation(api.chat.send);

const handleSubmit = async () => {
  try {
    await sendMessage({
      conversationId,
      content,
      modelId,
    });
    setContent(""); // Clear input
  } catch (error) {
    toast.error("Failed to send message");
  }
};
```

**2. Convex Queries (Components)**
```typescript
// src/components/sidebar/app-sidebar.tsx:50-55
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const conversations = useQuery(api.conversations.list, {
  userId: user.id,
});

// conversations updates automatically when DB changes (subscription)
```

**3. No Caching Strategy**
- Convex handles caching internally
- No manual cache invalidation
- Real-time subscriptions keep data fresh

**4. No Optimistic Updates**
- Wait for server response before updating UI
- Slower perceived performance

### Specific Files/Patterns

**Components using Convex hooks** (from `/Users/bhekanik/code/planetaryescape/blah.chat/`):

**Mutations** (migrate in Phase 2):
1. `src/components/chat/ChatInput.tsx:120` - `useMutation(api.chat.send)`
2. `src/components/sidebar/app-sidebar.tsx:85` - `useMutation(api.conversations.create)`
3. `src/components/sidebar/app-sidebar.tsx:120` - `useMutation(api.conversations.delete)`
4. `src/components/chat/ConversationHeaderMenu.tsx:45` - `useMutation(api.conversations.update)`
5. `src/components/settings/UISettings.tsx:30` - `useMutation(api.preferences.update)`
6. `src/components/chat/ChatMessage.tsx:100` - `useMutation(api.messages.update)`
7. `src/components/chat/ChatMessage.tsx:140` - `useMutation(api.messages.delete)`

**Queries** (keep Convex for Phase 2, migrate in Phase 3):
1. `src/components/sidebar/app-sidebar.tsx:50` - `useQuery(api.conversations.list)`
2. `src/components/chat/ChatView.tsx:30` - `useQuery(api.messages.list)`
3. `src/components/settings/UISettings.tsx:20` - `useQuery(api.preferences.get)`

**Total hooks to migrate**: 7 mutations (Phase 2), 3 queries (Phase 3)

## Target State

### What We're Building

```
src/
├── providers/
│   └── QueryProvider.tsx       # React Query setup
├── lib/
│   ├── api/
│   │   └── client.ts           # HTTP client wrapper
│   └── hooks/
│       ├── mutations/
│       │   ├── useCreateConversation.ts
│       │   ├── useSendMessage.ts
│       │   ├── useUpdateConversation.ts
│       │   ├── useDeleteConversation.ts
│       │   ├── useUpdateMessage.ts
│       │   ├── useDeleteMessage.ts
│       │   └── useUpdatePreferences.ts
│       └── queries/             # Phase 3
│           └── (coming later)
└── app/
    └── layout.tsx               # Wrap with QueryProvider
```

### Success Looks Like

**1. Send Message (Before)**
```typescript
// src/components/chat/ChatInput.tsx (old)
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const sendMessage = useMutation(api.chat.send);

await sendMessage({ conversationId, content, modelId });
```

**2. Send Message (After)**
```typescript
// src/components/chat/ChatInput.tsx (new)
import { useSendMessage } from "@/lib/hooks/mutations/useSendMessage";

const { mutateAsync: sendMessage, isPending } = useSendMessage();

await sendMessage({ conversationId, content, modelId });
// UI shows loading state via isPending
// Optimistic update: message appears immediately
```

**3. Network Tab**
```
POST /api/v1/conversations/j97x.../messages
Status: 202 Accepted
Time: 45ms
```

**4. Cache Behavior**
```typescript
// Multiple components call useSendMessage
// React Query deduplicates: single network request
// Result cached, shared across components
```

## Implementation Steps

### Step 1: Install React Query

**Goal**: Add @tanstack/react-query dependency

**Action**: Install via Bun

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/package.json`

**Code**:
```bash
# Terminal
bun add @tanstack/react-query @tanstack/react-query-devtools
```

Expected output:
```
bun add v1.x.x
+ @tanstack/react-query@5.x.x
+ @tanstack/react-query-devtools@5.x.x

2 packages installed
```

### Step 2: Create Query Provider

**Goal**: Setup React Query client and provider

**Action**: Create provider component with configuration

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/providers/QueryProvider.tsx`

**Code**:
```typescript
// src/providers/QueryProvider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/**
 * React Query configuration
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data fresh for 30s before background refetch
        staleTime: 30 * 1000,

        // Keep cached data for 5min (even if unmounted)
        gcTime: 5 * 60 * 1000,

        // Retry failed requests (exponential backoff)
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Refetch on window focus (user returns to tab)
        refetchOnWindowFocus: true,

        // Don't refetch on mount if data fresh
        refetchOnMount: false,

        // Disable refetch on reconnect (Convex handles this for now)
        refetchOnReconnect: false,
      },
      mutations: {
        // Retry mutations on network failure
        retry: 1,
        retryDelay: 1000,

        // Global error handler (optional)
        onError: (error) => {
          console.error("Mutation error:", error);
        },
      },
    },
  });
}

/**
 * Query Provider
 * Wraps app with React Query client
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create client once per session (not per render)
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools (only in development) */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
```

### Step 3: Add Provider to Layout

**Goal**: Make React Query available app-wide

**Action**: Wrap app with QueryProvider

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/layout.tsx`

**Code**:
```typescript
// src/app/layout.tsx
import { ConvexClientProvider } from "@/providers/ConvexClientProvider";
import { QueryProvider } from "@/providers/QueryProvider"; // Add this
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <ConvexClientProvider>
            <QueryProvider>{children}</QueryProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
```

**Order matters**:
1. ClerkProvider (auth)
2. ConvexClientProvider (keep for Phase 2)
3. QueryProvider (new)
4. Children

### Step 4: Create HTTP Client Wrapper

**Goal**: Centralize fetch logic with auth headers

**Action**: Create reusable API client

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/api/client.ts`

**Code**:
```typescript
// src/lib/api/client.ts
import type { ApiResponse } from "./types";

/**
 * Base API client
 * Handles auth, error parsing, response unwrapping
 */

const API_BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Make authenticated API request
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  // Get auth token from Clerk (client-side)
  // Note: This assumes Clerk session is available
  // For SSR, use different approach (Phase 3)
  const token =
    typeof window !== "undefined"
      ? await (window as any).__clerk?.session?.getToken()
      : null;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Parse response
  if (!response.ok) {
    // Try to parse error envelope
    try {
      const error: ApiResponse = await response.json();
      throw new ApiError(
        typeof error.error === "string"
          ? error.error
          : error.error?.message || "Request failed",
        response.status,
        typeof error.error === "object" ? error.error.code : undefined,
        typeof error.error === "object" ? error.error.details : undefined
      );
    } catch (e) {
      // Fallback if response not JSON
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }
  }

  // Parse success response
  if (response.status === 204) {
    // No content
    return undefined as T;
  }

  const envelope: ApiResponse<T> = await response.json();

  // Unwrap envelope
  if (envelope.status === "success" && envelope.data !== undefined) {
    return envelope.data;
  }

  throw new ApiError("Invalid response format", 500);
}

/**
 * HTTP methods
 */
export const apiClient = {
  get: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: "GET" }),

  post: <T>(endpoint: string, data?: unknown) =>
    fetchApi<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data: unknown) =>
    fetchApi<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (endpoint: string, params?: Record<string, string>) => {
    const queryString = params
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return fetchApi<void>(`${endpoint}${queryString}`, { method: "DELETE" });
  },
};
```

### Step 5: Create Mutation Hooks

**Goal**: Replace Convex `useMutation` with React Query `useMutation`

**Action**: Create custom hooks for each mutation

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/mutations/useSendMessage.ts`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/mutations/useCreateConversation.ts`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/mutations/useUpdateConversation.ts`

**Code**:
```typescript
// src/lib/hooks/mutations/useSendMessage.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Id } from "@/convex/_generated/dataModel";

interface SendMessageInput {
  conversationId: Id<"conversations">;
  content: string;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
    size: number;
  }>;
  modelId: string;
  parentId?: Id<"messages">;
}

interface Message {
  _id: Id<"messages">;
  conversationId: Id<"conversations">;
  role: "user" | "assistant";
  content: string;
  status: "pending" | "generating" | "complete" | "error";
  createdAt: number;
}

/**
 * Send message mutation
 * POST /api/v1/conversations/:id/messages
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      return apiClient.post<Message>(
        `/conversations/${input.conversationId}/messages`,
        input
      );
    },

    // Optimistic update
    onMutate: async (input) => {
      // Cancel outgoing queries (avoid race condition)
      await queryClient.cancelQueries({
        queryKey: ["messages", input.conversationId],
      });

      // Snapshot previous state
      const previousMessages = queryClient.getQueryData<Message[]>([
        "messages",
        input.conversationId,
      ]);

      // Optimistically add message to cache
      const optimisticMessage: Message = {
        _id: `temp-${Date.now()}` as Id<"messages">,
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
        status: "pending",
        createdAt: Date.now(),
      };

      queryClient.setQueryData<Message[]>(
        ["messages", input.conversationId],
        (old = []) => [...old, optimisticMessage]
      );

      // Return context for rollback
      return { previousMessages };
    },

    // Rollback on error
    onError: (error, input, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", input.conversationId],
          context.previousMessages
        );
      }
    },

    // Refetch on success
    onSuccess: (data, input) => {
      // Invalidate messages query to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: ["messages", input.conversationId],
      });

      // Update conversation list (updatedAt changed)
      queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
}
```

```typescript
// src/lib/hooks/mutations/useCreateConversation.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Id } from "@/convex/_generated/dataModel";

interface CreateConversationInput {
  title?: string;
  modelId: string;
  projectId?: Id<"projects">;
}

interface Conversation {
  _id: Id<"conversations">;
  userId: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Create conversation mutation
 * POST /api/v1/conversations
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateConversationInput) => {
      return apiClient.post<Conversation>("/conversations", input);
    },

    // Optimistic update
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const previousConversations = queryClient.getQueryData<Conversation[]>([
        "conversations",
      ]);

      // Add optimistic conversation
      const optimisticConversation: Conversation = {
        _id: `temp-${Date.now()}` as Id<"conversations">,
        userId: "current", // Placeholder
        title: input.title || "New Conversation",
        modelId: input.modelId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      queryClient.setQueryData<Conversation[]>(
        ["conversations"],
        (old = []) => [optimisticConversation, ...old]
      );

      return { previousConversations };
    },

    onError: (error, input, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(
          ["conversations"],
          context.previousConversations
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
```

```typescript
// src/lib/hooks/mutations/useUpdateConversation.ts
import { useMutation, useQueryClient } from "@tantml:react-query";
import { apiClient } from "@/lib/api/client";
import type { Id } from "@/convex/_generated/dataModel";

interface UpdateConversationInput {
  id: Id<"conversations">;
  title?: string;
  modelId?: string;
  archived?: boolean;
}

/**
 * Update conversation mutation
 * PATCH /api/v1/conversations/:id
 */
export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateConversationInput) => {
      return apiClient.patch(`/conversations/${id}`, data);
    },

    // Optimistic update
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const previousConversations = queryClient.getQueryData(["conversations"]);

      // Update in cache
      queryClient.setQueryData<any[]>(["conversations"], (old = []) =>
        old.map((conv) =>
          conv._id === id ? { ...conv, ...updates, updatedAt: Date.now() } : conv
        )
      );

      return { previousConversations };
    },

    onError: (error, input, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(
          ["conversations"],
          context.previousConversations
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
```

### Step 6: Migrate ChatInput Component

**Goal**: First component using new mutation hooks

**Action**: Replace Convex hook with React Query hook

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ChatInput.tsx`

**Code**:
```typescript
// src/components/chat/ChatInput.tsx
"use client";

import { useState } from "react";
import { useSendMessage } from "@/lib/hooks/mutations/useSendMessage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface ChatInputProps {
  conversationId: Id<"conversations">;
  modelId: string;
}

export function ChatInput({ conversationId, modelId }: ChatInputProps) {
  const [content, setContent] = useState("");

  // React Query mutation (replaces Convex useMutation)
  const { mutateAsync: sendMessage, isPending } = useSendMessage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isPending) return;

    const messageContent = content;
    setContent(""); // Clear input immediately (optimistic)

    try {
      await sendMessage({
        conversationId,
        content: messageContent,
        modelId,
      });

      // Success handled by onSuccess in hook
    } catch (error) {
      // Error: restore content, show toast
      setContent(messageContent);
      toast.error(
        error instanceof Error ? error.message : "Failed to send message"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type a message..."
        disabled={isPending}
        className="flex-1"
      />
      <Button type="submit" disabled={!content.trim() || isPending}>
        {isPending ? "Sending..." : "Send"}
      </Button>
    </form>
  );
}
```

**Changes**:
- ❌ `import { useMutation } from "convex/react"`
- ✅ `import { useSendMessage } from "@/lib/hooks/mutations/useSendMessage"`
- ❌ `const sendMessage = useMutation(api.chat.send)`
- ✅ `const { mutateAsync: sendMessage, isPending } = useSendMessage()`
- ✅ Added loading state via `isPending`
- ✅ Optimistic update: clear input immediately
- ✅ Error handling: restore content on failure

### Step 7: Migrate Sidebar Component

**Goal**: Create/delete conversations via API

**Action**: Replace Convex mutations

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/sidebar/app-sidebar.tsx`

**Code**:
```typescript
// src/components/sidebar/app-sidebar.tsx
"use client";

import { useCreateConversation } from "@/lib/hooks/mutations/useCreateConversation";
import { useDeleteConversation } from "@/lib/hooks/mutations/useDeleteConversation";
import { useQuery } from "convex/react"; // Keep for Phase 2
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AppSidebar() {
  const router = useRouter();

  // Queries: Keep Convex for now (migrate in Phase 3)
  const conversations = useQuery(api.conversations.list);

  // Mutations: Use React Query
  const { mutateAsync: createConversation, isPending: isCreating } =
    useCreateConversation();
  const { mutateAsync: deleteConversation } = useDeleteConversation();

  const handleNew = async () => {
    try {
      const conversation = await createConversation({
        title: "New Conversation",
        modelId: "openai:gpt-4o",
      });

      router.push(`/chat/${conversation._id}`);
    } catch (error) {
      toast.error("Failed to create conversation");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConversation({ id });
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  return (
    <aside>
      <button onClick={handleNew} disabled={isCreating}>
        {isCreating ? "Creating..." : "New Chat"}
      </button>

      <ul>
        {conversations?.map((conv) => (
          <li key={conv._id}>
            <span>{conv.title}</span>
            <button onClick={() => handleDelete(conv._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

### Step 8: Create Remaining Mutation Hooks

**Goal**: Complete mutation hook library

**Action**: Create hooks for delete, update message, preferences

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/mutations/useDeleteConversation.ts`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/mutations/useUpdateMessage.ts`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/mutations/useDeleteMessage.ts`
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/mutations/useUpdatePreferences.ts`

**Code**:
```typescript
// src/lib/hooks/mutations/useDeleteConversation.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Id } from "@/convex/_generated/dataModel";

interface DeleteConversationInput {
  id: Id<"conversations">;
  permanent?: boolean;
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, permanent = false }: DeleteConversationInput) => {
      await apiClient.delete(`/conversations/${id}`, {
        ...(permanent ? { permanent: "true" } : {}),
      });
    },

    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });

      const previousConversations = queryClient.getQueryData(["conversations"]);

      // Remove from cache optimistically
      queryClient.setQueryData<any[]>(["conversations"], (old = []) =>
        old.filter((conv) => conv._id !== id)
      );

      return { previousConversations };
    },

    onError: (error, input, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(
          ["conversations"],
          context.previousConversations
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
```

```typescript
// src/lib/hooks/mutations/useUpdatePreferences.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

interface UpdatePreferencesInput {
  theme?: "light" | "dark" | "system";
  defaultModelId?: string;
  language?: string;
  sendOnEnter?: boolean;
  showTimestamps?: boolean;
  codeTheme?: string;
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePreferencesInput) => {
      return apiClient.patch("/preferences", input);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });
}
```

## Code Examples & Patterns

### Pattern 1: Error Boundaries with React Query

```typescript
// src/components/ErrorBoundary.tsx
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

export function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ReactErrorBoundary
      onReset={reset}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}
    >
      {children}
    </ReactErrorBoundary>
  );
}
```

### Pattern 2: Dependent Mutations

```typescript
// Send message, then navigate to conversation
const { mutateAsync: createConversation } = useCreateConversation();
const { mutateAsync: sendMessage } = useSendMessage();

const handleQuickChat = async (content: string) => {
  // Create conversation first
  const conversation = await createConversation({
    modelId: "openai:gpt-4o",
  });

  // Then send message
  await sendMessage({
    conversationId: conversation._id,
    content,
    modelId: "openai:gpt-4o",
  });

  router.push(`/chat/${conversation._id}`);
};
```

### Pattern 3: Global Loading State

```typescript
// src/lib/hooks/useIsMutating.ts
import { useIsMutating } from "@tanstack/react-query";

export function useGlobalLoading() {
  // Returns number of active mutations
  const mutationCount = useIsMutating();

  return mutationCount > 0;
}

// Use in global loading indicator
function GlobalLoadingBar() {
  const isLoading = useGlobalLoading();

  return isLoading ? <div className="loading-bar" /> : null;
}
```

## Testing & Validation

### Manual Testing

**1. Test Send Message**
```bash
# Start dev server
bun dev

# Open http://localhost:3000/chat/some-conversation
# Type message, hit Send
# Expected:
# - Message appears immediately (optimistic update)
# - Network tab shows POST /api/v1/conversations/.../messages
# - Response shown in React Query DevTools
```

**2. Test Create Conversation**
```bash
# Click "New Chat" in sidebar
# Expected:
# - New conversation appears immediately
# - POST /api/v1/conversations in network tab
# - Navigates to new conversation page
```

**3. Test Error Handling**
```bash
# Disconnect network (DevTools > Network > Offline)
# Try sending message
# Expected:
# - Error toast appears
# - Optimistic update rolls back
# - Message input restored
```

**4. React Query DevTools**
```bash
# Open DevTools panel (bottom-right in dev mode)
# Send message
# Expected:
# - Mutation appears in "Mutations" tab
# - Cache updated in "Queries" tab
# - Can inspect mutation state (pending/error/success)
```

### Integration Testing

```typescript
// tests/hooks/useSendMessage.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSendMessage } from "@/lib/hooks/mutations/useSendMessage";

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useSendMessage", () => {
  it("sends message and updates cache", async () => {
    const { result } = renderHook(() => useSendMessage(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        conversationId: "test-conv",
        content: "Hello",
        modelId: "openai:gpt-4o",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

## Success Criteria

- [ ] React Query installed and configured
- [ ] QueryProvider wraps app
- [ ] HTTP client created with auth handling
- [ ] 7 mutation hooks created (send message, create/update/delete conversation, etc.)
- [ ] ChatInput.tsx migrated to useSendMessage
- [ ] app-sidebar.tsx migrated to useCreateConversation/useDeleteConversation
- [ ] Optimistic updates work (UI updates immediately)
- [ ] Error rollback works (reverts on failure)
- [ ] React Query DevTools shows mutations
- [ ] Network tab shows API calls (not Convex WebSocket)

## Common Pitfalls

### Pitfall 1: Not Awaiting getToken()
**Problem**: Token undefined, requests fail with 401
**Solution**: Always `await window.__clerk.session.getToken()`

### Pitfall 2: Forgetting to Invalidate Queries
**Problem**: Cache stale after mutation, UI doesn't update
**Solution**: Call `queryClient.invalidateQueries()` in `onSuccess`

### Pitfall 3: Not Canceling Queries in onMutate
**Problem**: Race condition - query refetches while optimistic update in progress
**Solution**: Always `await queryClient.cancelQueries()` before optimistic update

### Pitfall 4: Mixing Convex and React Query State
**Problem**: Conversation list from Convex, but mutations via API - cache mismatch
**Solution**: Accept hybrid state in Phase 2, migrate queries in Phase 3

### Pitfall 5: Missing Error Boundaries
**Problem**: Unhandled query errors crash entire app
**Solution**: Wrap routes in QueryErrorBoundary

## Next Steps

After completing Phase 2:

**Immediate next**: [Phase 3: Queries](./phase-3-queries.md)
- Implement GET endpoints for conversations, messages
- Create React Query `useQuery` hooks
- Migrate `useQuery(api.conversations.list)` to `useConversations()`
- Hybrid approach: Keep Convex subscriptions for web, add polling for mobile

**Testing checklist before Phase 3**:
1. All 7 mutation hooks work ✅
2. ChatInput sends messages via API ✅
3. Sidebar creates/deletes conversations via API ✅
4. Optimistic updates appear immediately ✅
5. Errors roll back correctly ✅
6. React Query DevTools shows mutations ✅
7. Network tab shows POST/PATCH/DELETE requests ✅

**Components migrated** (Phase 2 complete):
- ✅ ChatInput.tsx
- ✅ app-sidebar.tsx (mutations only)
- ⏳ ConversationHeaderMenu.tsx (do in Phase 3)
- ⏳ UISettings.tsx (do in Phase 3)

Ready for Phase 3: Queries (migrate reads to API, add polling for mobile).
