# Phase 3: Queries - Read Operations API

> **⚠️ Implementation Status: NOT STARTED (0%)**
> Zero GET endpoints exist. All reads use Convex `useQuery` hooks. Schema has 40+ tables (not 20 as originally estimated). Frontend makes 223 query calls. TypeScript recursion workarounds (@ts-ignore) needed for 94+ module codebase.

## Overview

Migrate read operations from Convex subscriptions to REST API with React Query. Implement hybrid approach: keep Convex real-time for web, add polling for mobile.

## Context & Grand Scope

### Why This Phase Exists
Mobile apps can't use Convex subscriptions (requires WebSocket SDK). Need HTTP polling alternative. Web keeps Convex for superior real-time UX, mobile uses polling (5-10s intervals) for battery efficiency.

### Dependencies
- **Previous phases**: Phase 0 (foundation), Phase 1 (mutations), Phase 2 (React Query) ✅
- **Blocks**: Phase 5 (real-time SSE - better than polling)
- **Critical path**: Must complete before mobile app can display data

## Research & Decision Rationale

### Industry Patterns Analyzed

**1. Polling vs WebSockets vs SSE**

| Pattern | Pros | Cons | Use Case |
|---------|------|------|----------|
| **Polling** | Simple, works everywhere, mobile-friendly | Higher latency (5-10s), bandwidth waste | Mobile apps, slow-changing data |
| **WebSockets** | Bi-directional, instant updates | Complex, battery drain, requires SDK | Real-time chat, gaming |
| **SSE** | Server→client, auto-reconnect, HTTP/2 multiplexing | One-way only | Live feeds, notifications, message streaming |

**ChatGPT analysis**:
- Uses SSE for message streaming (Phase 5)
- Uses polling for conversation list (Phase 3)
- Rationale: Messages need real-time, list updates infrequent

**2. Polling Intervals**

Industry standards:
- Slack mobile: 10s intervals for channel list
- WhatsApp web: 5s for conversation list
- Discord: 30s for server list (+ WebSocket for active channel)

**Decision factors**:
- Battery: 63% users uninstall battery-draining apps
- Bandwidth: 5s polling = 720 requests/hour vs 1 WebSocket
- Latency: Acceptable for list views, not for messages

**3. Hybrid Approach**

**Option A: API-only** (ditch Convex entirely)
- Pros: Single code path, simpler
- Cons: Worse web UX (lose real-time), migration risk

**Option B: Hybrid** (Convex for web, API for mobile)
- Pros: Best of both worlds, incremental migration
- Cons: Two code paths, complexity

**Option C: SSE for all** (Phase 5 future)
- Pros: Real-time everywhere, single path
- Cons: Not needed for slow-changing data

**Decision: Option B (Hybrid)**
- Web: Keep Convex subscriptions (instant updates)
- Mobile: Use React Query polling (5-10s)
- Migrate to SSE in Phase 5 if needed

### Decisions Made

**Decision 1: Mobile-Critical Queries Only**
- Migrate: conversations list, messages list, user preferences
- Keep Convex: search results, memories, analytics (mobile doesn't need)
- Rationale: 80/20 rule - 20% of queries cover 80% of mobile use

**Decision 2: 5-Second Polling Interval**
- Conversations list: 10s (slow-changing)
- Messages list: 5s (active conversation)
- Preferences: 60s (rarely changes)
- Rationale: Balance latency vs battery

**Decision 3: React Query Stale-While-Revalidate**
- Show cached data instantly (UX)
- Fetch fresh in background (correctness)
- Pattern: `staleTime: 5000`, `refetchInterval: 10000`

**Decision 4: Platform Detection**
- `isPlatformMobile()` helper determines polling vs Convex
- Web: Use Convex (existing code unchanged)
- Mobile: Use React Query (polling)
- Future: Feature flag for gradual web migration

## Current State Analysis

### How blah.chat Works Today

**1. Convex Queries (Real-Time Subscriptions)**
```typescript
// src/components/sidebar/app-sidebar.tsx:50-55
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const conversations = useQuery(api.conversations.list, {
  userId: user.id,
});

// conversations auto-updates when DB changes (WebSocket subscription)
// No polling, no manual refetch needed
```

**2. Query Composition**
```typescript
// src/components/chat/ChatView.tsx:30-40
const conversation = useQuery(api.conversations.getById, {
  id: conversationId,
});

const messages = useQuery(api.messages.list, {
  conversationId,
});

// Two subscriptions, both real-time
```

**3. No Loading States Needed**
```typescript
// Convex queries return undefined initially, then data
if (conversations === undefined) {
  return <Skeleton />;
}

// No isPending, isError, etc. - Convex handles internally
```

**4. No Cache Management**
```typescript
// Convex manages cache automatically
// No invalidation, no refetch, no stale time
// Just works™
```

### Specific Files/Patterns

**Components using Convex queries** (from `/Users/bhekanik/code/planetaryescape/blah.chat/`):

**Mobile-critical** (migrate in Phase 3):
1. `src/components/sidebar/app-sidebar.tsx:50` - `useQuery(api.conversations.list)` - List conversations
2. `src/components/chat/ChatView.tsx:30` - `useQuery(api.messages.list)` - List messages
3. `src/components/settings/UISettings.tsx:20` - `useQuery(api.preferences.get)` - User preferences

**Web-only** (keep Convex):
4. `src/components/search/SearchResults.tsx` - `useQuery(api.search.hybrid)` - Search (complex query)
5. `src/components/memories/MemoriesList.tsx` - `useQuery(api.memories.list)` - RAG memories
6. `src/components/usage/UsageChart.tsx` - `useQuery(api.usage.getDaily)` - Analytics

**Total queries**: 3 to migrate, 3 to keep

## Target State

### What We're Building

```
src/
├── lib/
│   ├── hooks/
│   │   └── queries/
│   │       ├── useConversations.ts    # GET /conversations
│   │       ├── useConversation.ts     # GET /conversations/:id
│   │       ├── useMessages.ts         # GET /conversations/:id/messages
│   │       ├── usePreferences.ts      # GET /preferences
│   │       └── useUser.ts             # GET /user
│   └── utils/
│       └── platform.ts                # isPlatformMobile()
├── app/api/v1/
│   ├── conversations/
│   │   ├── route.ts                   # GET /conversations (already exists from Phase 1)
│   │   └── [id]/
│   │       ├── route.ts               # GET /conversations/:id
│   │       └── messages/
│   │           └── route.ts           # GET /messages (already exists)
│   ├── preferences/
│   │   └── route.ts                   # GET /preferences (already exists)
│   └── user/
│       └── route.ts                   # GET /user (new)
```

### Success Looks Like

**1. List Conversations (Mobile)**
```bash
GET /api/v1/conversations?page=1&pageSize=20
Authorization: Bearer <token>
```

Response:
```json
{
  "status": "success",
  "sys": { "entity": "list" },
  "data": {
    "items": [
      {
        "_id": "j97x...",
        "title": "Chat about React",
        "modelId": "openai:gpt-4o",
        "updatedAt": 1702209600000
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "hasNext": true
    }
  }
}
```

**2. Hybrid Hook Pattern**
```typescript
// src/components/sidebar/app-sidebar.tsx
import { useConversations } from "@/lib/hooks/queries/useConversations";

// Hook automatically detects platform
const { data: conversations, isLoading, error } = useConversations();

// Web: Convex subscription (real-time)
// Mobile: React Query polling (5-10s)
```

**3. Polling in Action**
```typescript
// React Query config for mobile
useQuery({
  queryKey: ["conversations"],
  queryFn: () => apiClient.get("/conversations"),
  staleTime: 5000,        // Data fresh for 5s
  refetchInterval: 10000, // Poll every 10s
  refetchOnWindowFocus: true,
});
```

## Implementation Steps

### Step 1: Create Platform Detection Utility

**Goal**: Determine if running on mobile (use polling) or web (use Convex)

**Action**: Create platform detection helper

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/utils/platform.ts`

**Code**:
```typescript
// src/lib/utils/platform.ts

/**
 * Platform detection utilities
 */

let _isMobile: boolean | null = null;

/**
 * Detect if running on mobile (vs web)
 * Used to choose polling (mobile) vs Convex subscriptions (web)
 */
export function isPlatformMobile(): boolean {
  // Cache result
  if (_isMobile !== null) {
    return _isMobile;
  }

  // SSR: Not mobile
  if (typeof window === "undefined") {
    return false;
  }

  // Check for mobile user agent
  const ua = window.navigator.userAgent.toLowerCase();
  const isMobileUA =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);

  // Check for native mobile environment (Capacitor, React Native, etc.)
  const isNative =
    (window as any).Capacitor !== undefined ||
    (window as any).ReactNativeWebView !== undefined;

  // Check for smaller viewport (fallback)
  const isSmallViewport = window.innerWidth < 768;

  _isMobile = isMobileUA || isNative || isSmallViewport;

  return _isMobile;
}

/**
 * Force mobile mode (for testing)
 */
export function setMobileMode(isMobile: boolean) {
  _isMobile = isMobile;
}

/**
 * Get polling interval based on data type
 */
export function getPollingInterval(dataType: "conversations" | "messages" | "preferences"): number {
  if (!isPlatformMobile()) {
    return 0; // No polling on web (use Convex)
  }

  switch (dataType) {
    case "conversations":
      return 10000; // 10s - slow-changing
    case "messages":
      return 5000; // 5s - active conversation
    case "preferences":
      return 60000; // 60s - rarely changes
    default:
      return 10000;
  }
}
```

### Step 2: Create User API Route

**Goal**: GET /api/v1/user endpoint (user profile)

**Action**: Implement user query endpoint

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/app/api/v1/user/route.ts`

**Code**:
```typescript
// src/app/api/v1/user/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware/auth";
import { formatEntity } from "@/lib/utils/formatEntity";
import { usersDAL } from "@/lib/api/dal/users";

/**
 * GET /api/v1/user
 * Get current user profile
 */
export const GET = withAuth(async (req, { userId }) => {
  const user = await usersDAL.getByClerkId(userId);

  if (!user) {
    // User should exist (created on signup), but handle edge case
    return NextResponse.json(
      { status: "error", error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(formatEntity(user, "user", user._id));
});

export const dynamic = "force-dynamic";
```

### Step 3: Create Conversations Query Hook

**Goal**: Hybrid hook for listing conversations

**Action**: Create `useConversations` with platform detection

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/queries/useConversations.ts`

**Code**:
```typescript
// src/lib/hooks/queries/useConversations.ts
import { useQuery as useConvexQuery } from "convex/react";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { apiClient } from "@/lib/api/client";
import { isPlatformMobile, getPollingInterval } from "@/lib/utils/platform";
import type { Id } from "@/convex/_generated/dataModel";

interface Conversation {
  _id: Id<"conversations">;
  userId: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
}

interface UseConversationsOptions {
  page?: number;
  pageSize?: number;
  archived?: boolean;
}

/**
 * List conversations (hybrid: Convex for web, polling for mobile)
 */
export function useConversations(options: UseConversationsOptions = {}) {
  const { page = 1, pageSize = 50, archived = false } = options;
  const isMobile = isPlatformMobile();

  // Web: Use Convex subscription (real-time)
  const convexData = useConvexQuery(
    api.conversations.list,
    isMobile ? "skip" : { page, pageSize, archived }
  );

  // Mobile: Use React Query polling
  const reactQueryResult = useReactQuery({
    queryKey: ["conversations", { page, pageSize, archived }],
    queryFn: async () => {
      const result = await apiClient.get<{
        items: Conversation[];
        pagination: {
          page: number;
          pageSize: number;
          total: number;
          hasNext: boolean;
        };
      }>(`/conversations?page=${page}&pageSize=${pageSize}${archived ? "&archived=true" : ""}`);
      return result.items; // Unwrap pagination wrapper
    },
    enabled: isMobile, // Only run on mobile
    staleTime: 5000,
    refetchInterval: getPollingInterval("conversations"),
    refetchOnWindowFocus: true,
  });

  // Return unified interface
  if (isMobile) {
    return {
      data: reactQueryResult.data,
      isLoading: reactQueryResult.isLoading,
      error: reactQueryResult.error,
      refetch: reactQueryResult.refetch,
    };
  }

  return {
    data: convexData,
    isLoading: convexData === undefined,
    error: null,
    refetch: () => {}, // Convex auto-updates
  };
}
```

### Step 4: Create Messages Query Hook

**Goal**: Hybrid hook for listing messages

**Action**: Create `useMessages` with platform detection

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/queries/useMessages.ts`

**Code**:
```typescript
// src/lib/hooks/queries/useMessages.ts
import { useQuery as useConvexQuery } from "convex/react";
import { useQuery as useReactQuery } from "@tantml:react-query";
import { api } from "@/convex/_generated/api";
import { apiClient } from "@/lib/api/client";
import { isPlatformMobile, getPollingInterval } from "@/lib/utils/platform";
import type { Id } from "@/convex/_generated/dataModel";

interface Message {
  _id: Id<"messages">;
  conversationId: Id<"conversations">;
  role: "user" | "assistant" | "system";
  content: string;
  status?: "pending" | "generating" | "complete" | "error";
  partialContent?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * List messages in conversation (hybrid)
 */
export function useMessages(conversationId: Id<"conversations"> | null) {
  const isMobile = isPlatformMobile();

  // Web: Use Convex subscription
  const convexData = useConvexQuery(
    api.messages.list,
    conversationId && !isMobile ? { conversationId } : "skip"
  );

  // Mobile: Use React Query polling
  const reactQueryResult = useReactQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return apiClient.get<Message[]>(`/conversations/${conversationId}/messages`);
    },
    enabled: isMobile && conversationId !== null,
    staleTime: 2000, // 2s for active conversation
    refetchInterval: getPollingInterval("messages"),
    refetchOnWindowFocus: true,
  });

  // Return unified interface
  if (isMobile) {
    return {
      data: reactQueryResult.data,
      isLoading: reactQueryResult.isLoading,
      error: reactQueryResult.error,
      refetch: reactQueryResult.refetch,
    };
  }

  return {
    data: convexData,
    isLoading: convexData === undefined,
    error: null,
    refetch: () => {},
  };
}
```

### Step 5: Create Preferences Query Hook

**Goal**: Hybrid hook for user preferences

**Action**: Create `usePreferences` with platform detection

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/src/lib/hooks/queries/usePreferences.ts`

**Code**:
```typescript
// src/lib/hooks/queries/usePreferences.ts
import { useQuery as useConvexQuery } from "convex/react";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { apiClient } from "@/lib/api/client";
import { isPlatformMobile, getPollingInterval } from "@/lib/utils/platform";

interface Preferences {
  theme?: "light" | "dark" | "system";
  defaultModelId?: string;
  language?: string;
  sendOnEnter?: boolean;
  showTimestamps?: boolean;
  codeTheme?: string;
}

/**
 * Get user preferences (hybrid)
 */
export function usePreferences() {
  const isMobile = isPlatformMobile();

  // Web: Use Convex subscription
  const convexData = useConvexQuery(
    api.preferences.get,
    isMobile ? "skip" : {}
  );

  // Mobile: Use React Query polling
  const reactQueryResult = useReactQuery({
    queryKey: ["preferences"],
    queryFn: async () => apiClient.get<Preferences>("/preferences"),
    enabled: isMobile,
    staleTime: 30000, // 30s
    refetchInterval: getPollingInterval("preferences"),
    refetchOnWindowFocus: true,
  });

  // Return unified interface
  if (isMobile) {
    return {
      data: reactQueryResult.data,
      isLoading: reactQueryResult.isLoading,
      error: reactQueryResult.error,
      refetch: reactQueryResult.refetch,
    };
  }

  return {
    data: convexData,
    isLoading: convexData === undefined,
    error: null,
    refetch: () => {},
  };
}
```

### Step 6: Migrate Sidebar Component

**Goal**: Replace Convex query with hybrid hook

**Action**: Update app-sidebar.tsx to use `useConversations`

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/sidebar/app-sidebar.tsx`

**Code**:
```typescript
// src/components/sidebar/app-sidebar.tsx
"use client";

import { useConversations } from "@/lib/hooks/queries/useConversations";
import { useCreateConversation } from "@/lib/hooks/mutations/useCreateConversation";
import { useDeleteConversation } from "@/lib/hooks/mutations/useDeleteConversation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebar() {
  const router = useRouter();

  // Hybrid query (Convex for web, polling for mobile)
  const { data: conversations, isLoading, error } = useConversations();

  // Mutations (from Phase 2)
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

  // Loading state
  if (isLoading) {
    return (
      <aside>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </aside>
    );
  }

  // Error state
  if (error) {
    return (
      <aside>
        <p>Error loading conversations</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </aside>
    );
  }

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

**Changes**:
- ❌ `import { useQuery } from "convex/react"`
- ✅ `import { useConversations } from "@/lib/hooks/queries/useConversations"`
- ❌ `const conversations = useQuery(api.conversations.list, { userId })`
- ✅ `const { data: conversations, isLoading, error } = useConversations()`
- ✅ Added loading/error states (React Query requires explicit handling)

### Step 7: Migrate ChatView Component

**Goal**: Replace Convex messages query with hybrid hook

**Action**: Update ChatView.tsx to use `useMessages`

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/chat/ChatView.tsx`

**Code**:
```typescript
// src/components/chat/ChatView.tsx
"use client";

import { useMessages } from "@/lib/hooks/queries/useMessages";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { Skeleton } from "@/components/ui/skeleton";
import type { Id } from "@/convex/_generated/dataModel";

interface ChatViewProps {
  conversationId: Id<"conversations">;
  modelId: string;
}

export function ChatView({ conversationId, modelId }: ChatViewProps) {
  // Hybrid query
  const { data: messages, isLoading, error } = useMessages(conversationId);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return <div>Error loading messages: {error.message}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages?.map((message) => (
          <ChatMessage key={message._id} message={message} />
        ))}
      </div>

      {/* Input */}
      <ChatInput conversationId={conversationId} modelId={modelId} />
    </div>
  );
}
```

### Step 8: Migrate Settings Component

**Goal**: Replace Convex preferences query with hybrid hook

**Action**: Update UISettings.tsx to use `usePreferences`

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/src/components/settings/UISettings.tsx`

**Code**:
```typescript
// src/components/settings/UISettings.tsx
"use client";

import { usePreferences } from "@/lib/hooks/queries/usePreferences";
import { useUpdatePreferences } from "@/lib/hooks/mutations/useUpdatePreferences";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export function UISettings() {
  const { data: preferences, isLoading } = usePreferences();
  const { mutate: updatePreferences } = useUpdatePreferences();

  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    updatePreferences(
      { theme },
      {
        onSuccess: () => toast.success("Theme updated"),
        onError: () => toast.error("Failed to update theme"),
      }
    );
  };

  const handleSendOnEnterChange = (sendOnEnter: boolean) => {
    updatePreferences({ sendOnEnter });
  };

  if (isLoading) {
    return <div>Loading preferences...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label>Theme</label>
        <Select
          value={preferences?.theme || "system"}
          onValueChange={handleThemeChange}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <label>Send on Enter</label>
        <Switch
          checked={preferences?.sendOnEnter ?? true}
          onCheckedChange={handleSendOnEnterChange}
        />
      </div>
    </div>
  );
}
```

## Code Examples & Patterns

### Pattern 1: Dependent Queries

```typescript
// Fetch conversation, then messages
const { data: conversation } = useConversation(conversationId);
const { data: messages } = useMessages(
  conversation ? conversation._id : null // Only fetch if conversation exists
);
```

### Pattern 2: Infinite Scroll (Pagination)

```typescript
// src/lib/hooks/queries/useInfiniteConversations.ts
import { useInfiniteQuery } from "@tanstack/react-query";

export function useInfiniteConversations() {
  return useInfiniteQuery({
    queryKey: ["conversations", "infinite"],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get(`/conversations?page=${pageParam}&pageSize=20`),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

// Usage in component
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
  useInfiniteConversations();

<InfiniteScroll onLoadMore={fetchNextPage} hasMore={hasNextPage}>
  {data?.pages.flatMap((page) => page.items).map((conv) => (...))}
</InfiniteScroll>
```

### Pattern 3: Manual Refetch

```typescript
// Force refresh on pull-to-refresh
const { data, refetch } = useConversations();

const handleRefresh = async () => {
  await refetch(); // Manual refetch (ignores cache)
  toast.success("Refreshed");
};
```

### Pattern 4: Prefetching

```typescript
// Prefetch conversation when hovering over link
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();

const handleMouseEnter = (id: string) => {
  queryClient.prefetchQuery({
    queryKey: ["messages", id],
    queryFn: () => apiClient.get(`/conversations/${id}/messages`),
  });
};

<Link
  href={`/chat/${conv._id}`}
  onMouseEnter={() => handleMouseEnter(conv._id)}
>
  {conv.title}
</Link>
```

## Testing & Validation

### Manual Testing

**1. Test Web (Convex)**
```bash
# Start dev server
bun dev

# Open DevTools Console
# Run: localStorage.setItem('platform', 'web')
# Reload page

# Expected:
# - Convex WebSocket active (Network > WS)
# - Real-time updates (change DB in Convex dashboard, see instant update)
# - No polling (Network tab quiet)
```

**2. Test Mobile (Polling)**
```bash
# DevTools Console
# Run: localStorage.setItem('platform', 'mobile')
# Reload page

# Expected:
# - No WebSocket connections
# - Polling requests every 10s (GET /api/v1/conversations)
# - React Query DevTools shows refetch intervals
```

**3. Test Loading States**
```bash
# DevTools > Network > Slow 3G
# Navigate to /chat

# Expected:
# - Skeleton loaders appear
# - Data loads progressively
# - No flash of empty state
```

**4. Test Error Handling**
```bash
# DevTools > Network > Offline
# Try loading conversations

# Expected:
# - Error message displayed
# - Retry button works
# - Toast notification appears
```

### Integration Testing

```typescript
// tests/hooks/useConversations.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useConversations } from "@/lib/hooks/queries/useConversations";
import { setMobileMode } from "@/lib/utils/platform";

describe("useConversations", () => {
  it("uses Convex on web", async () => {
    setMobileMode(false);

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    // Should use Convex (data from subscription)
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it("uses polling on mobile", async () => {
    setMobileMode(true);

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    // Should use React Query (data from API)
    await waitFor(() => expect(result.current.data).toBeDefined());

    // Should refetch on interval
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 12000,
    });
  });
});
```

## Success Criteria

- [ ] Platform detection utility created
- [ ] GET /api/v1/user endpoint works
- [ ] 3 hybrid query hooks created (conversations, messages, preferences)
- [ ] app-sidebar.tsx migrated to useConversations
- [ ] ChatView.tsx migrated to useMessages
- [ ] UISettings.tsx migrated to usePreferences
- [ ] Web: Convex subscriptions still work (real-time)
- [ ] Mobile: Polling works (5-10s intervals)
- [ ] Loading/error states handled
- [ ] React Query DevTools shows polling

## Common Pitfalls

### Pitfall 1: Polling Too Aggressively
**Problem**: 1s interval drains battery, wastes bandwidth
**Solution**: Use 5-10s intervals, tune based on data type

### Pitfall 2: Not Disabling Query on Web
**Problem**: Both Convex and React Query run, duplicate requests
**Solution**: Use `enabled: isMobile` in React Query config

### Pitfall 3: Flash of Empty State
**Problem**: Query returns `undefined` initially, shows "No conversations"
**Solution**: Check `isLoading` before rendering empty state

### Pitfall 4: Stale Data on Page Load
**Problem**: Cached data shown, but outdated
**Solution**: Set `staleTime` shorter than `refetchInterval`

### Pitfall 5: Race Conditions
**Problem**: Mutation completes, but query hasn't refetched yet
**Solution**: Call `queryClient.invalidateQueries()` in mutation `onSuccess`

## Next Steps

After completing Phase 3:

**Immediate next**: [Phase 4: Actions](./phase-4-actions.md)
- Wrap long-running operations (search, memories, transcription)
- No timeout issues (Convex actions are 10min, route handlers are 60s+)
- Pattern: POST /actions/search, return job ID, poll for result

**Testing checklist before Phase 4**:
1. 3 hybrid query hooks work ✅
2. Web uses Convex (WebSocket active) ✅
3. Mobile uses polling (HTTP requests every 10s) ✅
4. Loading/error states display correctly ✅
5. React Query DevTools shows queries ✅
6. Platform detection works ✅
7. No duplicate requests ✅

**Components migrated** (Phase 3 complete):
- ✅ ChatInput.tsx (Phase 2 - mutations)
- ✅ app-sidebar.tsx (Phase 2+3 - mutations + queries)
- ✅ ChatView.tsx (Phase 3 - queries)
- ✅ UISettings.tsx (Phase 3 - queries)

Ready for Phase 4: Actions (wrap search, memories, transcription for mobile).
