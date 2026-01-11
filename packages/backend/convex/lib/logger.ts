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
    ...context,
  };
  return JSON.stringify(entry);
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
