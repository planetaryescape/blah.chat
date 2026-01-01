/**
 * ChatView Component - Full interactive chat with messages and input
 *
 * Features:
 * - View messages with real-time updates (Convex subscriptions)
 * - Send new messages
 * - Show generation status
 */

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import clipboard from "clipboardy";
import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { useCallback, useEffect, useState } from "react";
import { useMessages } from "../hooks/useMessages.js";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import {
  createBookmark,
  sendMessage,
  updateConversationModel,
} from "../lib/mutations.js";
import { type Conversation, getConversation } from "../lib/queries.js";
import { symbols } from "../lib/terminal.js";
import { ChatInput } from "./ChatInput.js";
import { HelpModal } from "./HelpModal.js";
import { Message } from "./Message.js";
import { ModelPicker } from "./ModelPicker.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChatViewProps {
  conversationId: Id<"conversations">;
  onBack: () => void;
}

type ViewState =
  | "loading"
  | "ready"
  | "sending"
  | "error"
  | "model-picker"
  | "help";
type InputMode = "typing" | "command";

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ChatView({ conversationId, onBack }: ChatViewProps) {
  const { exit } = useApp();
  const [state, setState] = useState<ViewState>("loading");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("typing"); // Start in typing mode
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null); // Message selection
  const [toast, setToast] = useState<string | null>(null); // Feedback messages

  // Subscribe to messages (real-time via WebSocket)
  const {
    data: messages,
    error: messagesError,
    isLoading: messagesLoading,
  } = useMessages(conversationId);

  // Derive generation state from messages
  const isGenerating = messages?.some(
    (m) => m.status === "generating" || m.status === "pending",
  );

  // Load conversation metadata
  useEffect(() => {
    async function loadConversation() {
      try {
        const client = requireClient();
        const apiKey = requireApiKey();
        const conv = await getConversation(client, apiKey, conversationId);

        if (!conv) {
          setError("Conversation not found or API key invalid");
          setState("error");
          return;
        }

        setConversation(conv);
        setState("ready");
      } catch (err) {
        setError(formatError(err));
        setState("error");
      }
    }

    loadConversation();
  }, [conversationId]);

  // Handle message subscription errors
  useEffect(() => {
    if (messagesError) {
      setError(formatError(messagesError));
      setState("error");
    }
  }, [messagesError]);

  // Clear toast after 2 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Reset selection when switching to typing mode
  useEffect(() => {
    if (inputMode === "typing") {
      setSelectedIndex(null);
    }
  }, [inputMode]);

  // Handle sending a message
  const handleSend = useCallback(
    async (content: string) => {
      setState("sending");
      setError(null);

      try {
        const client = requireClient();
        const apiKey = requireApiKey();

        // Send the message
        await sendMessage(client, apiKey, {
          conversationId,
          content,
        });

        // Messages will auto-update via subscription - no polling needed!
        setState("ready");
      } catch (err) {
        setError(formatError(err));
        setState("ready");
      }
    },
    [conversationId],
  );

  // Handle model selection
  const handleModelSelect = useCallback(
    async (modelId: string) => {
      try {
        const client = requireClient();
        const apiKey = requireApiKey();

        await updateConversationModel(client, apiKey, conversationId, modelId);

        // Refresh conversation to get updated model
        const conv = await getConversation(client, apiKey, conversationId);
        if (conv) {
          setConversation(conv);
        }

        setState("ready");
      } catch (err) {
        setError(formatError(err));
        setState("ready");
      }
    },
    [conversationId],
  );

  // Copy message to clipboard
  const handleCopy = useCallback(async () => {
    if (!messages || messages.length === 0) {
      setToast(`${symbols.warning} No messages to copy`);
      return;
    }

    // If no selection, copy last assistant message
    let msgToCopy =
      selectedIndex !== null
        ? messages[selectedIndex]
        : [...messages].reverse().find((m) => m.role === "assistant");

    if (!msgToCopy) {
      msgToCopy = messages[messages.length - 1]; // fallback to last message
    }

    const content = msgToCopy.content || msgToCopy.partialContent || "";
    await clipboard.write(content);
    setToast(`${symbols.success} Copied to clipboard`);
  }, [messages, selectedIndex]);

  // Bookmark message
  const handleBookmark = useCallback(async () => {
    if (!messages || messages.length === 0) {
      setToast(`${symbols.warning} No messages to bookmark`);
      return;
    }

    // If no selection, bookmark last assistant message
    let msgToBookmark =
      selectedIndex !== null
        ? messages[selectedIndex]
        : [...messages].reverse().find((m) => m.role === "assistant");

    if (!msgToBookmark) {
      msgToBookmark = messages[messages.length - 1];
    }

    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      await createBookmark(client, apiKey, msgToBookmark._id, conversationId);
      setToast(`${symbols.success} Bookmarked`);
    } catch (err) {
      setToast(`${symbols.error} ${formatError(err)}`);
    }
  }, [messages, selectedIndex, conversationId]);

  // Keyboard shortcuts - only in command mode
  useInput((input, key) => {
    // Only handle when in ready state
    if (state !== "ready") return;

    // Escape toggles to command mode
    if (key.escape) {
      if (inputMode === "typing") {
        setInputMode("command");
      } else {
        onBack();
      }
      return;
    }

    // In typing mode, don't intercept shortcuts (let TextInput handle them)
    if (inputMode === "typing") return;

    const msgCount = messages?.length ?? 0;
    const winSize = 8;
    const currentMaxScroll = Math.max(0, msgCount - winSize);

    // Navigation: j/down = next (toward newer), k/up = previous (toward older)
    if ((input === "j" || key.downArrow) && msgCount > 0) {
      if (selectedIndex === null) {
        // First press: select bottom visible message, then move down if possible
        const bottomVisible = Math.min(
          currentMaxScroll + winSize - 1,
          msgCount - 1,
        );
        setSelectedIndex(Math.min(bottomVisible + 1, msgCount - 1));
      } else {
        setSelectedIndex(Math.min(selectedIndex + 1, msgCount - 1));
      }
      return;
    }

    if ((input === "k" || key.upArrow) && msgCount > 0) {
      if (selectedIndex === null) {
        // First press: select bottom visible message, then move up
        const bottomVisible = Math.min(
          currentMaxScroll + winSize - 1,
          msgCount - 1,
        );
        setSelectedIndex(Math.max(bottomVisible - 1, 0));
      } else {
        setSelectedIndex(Math.max(selectedIndex - 1, 0));
      }
      return;
    }

    // g = go to first message
    if (input === "g" && msgCount > 0) {
      setSelectedIndex(0);
      return;
    }

    // G = go to last message
    if (input === "G" && msgCount > 0) {
      setSelectedIndex(msgCount - 1);
      return;
    }

    // c = copy selected/last assistant message
    if (input === "c") {
      handleCopy();
      return;
    }

    // B = bookmark selected/last assistant message
    if (input === "B") {
      handleBookmark();
      return;
    }

    // Command mode shortcuts
    if (input === "b") {
      onBack();
      return;
    }

    if (input === "q") {
      exit();
      return;
    }

    if (input === "m" && !isGenerating) {
      setState("model-picker");
      return;
    }

    if (input === "?") {
      setState("help");
      return;
    }

    // Any other key returns to typing mode
    if (input && !key.ctrl && !key.meta) {
      setInputMode("typing");
    }
  });

  // Calculate visible messages window
  const windowSize = 8;
  const totalMessages = messages?.length ?? 0;
  const maxScroll = Math.max(0, totalMessages - windowSize);

  // Compute startIdx from selectedIndex - keep selection visible with context
  let startIdx: number;
  if (selectedIndex === null) {
    // No selection: show last messages (default view)
    startIdx = maxScroll;
  } else {
    // Keep selection visible with 2 messages of context above
    const margin = 2;
    startIdx = Math.max(0, Math.min(selectedIndex - margin, maxScroll));
  }

  const visibleMessages =
    messages?.slice(startIdx, startIdx + windowSize) ?? [];
  const hiddenAbove = startIdx;
  const hiddenBelow = Math.max(0, totalMessages - startIdx - windowSize);

  // Help modal
  if (state === "help") {
    return <HelpModal context="chat" onClose={() => setState("ready")} />;
  }

  // Model picker state
  if (state === "model-picker") {
    return (
      <ModelPicker
        currentModel={conversation?.model ?? undefined}
        onSelect={handleModelSelect}
        onCancel={() => setState("ready")}
      />
    );
  }

  // Loading state (waiting for initial data)
  if (state === "loading" || (messagesLoading && !messages)) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Loading conversation...</Text>
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

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box
        marginBottom={1}
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
      >
        <Text bold>{conversation?.title || "Chat"}</Text>
        <Box flexGrow={1} />
        <Text dimColor>{messages?.length ?? 0} messages</Text>
      </Box>

      {/* Hidden messages above indicator */}
      {hiddenAbove > 0 && (
        <Box justifyContent="center" marginBottom={1}>
          <Text dimColor>↑ {hiddenAbove} older messages</Text>
        </Box>
      )}

      {/* Messages */}
      <Box flexDirection="column" marginBottom={1}>
        {visibleMessages.length === 0 ? (
          <Box>
            <Text dimColor>No messages yet. Start the conversation!</Text>
          </Box>
        ) : (
          visibleMessages.map((msg, idx) => {
            const actualIndex = startIdx + idx;
            return (
              <Message
                key={msg._id}
                message={msg}
                isHighlighted={selectedIndex === actualIndex}
              />
            );
          })
        )}
      </Box>

      {/* Hidden messages below indicator */}
      {hiddenBelow > 0 && (
        <Box justifyContent="center" marginBottom={1}>
          <Text dimColor>↓ {hiddenBelow} newer messages</Text>
        </Box>
      )}

      {/* Toast notification */}
      {toast && (
        <Box justifyContent="center" marginBottom={1}>
          <Text>{toast}</Text>
        </Box>
      )}

      {/* Input */}
      <ChatInput
        onSubmit={handleSend}
        onCancel={() => setInputMode("command")}
        isSending={state === "sending"}
        isDisabled={isGenerating || inputMode === "command"}
        placeholder={
          isGenerating
            ? "Waiting for response..."
            : inputMode === "command"
              ? "Press any key to type..."
              : "Type a message..."
        }
      />

      {/* Status bar */}
      <Box marginTop={1}>
        <Text dimColor>
          {symbols.chevronRight}{" "}
          {inputMode === "command" ? (
            <>
              <Text color="yellow">[CMD]</Text> j/k nav | c copy | B bookmark |
              b back | ? help
              {selectedIndex !== null && (
                <Text color="cyan">
                  {" "}
                  [{selectedIndex + 1}/{totalMessages}]
                </Text>
              )}
            </>
          ) : (
            <>
              <Text color="cyan">[TYPE]</Text> Esc for commands
            </>
          )}
          {conversation?.model && ` | ${conversation.model}`}
        </Text>
      </Box>
    </Box>
  );
}
