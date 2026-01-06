"use client";

import { Info, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ComparisonTrigger } from "./ComparisonTrigger";
import { KeyboardHints } from "./KeyboardHints";
import { QuickModelSwitcher } from "./QuickModelSwitcher";
import {
  type ThinkingEffort,
  ThinkingEffortSelector,
} from "./ThinkingEffortSelector";

interface InputBottomBarProps {
  // Comparison mode
  isComparisonMode: boolean;
  selectedModels: string[];
  onExitComparison?: () => void;
  onStartComparison?: (models: string[]) => void;
  comparisonDialogOpen?: boolean;
  onComparisonDialogOpenChange?: (open: boolean) => void;

  // Model selection
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  modelSelectorOpen?: boolean;
  onModelSelectorOpenChange?: (open: boolean) => void;

  // Thinking effort
  supportsThinking: boolean;
  thinkingEffort?: ThinkingEffort;
  onThinkingEffortChange?: (effort: ThinkingEffort) => void;

  // Keyboard hints
  isEmpty: boolean;
  hasContent: boolean;
}

/**
 * Bottom control bar for the chat input.
 * Layout: [Model + Thinking] ←spacer→ [Compare + Keyboard + Info]
 */
export function InputBottomBar({
  isComparisonMode,
  selectedModels,
  onExitComparison,
  onStartComparison,
  comparisonDialogOpen,
  onComparisonDialogOpenChange,
  selectedModel,
  onModelChange,
  modelSelectorOpen,
  onModelSelectorOpenChange,
  supportsThinking,
  thinkingEffort,
  onThinkingEffortChange,
  isEmpty,
  hasContent,
}: InputBottomBarProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      {/* Left group: Primary actions (Model + Thinking) */}
      <div className="flex items-center gap-1.5">
        {isComparisonMode && onExitComparison ? (
          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 pr-1 text-xs font-medium"
          >
            <span className="text-muted-foreground">Comparing</span>
            <span className="text-foreground">{selectedModels.length}</span>
            <Button
              size="icon"
              variant="ghost"
              className="w-4 h-4 p-0 rounded-full hover:bg-muted/50"
              onClick={onExitComparison}
              aria-label="Exit comparison mode"
            >
              <X className="w-3 h-3" />
            </Button>
          </Badge>
        ) : (
          <QuickModelSwitcher
            currentModel={selectedModel}
            onSelectModel={onModelChange}
            open={modelSelectorOpen ?? false}
            onOpenChange={onModelSelectorOpenChange ?? (() => {})}
            mode="single"
            showTrigger={true}
          />
        )}

        {supportsThinking &&
          thinkingEffort &&
          onThinkingEffortChange &&
          !isComparisonMode && (
            <ThinkingEffortSelector
              value={thinkingEffort}
              onChange={onThinkingEffortChange}
            />
          )}
      </div>

      {/* Right group: Secondary actions (Compare + Keyboard + Info) */}
      <div className="flex items-center gap-0.5">
        {onStartComparison && (
          <ComparisonTrigger
            onStartComparison={onStartComparison}
            isActive={isComparisonMode}
            selectedModels={selectedModels}
            open={comparisonDialogOpen}
            onOpenChange={onComparisonDialogOpenChange}
          />
        )}

        <KeyboardHints isEmpty={isEmpty} hasContent={hasContent} />

        <AIInfoTooltip />
      </div>
    </div>
  );
}

/**
 * AI disclaimer moved to compact info icon with tooltip.
 * Recovers vertical space while keeping the information accessible.
 */
function AIInfoTooltip() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-transparent"
          aria-label="AI information"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" align="end" className="max-w-xs">
        <p className="text-xs text-muted-foreground">
          AI can make mistakes.{" "}
          <Link
            href="/ai-info"
            className="underline transition-colors hover:text-foreground"
          >
            Verify important info
          </Link>
          .
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
