export type MessageStatus =
  | "pending"
  | "generating"
  | "complete"
  | "stopped"
  | "error";

const TERMINAL_STATUSES: Set<MessageStatus> = new Set([
  "complete",
  "stopped",
  "error",
]);

export function isTerminalStatus(status: MessageStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}
