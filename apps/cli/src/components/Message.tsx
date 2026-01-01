/**
 * Message Component - Individual message display with role-based styling
 *
 * Colors:
 * - User: blue/cyan
 * - Assistant: green
 * - System: gray (italic)
 * - Generating: yellow spinner
 * - Error: red
 */

import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { Message as MessageType } from "../lib/queries.js";
import { formatRelativeTime, formatTTFT } from "../lib/terminal.js";
import { Markdown } from "./Markdown.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MessageProps {
  message: MessageType;
  isHighlighted?: boolean;
}

interface RoleStyle {
  icon: string;
  label: string;
  color: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Styling
// ─────────────────────────────────────────────────────────────────────────────

const roleStyles: Record<string, RoleStyle> = {
  user: {
    icon: "👤",
    label: "You",
    color: "cyan",
  },
  assistant: {
    icon: "🤖",
    label: "Assistant",
    color: "green",
  },
  system: {
    icon: "⚙️",
    label: "System",
    color: "gray",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function Message({ message, isHighlighted }: MessageProps) {
  const style = roleStyles[message.role] || roleStyles.system;
  const isGenerating = message.status === "generating";
  const isError = message.status === "error";
  const isPending = message.status === "pending";

  // Use partialContent if generating, otherwise full content
  const displayContent = isGenerating
    ? message.partialContent || "..."
    : message.content;

  // Timestamp
  const timestamp = formatRelativeTime(message.createdAt);

  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      paddingLeft={isHighlighted ? 1 : 0}
      borderStyle={isHighlighted ? "single" : undefined}
      borderColor={isHighlighted ? "blue" : undefined}
    >
      {/* Header: Role + Timestamp + Status */}
      <Box>
        <Text color={style.color}>
          {style.icon} {style.label}
        </Text>
        <Box flexGrow={1} />
        {(isGenerating || isPending) && (
          <Box marginRight={1}>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            <Text color="yellow" dimColor>
              {isPending ? " waiting..." : " generating..."}
            </Text>
          </Box>
        )}
        {isError && (
          <Text color="red" dimColor>
            error
          </Text>
        )}
        <Text dimColor> {timestamp}</Text>
      </Box>

      {/* Content */}
      <Box marginLeft={3} marginTop={0}>
        {isError ? (
          <Text wrap="wrap" color="red">
            {message.error || displayContent}
          </Text>
        ) : (
          <Markdown
            content={displayContent}
            isStreaming={isGenerating || isPending}
          />
        )}
      </Box>

      {/* Model + Stats - only for assistant messages */}
      {message.role === "assistant" && (
        <Box marginLeft={3} marginTop={0} gap={2}>
          {/* Model name - show even if no model for debugging */}
          <Text dimColor>
            {message.model
              ? message.model.split(":")[1] || message.model
              : "(no model)"}
          </Text>
          {/* Stats only for completed messages */}
          {message.status === "complete" && (
            <>
              {/* TTFT */}
              {message.firstTokenAt && message.generationStartedAt && (
                <Text dimColor>
                  TTFT:{" "}
                  {formatTTFT(
                    message.firstTokenAt - message.generationStartedAt,
                  )}
                </Text>
              )}
              {/* TPS */}
              {message.tokensPerSecond && (
                <Text dimColor>{Math.round(message.tokensPerSecond)} t/s</Text>
              )}
              {/* Tokens */}
              {(message.inputTokens || message.outputTokens) && (
                <Text dimColor>
                  {message.inputTokens || 0}/{message.outputTokens || 0}
                </Text>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact Message (for list preview)
// ─────────────────────────────────────────────────────────────────────────────

interface CompactMessageProps {
  message: MessageType;
  maxLength?: number;
}

export function CompactMessage({
  message,
  maxLength = 60,
}: CompactMessageProps) {
  const style = roleStyles[message.role] || roleStyles.system;
  const content = message.content || message.partialContent || "";
  const truncated =
    content.length > maxLength ? `${content.slice(0, maxLength)}...` : content;

  return (
    <Box>
      <Text color={style.color}>{style.icon} </Text>
      <Text dimColor>{truncated.replace(/\n/g, " ")}</Text>
    </Box>
  );
}
