import { encoding_for_model, type TiktokenModel } from "@dqbd/tiktoken";
import type { CoreMessage } from "ai";
import type { Doc } from "../_generated/dataModel";

/**
 * Count tokens for a text string using tiktoken
 * @param text - The text to count tokens for
 * @param model - The model to use for encoding (default: gpt-4o)
 * @returns Number of tokens
 */
export function countTokens(text: string, model: string = "gpt-4o"): number {
  try {
    // Map model IDs to tiktoken models
    const tiktokenModel = mapModelToTiktoken(model);
    const encoder = encoding_for_model(tiktokenModel);
    const tokens = encoder.encode(text);
    const count = tokens.length;
    encoder.free();
    return count;
  } catch (error) {
    // Fallback to simple estimation if tiktoken fails
    console.warn(`Token counting failed for model ${model}, using estimation`);
    return estimateTokens(text);
  }
}

/**
 * Map blah.chat model IDs to tiktoken models
 */
function mapModelToTiktoken(model: string): TiktokenModel {
  // Extract base model from provider:model format
  const baseModel = model.includes(":") ? model.split(":")[1] : model;

  // Map to tiktoken models
  if (baseModel.startsWith("gpt-4") || baseModel.startsWith("gpt-5")) {
    return "gpt-4o";
  }
  if (baseModel.startsWith("gpt-3.5")) {
    return "gpt-3.5-turbo";
  }
  if (baseModel.startsWith("o1") || baseModel.startsWith("o3")) {
    return "gpt-4o"; // o1/o3 use similar tokenization
  }
  // Default to gpt-4o for unknown models
  return "gpt-4o";
}

/**
 * Simple token estimation (fallback)
 * Roughly 1 token per 4 characters for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Count tokens for a list of messages
 * Includes per-message overhead for chat format
 */
export function countMessageTokens(
  messages: CoreMessage[],
  model: string = "gpt-4o",
): number {
  let total = 0;

  for (const message of messages) {
    // Message content
    const content =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content);
    total += countTokens(content, model);

    // Per-message overhead (role, formatting, etc.)
    total += 4;
  }

  // Priming tokens for chat format
  total += 3;

  return total;
}

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

export function calculateConversationTokens(
  systemPrompts: string[],
  memories: string[],
  messages: Doc<"messages">[],
  contextLimit: number,
  model: string = "gpt-4o",
): TokenUsage {
  // Count system prompts
  const systemText = systemPrompts.join("\n\n");
  const systemTokens = countTokens(systemText, model);

  // Count memories
  const memoriesText = memories.join("\n");
  const memoriesTokens = countTokens(memoriesText, model);

  // Count messages (convert to CoreMessage format)
  const coreMessages: CoreMessage[] = messages.map((msg) => ({
    role: msg.role as "user" | "assistant" | "system",
    content: msg.content,
  }));
  const messagesTokens = countMessageTokens(coreMessages, model);

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
