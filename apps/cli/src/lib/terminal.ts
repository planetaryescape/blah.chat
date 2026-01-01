/**
 * Terminal-specific design tokens for the CLI
 *
 * Box drawing characters, spinners, status symbols, and ANSI color mapping.
 */

import { colors } from "@blah-chat/shared/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Box Drawing Characters
// ─────────────────────────────────────────────────────────────────────────────

export const box = {
  // Rounded corners (modern, softer look)
  rounded: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
  },

  // Sharp corners (classic, terminal aesthetic)
  sharp: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
  },

  // Double line (emphasis, headers)
  double: {
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    vertical: "║",
  },

  // Heavy line (bold emphasis)
  heavy: {
    topLeft: "┏",
    topRight: "┓",
    bottomLeft: "┗",
    bottomRight: "┛",
    horizontal: "━",
    vertical: "┃",
  },
} as const;

// Default box style
export const defaultBox = box.rounded;

// ─────────────────────────────────────────────────────────────────────────────
// Spinner Frames
// ─────────────────────────────────────────────────────────────────────────────

export const spinners = {
  // Braille dots (smooth, modern - like Claude Code)
  braille: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],

  // Simple dots
  dots: ["⠋", "⠙", "⠚", "⠒", "⠂", "⠂", "⠒", "⠚", "⠙", "⠋"],

  // Classic spinner
  classic: ["|", "/", "-", "\\"],

  // Arc (quarter rotation)
  arc: ["◜", "◠", "◝", "◞", "◡", "◟"],

  // Bouncing ball
  bounce: ["⠁", "⠂", "⠄", "⠂"],

  // Growing dots
  growing: [".", "..", "...", ".."],
} as const;

// Default spinner
export const defaultSpinner = spinners.braille;

// ─────────────────────────────────────────────────────────────────────────────
// Status Symbols
// ─────────────────────────────────────────────────────────────────────────────

export const symbols = {
  // Status indicators
  success: "✓",
  error: "✗",
  warning: "⚠",
  info: "ℹ",
  pending: "○",
  active: "●",

  // Navigation
  arrowRight: "→",
  arrowLeft: "←",
  arrowUp: "↑",
  arrowDown: "↓",
  chevronRight: "›",
  chevronLeft: "‹",

  // Selection
  selected: "▸",
  unselected: " ",
  checkbox: "☐",
  checkboxChecked: "☑",
  radio: "○",
  radioSelected: "●",

  // Messages
  user: "👤",
  assistant: "🤖",
  system: "⚙",

  // Actions
  star: "★",
  starEmpty: "☆",
  pin: "📌",
  archive: "📦",
  trash: "🗑",

  // Misc
  ellipsis: "…",
  bullet: "•",
  dash: "─",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// ANSI Color Mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map theme colors to terminal-compatible colors.
 * Ink supports hex colors directly, but these provide semantic naming.
 */
export const terminalColors = {
  // Core theme (from shared)
  background: colors.background,
  foreground: colors.foreground,
  primary: colors.primary,
  secondary: colors.secondary,
  muted: colors.mutedForeground,
  accent: colors.accent,
  border: colors.border,

  // Message colors
  userBubble: colors.userBubble,
  userText: colors.userBubbleText,
  aiBubble: colors.aiBubble,
  aiText: colors.aiBubbleText,

  // Status colors
  success: colors.success,
  error: colors.error,
  warning: colors.star, // Use star color for warnings
  generating: colors.generating,

  // UI elements
  link: colors.link,
  code: colors.codeBackground,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Spacing (terminal-adapted)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Terminal spacing in characters (not pixels).
 * Adapted from the shared spacing scale.
 */
export const terminalSpacing = {
  none: 0,
  xs: 1,
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Animation Timing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Animation intervals in milliseconds.
 */
export const timing = {
  spinnerInterval: 80, // Spinner frame rate
  streamingPoll: 100, // Polling interval for streaming responses
  debounce: 150, // Input debounce
  fastTransition: 150,
  normalTransition: 300,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a horizontal rule with the specified character.
 */
export function horizontalRule(
  width: number,
  char = defaultBox.horizontal,
): string {
  return char.repeat(width);
}

/**
 * Create a simple box around text.
 */
export function boxText(
  text: string,
  style: keyof typeof box = "rounded",
): string {
  const chars = box[style];
  const lines = text.split("\n");
  const maxWidth = Math.max(...lines.map((l) => l.length));

  const top =
    chars.topLeft + chars.horizontal.repeat(maxWidth + 2) + chars.topRight;
  const bottom =
    chars.bottomLeft +
    chars.horizontal.repeat(maxWidth + 2) +
    chars.bottomRight;
  const middle = lines.map(
    (line) => `${chars.vertical} ${line.padEnd(maxWidth)} ${chars.vertical}`,
  );

  return [top, ...middle, bottom].join("\n");
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + symbols.ellipsis;
}

/**
 * Format relative time for display.
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "now";
}

/**
 * Format time to first token (TTFT) for display.
 */
export function formatTTFT(ms: number): string {
  if (ms < 100) return `${Math.round(ms)}ms`;
  if (ms < 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 1000).toFixed(1)}s`;
}
