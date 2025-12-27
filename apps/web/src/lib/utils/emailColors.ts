/**
 * Email-safe color constants and emoji mappings for feedback notifications
 * Uses hex colors from design system (globals.css) for maximum email client compatibility
 */

export type FeedbackPriority = "critical" | "high" | "medium" | "low" | "none";
export type FeedbackType = "bug" | "feature" | "praise" | "other";
export type FeedbackSentiment =
  | "positive"
  | "neutral"
  | "negative"
  | "frustrated";

// Priority colors (email-safe hex from design system light mode)
export const PRIORITY_COLORS: Record<FeedbackPriority, string> = {
  critical: "#dc2626", // Red - immediate attention
  high: "#d87945", // Orange (accent color from design system)
  medium: "#b89f42", // Gold (primary color from design system)
  low: "#6b7280", // Gray - neutral
  none: "#9ca3af", // Light gray
} as const;

// Type colors for visual differentiation
export const TYPE_COLORS: Record<FeedbackType, string> = {
  bug: "#dc2626", // Red
  feature: "#3b82f6", // Blue
  praise: "#10b981", // Green
  other: "#6b7280", // Gray
} as const;

// Background colors (subtle, email-safe)
export const PRIORITY_BG_COLORS: Record<FeedbackPriority, string> = {
  critical: "#fee2e2", // Light red
  high: "#fed7aa", // Light orange
  medium: "#fef3c7", // Light yellow
  low: "#f3f4f6", // Light gray
  none: "#f9fafb", // Very light gray
} as const;

// Sentiment icons for AI analysis
export const SENTIMENT_ICONS: Record<FeedbackSentiment, string> = {
  frustrated: "🔥",
  negative: "😟",
  neutral: "😐",
  positive: "😊",
} as const;

/**
 * Get priority emoji for email subject line and headers
 */
export function getPriorityEmoji(priority: FeedbackPriority): string {
  const map: Record<FeedbackPriority, string> = {
    critical: "🚨",
    high: "⚠️",
    medium: "📌",
    low: "💬",
    none: "📝",
  };
  return map[priority];
}

/**
 * Get type emoji for visual categorization
 */
export function getTypeEmoji(type: FeedbackType): string {
  const map: Record<FeedbackType, string> = {
    bug: "🐛",
    feature: "💡",
    praise: "⭐",
    other: "💬",
  };
  return map[type];
}

/**
 * Get sentiment icon from AI triage
 */
export function getSentimentIcon(sentiment: FeedbackSentiment): string {
  return SENTIMENT_ICONS[sentiment];
}

/**
 * Get priority color (for text/borders)
 */
export function getPriorityColor(priority: FeedbackPriority): string {
  return PRIORITY_COLORS[priority];
}

/**
 * Get priority background color (for badges/sections)
 */
export function getPriorityBgColor(priority: FeedbackPriority): string {
  return PRIORITY_BG_COLORS[priority];
}

/**
 * Get type color
 */
export function getTypeColor(type: FeedbackType): string {
  return TYPE_COLORS[type];
}
