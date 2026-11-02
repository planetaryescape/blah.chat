# Phase 1A: Shared Hooks Package

## Context

blah.chat is building a Terminal UI (TUI) client using Ink (React for CLI). Since Ink uses React, we can **share hooks between the web app and CLI app**.

This phase extracts pure data-fetching hooks from the web app into a shared `@blah-chat/hooks` package. These hooks have no browser dependencies and work in any React environment.

### Why This Phase First?

This is the foundation for the entire TUI project. By creating shared hooks:
1. CLI app can reuse battle-tested data logic
2. No code duplication between web and CLI
3. Bug fixes apply to both apps
4. Consistent API across platforms

### What Comes After

- **Phase 1B**: CLI scaffold + authentication (uses these hooks)
- **Phase 2A**: Wire hooks to CLI UI (displays data)
- **Phase 3A**: Interactive chat (mutations work)

## Goal

Create `@blah-chat/hooks` package with:
- Injectable auth context (works with Clerk on web, stored token on CLI)
- `useConversations` query hook
- `useSendMessage` mutation hook
- Shared utilities (query keys, types)

**Success criteria**: Web app works exactly as before, importing from new package.

## Prerequisites

- Monorepo already uses Turborepo with `packages/*` workspace
- React Query already installed in web app
- Convex client configured

## Implementation

### Step 1: Create Package Structure

```bash
mkdir -p packages/hooks/src/{client,queries,mutations,utils}
```

Create `packages/hooks/package.json`:

```json
{
  "name": "@blah-chat/hooks",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "convex": "^1.17.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.0.0"
  }
}
```

Create `packages/hooks/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 2: Create Auth Context

The key innovation: auth is injectable, not hardcoded.

Create `packages/hooks/src/client/context.ts`:

```typescript
import { createContext, useContext } from "react";

export interface AuthContext {
  /**
   * Get the current authentication token.
   * Returns null if not authenticated.
   */
  getToken: () => Promise<string | null>;

  /**
   * Check if user is authenticated.
   */
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContext | null>(null);

export function useAuthContext(): AuthContext {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "useAuthContext must be used within AuthContext.Provider. " +
      "Wrap your app with <AuthContext.Provider value={{ getToken, isAuthenticated }}>."
    );
  }
  return context;
}
```

### Step 3: Create API Client Hook

Create `packages/hooks/src/client/useApiClient.ts`:

```typescript
import { useAuthContext } from "./context";

interface FetchOptions extends RequestInit {
  body?: string;
}

interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  error?: string;
}

async function fetchWithAuth<T>(
  url: string,
  options: FetchOptions,
  getToken: () => Promise<string | null>
): Promise<T> {
  const token = await getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const json: ApiResponse<T> = await response.json();

  if (json.status === "error") {
    throw new Error(json.error || "API request failed");
  }

  return json.data as T;
}

export interface ApiClient {
  get: <T>(url: string) => Promise<T>;
  post: <T>(url: string, body?: unknown) => Promise<T>;
  patch: <T>(url: string, body?: unknown) => Promise<T>;
  delete: <T>(url: string) => Promise<T>;
}

export function useApiClient(): ApiClient {
  const { getToken } = useAuthContext();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return {
    get: <T>(url: string) =>
      fetchWithAuth<T>(`${baseUrl}${url}`, { method: "GET" }, getToken),

    post: <T>(url: string, body?: unknown) =>
      fetchWithAuth<T>(
        `${baseUrl}${url}`,
        { method: "POST", body: body ? JSON.stringify(body) : undefined },
        getToken
      ),

    patch: <T>(url: string, body?: unknown) =>
      fetchWithAuth<T>(
        `${baseUrl}${url}`,
        { method: "PATCH", body: body ? JSON.stringify(body) : undefined },
        getToken
      ),

    delete: <T>(url: string) =>
      fetchWithAuth<T>(`${baseUrl}${url}`, { method: "DELETE" }, getToken),
  };
}
```

### Step 4: Create Query Keys Utility

Create `packages/hooks/src/utils/queryKeys.ts`:

```typescript
export const queryKeys = {
  conversations: {
    all: ["conversations"] as const,
    list: (filters?: { archived?: boolean }) =>
      [...queryKeys.conversations.all, "list", filters] as const,
    detail: (id: string) =>
      [...queryKeys.conversations.all, "detail", id] as const,
  },
  messages: {
    all: ["messages"] as const,
    list: (conversationId: string) =>
      [...queryKeys.messages.all, "list", conversationId] as const,
    detail: (id: string) =>
      [...queryKeys.messages.all, "detail", id] as const,
  },
  preferences: {
    all: ["preferences"] as const,
  },
} as const;
```

### Step 5: Create useConversations Hook

Create `packages/hooks/src/queries/useConversations.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../client/useApiClient";
import { queryKeys } from "../utils/queryKeys";

export interface Conversation {
  _id: string;
  title: string;
  model: string;
  pinned: boolean;
  archived: boolean;
  starred: boolean;
  messageCount?: number;
  lastMessageAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface UseConversationsOptions {
  archived?: boolean;
  enabled?: boolean;
}

export function useConversations(options: UseConversationsOptions = {}) {
  const { archived = false, enabled = true } = options;
  const apiClient = useApiClient();

  return useQuery({
    queryKey: queryKeys.conversations.list({ archived }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (archived) params.set("archived", "true");

      const url = `/api/v1/conversations${params.toString() ? `?${params}` : ""}`;
      return apiClient.get<Conversation[]>(url);
    },
    enabled,
    staleTime: 30_000, // 30 seconds
  });
}
```

### Step 6: Create useSendMessage Hook

Create `packages/hooks/src/mutations/useSendMessage.ts`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../client/useApiClient";
import { queryKeys } from "../utils/queryKeys";

export interface SendMessageArgs {
  conversationId: string;
  content: string;
  modelId?: string;
  models?: string[]; // For comparison mode
  thinkingEffort?: "low" | "medium" | "high";
}

export interface SendMessageResult {
  conversationId: string;
  messageId: string;
  assistantMessageIds: string[];
}

export interface UseSendMessageOptions {
  onOptimisticUpdate?: (messages: OptimisticMessage[]) => void;
}

export interface OptimisticMessage {
  _id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  status: "optimistic" | "pending" | "generating" | "complete";
  model?: string;
  createdAt: number;
  _optimistic: boolean;
}

export function useSendMessage(options: UseSendMessageOptions = {}) {
  const { onOptimisticUpdate } = options;
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: SendMessageArgs): Promise<SendMessageResult> => {
      return apiClient.post<SendMessageResult>(
        `/api/v1/conversations/${args.conversationId}/messages`,
        {
          content: args.content,
          modelId: args.modelId,
          models: args.models,
          thinkingEffort: args.thinkingEffort,
        }
      );
    },

    onMutate: (variables) => {
      // Create optimistic user message
      const optimisticUserMsg: OptimisticMessage = {
        _id: `temp-user-${Date.now()}`,
        conversationId: variables.conversationId,
        role: "user",
        content: variables.content,
        status: "optimistic",
        createdAt: Date.now(),
        _optimistic: true,
      };

      // Create optimistic assistant message(s)
      const models = variables.models || [variables.modelId].filter(Boolean);
      const optimisticAssistantMsgs: OptimisticMessage[] = models.map(
        (modelId, idx) => ({
          _id: `temp-assistant-${Date.now()}-${idx}`,
          conversationId: variables.conversationId,
          role: "assistant" as const,
          content: "",
          status: "pending" as const,
          model: modelId,
          createdAt: Date.now(),
          _optimistic: true,
        })
      );

      // Notify caller of optimistic updates
      onOptimisticUpdate?.([optimisticUserMsg, ...optimisticAssistantMsgs]);

      return { optimisticUserMsg, optimisticAssistantMsgs };
    },

    onSuccess: (_data, variables) => {
      // Invalidate to fetch real messages
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.list(variables.conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    },

    onError: (error, variables, context) => {
      console.error("Failed to send message:", error);
      // Could implement retry queue here
    },
  });
}
```

### Step 7: Create Package Index

Create `packages/hooks/src/index.ts`:

```typescript
// Context
export { AuthContext, useAuthContext } from "./client/context";
export type { AuthContext as AuthContextType } from "./client/context";

// Client
export { useApiClient } from "./client/useApiClient";
export type { ApiClient } from "./client/useApiClient";

// Queries
export { useConversations } from "./queries/useConversations";
export type { Conversation, UseConversationsOptions } from "./queries/useConversations";

// Mutations
export { useSendMessage } from "./mutations/useSendMessage";
export type {
  SendMessageArgs,
  SendMessageResult,
  UseSendMessageOptions,
  OptimisticMessage,
} from "./mutations/useSendMessage";

// Utils
export { queryKeys } from "./utils/queryKeys";
```

### Step 8: Update Web App Imports

In the web app, create wrapper that provides Clerk auth:

Create `apps/web/src/lib/hooks/provider.tsx`:

```typescript
"use client";

import { useAuth } from "@clerk/nextjs";
import { AuthContext } from "@blah-chat/hooks";

export function HooksAuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

  const authContext = {
    getToken: async () => {
      const token = await getToken();
      return token;
    },
    isAuthenticated: !!isSignedIn,
  };

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
}
```

Update existing hook files to re-export from shared package:

`apps/web/src/lib/hooks/queries/useConversations.ts`:

```typescript
// Re-export from shared package
export { useConversations } from "@blah-chat/hooks";
export type { Conversation, UseConversationsOptions } from "@blah-chat/hooks";
```

### Step 9: Add to Turborepo

Update root `package.json` to include new package in workspaces (should already be covered by `packages/*`).

Run:
```bash
bun install
cd packages/hooks && bun run build
```

### Step 10: Verify Web App Works

```bash
cd apps/web
bun run build
bun run dev
```

Test:
1. Login to web app
2. View conversation list (uses shared `useConversations`)
3. Send a message (uses shared `useSendMessage`)
4. Verify everything works as before

## Files Created

```
packages/hooks/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── client/
    │   ├── context.ts
    │   └── useApiClient.ts
    ├── queries/
    │   └── useConversations.ts
    ├── mutations/
    │   └── useSendMessage.ts
    └── utils/
        └── queryKeys.ts
```

## Files Modified

```
apps/web/src/lib/hooks/
├── provider.tsx (NEW - wraps AuthContext with Clerk)
└── queries/useConversations.ts (updated to re-export)
```

## Checklist

- [ ] Create `packages/hooks/` directory structure
- [ ] Create `package.json` with dependencies
- [ ] Create `tsconfig.json` for TypeScript
- [ ] Implement `AuthContext` for injectable auth
- [ ] Implement `useApiClient` with auth injection
- [ ] Implement `queryKeys` utility
- [ ] Implement `useConversations` hook
- [ ] Implement `useSendMessage` hook
- [ ] Create package index with exports
- [ ] Create `HooksAuthProvider` in web app
- [ ] Update web app imports to use shared package
- [ ] Run `bun install` to link workspace
- [ ] Build shared package
- [ ] Verify web app works correctly

## Next Phase

After this phase, proceed to [Phase 1B: CLI Scaffold + Auth](./phase-1b-cli-scaffold.md) to create the CLI application that uses these shared hooks.
