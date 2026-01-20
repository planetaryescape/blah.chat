"use client";

import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { Check, Copy, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type SiblingWithDuration,
  useBranchComparison,
} from "@/hooks/useBranchComparison";
import { useUserPreference } from "@/hooks/useUserPreference";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "./MarkdownContent";

interface BranchComparisonSheetProps {
  messageId: Id<"messages">;
  conversationId: Id<"conversations">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BranchComparisonSheet({
  messageId,
  conversationId,
  open,
  onOpenChange,
}: BranchComparisonSheetProps) {
  const { siblings, switchToBranch, regenerate, copyContent } =
    useBranchComparison({ messageId, conversationId });

  const showStats = useUserPreference("showComparisonStatistics");
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const [activeTab, setActiveTab] = useState<string>(messageId);

  // Sort siblings by siblingIndex
  const sortedSiblings = useMemo(() => {
    return [...siblings].sort(
      (a, b) => (a.siblingIndex ?? 0) - (b.siblingIndex ?? 0),
    );
  }, [siblings]);

  // Find the active sibling (currently displayed in chat)
  const activeSiblingId = useMemo(() => {
    const active = sortedSiblings.find((s) => s.isActiveBranch);
    return active?._id ?? messageId;
  }, [sortedSiblings, messageId]);

  // Max 4 siblings for comparison view
  const displayedSiblings = sortedSiblings.slice(0, 4);
  const hasMoreSiblings = sortedSiblings.length > 4;

  const handleSelectBranch = async (targetId: Id<"messages">) => {
    if (targetId === activeSiblingId) return;
    await switchToBranch(targetId);
    onOpenChange(false);
  };

  const handleRegenerate = async (msgId: Id<"messages">) => {
    await regenerate(msgId);
    onOpenChange(false);
  };

  // Mobile: Tabs view
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[85vh] flex flex-col p-0 sm:max-w-full"
        >
          <SheetHeader className="p-4 pb-2 border-b">
            <SheetTitle>Compare Versions</SheetTitle>
            <SheetDescription>
              {sortedSiblings.length} version
              {sortedSiblings.length !== 1 && "s"}
              {hasMoreSiblings && " (showing first 4)"}
            </SheetDescription>
          </SheetHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col"
          >
            <TabsList className="w-full justify-start overflow-x-auto no-scrollbar px-4 py-2 h-auto">
              {displayedSiblings.map((sibling, idx) => (
                <TabsTrigger
                  key={sibling._id}
                  value={sibling._id}
                  className="flex-shrink-0 min-w-[80px] gap-1"
                >
                  {sibling._id === activeSiblingId && (
                    <Check className="h-3 w-3" />
                  )}
                  {sibling.model?.split(":")[1] || `V${idx + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>

            {displayedSiblings.map((sibling, idx) => (
              <TabsContent
                key={sibling._id}
                value={sibling._id}
                className="flex-1 flex flex-col m-0 data-[state=active]:flex"
              >
                <BranchPanel
                  sibling={sibling}
                  index={idx}
                  isActive={sibling._id === activeSiblingId}
                  showStats={showStats}
                  onSelect={() => handleSelectBranch(sibling._id)}
                  onCopy={() => copyContent(sibling.content || "")}
                  onRegenerate={() => handleRegenerate(sibling._id)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Side-by-side grid
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex flex-col p-0",
          displayedSiblings.length === 2 && "sm:max-w-2xl",
          displayedSiblings.length === 3 && "sm:max-w-4xl",
          displayedSiblings.length >= 4 && "sm:max-w-6xl",
        )}
      >
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle>Compare Versions</SheetTitle>
          <SheetDescription>
            {sortedSiblings.length} version{sortedSiblings.length !== 1 && "s"}
            {hasMoreSiblings && " (showing first 4)"}
          </SheetDescription>
        </SheetHeader>

        <div
          className={cn(
            "flex-1 grid gap-3 p-4 overflow-hidden",
            displayedSiblings.length === 2 && "grid-cols-2",
            displayedSiblings.length === 3 && "grid-cols-3",
            displayedSiblings.length >= 4 && "grid-cols-2 xl:grid-cols-4",
          )}
        >
          {displayedSiblings.map((sibling, idx) => (
            <BranchPanel
              key={sibling._id}
              sibling={sibling}
              index={idx}
              isActive={sibling._id === activeSiblingId}
              showStats={showStats}
              onSelect={() => handleSelectBranch(sibling._id)}
              onCopy={() => copyContent(sibling.content || "")}
              onRegenerate={() => handleRegenerate(sibling._id)}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface BranchPanelProps {
  sibling: SiblingWithDuration;
  index: number;
  isActive: boolean;
  showStats: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
}

function BranchPanel({
  sibling,
  index,
  isActive,
  showStats,
  onSelect,
  onCopy,
  onRegenerate,
}: BranchPanelProps) {
  const isGenerating = ["pending", "generating"].includes(sibling.status);
  const displayContent = sibling.partialContent || sibling.content || "";
  const modelName = sibling.model?.split(":")[1] || sibling.model || "Unknown";

  const formatDuration = (ms: number | null) => {
    if (ms === null) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full border rounded-lg overflow-hidden",
        isActive && "border-primary ring-1 ring-primary/20",
      )}
    >
      {/* Header */}
      <div className="flex flex-col items-start gap-2 p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 w-full">
          <Badge variant={isActive ? "default" : "secondary"}>
            {modelName}
          </Badge>
          {isActive && (
            <Badge variant="outline" className="text-xs">
              Active
            </Badge>
          )}
          {sibling.forkReason && (
            <Badge variant="outline" className="text-xs capitalize">
              {sibling.forkReason.replace("_", " ")}
            </Badge>
          )}
        </div>
        {showStats && (
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-1 w-full pl-1">
            <span>{sibling.inputTokens?.toLocaleString() || 0} in</span>
            <span>•</span>
            <span>{sibling.outputTokens?.toLocaleString() || 0} out</span>
            <span>•</span>
            <span className="font-mono">
              ${sibling.cost?.toFixed(4) || "0.0000"}
            </span>
            {sibling.generationDuration !== null && (
              <>
                <span>•</span>
                <span className="font-mono">
                  {formatDuration(sibling.generationDuration)}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {displayContent ? (
          <MarkdownContent
            content={displayContent}
            isStreaming={isGenerating}
          />
        ) : (
          <div className="flex gap-1 items-center h-6">
            <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-150" />
            <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-300" />
          </div>
        )}
      </div>

      {/* Footer - Actions */}
      <div className="p-3 border-t flex items-center gap-2">
        {!isActive ? (
          <Button
            onClick={onSelect}
            size="sm"
            className="flex-1"
            disabled={isGenerating}
          >
            <Check className="h-4 w-4 mr-1" />
            Select
          </Button>
        ) : (
          <div className="flex-1 text-sm text-muted-foreground text-center">
            Currently active
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onCopy}
              size="icon"
              variant="ghost"
              disabled={!displayContent || isGenerating}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy content</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onRegenerate}
              size="icon"
              variant="ghost"
              disabled={isGenerating}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Regenerate (creates new version)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
