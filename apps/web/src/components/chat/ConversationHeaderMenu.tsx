"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Archive,
  BarChart3,
  Brain,
  Check,
  Copy,
  Edit,
  Loader2,
  Maximize2,
  MoreHorizontal,
  Pin,
  Presentation,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConversationActions } from "@/hooks/useConversationActions";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useUserPreference } from "@/hooks/useUserPreference";
import { analytics } from "@/lib/analytics";
import { exportConversationToMarkdown } from "@/lib/export/markdown";
import type { ChatWidth } from "@/lib/utils/chatWidth";
import { DeleteConversationDialog } from "../sidebar/DeleteConversationDialog";
import { RenameDialog } from "../sidebar/RenameDialog";

interface ConversationHeaderMenuProps {
  conversation: Doc<"conversations">;
}

export function ConversationHeaderMenu({
  conversation,
}: ConversationHeaderMenuProps) {
  const router = useRouter();
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [copied, setCopied] = useState(false);
  const actions = useConversationActions(conversation._id, "header_menu");
  const { showSlides } = useFeatureToggles();

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const triggerExtraction = useMutation(api.memories.triggerExtraction);
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const messages = useQuery(api.messages.list, {
    conversationId: conversation._id,
  });
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const sources = useQuery(api.sources.operations.getByConversation, {
    conversationId: conversation._id,
  });

  const handleCreatePresentation = () => {
    router.push(`/slides/new?conversationId=${conversation._id}`);
  };

  const handleExtractMemories = async () => {
    setIsExtracting(true);
    try {
      await triggerExtraction({ conversationId: conversation._id });
      toast.success("Memory extraction started! This may take a few moments.");
      analytics.track("memory_extraction_triggered", {
        source: "manual",
        conversationId: conversation._id,
      });
    } catch (_error) {
      toast.error("Failed to start extraction");
    } finally {
      setTimeout(() => setIsExtracting(false), 3000);
    }
  };

  const handleCopyConversation = async () => {
    if (!messages) return;

    // Group sources by messageId
    const sourcesByMessage = new Map<
      Id<"messages">,
      Array<{ position: number; title?: string | null; url: string }>
    >();
    if (sources) {
      for (const src of sources) {
        const existing = sourcesByMessage.get(src.messageId) || [];
        existing.push(src);
        sourcesByMessage.set(src.messageId, existing);
      }
    }

    const markdown = exportConversationToMarkdown(
      conversation,
      messages,
      sourcesByMessage,
    );
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    toast.success("Conversation copied to clipboard");
    setTimeout(() => setCopied(false), 2000);

    analytics.track("conversation_copied", {
      conversationId: conversation._id,
      messageCount: messages.length,
    });
  };

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const _user = useQuery(api.users.getCurrentUser);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePreferences = useMutation(api.users.updatePreferences);

  // Phase 4: Use new preference hooks
  const prefChatWidth = useUserPreference("chatWidth");
  const prefShowMessageStats = useUserPreference("showMessageStatistics");
  const prefShowComparisonStats = useUserPreference("showComparisonStatistics");

  const currentWidth = (prefChatWidth as ChatWidth) || "standard";
  const showMessageStats = prefShowMessageStats ?? false;
  const showComparisonStats = prefShowComparisonStats ?? false;

  const handleWidthChange = async (width: ChatWidth) => {
    try {
      await updatePreferences({
        preferences: { chatWidth: width },
      });
      toast.success("Chat width updated");
    } catch (error) {
      console.error("[ConversationHeaderMenu] Failed to update width:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update width",
      );
    }
  };

  const handleToggleMessageStats = async (checked: boolean) => {
    try {
      await updatePreferences({
        preferences: { showMessageStatistics: checked },
      });
      toast.success(checked ? "Statistics enabled" : "Statistics hidden");
      analytics.track("ui_preference_changed", {
        setting: "show_message_statistics",
        value: checked,
        source: "header_menu",
      });
    } catch (error) {
      console.error(
        "[ConversationHeaderMenu] Failed to update message statistics:",
        error,
      );
      toast.error(
        error instanceof Error ? error.message : "Failed to update statistics",
      );
    }
  };

  const handleToggleComparisonStats = async (checked: boolean) => {
    try {
      await updatePreferences({
        preferences: { showComparisonStatistics: checked },
      });
      toast.success(
        checked ? "Comparison stats enabled" : "Comparison stats hidden",
      );
      analytics.track("ui_preference_changed", {
        setting: "show_comparison_statistics",
        value: checked,
        source: "header_menu",
      });
    } catch (error) {
      console.error(
        "[ConversationHeaderMenu] Failed to update comparison statistics:",
        error,
      );
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update comparison statistics",
      );
    }
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Conversation options</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Conversation options</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowRename(true);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            disabled={!conversation.pinned && conversation.messageCount === 0}
            onClick={(e) => {
              e.stopPropagation();
              actions.handleTogglePin(conversation.pinned);
            }}
          >
            <Pin className="mr-2 h-4 w-4" />
            {conversation.pinned
              ? "Unpin"
              : conversation.messageCount === 0
                ? "Cannot pin empty"
                : "Pin"}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              actions.handleToggleStar(conversation.starred);
            }}
          >
            <Star className="mr-2 h-4 w-4" />
            {conversation.starred ? "Unstar" : "Star"}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              actions.handleArchive();
            }}
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleCopyConversation();
            }}
            disabled={!messages?.length}
          >
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy conversation"}
          </DropdownMenuItem>

          {showSlides && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleCreatePresentation();
              }}
            >
              <Presentation className="mr-2 h-4 w-4" />
              Create Presentation
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              actions.handleAutoRename();
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Auto-rename
          </DropdownMenuItem>

          {/* Only show for non-incognito conversations with enough messages */}
          {!conversation.isIncognito &&
            (conversation.messageCount ?? 0) >= 3 && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleExtractMemories();
                }}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="mr-2 h-4 w-4" />
                )}
                {isExtracting ? "Extracting..." : "Extract Memories"}
              </DropdownMenuItem>
            )}

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Maximize2 className="mr-2 h-4 w-4" />
              Chat Width
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel>Layout Width</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={currentWidth}
                onValueChange={(value) => handleWidthChange(value as ChatWidth)}
              >
                <DropdownMenuRadioItem value="narrow">
                  Narrow (672px)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="standard">
                  Standard (896px)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="wide">
                  Wide (1152px)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="full">
                  Full Width (95%)
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <BarChart3 className="mr-2 h-4 w-4" />
              Statistics
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel>Display Options</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={showMessageStats}
                onCheckedChange={handleToggleMessageStats}
              >
                Message Statistics
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showComparisonStats}
                onCheckedChange={handleToggleComparisonStats}
              >
                Comparison Statistics
              </DropdownMenuCheckboxItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowDelete(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <RenameDialog
        conversation={conversation}
        open={showRename}
        onOpenChange={setShowRename}
      />

      <DeleteConversationDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={actions.handleDelete}
        conversationTitle={conversation.title}
      />
    </>
  );
}
