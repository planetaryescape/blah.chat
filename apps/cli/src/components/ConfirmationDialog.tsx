/**
 * ConfirmationDialog Component - Modal for confirming actions
 *
 * Features:
 * - Keyboard navigation (y/n, Enter/Escape)
 * - Customizable message and action labels
 * - Destructive action styling (red for delete)
 */

import { Box, Text, useInput } from "ink";
import { symbols } from "../lib/terminal.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmationDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ConfirmationDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  useInput((input, key) => {
    // y or Enter to confirm
    if (input.toLowerCase() === "y" || key.return) {
      onConfirm();
      return;
    }

    // n, Escape, or q to cancel
    if (input.toLowerCase() === "n" || key.escape || input === "q") {
      onCancel();
      return;
    }
  });

  const confirmColor = isDestructive ? "red" : "green";

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title */}
      <Box
        marginBottom={1}
        borderStyle="single"
        borderColor={isDestructive ? "red" : "cyan"}
        paddingX={1}
      >
        <Text bold color={isDestructive ? "red" : "cyan"}>
          {isDestructive ? symbols.warning : symbols.info} {title}
        </Text>
      </Box>

      {/* Message */}
      <Box paddingX={1} marginBottom={1}>
        <Text>{message}</Text>
      </Box>

      {/* Actions */}
      <Box paddingX={1} gap={2}>
        <Box>
          <Text color={confirmColor} bold>
            [y]
          </Text>
          <Text color={confirmColor}> {confirmLabel}</Text>
        </Box>
        <Box>
          <Text dimColor bold>
            [n]
          </Text>
          <Text dimColor> {cancelLabel}</Text>
        </Box>
      </Box>

      {/* Help */}
      <Box marginTop={1} paddingX={1}>
        <Text dimColor>Press y/Enter to confirm, n/Esc to cancel</Text>
      </Box>
    </Box>
  );
}
