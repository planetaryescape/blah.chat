"use client";

import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatTTFT } from "@/lib/utils/formatMetrics";

interface MessageStatsBadgesProps {
  modelName: string;
  ttft: number | null;
  isCached: boolean;
  tokensPerSecond?: number;
  inputTokens?: number;
  outputTokens?: number;
  status: string;
  showStats: boolean;
}

/**
 * Statistics badges for assistant messages.
 * Displays model name, TTFT, TPS, and token counts with tooltips.
 */
export function MessageStatsBadges({
  modelName,
  ttft,
  isCached,
  tokensPerSecond,
  inputTokens,
  outputTokens,
  status,
  showStats,
}: MessageStatsBadgesProps) {
  return (
    <div className="mt-3 pt-3 border-t border-border/10 flex flex-wrap items-center gap-2 transition-opacity duration-300">
      {/* Model name - ALWAYS visible */}
      <Badge
        variant="outline"
        className="text-[10px] h-5 bg-background/50 backdrop-blur border-border/50 text-muted-foreground"
      >
        {modelName}
      </Badge>

      {/* Statistics - conditional based on user preference */}
      {showStats && (
        <>
          {/* TTFT badge */}
          {ttft !== null && (
            <TooltipProvider>
              {isCached ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 bg-background/50 backdrop-blur border-border/50 text-muted-foreground"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      cached
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div className="font-semibold">Cached Response</div>
                      <div className="text-muted-foreground">
                        Served instantly from cache
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] h-5 font-mono tabular-nums cursor-help bg-background/50 backdrop-blur border-border/50 text-muted-foreground",
                        status === "generating" && "animate-pulse",
                      )}
                    >
                      TTFT: {formatTTFT(ttft)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div className="font-semibold">Time to First Token</div>
                      <div className="text-muted-foreground">
                        {status === "generating"
                          ? "AI started responding"
                          : "How long until AI started responding"}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          )}

          {/* TPS badge (completed only) */}
          {tokensPerSecond && status === "complete" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 font-mono tabular-nums cursor-help bg-background/50 backdrop-blur border-border/50 text-muted-foreground"
                  >
                    TPS: {Math.round(tokensPerSecond)} t/s
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-semibold">Tokens Per Second</div>
                    <div className="text-muted-foreground">
                      Generation speed: {Math.round(tokensPerSecond)} tokens/sec
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Token count badge */}
          {(inputTokens !== undefined || outputTokens !== undefined) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 font-mono tabular-nums cursor-help bg-background/50 backdrop-blur border-border/50 text-muted-foreground"
                  >
                    {inputTokens || 0}/{outputTokens || 0}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-semibold">Token Count</div>
                    <div className="text-muted-foreground">
                      Input: {inputTokens?.toLocaleString() || 0}
                    </div>
                    <div className="text-muted-foreground">
                      Output: {outputTokens?.toLocaleString() || 0}
                    </div>
                    <div className="text-muted-foreground font-semibold mt-1">
                      Total:{" "}
                      {(
                        (inputTokens || 0) + (outputTokens || 0)
                      ).toLocaleString()}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </>
      )}
    </div>
  );
}
