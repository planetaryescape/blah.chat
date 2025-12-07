"use client";

import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import { useState } from "react";

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  timestamp: number;
}

interface ToolCallDisplayProps {
  toolCalls?: ToolCall[];
  partialToolCalls?: Omit<ToolCall, "result">[];
}

type ToolCallState = "executing" | "complete" | "error";

function getCallState(call: ToolCall): ToolCallState {
  if (!call.result) return "executing";

  try {
    const parsed = JSON.parse(call.result);
    if (parsed.error) return "error";
  } catch {}

  return "complete";
}

export function ToolCallDisplay({
  toolCalls,
  partialToolCalls,
}: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Merge partial (loading) and complete calls
  const allCalls = [
    ...(partialToolCalls?.map((tc) => ({ ...tc, result: undefined })) || []),
    ...(toolCalls || []),
  ];

  // Deduplicate by ID (completed overwrites partial)
  const uniqueCalls = Array.from(
    new Map(allCalls.map((tc) => [tc.id, tc])).values(),
  );

  if (uniqueCalls.length === 0) return null;

  return (
    <div className="space-y-2 my-3">
      {uniqueCalls.map((call) => {
        const isExpanded = expanded[call.id] ?? false;
        const state = getCallState(call);

        let parsedArgs: any;
        let parsedResult: any;
        try {
          parsedArgs = JSON.parse(call.arguments);
          parsedResult = call.result ? JSON.parse(call.result) : null;
        } catch {
          parsedArgs = call.arguments;
          parsedResult = call.result;
        }

        const statusConfig = {
          executing: {
            icon: Loader2,
            color: "text-blue-500",
            label: "RUNNING",
            animate: "animate-spin",
          },
          complete: {
            icon: CheckCircle2,
            color: "text-green-500",
            label: "DONE",
            animate: "",
          },
          error: {
            icon: AlertCircle,
            color: "text-red-500",
            label: "ERROR",
            animate: "",
          },
        }[state];

        const StatusIcon = statusConfig.icon;

        return (
          <div
            key={call.id}
            className="border rounded-lg overflow-hidden bg-muted/30"
          >
            <button
              type="button"
              onClick={() =>
                setExpanded((prev) => ({ ...prev, [call.id]: !prev[call.id] }))
              }
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}

              <Search className="w-4 h-4 shrink-0 text-muted-foreground" />

              <span className="font-medium text-sm">{call.name}</span>

              <Badge variant="outline" className="ml-auto text-xs">
                <StatusIcon
                  className={`w-3 h-3 mr-1 ${statusConfig.color} ${statusConfig.animate}`}
                />
                {statusConfig.label}
              </Badge>

              {parsedResult?.found !== undefined && state === "complete" && (
                <span className="text-xs text-muted-foreground">
                  {parsedResult.found} result
                  {parsedResult.found !== 1 ? "s" : ""}
                </span>
              )}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-2 text-sm border-t">
                <div className="mt-2">
                  <div className="font-medium text-muted-foreground mb-1">
                    Query:
                  </div>
                  <div className="pl-3 border-l-2 text-xs font-mono">
                    {parsedArgs.query}
                  </div>
                </div>

                {parsedResult && (
                  <div>
                    <div className="font-medium text-muted-foreground mb-1">
                      Results:
                    </div>
                    <div className="pl-3 border-l-2 space-y-1 max-h-64 overflow-y-auto">
                      {parsedResult.memories?.map((mem: any, i: number) => (
                        <div key={i} className="text-xs py-1">
                          <span className="font-medium text-primary">
                            [{mem.category}]
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {mem.content}
                          </span>
                        </div>
                      ))}
                      {parsedResult.found === 0 && (
                        <div className="text-muted-foreground text-xs">
                          No memories found
                        </div>
                      )}
                      {state === "error" && (
                        <div className="text-red-500 text-xs">
                          {parsedResult.error || "Tool execution failed"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
