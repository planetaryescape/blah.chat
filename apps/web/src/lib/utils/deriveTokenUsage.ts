import type { TokenUsage } from "@/types/tokenUsage";

interface MessageWithTokens {
  inputTokens?: number;
  outputTokens?: number;
}

export function deriveTokenUsage(
  messages: ReadonlyArray<MessageWithTokens> | undefined,
): TokenUsage | undefined {
  if (!messages || messages.length === 0) return undefined;

  let totalTokens = 0;
  for (const message of messages) {
    totalTokens += message.inputTokens ?? 0;
    totalTokens += message.outputTokens ?? 0;
  }

  return { totalTokens };
}
