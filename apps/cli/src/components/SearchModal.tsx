/**
 * SearchModal Component - Search conversations with fuzzy matching
 *
 * Features:
 * - Real-time fuzzy search as you type
 * - Keyboard navigation of results
 * - Shows matching highlights
 */

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import { useCallback, useEffect, useState } from "react";
import { useFuzzySearch } from "../hooks/useFuzzySearch.js";
import { formatError, requireApiKey, requireClient } from "../lib/client.js";
import { type Conversation, listConversations } from "../lib/queries.js";
import { formatRelativeTime, symbols } from "../lib/terminal.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SearchModalProps {
  onSelect: (conversationId: Id<"conversations">) => void;
  onCancel: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SearchModal({ onSelect, onCancel }: SearchModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fuzzy search
  const { query, setQuery, results, isSearching } = useFuzzySearch({
    items: conversations,
    getSearchText: (conv) => conv.title || "Untitled",
  });

  // Load all conversations for client-side search
  useEffect(() => {
    async function load() {
      try {
        const client = requireClient();
        const apiKey = requireApiKey();
        const convos = await listConversations(client, apiKey, { limit: 100 });
        if (convos) {
          setConversations(convos);
        }
      } catch (err) {
        setError(formatError(err));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Handle keyboard input
  useInput(
    useCallback(
      (input, key) => {
        // Navigation
        if (key.downArrow || (key.ctrl && input === "n")) {
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
          return;
        }

        if (key.upArrow || (key.ctrl && input === "p")) {
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return;
        }

        // Select
        if (key.return) {
          const selected = results[selectedIndex];
          if (selected) {
            onSelect(selected._id);
          }
          return;
        }

        // Cancel
        if (key.escape) {
          onCancel();
          return;
        }
      },
      [results, selectedIndex, onSelect, onCancel],
    ),
    { isActive: !isLoading },
  );

  // Loading state
  if (isLoading) {
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
  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="red">{symbols.error} </Text>
          <Text color="red">{error}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Escape to go back</Text>
        </Box>
      </Box>
    );
  }

  // Calculate visible window
  const windowSize = 8;
  const halfWindow = Math.floor(windowSize / 2);
  const startIndex = Math.max(0, selectedIndex - halfWindow);
  const endIndex = Math.min(results.length, startIndex + windowSize);
  const visibleResults = results.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box
        marginBottom={1}
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
      >
        <Text bold color="cyan">
          Search Conversations
        </Text>
        <Box flexGrow={1} />
        {isSearching && <Text dimColor>{results.length} results</Text>}
      </Box>

      {/* Search input */}
      <Box marginBottom={1}>
        <Text color="cyan">{symbols.chevronRight} </Text>
        <TextInput
          value={query}
          onChange={setQuery}
          placeholder="Type to search..."
        />
      </Box>

      {/* Results */}
      {results.length === 0 ? (
        <Box paddingX={1}>
          <Text dimColor>
            {isSearching ? "No matches found" : "No conversations"}
          </Text>
        </Box>
      ) : (
        <>
          {/* Scroll indicator (top) */}
          {startIndex > 0 && (
            <Box justifyContent="center">
              <Text dimColor>
                {symbols.arrowUp} {startIndex} more
              </Text>
            </Box>
          )}

          {/* Result list */}
          <Box flexDirection="column">
            {visibleResults.map((conv, i) => {
              const actualIndex = startIndex + i;
              const isSelected = actualIndex === selectedIndex;
              const title = conv.title || "Untitled";
              const truncatedTitle =
                title.length > 40 ? `${title.slice(0, 40)}...` : title;
              const relTime = formatRelativeTime(
                conv.lastMessageAt || conv.createdAt,
              );

              return (
                <Box
                  key={conv._id}
                  paddingX={1}
                  borderStyle={isSelected ? "single" : undefined}
                  borderColor={isSelected ? "cyan" : undefined}
                >
                  {/* Selection indicator */}
                  <Text color={isSelected ? "cyan" : "gray"}>
                    {isSelected ? symbols.chevronRight : " "}
                  </Text>
                  <Text> </Text>

                  {/* Title */}
                  <Box flexGrow={1}>
                    <Text
                      color={isSelected ? "cyan" : undefined}
                      bold={isSelected}
                    >
                      {truncatedTitle}
                    </Text>
                  </Box>

                  {/* Message count and time */}
                  <Text dimColor>
                    ({conv.messageCount || 0}) {relTime}
                  </Text>
                </Box>
              );
            })}
          </Box>

          {/* Scroll indicator (bottom) */}
          {endIndex < results.length && (
            <Box justifyContent="center">
              <Text dimColor>
                {symbols.arrowDown} {results.length - endIndex} more
              </Text>
            </Box>
          )}
        </>
      )}

      {/* Help bar */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          {symbols.chevronRight} ↑↓ navigate | Enter select | Esc cancel
        </Text>
      </Box>
    </Box>
  );
}
