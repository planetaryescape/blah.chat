"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { BranchBadge } from "@/components/chat/BranchBadge";
import { ContextWindowIndicator } from "@/components/chat/ContextWindowIndicator";
import { ConversationHeaderMenu } from "@/components/chat/ConversationHeaderMenu";
import { FireButton } from "@/components/chat/FireButton";
import { IncognitoBadge } from "@/components/chat/IncognitoBadge";
import { ModelBadge } from "@/components/chat/ModelBadge";
import { ShareDialog } from "@/components/chat/ShareDialog";
import { ProjectSelector } from "@/components/projects/ProjectSelector";
import { Button } from "@/components/ui/button";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface ChatHeaderProps {
  conversation: Doc<"conversations"> | null | undefined;
  conversationId: Id<"conversations">;
  selectedModel: string;
  modelLoading: boolean;
  hasMessages: boolean;
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
      {/* Navigation buttons - left side next to title */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onNavigatePrevious}
          disabled={isFirst}
          className="h-7 w-7 shrink-0 cursor-pointer"
          title="Previous conversation (⌘[)"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNavigateNext}
          disabled={isLast}
          className="h-7 w-7 shrink-0 cursor-pointer"
          title="Next conversation (⌘])"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 flex-1 min-w-0">
        <h1 className="text-lg font-semibold truncate">
          {conversation?.title || "New Chat"}
        </h1>
      </div>

      <div className="hidden sm:flex items-center gap-2">
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
        {conversation?.isIncognito && <IncognitoBadge />}
      </div>

      {showProjects && !conversation?.isIncognito && (
        <ProjectSelector
          conversationId={conversationId}
          currentProjectId={conversation?.projectId ?? undefined}
        />
      )}

      <div className="flex items-center gap-2">
        {hasMessages && conversationId && (
          <ContextWindowIndicator
            conversationId={conversationId}
            modelId={selectedModel}
          />
        )}
        {conversationId && <BranchBadge conversationId={conversationId} />}
        {/* Hide sharing for incognito - ephemeral by design */}
        {hasMessages && conversationId && !conversation?.isIncognito && (
          <ShareDialog conversationId={conversationId} />
        )}
        {/* Fire button for incognito conversations */}
        {conversation?.isIncognito && (
          <FireButton conversationId={conversationId} />
        )}
        {conversation && <ConversationHeaderMenu conversation={conversation} />}
      </div>
    </header>
  );
}
