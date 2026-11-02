/** Convex stores native JSON; HTTP snapshots may still contain encoded JSON. */
export function parseToolValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function formatToolResult(value: unknown): string | null {
  const parsed = parseToolValue(value);
  if (parsed === undefined || parsed === null) return null;
  return typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
}
