import type { CoreMessage } from "ai";
import type { Doc } from "../_generated/dataModel";

// Legacy sync functions removed - use async versions (countTokensAsync, etc.)

/**
 * Simple token estimation (fallback)
 * Roughly 1 token per 4 characters for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Legacy countMessageTokens removed - use countMessageTokensAsync

/**
 * Count tokens for conversation context
 * Includes: system prompts + memories + messages
 */
export interface TokenUsage {
  systemTokens: number;
  messagesTokens: number;
  memoriesTokens: number;
  totalTokens: number;
  contextLimit: number;
  lastCalculatedAt: number;
}

// Legacy calculateConversationTokens removed - use calculateConversationTokensAsync

/**
 * Calculate percentage of context window used
 */
export function getContextUsagePercentage(
  totalTokens: number,
  contextLimit: number,
): number {
  return Math.round((totalTokens / contextLimit) * 100);
}

/**
 * Check if context window is near limit
 */
export function isContextNearLimit(
  totalTokens: number,
  contextLimit: number,
  threshold: number = 0.8,
): boolean {
  return totalTokens / contextLimit >= threshold;
}

/**
 * Get warning level based on context usage
 */
export type WarningLevel = "safe" | "caution" | "warning" | "critical";

export function getContextWarningLevel(
  totalTokens: number,
  contextLimit: number,
): WarningLevel {
  const percentage = totalTokens / contextLimit;

  if (percentage >= 0.95) return "critical";
  if (percentage >= 0.85) return "warning";
  if (percentage >= 0.7) return "caution";
  return "safe";
}

/**
 * ASYNC TOKEN COUNTING FUNCTIONS
 * Provider-native counting for accuracy across all models
 */

import { getTokenCounter } from "./service";

/**
 * Count tokens for a text string using provider-native counting
 * @param text - The text to count tokens for
 * @param modelId - The full model ID (e.g., "openai:gpt-5.1", "anthropic:claude-opus-4-5-20251101")
 * @returns Number of tokens
 */
export async function countTokensAsync(
  text: string,
  modelId: string,
): Promise<number> {
  const counter = await getTokenCounter(modelId);
  return counter.countText(text);
}

/**
 * Count tokens for a list of messages using provider-native counting
 * Includes per-message overhead for chat format
 */
export async function countMessageTokensAsync(
  messages: CoreMessage[],
  modelId: string,
): Promise<number> {
  const counter = await getTokenCounter(modelId);
  return counter.countMessages(messages);
}

/**
 * Count tokens for conversation context using provider-native counting
 * Includes: system prompts + memories + messages
 * Counts all parts in parallel for optimal performance
 */
export async function calculateConversationTokensAsync(
  systemPrompts: string[],
  memories: string[],
  messages: Doc<"messages">[],
  contextLimit: number,
  modelId: string,
): Promise<TokenUsage> {
  const counter = await getTokenCounter(modelId);

  // Convert messages to CoreMessage format
  const coreMessages: CoreMessage[] = messages.map((msg) => ({
    role: msg.role as "user" | "assistant" | "system",
    content: msg.content,
  }));

  // Count all parts in parallel for optimal performance
  const [systemTokens, memoriesTokens, messagesTokens] = await Promise.all([
    counter.countText(systemPrompts.join("\n\n")),
    counter.countText(memories.join("\n")),
    counter.countMessages(coreMessages),
  ]);

  const totalTokens = systemTokens + memoriesTokens + messagesTokens;

  return {
    systemTokens,
    messagesTokens,
    memoriesTokens,
    totalTokens,
    contextLimit,
    lastCalculatedAt: Date.now(),
  };
}
