# Phase 2A: Convex Integration

## Context

blah.chat is building a Terminal UI (TUI) client using Ink (React for CLI). This phase wires up the shared hooks to fetch and display conversation data from Convex.

### Project Background

- **Framework**: Ink (React for CLI) - same as Claude Code
- **Shared Hooks**: `@blah-chat/hooks` package (Phase 1A)
- **CLI App**: Created in Phase 1B with authentication
- **Backend**: Convex real-time database

### What Came Before

- **Phase 1A**: Created `@blah-chat/hooks` with `useConversations`
- **Phase 1B**: CLI scaffold with `blah login/logout/whoami`

### What Comes After

- **Phase 2B**: Message viewing with conversation selection
- **Phase 3A**: Send messages

## Goal

Wire up shared hooks to CLI and display conversation list:
- Set up React Query provider for Ink
- Create CLI-specific auth context
- Display conversation list in terminal
- Handle loading/error states

**Success criteria**: Run `blah`, see list of conversations from your account.

## Prerequisites

- Phase 1A complete (`@blah-chat/hooks` exists)
- Phase 1B complete (CLI with auth works)
- Logged in via `blah login`

## Implementation

### Step 1: Create Query Provider

Create `apps/cli/src/providers/query-provider.tsx`:

```typescript
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      retry: 2,
      refetchOnWindowFocus: false, // No window in terminal
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };
```

### Step 2: Create CLI Auth Provider

Create `apps/cli/src/providers/auth-provider.tsx`:

```typescript
import React, { createContext, useContext, useMemo } from "react";
import { AuthContext } from "@blah-chat/hooks";
import { getCredentials, Credentials } from "../lib/auth.js";

interface CLIAuthContextValue {
  credentials: Credentials | null;
  isAuthenticated: boolean;
}

const CLIAuthContext = createContext<CLIAuthContextValue | null>(null);

export function useCLIAuth() {
  const context = useContext(CLIAuthContext);
  if (!context) {
    throw new Error("useCLIAuth must be used within CLIAuthProvider");
  }
  return context;
}

interface CLIAuthProviderProps {
  children: React.ReactNode;
}

export function CLIAuthProvider({ children }: CLIAuthProviderProps) {
  const credentials = getCredentials();
  const isAuthenticated = credentials !== null;

  // Create the shared hooks auth context
  const authContextValue = useMemo(
    () => ({
      getToken: async () => credentials?.token ?? null,
      isAuthenticated,
    }),
    [credentials, isAuthenticated]
  );

  const cliAuthValue = useMemo(
    () => ({
      credentials,
      isAuthenticated,
    }),
    [credentials, isAuthenticated]
  );

  return (
    <CLIAuthContext.Provider value={cliAuthValue}>
      <AuthContext.Provider value={authContextValue}>
        {children}
      </AuthContext.Provider>
    </CLIAuthContext.Provider>
  );
}
```

### Step 3: Create App Provider Wrapper

Create `apps/cli/src/providers/index.tsx`:

```typescript
import React from "react";
import { QueryProvider } from "./query-provider.js";
import { CLIAuthProvider } from "./auth-provider.js";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <CLIAuthProvider>
        {children}
      </CLIAuthProvider>
    </QueryProvider>
  );
}

export { useCLIAuth } from "./auth-provider.js";
export { queryClient } from "./query-provider.js";
```

### Step 4: Create Conversation List Component

Create `apps/cli/src/components/conversation-list.tsx`:

```typescript
import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useConversations } from "@blah-chat/hooks";
import { formatRelativeTime } from "../lib/utils.js";

interface ConversationListProps {
  selectedIndex?: number;
  onSelect?: (conversationId: string) => void;
}

export function ConversationList({
  selectedIndex = 0,
  onSelect,
}: ConversationListProps) {
  const { data: conversations, isLoading, error } = useConversations();

  if (isLoading) {
    return (
      <Box>
        <Spinner type="dots" />
        <Text> Loading conversations...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Text color="red">Error: {error.message}</Text>
      </Box>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No conversations yet</Text>
        <Text dimColor>Press 'n' to start a new chat</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {conversations.map((conv, index) => (
        <ConversationItem
          key={conv._id}
          title={conv.title}
          model={conv.model}
          lastMessageAt={conv.lastMessageAt}
          isSelected={index === selectedIndex}
          isPinned={conv.pinned}
          isStarred={conv.starred}
        />
      ))}
    </Box>
  );
}

interface ConversationItemProps {
  title: string;
  model: string;
  lastMessageAt: number;
  isSelected: boolean;
  isPinned: boolean;
  isStarred: boolean;
}

function ConversationItem({
  title,
  model,
  lastMessageAt,
  isSelected,
  isPinned,
  isStarred,
}: ConversationItemProps) {
  const bgColor = isSelected ? "blue" : undefined;
  const textColor = isSelected ? "white" : undefined;

  return (
    <Box paddingX={1} backgroundColor={bgColor}>
      <Box width={2}>
        {isPinned && <Text>📌</Text>}
        {isStarred && !isPinned && <Text>⭐</Text>}
      </Box>
      <Box flexGrow={1}>
        <Text color={textColor} bold={isSelected}>
          {title.slice(0, 40)}
          {title.length > 40 ? "..." : ""}
        </Text>
      </Box>
      <Box width={12}>
        <Text dimColor color={textColor}>
          {getModelShortName(model)}
        </Text>
      </Box>
      <Box width={10}>
        <Text dimColor color={textColor}>
          {formatRelativeTime(lastMessageAt)}
        </Text>
      </Box>
    </Box>
  );
}

function getModelShortName(modelId: string): string {
  // Extract short name from model ID like "openai:gpt-4o"
  const parts = modelId.split(":");
  const name = parts[parts.length - 1];

  // Shorten common model names
  const shortNames: Record<string, string> = {
    "gpt-4o": "GPT-4o",
    "gpt-4o-mini": "4o-mini",
    "claude-3-5-sonnet-20241022": "Sonnet",
    "claude-3-opus-20240229": "Opus",
    "gemini-2.0-flash-exp": "Gemini",
  };

  return shortNames[name] || name.slice(0, 10);
}
```

### Step 5: Create Utility Functions

Create `apps/cli/src/lib/utils.ts`:

```typescript
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "now";
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
```

### Step 6: Update Chat App Component

Update `apps/cli/src/commands/chat.tsx`:

```typescript
import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { AppProviders } from "../providers/index.js";
import { ConversationList } from "../components/conversation-list.js";
import { useCLIAuth } from "../providers/index.js";
import { useConversations } from "@blah-chat/hooks";

function ChatAppInner() {
  const { exit } = useApp();
  const { isAuthenticated, credentials } = useCLIAuth();
  const { data: conversations } = useConversations();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    // Quit
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }

    // Navigation
    if (input === "j" || key.downArrow) {
      setSelectedIndex((prev) =>
        Math.min(prev + 1, (conversations?.length ?? 1) - 1)
      );
    }
    if (input === "k" || key.upArrow) {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }

    // Select conversation (Enter)
    if (key.return && conversations?.[selectedIndex]) {
      // TODO: Phase 2B - open conversation
      // For now, just log
    }
  });

  if (!isAuthenticated) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">Not logged in</Text>
        <Text dimColor>Run: blah login</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">blah.chat</Text>
        <Text dimColor> — {credentials?.email}</Text>
      </Box>

      {/* Conversation List */}
      <Box flexDirection="column" flexGrow={1}>
        <ConversationList selectedIndex={selectedIndex} />
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false}>
        <Text dimColor>
          j/k:navigate  Enter:select  n:new  q:quit
        </Text>
      </Box>
    </Box>
  );
}

export function ChatApp() {
  return (
    <AppProviders>
      <ChatAppInner />
    </AppProviders>
  );
}
```

### Step 7: Configure Environment

Make sure the CLI can reach the web app API. Update `apps/cli/src/lib/auth.ts` to export the app URL:

```typescript
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
```

Update the API client base URL in the hooks package or pass it via environment.

### Step 8: Test

```bash
# Make sure web app is running
cd apps/web && bun dev

# In another terminal
cd apps/cli && bun run build

# Login if needed
blah login

# Run chat app
blah
```

You should see:
1. Header with "blah.chat" and your email
2. List of conversations with titles, models, timestamps
3. Ability to navigate with j/k or arrow keys
4. Footer with keyboard shortcuts

## Files Created

```
apps/cli/src/
├── providers/
│   ├── index.tsx
│   ├── query-provider.tsx
│   └── auth-provider.tsx
├── components/
│   └── conversation-list.tsx
└── lib/
    └── utils.ts
```

## Files Modified

```
apps/cli/src/commands/chat.tsx (updated with providers and conversation list)
```

## Checklist

- [ ] Create `QueryProvider` with React Query client
- [ ] Create `CLIAuthProvider` that wraps shared `AuthContext`
- [ ] Create `AppProviders` wrapper
- [ ] Create `ConversationList` component
- [ ] Create `formatRelativeTime` utility
- [ ] Update `ChatApp` to use providers and display conversations
- [ ] Handle loading state with spinner
- [ ] Handle error state
- [ ] Handle empty state
- [ ] Implement j/k and arrow key navigation
- [ ] Test with real data from web app

## Testing

1. Ensure web app is running (`bun dev` in apps/web)
2. Create some conversations in web app
3. Run `blah login` if needed
4. Run `blah` to open chat
5. Verify conversations appear
6. Navigate with j/k or arrows
7. Verify selection highlight works
8. Press q to quit

## Next Phase

After this phase, proceed to [Phase 2B: Message Viewing](./phase-2b-message-viewing.md) to add message display when selecting a conversation.
