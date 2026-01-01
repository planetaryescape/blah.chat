/**
 * ConversationList Component - Scrollable conversation list with selection
 *
 * Features:
 * - Keyboard navigation (j/k, arrows)
 * - Shows pinned, message count, relative time
 * - Enter to select, q to quit
 */

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { useCallback, useEffect, useState } from "react";
import { useListNavigation } from "../hooks/useListNavigation.js";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import { archiveConversation, deleteConversation } from "../lib/mutations.js";
import { type Conversation, listConversations } from "../lib/queries.js";
import { formatRelativeTime, symbols } from "../lib/terminal.js";
import { ConfirmationDialog } from "./ConfirmationDialog.js";
import { HelpModal } from "./HelpModal.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ConversationListProps {
  onSelect: (conversationId: Id<"conversations">) => void;
  onNewConversation?: () => void;
  onSearch?: () => void;
}

type ViewState = "loading" | "ready" | "error";
type DialogState = "none" | "archive" | "delete";

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ConversationList({
  onSelect,
  onNewConversation,
  onSearch,
}: ConversationListProps) {
  const { exit } = useApp();
  const [state, setState] = useState<ViewState>("loading");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>("none");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Load/refresh conversations
  const refreshConversations = useCallback(async () => {
    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      const convos = await listConversations(client, apiKey, { limit: 50 });
      if (!convos) {
        setError("API key invalid or revoked. Run: blah login");
        setState("error");
        return;
      }
      setConversations(convos);
      setState("ready");
    } catch (err) {
      setError(formatError(err));
      setState("error");
    }
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Keyboard navigation
  const { selectedIndex, selectedItem } = useListNavigation({
    items: conversations,
    onSelect: (conv) => onSelect(conv._id),
    onCancel: () => exit(),
    isActive: state === "ready" && dialog === "none" && !showHelp,
  });

  // Action handlers
  const handleArchive = useCallback(async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      await archiveConversation(client, apiKey, selectedItem._id);
      await refreshConversations();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsProcessing(false);
      setDialog("none");
    }
  }, [selectedItem, refreshConversations]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
      const client = requireClient();
      const apiKey = requireApiKey();
      await deleteConversation(client, apiKey, selectedItem._id);
      await refreshConversations();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsProcessing(false);
      setDialog("none");
    }
  }, [selectedItem, refreshConversations]);

  // Additional key handlers (n, a, d, /, ?)
  useInput(
    (input) => {
      if (dialog !== "none" || isProcessing || showHelp) return;

      // ? = show help
      if (input === "?") {
        setShowHelp(true);
        return;
      }

      // n = new conversation
      if (input === "n" && onNewConversation) {
        onNewConversation();
        return;
      }

      // / = search
      if (input === "/" && onSearch) {
        onSearch();
        return;
      }

      // a = archive selected
      if (input === "a" && selectedItem) {
        setDialog("archive");
        return;
      }

      // d = delete selected
      if (input === "d" && selectedItem) {
        setDialog("delete");
        return;
      }
    },
    { isActive: state === "ready" },
  );

  // Calculate visible window
  const windowSize = 15;
  const halfWindow = Math.floor(windowSize / 2);
  const startIndex = Math.max(0, selectedIndex - halfWindow);
  const endIndex = Math.min(conversations.length, startIndex + windowSize);
  const visibleConversations = conversations.slice(startIndex, endIndex);

  // Loading state
  if (state === "loading") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Loading conversations...</Text>
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
          <Text dimColor>Press 'q' to quit</Text>
        </Box>
      </Box>
    );
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold>Conversations</Text>
        </Box>
        <Box>
          <Text dimColor>No conversations yet</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            {onNewConversation
              ? "Press 'n' to create a new conversation"
              : "Create a conversation on the web to get started."}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press 'q' to quit</Text>
        </Box>
      </Box>
    );
  }

  // Archive confirmation dialog
  if (dialog === "archive" && selectedItem) {
    return (
      <ConfirmationDialog
        title="Archive Conversation"
        message={`Archive "${selectedItem.title || "Untitled"}"? It will be hidden from the list.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        isDestructive={false}
        onConfirm={handleArchive}
        onCancel={() => setDialog("none")}
      />
    );
  }

  // Delete confirmation dialog
  if (dialog === "delete" && selectedItem) {
    return (
      <ConfirmationDialog
        title="Delete Conversation"
        message={`Permanently delete "${selectedItem.title || "Untitled"}" and all its messages? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDialog("none")}
      />
    );
  }

  // Processing state
  if (isProcessing) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Processing...</Text>
        </Box>
      </Box>
    );
  }

  // Help modal
  if (showHelp) {
    return <HelpModal context="list" onClose={() => setShowHelp(false)} />;
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
        <Text bold>Conversations</Text>
        <Box flexGrow={1} />
        <Text dimColor>({conversations.length})</Text>
      </Box>

      {/* Scroll indicator (top) */}
      {startIndex > 0 && (
        <Box justifyContent="center">
          <Text dimColor>↑ {startIndex} more</Text>
        </Box>
      )}

      {/* Conversation list */}
      <Box flexDirection="column">
        {visibleConversations.map((conv, i) => (
          <ConversationItem
            key={conv._id}
            conversation={conv}
            isSelected={startIndex + i === selectedIndex}
          />
        ))}
      </Box>

      {/* Scroll indicator (bottom) */}
      {endIndex < conversations.length && (
        <Box justifyContent="center">
          <Text dimColor>↓ {conversations.length - endIndex} more</Text>
        </Box>
      )}

      {/* Help bar */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          {symbols.chevronRight} ↑↓/jk nav | Enter open |{" "}
          {onSearch ? "/ search | " : ""}
          {onNewConversation ? "n new | " : ""}a archive | d delete | ? help | q
          quit
        </Text>
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversation Item
// ─────────────────────────────────────────────────────────────────────────────

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
}

function ConversationItem({ conversation, isSelected }: ConversationItemProps) {
  const title = conversation.title || "Untitled";
  const truncatedTitle = title.length > 35 ? `${title.slice(0, 35)}...` : title;
  const messageCount = conversation.messageCount || 0;
  const relTime = formatRelativeTime(
    conversation.lastMessageAt || conversation.createdAt,
  );

  return (
    <Box
      paddingX={1}
      paddingY={0}
      borderStyle={isSelected ? "single" : undefined}
      borderColor={isSelected ? "cyan" : undefined}
    >
      {/* Selection indicator */}
      <Text color={isSelected ? "cyan" : "gray"}>
        {isSelected ? symbols.chevronRight : " "}
      </Text>

      {/* Pinned indicator */}
      <Text> {conversation.pinned ? "📌" : "  "} </Text>

      {/* Title */}
      <Box flexGrow={1}>
        <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
          {truncatedTitle}
        </Text>
      </Box>

      {/* Message count */}
      <Text dimColor>({messageCount}) </Text>

      {/* Relative time */}
      <Text dimColor>{relTime}</Text>
    </Box>
  );
}
