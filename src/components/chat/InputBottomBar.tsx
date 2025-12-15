"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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
 * Contains model switcher, thinking effort selector, comparison trigger, and keyboard hints.
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
    <div className="px-4 pb-2 flex justify-between items-center">
      <div className="flex items-center gap-2">
        {isComparisonMode && onExitComparison ? (
          <Badge variant="secondary" className="mr-2 flex items-center gap-2">
            Comparing {selectedModels.length} models
            <Button
              size="icon"
              variant="ghost"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={onExitComparison}
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
        {onStartComparison && (
          <ComparisonTrigger
            onStartComparison={onStartComparison}
            isActive={isComparisonMode}
            open={comparisonDialogOpen}
            onOpenChange={onComparisonDialogOpenChange}
          />
        )}
      </div>
      <KeyboardHints isEmpty={isEmpty} hasContent={hasContent} />
    </div>
  );
}
