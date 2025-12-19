import type { LucideIcon } from "lucide-react";

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  timestamp: number;
}

export type ToolCallState = "executing" | "complete" | "error";

export interface ToolRendererProps {
  call: ToolCall;
  parsedArgs: any;
  parsedResult: any;
  state: ToolCallState;
  ToolIcon: LucideIcon;
}

/**
 * Determine the state of a tool call based on its result
 */
export function getCallState(call: ToolCall): ToolCallState {
  if (!call.result) {
    // Check if tool has been "executing" too long (> 30s = likely stuck)
    const elapsed = Date.now() - call.timestamp;
    if (elapsed > 30000) return "error";
    return "executing";
  }

  try {
    const parsed = JSON.parse(call.result);
    if (parsed.error || parsed.success === false) return "error";
  } catch {}

  return "complete";
}
