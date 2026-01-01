/**
 * MessageList Component - Scrollable message display
 *
 * Features:
 * - Auto-scroll to bottom on load
 * - Keyboard navigation (j/k, arrows)
 * - Shows generating/error states
 */

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { useEffect, useState } from "react";
import { useListNavigation } from "../hooks/useListNavigation.js";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import {
  type Conversation,
  getConversation,
  listMessages,
  type Message as MessageType,
} from "../lib/queries.js";
import { symbols } from "../lib/terminal.js";
import { Message } from "./Message.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MessageListProps {
  conversationId: Id<"conversations">;
  onBack: () => void;
}

type ViewState = "loading" | "ready" | "error";

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function MessageList({ conversationId, onBack }: MessageListProps) {
  const { exit: _exit } = useApp();
  const [state, setState] = useState<ViewState>("loading");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load messages
  useEffect(() => {
    async function load() {
      try {
        const client = requireClient();
        const apiKey = requireApiKey();
        const [conv, msgs] = await Promise.all([
          getConversation(client, apiKey, conversationId),
          listMessages(client, apiKey, conversationId),
        ]);

        if (!conv) {
          setError("Conversation not found");
          setState("error");
          return;
        }

        setConversation(conv);
        setMessages(msgs ?? []);
        setState("ready");
      } catch (err) {
        setError(formatError(err));
        setState("error");
      }
    }

    load();
  }, [conversationId]);

  // Keyboard navigation (scroll through messages)
  const { selectedIndex } = useListNavigation({
    items: messages,
    initialIndex: messages.length - 1, // Start at bottom
    onCancel: onBack,
    isActive: state === "ready",
  });

  // Calculate visible window (show ~10 messages around selected)
  const windowSize = 10;
  const halfWindow = Math.floor(windowSize / 2);
  const startIndex = Math.max(0, selectedIndex - halfWindow);
  const endIndex = Math.min(messages.length, startIndex + windowSize);
  const visibleMessages = messages.slice(startIndex, endIndex);

  // Loading state
  if (state === "loading") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Loading messages...</Text>
        </Box>
      </Box>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="red">{symbols.error} </Text>
          <Text color="red">{error}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press 'b' to go back or 'q' to quit</Text>
        </Box>
      </Box>
    );
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold>{conversation?.title || "Conversation"}</Text>
        </Box>
        <Box>
          <Text dimColor>No messages yet</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press 'b' to go back or 'q' to quit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box
        marginBottom={1}
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
      >
        <Text bold>{conversation?.title || "Conversation"}</Text>
        <Box flexGrow={1} />
        <Text dimColor>
          {selectedIndex + 1}/{messages.length}
        </Text>
      </Box>

      {/* Scroll indicator (top) */}
      {startIndex > 0 && (
        <Box justifyContent="center">
          <Text dimColor>↑ {startIndex} more messages</Text>
        </Box>
      )}

      {/* Messages */}
      <Box flexDirection="column">
        {visibleMessages.map((msg, i) => (
          <Message
            key={msg._id}
            message={msg}
            isHighlighted={startIndex + i === selectedIndex}
          />
        ))}
      </Box>

      {/* Scroll indicator (bottom) */}
      {endIndex < messages.length && (
        <Box justifyContent="center">
          <Text dimColor>↓ {messages.length - endIndex} more messages</Text>
        </Box>
      )}

      {/* Help bar */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          {symbols.chevronRight} ↑↓/jk scroll | b back | q quit
        </Text>
      </Box>
    </Box>
  );
}
