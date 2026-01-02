"use client";

import { useMemo } from "react";
import { getModelConfig } from "@/lib/ai/utils";
import { DEFAULT_CONTEXT_WINDOW } from "@/lib/utils/formatMetrics";
import type { TokenUsage } from "@/types/tokenUsage";

interface UseContextLimitEnforcementOptions {
  tokenUsage: TokenUsage | null | undefined;
  modelId: string;
}

interface UseContextLimitEnforcementReturn {
  /** Percentage of context window used (0-100) */
  percentage: number;
  /** Whether message sending should be blocked (>= 95%) */
  shouldBlockSend: boolean;
  /** Whether auto-compress should trigger (>= 75%) */
  shouldAutoCompress: boolean;
  /** Warning level for UI display */
  warningLevel: "safe" | "caution" | "warning" | "critical";
  /** Current token usage */
  totalTokens: number;
  /** Model's context window limit */
  contextLimit: number;
}

/**
 * Hook for enforcing context window limits.
 *
 * Calculates percentage used and determines if actions should be blocked.
 */
export function useContextLimitEnforcement({
  tokenUsage,
  modelId,
}: UseContextLimitEnforcementOptions): UseContextLimitEnforcementReturn {
  return useMemo(() => {
    const modelConfig = getModelConfig(modelId);
    const contextLimit = modelConfig?.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
    const totalTokens = tokenUsage?.totalTokens ?? 0;

    const percentage = Math.min(
      100,
      Math.round((totalTokens / contextLimit) * 100),
    );

    const shouldBlockSend = percentage >= 95;
    const shouldAutoCompress = percentage >= 75;

    let warningLevel: "safe" | "caution" | "warning" | "critical" = "safe";
    if (percentage >= 95) {
      warningLevel = "critical";
    } else if (percentage >= 85) {
      warningLevel = "warning";
    } else if (percentage >= 70) {
      warningLevel = "caution";
    }

    return {
      percentage,
      shouldBlockSend,
      shouldAutoCompress,
      warningLevel,
      totalTokens,
      contextLimit,
    };
  }, [tokenUsage, modelId]);
}

/**
 * Check if switching to a target model would exceed its context limit.
 */
export function wouldExceedContextLimit(
  currentTokens: number,
  targetModelId: string,
): { exceeded: boolean; targetLimit: number } {
  const targetConfig = getModelConfig(targetModelId);
  const targetLimit = targetConfig?.contextWindow ?? DEFAULT_CONTEXT_WINDOW;

  return {
    exceeded: currentTokens > targetLimit,
    targetLimit,
  };
}
