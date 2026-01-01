/**
 * Chat Command - Main chat interface
 *
 * Flow:
 * 1. Show conversation list
 * 2. Select conversation → interactive chat view
 * 3. Send messages and see streaming responses
 * 4. Press 'b' to go back to list
 * 5. Press 'q' to quit
 */

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useCallback, useState } from "react";
import { ChatView } from "../components/ChatView.js";
import { ConversationList } from "../components/ConversationList.js";
import { SearchModal } from "../components/SearchModal.js";
import { ConvexProvider } from "../context/ConvexContext.js";
import { getCredentials } from "../lib/auth.js";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import { createConversation } from "../lib/mutations.js";
import { getUserDefaultModel } from "../lib/queries.js";
import { symbols } from "../lib/terminal.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type View = "list" | "chat" | "search" | "creating";

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ChatCommand() {
  const [view, setView] = useState<View>("list");
  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if logged in
  const credentials = getCredentials();
  if (!credentials) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="yellow">{symbols.warning} </Text>
          <Text color="yellow">Not logged in</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Run: </Text>
          <Text>blah login</Text>
        </Box>
      </Box>
    );
  }

  // Handle conversation selection
  const handleSelectConversation = (conversationId: Id<"conversations">) => {
    setSelectedConversationId(conversationId);
    setView("chat");
  };

  // Handle going back to list
  const handleBack = () => {
    setView("list");
    setSelectedConversationId(null);
    setError(null);
  };

  // Handle new conversation - create instantly with defaults
  const handleNewConversation = useCallback(async () => {
    setView("creating");
    setError(null);

    try {
      const client = requireClient();
      const apiKey = requireApiKey();

      // Get user's default model
      const defaultModel = await getUserDefaultModel(client, apiKey);

      // Create conversation with defaults (title auto-generated after first response)
      const result = await createConversation(client, apiKey, {
        title: "New Chat",
        model: defaultModel,
      });

      // Navigate to new conversation
      setSelectedConversationId(result.conversationId);
      setView("chat");
    } catch (err) {
      setError(formatError(err));
      setView("list");
    }
  }, []);

  // Handle search
  const handleSearch = () => {
    setView("search");
  };

  // Render based on current view
  if (view === "search") {
    return (
      <SearchModal onSelect={handleSelectConversation} onCancel={handleBack} />
    );
  }

  if (view === "creating") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Creating new conversation...</Text>
        </Box>
      </Box>
    );
  }

  if (view === "chat" && selectedConversationId) {
    return (
      <ConvexProvider>
        <ChatView conversationId={selectedConversationId} onBack={handleBack} />
      </ConvexProvider>
    );
  }

  return (
    <Box flexDirection="column">
      {error && (
        <Box padding={1}>
          <Text color="red">{symbols.error} </Text>
          <Text color="red">{error}</Text>
        </Box>
      )}
      <ConversationList
        onSelect={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onSearch={handleSearch}
      />
    </Box>
  );
}
