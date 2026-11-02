/**
 * Structured Logger for Convex Backend
 *
 * JSON-formatted console logging for better debugging and observability.
 * Works natively with Convex dashboard logs.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
): string {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...Object.fromEntries(
      Object.entries(context ?? {}).map(([key, value]) => [
        key,
        sensitiveKey.test(key) ? "[REDACTED]" : redact(value),
      ]),
    ),
  };
  return JSON.stringify(entry);
}

// Context can include provider credentials and nested tool arguments. Never
// mutate the caller's objects, and handle circular diagnostic objects safely.
const sensitiveKey =
  /authorization|cookie|password|secret|token|api.?key|deploy.?key|access.?key|credential|private.?key|headers/i;
function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string")
    return value
      .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
      .replace(/\b(?:sk|pk|key)-[A-Za-z0-9_-]{12,}/g, "[REDACTED]");
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, seen));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : redact(item, seen),
    ]),
  );
}

function debug(message: string, context?: LogContext): void {
  console.log(formatLog("debug", message, context));
}

function info(message: string, context?: LogContext): void {
  console.log(formatLog("info", message, context));
}

function warn(message: string, context?: LogContext): void {
  console.warn(formatLog("warn", message, context));
}

function error(message: string, context?: LogContext): void {
  console.error(formatLog("error", message, context));
}

export const logger = {
  debug,
  info,
  warn,
  error,
};
