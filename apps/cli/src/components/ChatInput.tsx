/**
 * ChatInput Component - Text input for sending messages
 *
 * Features:
 * - Multi-line aware (single line input)
 * - Enter to send
 * - Escape to cancel/blur
 * - Shows sending state
 */

import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import { useState } from "react";
import { symbols } from "../lib/terminal.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChatInputProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  isDisabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ChatInput({
  onSubmit,
  onCancel,
  isDisabled = false,
  isSending = false,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [value, setValue] = useState("");

  // Handle escape key
  useInput(
    (input, key) => {
      if (key.escape && onCancel) {
        onCancel();
      }
    },
    { isActive: !isDisabled && !isSending },
  );

  const handleSubmit = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !isSending) {
      onSubmit(trimmed);
      setValue("");
    }
  };

  // Sending state
  if (isSending) {
    return (
      <Box borderStyle="single" borderColor="yellow" paddingX={1} paddingY={0}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text color="yellow"> Sending...</Text>
      </Box>
    );
  }

  // Disabled state
  if (isDisabled) {
    return (
      <Box borderStyle="single" borderColor="gray" paddingX={1} paddingY={0}>
        <Text dimColor>{placeholder}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderColor="cyan" paddingX={1} paddingY={0}>
        <Text color="cyan">{symbols.chevronRight} </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder={placeholder}
        />
      </Box>
      <Box paddingX={1}>
        <Text dimColor>Enter send | Esc cancel | Ctrl+C quit</Text>
      </Box>
    </Box>
  );
}
