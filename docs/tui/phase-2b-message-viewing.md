# Phase 2B: Message Viewing

## Context

blah.chat is building a Terminal UI (TUI) client using Ink (React for CLI). This phase adds the ability to select a conversation and view its messages.

### Project Background

- **Framework**: Ink (React for CLI) - same as Claude Code
- **Shared Hooks**: `@blah-chat/hooks` package
- **Current State**: Can display conversation list (Phase 2A)

### What Came Before

- **Phase 1A**: Created shared hooks package
- **Phase 1B**: CLI scaffold with authentication
- **Phase 2A**: Conversation list display with navigation

### What Comes After

- **Phase 3A**: Send messages
- **Phase 3B**: Streaming responses

## Goal

Add message viewing functionality:
- Extract `useMessages` hook to shared package
- Create message list component
- Navigate between conversation list and chat view
- Display messages with proper formatting

**Success criteria**: Select conversation → see messages → press Esc to go back.

## Prerequisites

- Phase 2A complete (conversation list works)
- Have conversations with messages in web app

## Implementation

### Step 1: Add useMessages to Shared Hooks

Create `packages/hooks/src/queries/useMessages.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../client/useApiClient.js";
import { queryKeys } from "../utils/queryKeys.js";

export interface Message {
  _id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  status: "pending" | "generating" | "complete" | "stopped" | "error";
  model?: string;
  partialContent?: string;
  partialReasoning?: string;
  reasoning?: string;
  createdAt: number;
  updatedAt: number;
  generationStartedAt?: number;
  generationCompletedAt?: number;
}

export interface UseMessagesOptions {
  conversationId: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export function useMessages(options: UseMessagesOptions) {
  const { conversationId, enabled = true, refetchInterval } = options;
  const apiClient = useApiClient();

  return useQuery({
    queryKey: queryKeys.messages.list(conversationId),
    queryFn: async () => {
      const url = `/api/v1/conversations/${conversationId}/messages`;
      return apiClient.get<Message[]>(url);
    },
    enabled: enabled && !!conversationId,
    staleTime: 10_000, // 10 seconds
    refetchInterval, // For polling during generation
  });
}
```

Update `packages/hooks/src/index.ts`:

```typescript
// ... existing exports ...

// Add to queries
export { useMessages } from "./queries/useMessages.js";
export type { Message, UseMessagesOptions } from "./queries/useMessages.js";
```

Rebuild shared hooks:

```bash
cd packages/hooks && bun run build
```

### Step 2: Create Message Component

Create `apps/cli/src/components/message.tsx`:

```typescript
import React from "react";
import { Box, Text } from "ink";
import type { Message } from "@blah-chat/hooks";
import { formatRelativeTime } from "../lib/utils.js";

interface MessageItemProps {
  message: Message;
  isLastAssistant?: boolean;
}

export function MessageItem({ message, isLastAssistant }: MessageItemProps) {
  const isUser = message.role === "user";
  const isGenerating = message.status === "generating";
  const content = isGenerating
    ? message.partialContent || ""
    : message.content;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header */}
      <Box>
        <Text bold color={isUser ? "green" : "blue"}>
          {isUser ? "You" : getModelDisplayName(message.model)}
        </Text>
        <Text dimColor> · {formatRelativeTime(message.createdAt)}</Text>
        {isGenerating && (
          <Text color="yellow"> (generating...)</Text>
        )}
      </Box>

      {/* Content */}
      <Box paddingLeft={2} flexDirection="column">
        {message.reasoning && (
          <Box marginBottom={1}>
            <Text dimColor italic>
              💭 {message.reasoning.slice(0, 200)}
              {message.reasoning.length > 200 ? "..." : ""}
            </Text>
          </Box>
        )}
        <Text wrap="wrap">{content || <Text dimColor>(empty)</Text>}</Text>
      </Box>
    </Box>
  );
}

function getModelDisplayName(modelId?: string): string {
  if (!modelId) return "Assistant";

  const shortNames: Record<string, string> = {
    "openai:gpt-4o": "GPT-4o",
    "openai:gpt-4o-mini": "GPT-4o mini",
    "anthropic:claude-3-5-sonnet-20241022": "Claude Sonnet",
    "anthropic:claude-3-opus-20240229": "Claude Opus",
    "google:gemini-2.0-flash-exp": "Gemini Flash",
  };

  return shortNames[modelId] || modelId.split(":").pop() || "Assistant";
}
```

### Step 3: Create Message List Component

Create `apps/cli/src/components/message-list.tsx`:

```typescript
import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useMessages, type Message } from "@blah-chat/hooks";
import { MessageItem } from "./message.js";

interface MessageListProps {
  conversationId: string;
  scrollOffset?: number;
}

export function MessageList({
  conversationId,
  scrollOffset = 0,
}: MessageListProps) {
  // Poll every 100ms if there's a generating message
  const { data: messages, isLoading, error } = useMessages({
    conversationId,
    refetchInterval: (query) => {
      const data = query.state.data as Message[] | undefined;
      const hasGenerating = data?.some((m) => m.status === "generating");
      return hasGenerating ? 100 : false;
    },
  });

  if (isLoading) {
    return (
      <Box>
        <Spinner type="dots" />
        <Text> Loading messages...</Text>
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

  if (!messages || messages.length === 0) {
    return (
      <Box>
        <Text dimColor>No messages yet. Start typing to begin.</Text>
      </Box>
    );
  }

  // Simple pagination: show last N messages based on terminal height
  // In a real implementation, you'd use ink-scroll-area
  const visibleMessages = messages.slice(-20 + scrollOffset);

  return (
    <Box flexDirection="column">
      {visibleMessages.map((message, index) => (
        <MessageItem
          key={message._id}
          message={message}
          isLastAssistant={
            message.role === "assistant" &&
            index === visibleMessages.length - 1
          }
        />
      ))}
    </Box>
  );
}
```

### Step 4: Create Chat View Component

Create `apps/cli/src/components/chat-view.tsx`:

```typescript
import React from "react";
import { Box, Text, useInput } from "ink";
import { MessageList } from "./message-list.js";
import { useConversations } from "@blah-chat/hooks";

interface ChatViewProps {
  conversationId: string;
  onBack: () => void;
}

export function ChatView({ conversationId, onBack }: ChatViewProps) {
  const { data: conversations } = useConversations();
  const conversation = conversations?.find((c) => c._id === conversationId);

  useInput((input, key) => {
    if (key.escape || (input === "q" && !key.ctrl)) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box
        borderStyle="single"
        borderBottom
        borderTop={false}
        borderLeft={false}
        borderRight={false}
        paddingX={1}
      >
        <Text bold>{conversation?.title || "Chat"}</Text>
        <Text dimColor> · {conversation?.model}</Text>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        <MessageList conversationId={conversationId} />
      </Box>

      {/* Footer - placeholder for input */}
      <Box
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        paddingX={1}
      >
        <Text dimColor>
          Esc:back  (input coming in Phase 3A)
        </Text>
      </Box>
    </Box>
  );
}
```

### Step 5: Update Chat App with View Switching

Update `apps/cli/src/commands/chat.tsx`:

```typescript
import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { AppProviders } from "../providers/index.js";
import { ConversationList } from "../components/conversation-list.js";
import { ChatView } from "../components/chat-view.js";
import { useCLIAuth } from "../providers/index.js";
import { useConversations } from "@blah-chat/hooks";

type View = "list" | "chat";

function ChatAppInner() {
  const { exit } = useApp();
  const { isAuthenticated, credentials } = useCLIAuth();
  const { data: conversations } = useConversations();

  const [view, setView] = useState<View>("list");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  useInput((input, key) => {
    // Only handle input when in list view
    if (view !== "list") return;

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

    // Select conversation
    if (key.return && conversations?.[selectedIndex]) {
      setSelectedConversationId(conversations[selectedIndex]._id);
      setView("chat");
    }
  });

  const handleBackToList = () => {
    setView("list");
    setSelectedConversationId(null);
  };

  if (!isAuthenticated) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">Not logged in</Text>
        <Text dimColor>Run: blah login</Text>
      </Box>
    );
  }

  // Chat view
  if (view === "chat" && selectedConversationId) {
    return <ChatView conversationId={selectedConversationId} onBack={handleBackToList} />;
  }

  // List view
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
      <Box
        marginTop={1}
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      >
        <Text dimColor>j/k:navigate  Enter:select  n:new  q:quit</Text>
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

### Step 6: Test

```bash
# Rebuild shared hooks
cd packages/hooks && bun run build

# Rebuild CLI
cd apps/cli && bun run build

# Run
blah
```

Test flow:
1. See conversation list
2. Navigate with j/k
3. Press Enter to select
4. See messages
5. Press Esc to go back

## Files Created

```
packages/hooks/src/queries/useMessages.ts

apps/cli/src/components/
├── message.tsx
├── message-list.tsx
└── chat-view.tsx
```

## Files Modified

```
packages/hooks/src/index.ts (add useMessages export)
apps/cli/src/commands/chat.tsx (add view switching)
```

## Checklist

- [ ] Create `useMessages` hook in shared package
- [ ] Export from package index
- [ ] Rebuild shared hooks package
- [ ] Create `MessageItem` component
- [ ] Create `MessageList` component with polling
- [ ] Create `ChatView` component
- [ ] Update `ChatApp` with view switching
- [ ] Handle keyboard navigation (Esc to go back)
- [ ] Handle loading state
- [ ] Handle error state
- [ ] Handle empty state
- [ ] Test with real conversations

## Testing

1. Open CLI with `blah`
2. Select a conversation with messages
3. Verify messages display correctly
4. Verify user messages show "You"
5. Verify assistant messages show model name
6. Verify timestamps are relative
7. Press Esc to return to list
8. Verify you're back at the list

## Next Phase

After this phase, proceed to [Phase 3A: Send Messages](./phase-3a-send-messages.md) to add the ability to send new messages.
