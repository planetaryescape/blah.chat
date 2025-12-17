"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { BranchBadge } from "@/components/chat/BranchBadge";
import { ContextWindowIndicator } from "@/components/chat/ContextWindowIndicator";
import { ConversationHeaderMenu } from "@/components/chat/ConversationHeaderMenu";
import { ExtractMemoriesButton } from "@/components/chat/ExtractMemoriesButton";
import { ModelBadge } from "@/components/chat/ModelBadge";
import { ShareDialog } from "@/components/chat/ShareDialog";
import { ProjectSelector } from "@/components/projects/ProjectSelector";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface ChatHeaderProps {
  conversation: Doc<"conversations"> | null | undefined;
  conversationId: Id<"conversations">;
  selectedModel: string;
  modelLoading: boolean;
  hasMessages: boolean;
  messageCount: number;
  isFirst: boolean;
  isLast: boolean;
  isComparisonActive: boolean;
  comparisonModelCount: number;
  showProjects: boolean;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onModelBadgeClick: () => void;
  onComparisonBadgeClick: () => void;
}

export function ChatHeader({
  conversation,
  conversationId,
  selectedModel,
  modelLoading,
  hasMessages,
  messageCount,
  isFirst,
  isLast,
  isComparisonActive,
  comparisonModelCount,
  showProjects,
  onNavigatePrevious,
  onNavigateNext,
  onModelBadgeClick,
  onComparisonBadgeClick,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-4 border-b px-4 py-3 shrink-0">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigatePrevious}
                disabled={isFirst}
                className="h-7 w-7 shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous conversation (⌘[)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <h1 className="text-lg font-semibold truncate">
          {conversation?.title || "New Chat"}
        </h1>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigateNext}
                disabled={isLast}
                className="h-7 w-7 shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next conversation (⌘])</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="hidden sm:block">
        {!modelLoading && selectedModel && (
          <ModelBadge
            modelId={isComparisonActive ? undefined : selectedModel}
            isComparison={isComparisonActive}
            comparisonCount={comparisonModelCount}
            onClick={
              isComparisonActive ? onComparisonBadgeClick : onModelBadgeClick
            }
          />
        )}
      </div>

      {showProjects && (
        <ProjectSelector
          conversationId={conversationId}
          currentProjectId={conversation?.projectId ?? undefined}
        />
      )}

      <div className="flex items-center gap-2">
        {conversationId && messageCount >= 3 && (
          <ExtractMemoriesButton conversationId={conversationId} />
        )}
        {hasMessages && conversationId && (
          <ContextWindowIndicator
            conversationId={conversationId}
            modelId={selectedModel}
          />
        )}
        {conversationId && <BranchBadge conversationId={conversationId} />}
        {hasMessages && conversationId && (
          <ShareDialog conversationId={conversationId} />
        )}
        {conversation && <ConversationHeaderMenu conversation={conversation} />}
      </div>
    </header>
  );
}
