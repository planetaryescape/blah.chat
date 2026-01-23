# Phase 3A: Send Messages

## Context

blah.chat is building a Terminal UI (TUI) client using Ink (React for CLI). This phase adds the ability to send messages and receive responses.

### Project Background

- **Framework**: Ink (React for CLI) - same as Claude Code
- **Shared Hooks**: `@blah-chat/hooks` with `useSendMessage`
- **Current State**: Can view conversations and messages (Milestone 2)

### What Came Before

- **Phase 1A-1B**: Foundation (shared hooks, CLI auth)
- **Phase 2A-2B**: Read-only chat (conversation list, message viewing)

### What Comes After

- **Phase 3B**: Streaming responses (poll partialContent)
- **Phase 4A**: Conversation management (new chat, model selector)

## Goal

Add message sending capability:
- Create text input component
- Wire up `useSendMessage` hook
- Show optimistic user message
- Poll for assistant response

**Success criteria**: Type message → send → see response appear.

## Prerequisites

- Phase 2B complete (message viewing works)
- `useSendMessage` hook exists in shared package (Phase 1A)

## Implementation

### Step 1: Create Text Input Component

Create `apps/cli/src/components/chat-input.tsx`:

```typescript
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  isDisabled = false,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(true);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed && !isDisabled) {
      onSubmit(trimmed);
      setValue("");
    }
  };

  useInput((input, key) => {
    if (key.return && !key.shift) {
      handleSubmit();
    }
  });

  return (
    <Box
      borderStyle="single"
      borderColor={isFocused ? "cyan" : "gray"}
      paddingX={1}
    >
      {isDisabled ? (
        <Text dimColor>Waiting for response...</Text>
      ) : (
        <Box>
          <Text color="cyan">❯ </Text>
          <TextInput
            value={value}
            onChange={setValue}
            placeholder={placeholder}
            focus={isFocused}
          />
        </Box>
      )}
    </Box>
  );
}
```

### Step 2: Create Optimistic Message Handler

Create `apps/cli/src/hooks/use-optimistic-messages.ts`:

```typescript
import { useState, useCallback } from "react";
import type { OptimisticMessage } from "@blah-chat/hooks";

export function useOptimisticMessages() {
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);

  const addOptimisticMessages = useCallback((messages: OptimisticMessage[]) => {
    setOptimisticMessages((prev) => [...prev, ...messages]);
  }, []);

  const clearOptimisticMessages = useCallback(() => {
    setOptimisticMessages([]);
  }, []);

  const removeOptimisticMessage = useCallback((id: string) => {
    setOptimisticMessages((prev) => prev.filter((m) => m._id !== id));
  }, []);

  return {
    optimisticMessages,
    addOptimisticMessages,
    clearOptimisticMessages,
    removeOptimisticMessage,
  };
}
```

### Step 3: Update Message List to Include Optimistic Messages

Update `apps/cli/src/components/message-list.tsx`:

```typescript
import React, { useMemo } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useMessages, type Message, type OptimisticMessage } from "@blah-chat/hooks";
import { MessageItem } from "./message.js";

interface MessageListProps {
  conversationId: string;
  optimisticMessages?: OptimisticMessage[];
  scrollOffset?: number;
}

export function MessageList({
  conversationId,
  optimisticMessages = [],
  scrollOffset = 0,
}: MessageListProps) {
  const { data: messages, isLoading, error } = useMessages({
    conversationId,
    refetchInterval: (query) => {
      const data = query.state.data as Message[] | undefined;
      const hasGenerating = data?.some((m) => m.status === "generating");
      // Also poll if we have optimistic messages waiting for real data
      return hasGenerating || optimisticMessages.length > 0 ? 100 : false;
    },
  });

  // Merge real messages with optimistic ones
  const allMessages = useMemo(() => {
    if (!messages) return optimisticMessages as Message[];

    // Filter out optimistic messages that now have real counterparts
    const realIds = new Set(messages.map((m) => m._id));
    const pendingOptimistic = optimisticMessages.filter(
      (m) => !realIds.has(m._id) && !m._id.startsWith("temp-")
    );

    // For temp IDs, check if we have a real message with same content
    const filteredOptimistic = optimisticMessages.filter((om) => {
      if (!om._id.startsWith("temp-")) return false;

      // Check if there's a matching real message
      const hasMatch = messages.some(
        (m) =>
          m.role === om.role &&
          m.content === om.content &&
          Math.abs(m.createdAt - om.createdAt) < 5000
      );
      return !hasMatch;
    });

    return [...messages, ...filteredOptimistic] as Message[];
  }, [messages, optimisticMessages]);

  if (isLoading && !optimisticMessages.length) {
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

  if (allMessages.length === 0) {
    return (
      <Box>
        <Text dimColor>No messages yet. Start typing to begin.</Text>
      </Box>
    );
  }

  const visibleMessages = allMessages.slice(-20 + scrollOffset);

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

### Step 4: Update Chat View with Input

Update `apps/cli/src/components/chat-view.tsx`:

```typescript
import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { MessageList } from "./message-list.js";
import { ChatInput } from "./chat-input.js";
import { useOptimisticMessages } from "../hooks/use-optimistic-messages.js";
import { useConversations, useSendMessage, type OptimisticMessage } from "@blah-chat/hooks";

interface ChatViewProps {
  conversationId: string;
  onBack: () => void;
}

export function ChatView({ conversationId, onBack }: ChatViewProps) {
  const { data: conversations } = useConversations();
  const conversation = conversations?.find((c) => c._id === conversationId);

  const {
    optimisticMessages,
    addOptimisticMessages,
    clearOptimisticMessages,
  } = useOptimisticMessages();

  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  const sendMessage = useSendMessage({
    onOptimisticUpdate: (messages: OptimisticMessage[]) => {
      addOptimisticMessages(messages);
      setIsWaitingForResponse(true);
    },
  });

  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        await sendMessage.mutateAsync({
          conversationId,
          content,
          modelId: conversation?.model,
        });
        // Clear optimistic messages after successful send
        // Real messages will appear from server
        setTimeout(() => {
          clearOptimisticMessages();
          setIsWaitingForResponse(false);
        }, 500);
      } catch (error) {
        console.error("Failed to send message:", error);
        clearOptimisticMessages();
        setIsWaitingForResponse(false);
      }
    },
    [conversationId, conversation?.model, sendMessage, clearOptimisticMessages]
  );

  useInput((input, key) => {
    if (key.escape) {
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
        <MessageList
          conversationId={conversationId}
          optimisticMessages={optimisticMessages}
        />
      </Box>

      {/* Input */}
      <ChatInput
        onSubmit={handleSendMessage}
        isDisabled={isWaitingForResponse || sendMessage.isPending}
        placeholder={
          isWaitingForResponse
            ? "Waiting for response..."
            : "Type a message..."
        }
      />

      {/* Footer */}
      <Box paddingX={1}>
        <Text dimColor>
          Enter:send  Esc:back
          {sendMessage.isPending && "  Sending..."}
        </Text>
      </Box>
    </Box>
  );
}
```

### Step 5: Handle Message Errors

Update `apps/cli/src/components/message.tsx` to show error states:

```typescript
import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { Message } from "@blah-chat/hooks";
import { formatRelativeTime } from "../lib/utils.js";

interface MessageItemProps {
  message: Message;
  isLastAssistant?: boolean;
}

export function MessageItem({ message, isLastAssistant }: MessageItemProps) {
  const isUser = message.role === "user";
  const isGenerating = message.status === "generating";
  const isPending = message.status === "pending";
  const isError = message.status === "error";
  const isOptimistic = (message as any)._optimistic;

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
        {isOptimistic && <Text color="yellow"> (sending...)</Text>}
        {isPending && (
          <Box marginLeft={1}>
            <Spinner type="dots" />
            <Text color="yellow"> thinking...</Text>
          </Box>
        )}
        {isGenerating && (
          <Box marginLeft={1}>
            <Spinner type="dots" />
            <Text color="cyan"> generating...</Text>
          </Box>
        )}
        {isError && <Text color="red"> (error)</Text>}
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
        {isError ? (
          <Text color="red">Failed to generate response. Try again.</Text>
        ) : isPending ? (
          <Text dimColor>...</Text>
        ) : (
          <Text wrap="wrap">{content || <Text dimColor>(empty)</Text>}</Text>
        )}
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

### Step 6: Test

```bash
# Rebuild CLI
cd apps/cli && bun run build

# Run
blah
```

Test flow:
1. Select a conversation
2. Type a message in input
3. Press Enter
4. See "sending..." indicator
5. See user message appear
6. See "thinking..." indicator
7. See response start appearing
8. See final response

## Files Created

```
apps/cli/src/
├── components/
│   └── chat-input.tsx
└── hooks/
    └── use-optimistic-messages.ts
```

## Files Modified

```
apps/cli/src/components/message-list.tsx (add optimistic message support)
apps/cli/src/components/chat-view.tsx (add input and send logic)
apps/cli/src/components/message.tsx (add status indicators)
```

## Checklist

- [ ] Create `ChatInput` component with text input
- [ ] Create `useOptimisticMessages` hook
- [ ] Update `MessageList` to merge optimistic messages
- [ ] Update `ChatView` with input and send logic
- [ ] Update `MessageItem` with status indicators
- [ ] Handle sending state (disable input)
- [ ] Handle optimistic user message display
- [ ] Handle pending assistant message
- [ ] Handle error state
- [ ] Test full send flow

## Testing

1. Open conversation with `blah`
2. Type a message
3. Press Enter
4. Verify message appears immediately (optimistic)
5. Verify assistant message shows "thinking..."
6. Verify response eventually appears
7. Verify input re-enables after response

## Known Limitations

- Response appears all at once (streaming in Phase 3B)
- No retry on error
- No multiline input

## Next Phase

After this phase, proceed to [Phase 3B: Streaming Responses](./phase-3b-streaming.md) to show responses character by character.
