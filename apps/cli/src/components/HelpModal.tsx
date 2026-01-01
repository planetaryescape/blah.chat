/**
 * HelpModal Component - Keyboard shortcuts reference
 *
 * Shows all available keybindings in the current context
 */

import { Box, Text, useInput } from "ink";
import { symbols } from "../lib/terminal.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface HelpModalProps {
  context: "list" | "chat";
  onClose: () => void;
}

interface KeyBinding {
  key: string;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Key Bindings Data
// ─────────────────────────────────────────────────────────────────────────────

const commonBindings: KeyBinding[] = [
  { key: "q", description: "Quit" },
  { key: "?", description: "Toggle help" },
];

const listBindings: KeyBinding[] = [
  { key: "j / ↓", description: "Move down" },
  { key: "k / ↑", description: "Move up" },
  { key: "g", description: "Go to top" },
  { key: "G", description: "Go to bottom" },
  { key: "Ctrl+D", description: "Half-page down" },
  { key: "Ctrl+U", description: "Half-page up" },
  { key: "Enter", description: "Open conversation" },
  { key: "n", description: "New conversation" },
  { key: "/", description: "Search conversations" },
  { key: "a", description: "Archive selected" },
  { key: "d", description: "Delete selected" },
];

const chatBindings: KeyBinding[] = [
  { key: "Enter", description: "Send message" },
  { key: "Ctrl+C", description: "Cancel input" },
  { key: "Esc", description: "Enter command mode" },
  { key: "j / k / ↑ / ↓", description: "Navigate messages" },
  { key: "g / G", description: "Jump to first/last message" },
  { key: "c", description: "Copy selected message" },
  { key: "B", description: "Bookmark selected message" },
  { key: "b", description: "Back to list" },
  { key: "m", description: "Change model" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function HelpModal({ context, onClose }: HelpModalProps) {
  useInput((input, key) => {
    // Any key closes help
    if (input || key.return || key.escape) {
      onClose();
    }
  });

  const contextBindings = context === "list" ? listBindings : chatBindings;
  const contextTitle = context === "list" ? "Conversation List" : "Chat View";

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box
        marginBottom={1}
        borderStyle="double"
        borderColor="cyan"
        paddingX={2}
        justifyContent="center"
      >
        <Text bold color="cyan">
          {symbols.info} Keyboard Shortcuts
        </Text>
      </Box>

      {/* Context-specific bindings */}
      <Box marginBottom={1} flexDirection="column">
        <Box marginBottom={1}>
          <Text bold underline>
            {contextTitle}
          </Text>
        </Box>
        {contextBindings.map((binding, i) => (
          <KeyBindingRow key={i} binding={binding} />
        ))}
      </Box>

      {/* Common bindings */}
      <Box marginBottom={1} flexDirection="column">
        <Box marginBottom={1}>
          <Text bold underline>
            General
          </Text>
        </Box>
        {commonBindings.map((binding, i) => (
          <KeyBindingRow key={i} binding={binding} />
        ))}
      </Box>

      {/* Footer */}
      <Box marginTop={1} justifyContent="center">
        <Text dimColor>Press any key to close</Text>
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Key Binding Row
// ─────────────────────────────────────────────────────────────────────────────

function KeyBindingRow({ binding }: { binding: KeyBinding }) {
  return (
    <Box paddingX={1}>
      <Box width={12}>
        <Text color="yellow" bold>
          {binding.key}
        </Text>
      </Box>
      <Text>{binding.description}</Text>
    </Box>
  );
}
