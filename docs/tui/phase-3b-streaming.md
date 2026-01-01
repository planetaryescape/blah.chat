# Phase 3B: Streaming Responses

## Context

blah.chat is building a Terminal UI (TUI) client using Ink (React for CLI). This phase improves the chat experience by showing AI responses as they stream in, character by character.

### Project Background

- **Framework**: Ink (React for CLI) - same as Claude Code
- **Streaming Architecture**: Server updates `partialContent` every ~100ms
- **Current State**: Messages appear all at once (Phase 3A)

### What Came Before

- **Phase 3A**: Send messages, see responses (but not streaming)
- **Phase 2A-2B**: Conversation and message viewing

### What Comes After

- **Phase 4A**: Conversation management (new chat, model selector)
- **Phase 4B**: Search and settings

## Goal

Implement streaming response display:
- Poll `partialContent` during generation
- Show characters as they arrive
- Smooth visual update
- Handle generation completion

**Success criteria**: Watch response stream character by character like ChatGPT.

## Prerequisites

- Phase 3A complete (sending messages works)
- Backend updates `partialContent` during generation

## Architecture

### How Streaming Works

1. User sends message → server creates assistant message with `status: "pending"`
2. Server starts LLM generation → updates `status: "generating"`
3. Every ~100ms, server updates `partialContent` with new text
4. Client polls message every 100ms, renders `partialContent`
5. When complete → `status: "complete"`, `content` has full text

```
Message Status Flow:
pending → generating (partialContent updates) → complete
```

## Implementation

### Step 1: Create Streaming Hook

Create `apps/cli/src/hooks/use-streaming-message.ts`:

```typescript
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient, queryKeys } from "@blah-chat/hooks";

interface StreamingMessage {
  _id: string;
  status: "pending" | "generating" | "complete" | "stopped" | "error";
  content: string;
  partialContent?: string;
  partialReasoning?: string;
}

interface UseStreamingMessageOptions {
  messageId: string;
  enabled?: boolean;
  onComplete?: (message: StreamingMessage) => void;
}

export function useStreamingMessage({
  messageId,
  enabled = true,
  onComplete,
}: UseStreamingMessageOptions) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [isStreaming, setIsStreaming] = useState(false);

  const query = useQuery({
    queryKey: ["message", messageId],
    queryFn: async () => {
      const response = await apiClient.get<StreamingMessage>(
        `/api/v1/messages/${messageId}`
      );
      return response;
    },
    enabled: enabled && !!messageId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 100; // Poll while loading

      // Poll every 100ms while generating
      if (data.status === "generating" || data.status === "pending") {
        return 100;
      }

      // Stop polling when complete
      return false;
    },
    staleTime: 0, // Always fetch fresh during streaming
  });

  // Track streaming state
  useEffect(() => {
    if (query.data?.status === "generating") {
      setIsStreaming(true);
    } else if (query.data?.status === "complete" && isStreaming) {
      setIsStreaming(false);
      onCompleteRef.current?.(query.data);

      // Invalidate messages list to get final version
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.all,
      });
    }
  }, [query.data?.status, isStreaming, queryClient]);

  return {
    message: query.data,
    isStreaming,
    isLoading: query.isLoading,
    error: query.error,
    displayContent: query.data?.partialContent || query.data?.content || "",
    displayReasoning: query.data?.partialReasoning || "",
  };
}
```

### Step 2: Create Streaming Message Component

Create `apps/cli/src/components/streaming-message.tsx`:

```typescript
import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useStreamingMessage } from "../hooks/use-streaming-message.js";
import { formatRelativeTime } from "../lib/utils.js";

interface StreamingMessageProps {
  messageId: string;
  model?: string;
  createdAt: number;
  onComplete?: () => void;
}

export function StreamingMessage({
  messageId,
  model,
  createdAt,
  onComplete,
}: StreamingMessageProps) {
  const {
    message,
    isStreaming,
    isLoading,
    displayContent,
    displayReasoning,
  } = useStreamingMessage({
    messageId,
    onComplete: onComplete ? () => onComplete() : undefined,
  });

  const status = message?.status || "pending";
  const isPending = status === "pending";
  const isGenerating = status === "generating";
  const isComplete = status === "complete";
  const isError = status === "error";

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header */}
      <Box>
        <Text bold color="blue">
          {getModelDisplayName(model)}
        </Text>
        <Text dimColor> · {formatRelativeTime(createdAt)}</Text>

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

      {/* Reasoning (if available) */}
      {displayReasoning && (
        <Box paddingLeft={2} marginBottom={1}>
          <Text dimColor italic>
            💭 {displayReasoning.slice(0, 300)}
            {displayReasoning.length > 300 ? "..." : ""}
          </Text>
        </Box>
      )}

      {/* Content */}
      <Box paddingLeft={2}>
        {isError ? (
          <Text color="red">Failed to generate response.</Text>
        ) : isPending && !displayContent ? (
          <Text dimColor>...</Text>
        ) : (
          <Text wrap="wrap">
            {displayContent}
            {isGenerating && <Text color="cyan">▊</Text>}
          </Text>
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

### Step 3: Update Message List with Streaming

Update `apps/cli/src/components/message-list.tsx`:

```typescript
import React, { useMemo } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useMessages, type Message, type OptimisticMessage } from "@blah-chat/hooks";
import { MessageItem } from "./message.js";
import { StreamingMessage } from "./streaming-message.js";

interface MessageListProps {
  conversationId: string;
  optimisticMessages?: OptimisticMessage[];
  scrollOffset?: number;
  onStreamingComplete?: () => void;
}

export function MessageList({
  conversationId,
  optimisticMessages = [],
  scrollOffset = 0,
  onStreamingComplete,
}: MessageListProps) {
  const { data: messages, isLoading, error, refetch } = useMessages({
    conversationId,
    refetchInterval: (query) => {
      const data = query.state.data as Message[] | undefined;
      const hasGenerating = data?.some(
        (m) => m.status === "generating" || m.status === "pending"
      );
      return hasGenerating ? 500 : false; // Slower poll for list, detailed poll in StreamingMessage
    },
  });

  // Find messages that are currently generating
  const generatingMessages = useMemo(() => {
    if (!messages) return [];
    return messages.filter(
      (m) => m.status === "generating" || m.status === "pending"
    );
  }, [messages]);

  // Completed messages (not generating)
  const completedMessages = useMemo(() => {
    if (!messages) return [];
    return messages.filter(
      (m) => m.status !== "generating" && m.status !== "pending"
    );
  }, [messages]);

  // Filter out optimistic messages that have real counterparts
  const pendingOptimistic = useMemo(() => {
    if (!messages) return optimisticMessages;

    return optimisticMessages.filter((om) => {
      // Check if there's a matching real message
      const hasMatch = messages.some(
        (m) =>
          m.role === om.role &&
          m.content === om.content &&
          Math.abs(m.createdAt - om.createdAt) < 5000
      );
      return !hasMatch;
    });
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

  const allCompleted = [...completedMessages];
  const visibleCompleted = allCompleted.slice(-15 + scrollOffset);

  return (
    <Box flexDirection="column">
      {/* Completed messages */}
      {visibleCompleted.map((message) => (
        <MessageItem key={message._id} message={message} />
      ))}

      {/* Optimistic messages */}
      {pendingOptimistic.map((message) => (
        <MessageItem key={message._id} message={message as Message} />
      ))}

      {/* Streaming messages - rendered with dedicated component */}
      {generatingMessages.map((message) => (
        <StreamingMessage
          key={message._id}
          messageId={message._id}
          model={message.model}
          createdAt={message.createdAt}
          onComplete={() => {
            refetch();
            onStreamingComplete?.();
          }}
        />
      ))}
    </Box>
  );
}
```

### Step 4: Update Chat View

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
        // Clear optimistic messages - real ones will appear from server
        clearOptimisticMessages();
      } catch (error) {
        console.error("Failed to send message:", error);
        clearOptimisticMessages();
        setIsWaitingForResponse(false);
      }
    },
    [conversationId, conversation?.model, sendMessage, clearOptimisticMessages]
  );

  const handleStreamingComplete = useCallback(() => {
    setIsWaitingForResponse(false);
  }, []);

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
          onStreamingComplete={handleStreamingComplete}
        />
      </Box>

      {/* Input */}
      <ChatInput
        onSubmit={handleSendMessage}
        isDisabled={isWaitingForResponse || sendMessage.isPending}
        placeholder={
          isWaitingForResponse
            ? "Generating response..."
            : "Type a message..."
        }
      />

      {/* Footer */}
      <Box paddingX={1}>
        <Text dimColor>Enter:send  Esc:back</Text>
      </Box>
    </Box>
  );
}
```

### Step 5: Add Cursor Animation

The streaming message shows a blinking cursor (`▊`) while generating. The cursor is rendered directly in the component.

For a more sophisticated animation, you could add:

```typescript
// In streaming-message.tsx
import { useState, useEffect } from "react";

function useCursorBlink(enabled: boolean) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, 500);

    return () => clearInterval(interval);
  }, [enabled]);

  return visible;
}

// In component:
const cursorVisible = useCursorBlink(isGenerating);

// In render:
{isGenerating && cursorVisible && <Text color="cyan">▊</Text>}
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
2. Send a message
3. Watch response stream in character by character
4. See cursor blink while generating
5. Cursor disappears when complete
6. Input re-enables

## Files Created

```
apps/cli/src/
├── hooks/
│   └── use-streaming-message.ts
└── components/
    └── streaming-message.tsx
```

## Files Modified

```
apps/cli/src/components/message-list.tsx (separate streaming messages)
apps/cli/src/components/chat-view.tsx (handle streaming completion)
```

## Checklist

- [ ] Create `useStreamingMessage` hook with polling
- [ ] Create `StreamingMessage` component
- [ ] Add cursor animation while generating
- [ ] Update `MessageList` to render streaming separately
- [ ] Update `ChatView` to handle completion
- [ ] Invalidate queries on completion
- [ ] Handle reasoning display (for thinking models)
- [ ] Test full streaming flow

## Testing

1. Open conversation
2. Send a message
3. Verify response streams in (not all at once)
4. Verify cursor blinks during generation
5. Verify cursor disappears when done
6. Verify input re-enables
7. Test with different models
8. Test with thinking models (should show reasoning)

## Performance Notes

- Polling at 100ms is acceptable for streaming
- Server updates `partialContent` every ~100ms
- Total latency: ~200ms worst case
- Much better than waiting for full response

## Next Phase

After this phase, proceed to [Phase 4A: Conversation Management](./phase-4a-conversation-management.md) to add new chat and model selection.
