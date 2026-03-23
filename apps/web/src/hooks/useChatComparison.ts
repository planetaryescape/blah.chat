"use client";

import { useComparisonHandlers } from "./useComparisonHandlers";

interface UseChatComparisonOptions {
  conversationId: string | undefined;
  messages: any[] | undefined;
}

export function useChatComparison({
  conversationId,
  messages,
}: UseChatComparisonOptions) {
  return useComparisonHandlers({
    conversationId,
    messages,
  });
}
