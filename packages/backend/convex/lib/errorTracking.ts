"use node";

import { PostHog } from "posthog-node";

// Initialize PostHog client for error tracking
let posthogClient: PostHog | null = null;

function getPostHogClient(): PostHog {
  if (!posthogClient) {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST || "https://app.posthog.com";

    if (!apiKey) {
      throw new Error("POSTHOG_API_KEY environment variable is not set");
    }

    posthogClient = new PostHog(apiKey, {
      host,
      flushAt: 1, // Send immediately for errors
      flushInterval: 0,
    });
  }

  return posthogClient;
}

export interface ErrorContext {
  userId?: string;
  conversationId?: string;
  messageId?: string;
  model?: string;
  errorType?: string;
  severity?: "fatal" | "error" | "warning" | "info";
  cost?: number;
  tokensGenerated?: number;
  streamPosition?: number;
  isRetryable?: boolean;
  [key: string]: unknown;
}

/**
 * Capture an exception from Convex server-side code
 * Use this in Convex actions/mutations to track server-side errors
 */
export async function captureException(
  error: Error,
  context?: ErrorContext,
): Promise<void> {
  try {
    const client = getPostHogClient();

    await client.capture({
      distinctId: context?.userId || "anonymous",
      event: "$exception",
      properties: {
        $exception_type: error.name,
        $exception_message: error.message,
        $exception_stack_trace_raw: error.stack,
        $exception_level: context?.severity || "error",
        $exception_source: "convex-server",
        $lib: "convex",
        $lib_version: "1.0.0",
        ...context,
      },
    });

    // Ensure error is sent before action completes
    await client.shutdown();

    // Also log to console for Convex dashboard
    const { logger } = await import("./logger");
    logger.error(`${error.name}: ${error.message}`, {
      tag: "ErrorTracking",
      ...context,
    });
  } catch (captureError) {
    const { logger } = await import("./logger");
    logger.error("Failed to capture exception in PostHog", {
      tag: "ErrorTracking",
      captureError: String(captureError),
    });
    // Still log the original error
    logger.error("Original error", {
      tag: "ErrorTracking",
      errorName: error.name,
      errorMessage: error.message,
      ...context,
    });
  }
}

/** Read HTTP status from SDK errors or wrapped causes without serializing them. */
export function getProviderStatusCode(error: unknown): number | undefined {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const statusCode = "statusCode" in current ? current.statusCode : undefined;
    const status =
      statusCode ?? ("status" in current ? current.status : undefined);
    if (typeof status === "number") return status;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

/** Recognize payment/quota failures, not ordinary rate-limit responses. */
export function detectCreditsError(error: unknown): boolean {
  const errorStr = String(
    error instanceof Error ? error.message : error,
  ).toLowerCase();
  const status = getProviderStatusCode(error);
  // Authentication failures and ordinary throttling are not exhausted credits.
  if (status === 401 || status === 403) return false;
  if (
    status === 429 &&
    !/insufficient[_ ](?:quota|credits|funds)|out of credits|credit balance|exceeded your current quota/.test(
      errorStr,
    )
  )
    return false;

  // Check error message keywords
  const hasCreditKeywords =
    errorStr.includes("credit") ||
    errorStr.includes("quota") ||
    errorStr.includes("insufficient funds") ||
    errorStr.includes("balance") ||
    errorStr.includes("billing limit");

  // Combine both signals
  return status === 402 || hasCreditKeywords;
}

/**
 * Classify AI streaming errors
 */
export function classifyStreamingError(error: Error): string {
  const message = error.message.toLowerCase();
  const status = getProviderStatusCode(error);
  if (status === 401 || status === 403) return "auth_error";
  if (detectCreditsError(error)) return "credits_exhausted";
  if (status === 429) return "rate_limit";
  if (status === 404) return "model_not_found";
  if (status !== undefined && status >= 500) return "gateway_error";

  if (message.includes("timeout") || message.includes("timed out")) {
    return "network_timeout";
  }
  if (message.includes("rate limit") || message.includes("rate_limit")) {
    return "rate_limit";
  }
  if (
    message.includes("content policy") ||
    message.includes("content_policy")
  ) {
    return "content_policy";
  }
  if (message.includes("context") || message.includes("maximum")) {
    return "context_exceeded";
  }
  if (
    message.includes("authentication") ||
    message.includes("unauthorized") ||
    message.includes("api key")
  ) {
    return "auth_error";
  }
  if (message.includes("gateway") || message.includes("upstream")) {
    return "gateway_error";
  }
  if (message.includes("model") && message.includes("not found")) {
    return "model_not_found";
  }

  return "unknown";
}

/**
 * Classify rate limit errors
 */
export function classifyRateLimitError(error: Error): {
  type: "user_budget" | "provider_rate_limit" | "unknown";
  severity: "info" | "error";
  actionable: boolean;
  suggestion: string;
} {
  const message = error.message.toLowerCase();

  if (message.includes("daily_message_limit") || message.includes("budget")) {
    return {
      type: "user_budget",
      severity: "info", // Expected, user-controlled
      actionable: true,
      suggestion: "upgrade_plan",
    };
  }

  if (
    message.includes("rate_limit_exceeded") ||
    message.includes("too many requests")
  ) {
    return {
      type: "provider_rate_limit",
      severity: "error", // System issue
      actionable: false,
      suggestion: "retry_with_backoff",
    };
  }

  return {
    type: "unknown",
    severity: "error",
    actionable: false,
    suggestion: "investigate",
  };
}

/**
 * Detect if error is user-facing (should show to user) or system error
 */
export function isUserFacingError(error: Error): boolean {
  const userFacingPatterns = [
    "rate limit",
    "budget",
    "daily limit",
    "context window",
    "content policy",
    "authentication",
    "invalid input",
  ];

  const message = error.message.toLowerCase();
  return userFacingPatterns.some((pattern) => message.includes(pattern));
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(errorType: string): string {
  const messages: Record<string, string> = {
    network_timeout:
      "The response took too long. Please try again or use a different model.",
    rate_limit:
      "You've hit the rate limit. Please wait a moment and try again.",
    content_policy:
      "This content violates the model's usage policies. Please rephrase your message.",
    context_exceeded:
      "Your conversation is too long for this model. Try starting a new conversation or using a model with a larger context window.",
    auth_error:
      "The AI provider's API key is missing or invalid. Check your API key settings if using your own key, or contact support. You can also select a different model.",
    credits_exhausted:
      "The AI provider has insufficient credits. Check provider billing if using your own key, or contact support. You can also select a different model.",
    gateway_error:
      "We're experiencing issues connecting to the AI service. Please try again.",
    model_not_found:
      "This model is not available. Please select a different model.",
    unknown:
      "An unexpected error occurred. Please try again or contact support if the issue persists.",
  };

  return messages[errorType] || messages.unknown;
}

/**
 * Estimate wasted cost from failed generation
 * Includes both input tokens (conversation context) and output tokens (partial response)
 */
export function estimateWastedCost(
  inputTokens: number,
  outputTokens: number,
  modelPricing: { input: number; output: number },
): number {
  const inputCost = (inputTokens * modelPricing.input) / 1000000;
  const outputCost = (outputTokens * modelPricing.output) / 1000000;
  return inputCost + outputCost;
}
