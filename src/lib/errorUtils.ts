/**
 * Client-side error classification and utility functions
 */

export type ErrorSeverity = "fatal" | "error" | "warning" | "info";

/**
 * Classify error severity based on error type and context
 */
export function classifyErrorSeverity(
  error: Error,
  context?: string,
): ErrorSeverity {
  const message = error.message.toLowerCase();

  // Fatal errors - security, data loss, payment
  if (
    message.includes("security") ||
    message.includes("payment") ||
    message.includes("data loss")
  ) {
    return "fatal";
  }

  // Warnings - recoverable issues
  if (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("rate limit") ||
    message.includes("retry")
  ) {
    return "warning";
  }

  // Info - expected errors (validation, user input)
  if (
    message.includes("validation") ||
    message.includes("invalid input") ||
    message.includes("required field")
  ) {
    return "info";
  }

  // Default to error
  return "error";
}

/**
 * Determine if error should be reported to PostHog
 */
export function shouldReportError(error: Error): boolean {
  const ignoredPatterns = [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection",
    "cancelled", // User-initiated cancellations
    "aborted", // User-initiated aborts
  ];

  const message = error.message.toLowerCase();
  return !ignoredPatterns.some((pattern) =>
    message.includes(pattern.toLowerCase()),
  );
}

/**
 * Extract error context from React error boundary
 */
export function extractErrorContext(
  error: Error,
  errorInfo?: React.ErrorInfo,
): Record<string, unknown> {
  return {
    errorName: error.name,
    errorMessage: error.message,
    errorStack: error.stack,
    componentStack: errorInfo?.componentStack,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== "undefined" ? window.navigator.userAgent : null,
    url: typeof window !== "undefined" ? window.location.href : null,
  };
}

/**
 * Create error fingerprint for grouping similar errors
 */
export function createErrorFingerprint(
  error: Error,
  context?: string,
): string[] {
  const fingerprint = [error.name];

  // Add context if provided
  if (context) {
    fingerprint.push(context);
  }

  // Add first line of stack trace for unique grouping
  if (error.stack) {
    const stackLines = error.stack.split("\n");
    if (stackLines.length > 1) {
      fingerprint.push(stackLines[1].trim());
    }
  }

  return fingerprint;
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: Error): string {
  // User-friendly messages for common errors
  const userMessages: Record<string, string> = {
    "Network request failed": "Connection error. Please check your internet and try again.",
    "Failed to fetch": "Unable to connect. Please try again.",
    "Timeout": "Request timed out. Please try again.",
  };

  for (const [pattern, message] of Object.entries(userMessages)) {
    if (error.message.includes(pattern)) {
      return message;
    }
  }

  // Generic fallback
  return "Something went wrong. Please try again or contact support.";
}

/**
 * Rate limit error tracking to prevent spam
 */
const errorRateLimiter = new Map<string, { count: number; timestamp: number }>();

export function shouldThrottleError(
  errorKey: string,
  maxErrors: number = 10,
  windowMs: number = 60000,
): boolean {
  const now = Date.now();
  const entry = errorRateLimiter.get(errorKey);

  if (!entry || now - entry.timestamp > windowMs) {
    errorRateLimiter.set(errorKey, { count: 1, timestamp: now });
    return false;
  }

  if (entry.count >= maxErrors) {
    return true; // Throttle
  }

  entry.count++;
  return false;
}

/**
 * Clean up old rate limiter entries
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of errorRateLimiter.entries()) {
    if (now - entry.timestamp > 300000) {
      // 5 minutes
      errorRateLimiter.delete(key);
    }
  }
}, 60000); // Clean up every minute
