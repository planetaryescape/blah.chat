"use client";

import { MIN_MESSAGES_FOR_COMPACTION } from "@blah-chat/shared/limits";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useReducer } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConversationActions } from "@/hooks/useConversationActions";
import {
  updatePreferenceCache,
  useUserPreference,
} from "@/hooks/useUserPreference";
import { analytics } from "@/lib/analytics";
import { useApiClient } from "@/lib/api/client";
import { useSDKClient } from "@/lib/api/sdkClient";
import { exportConversationToMarkdown } from "@/lib/export/markdown";
import type { ChatWidth } from "@/lib/utils/chatWidth";
import { DeleteConversationDialog } from "../sidebar/DeleteConversationDialog";
import { RenameDialog } from "../sidebar/RenameDialog";
import { ConversationHeaderMenuContent } from "./ConversationHeaderMenuContent";

interface ConversationHeaderMenuProps {
  conversation: any;
}

interface ConversationHeaderMenuState {
  showRename: boolean;
  showDelete: boolean;
  isExtracting: boolean;
  isCompacting: boolean;
  copied: boolean;
}

type ConversationHeaderMenuAction = {
  type: "set";
  key: keyof ConversationHeaderMenuState;
  value: boolean;
};

const INITIAL_MENU_STATE: ConversationHeaderMenuState = {
  showRename: false,
  showDelete: false,
  isExtracting: false,
  isCompacting: false,
  copied: false,
};

function conversationHeaderMenuReducer(
  state: ConversationHeaderMenuState,
  action: ConversationHeaderMenuAction,
): ConversationHeaderMenuState {
  if (state[action.key] === action.value) {
    return state;
  }

  return { ...state, [action.key]: action.value };
}

export function ConversationHeaderMenu({
  conversation,
}: ConversationHeaderMenuProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    conversationHeaderMenuReducer,
    INITIAL_MENU_STATE,
  );
  const actions = useConversationActions(conversation._id, "header_menu");
  const apiClient = useApiClient();
  const sdk = useSDKClient();
  const setState = (key: keyof ConversationHeaderMenuState, value: boolean) =>
    dispatch({ type: "set", key, value });

  const handleExtractMemories = () => {
    setState("isExtracting", true);
    void sdk
      .extractMemories(conversation._id)
      .then(() => {
        toast.success(
          "Memory extraction started! This may take a few moments.",
        );
        analytics.track("memory_extraction_triggered", {
          source: "manual",
          conversationId: conversation._id,
        });
      })
      .catch(() => {
        toast.error("Failed to start extraction");
      })
      .finally(() => {
        setTimeout(() => setState("isExtracting", false), 3000);
      });
  };

  const handleCompactConversation = () => {
    setState("isCompacting", true);
    void apiClient
      .post<{
        conversationId: string;
      }>(`/api/v1/conversations/${conversation._id}/compact`, {
        targetModel: conversation.model,
      })
      .then(({ conversationId }) => {
        toast.success("Conversation compacted!");
        analytics.track("conversation_compacted", {
          source: "manual",
          conversationId: conversation._id,
        });
        router.push(`/chat/${conversationId}`);
      })
      .catch(() => {
        toast.error("Failed to compact conversation");
      })
      .finally(() => {
        setState("isCompacting", false);
      });
  };

  const handleCopyConversation = async () => {
    const [messages, sources] = await Promise.all([
      apiClient.get<
        Array<{
          data: {
            _id: string;
            role: "user" | "assistant" | "system";
            content: string;
          };
        }>
      >(`/api/v1/conversations/${conversation._id}/messages`),
      apiClient.get<
        Array<{
          data: {
            messageId: string;
            position: number;
            title?: string | null;
            url: string;
          };
        }>
      >(`/api/v1/conversations/${conversation._id}/sources`),
    ]);

    const sourcesByMessage = new Map<
      string,
      Array<{ position: number; title?: string | null; url: string }>
    >();
    for (const entry of sources) {
      const source = entry.data;
      const existing = sourcesByMessage.get(source.messageId) || [];
      existing.push(source);
      sourcesByMessage.set(source.messageId, existing);
    }

    const markdown = exportConversationToMarkdown(
      conversation,
      messages.map((entry) => entry.data),
      sourcesByMessage,
    );
    await navigator.clipboard.writeText(markdown);
    setState("copied", true);
    toast.success("Conversation copied to clipboard");
    setTimeout(() => setState("copied", false), 2000);

    analytics.track("conversation_copied", {
      conversationId: conversation._id,
      messageCount: messages.length,
    });
  };

  // Phase 4: Use new preference hooks
  const prefChatWidth = useUserPreference("chatWidth");
  const prefShowMessageStats = useUserPreference("showMessageStatistics");
  const prefShowComparisonStats = useUserPreference("showComparisonStatistics");

  const currentWidth = (prefChatWidth as ChatWidth) || "standard";
  const showMessageStats = prefShowMessageStats ?? false;
  const showComparisonStats = prefShowComparisonStats ?? false;
  const canExtractMemories =
    !conversation.isIncognito && (conversation.messageCount ?? 0) >= 3;
  const canCompactConversation =
    (conversation.messageCount ?? 0) >= MIN_MESSAGES_FOR_COMPACTION;

  const handleWidthChange = (width: ChatWidth) => {
    void sdk
      .updatePreference("chatWidth", width)
      .then(() => {
        toast.success("Chat width updated");
      })
      .catch((error) => {
        console.error(
          "[ConversationHeaderMenu] Failed to update width:",
          error,
        );
        toast.error(
          error instanceof Error ? error.message : "Failed to update width",
        );
      });
  };

  const handleToggleMessageStats = (checked: boolean) => {
    void updatePreferenceCache("showMessageStatistics", checked)
      .then(() => sdk.updatePreference("showMessageStatistics", checked))
      .then(() => {
        toast.success(checked ? "Statistics enabled" : "Statistics hidden");
        analytics.track("ui_preference_changed", {
          setting: "show_message_statistics",
          value: checked,
          source: "header_menu",
        });
      })
      .catch((error) => {
        void updatePreferenceCache("showMessageStatistics", !checked);
        console.error(
          "[ConversationHeaderMenu] Failed to update message statistics:",
          error,
        );
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update statistics",
        );
      });
  };

  const handleToggleComparisonStats = (checked: boolean) => {
    void updatePreferenceCache("showComparisonStatistics", checked)
      .then(() => sdk.updatePreference("showComparisonStatistics", checked))
      .then(() => {
        toast.success(
          checked ? "Comparison stats enabled" : "Comparison stats hidden",
        );
        analytics.track("ui_preference_changed", {
          setting: "show_comparison_statistics",
          value: checked,
          source: "header_menu",
        });
      })
      .catch((error) => {
        void updatePreferenceCache("showComparisonStatistics", !checked);
        console.error(
          "[ConversationHeaderMenu] Failed to update comparison statistics:",
          error,
        );
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update comparison statistics",
        );
      });
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

        <ConversationHeaderMenuContent
          conversation={conversation}
          copied={state.copied}
          currentWidth={currentWidth}
          isCompacting={state.isCompacting}
          isExtracting={state.isExtracting}
          showComparisonStats={showComparisonStats}
          showMessageStats={showMessageStats}
          canCompactConversation={canCompactConversation}
          canExtractMemories={canExtractMemories}
          onArchive={actions.handleArchive}
          onAutoRename={actions.handleAutoRename}
          onCompactConversation={handleCompactConversation}
          onCopyConversation={() => {
            handleCopyConversation().catch(() => {
              toast.error("Failed to copy conversation");
            });
          }}
          onDelete={() => setState("showDelete", true)}
          onExtractMemories={handleExtractMemories}
          onRename={() => setState("showRename", true)}
          onToggleComparisonStats={handleToggleComparisonStats}
          onToggleMessageStats={handleToggleMessageStats}
          onTogglePin={() => actions.handleTogglePin(conversation.pinned)}
          onToggleStar={() => actions.handleToggleStar(conversation.starred)}
          onWidthChange={handleWidthChange}
        />
      </DropdownMenu>

      <RenameDialog
        conversation={conversation}
        open={state.showRename}
        onOpenChange={(open) => setState("showRename", open)}
      />

      <DeleteConversationDialog
        open={state.showDelete}
        onOpenChange={(open) => setState("showDelete", open)}
        onConfirm={actions.handleDelete}
        conversationTitle={conversation.title}
      />
    </>
  );
}
