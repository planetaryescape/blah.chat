"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { MIN_MESSAGES_FOR_COMPACTION } from "@blah-chat/shared/limits";
import { useMutation } from "convex/react";
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
  Shrink,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useReducer } from "react";
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

interface ConversationHeaderMenuProps {
  conversation: Doc<"conversations">;
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

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePreferences = useMutation(api.users.updatePreferences);

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
    void updatePreferences({
      preferences: { chatWidth: width },
    })
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
      .then(() =>
        updatePreferences({
          preferences: { showMessageStatistics: checked },
        }),
      )
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
      .then(() =>
        updatePreferences({
          preferences: { showComparisonStatistics: checked },
        }),
      )
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

function ConversationHeaderMenuContent({
  conversation,
  copied,
  currentWidth,
  isCompacting,
  isExtracting,
  showComparisonStats,
  showMessageStats,
  canCompactConversation,
  canExtractMemories,
  onArchive,
  onAutoRename,
  onCompactConversation,
  onCopyConversation,
  onDelete,
  onExtractMemories,
  onRename,
  onToggleComparisonStats,
  onToggleMessageStats,
  onTogglePin,
  onToggleStar,
  onWidthChange,
}: {
  conversation: Doc<"conversations">;
  copied: boolean;
  currentWidth: ChatWidth;
  isCompacting: boolean;
  isExtracting: boolean;
  showComparisonStats: boolean;
  showMessageStats: boolean;
  canCompactConversation: boolean;
  canExtractMemories: boolean;
  onArchive: () => void;
  onAutoRename: () => void;
  onCompactConversation: () => void;
  onCopyConversation: () => void;
  onDelete: () => void;
  onExtractMemories: () => void;
  onRename: () => void;
  onToggleComparisonStats: (checked: boolean) => void;
  onToggleMessageStats: (checked: boolean) => void;
  onTogglePin: () => void;
  onToggleStar: () => void;
  onWidthChange: (width: ChatWidth) => void;
}) {
  return (
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onRename();
        }}
      >
        <Edit className="mr-2 h-4 w-4" />
        Rename
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <ConversationPrimaryActions
        conversation={conversation}
        copied={copied}
        isCompacting={isCompacting}
        isExtracting={isExtracting}
        canCompactConversation={canCompactConversation}
        canExtractMemories={canExtractMemories}
        onArchive={onArchive}
        onAutoRename={onAutoRename}
        onCompactConversation={onCompactConversation}
        onCopyConversation={onCopyConversation}
        onExtractMemories={onExtractMemories}
        onTogglePin={onTogglePin}
        onToggleStar={onToggleStar}
      />

      <DropdownMenuSeparator />

      <ConversationPreferencesMenu
        currentWidth={currentWidth}
        showComparisonStats={showComparisonStats}
        showMessageStats={showMessageStats}
        onToggleComparisonStats={onToggleComparisonStats}
        onToggleMessageStats={onToggleMessageStats}
        onWidthChange={onWidthChange}
      />

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

function ConversationPrimaryActions({
  conversation,
  copied,
  isCompacting,
  isExtracting,
  canCompactConversation,
  canExtractMemories,
  onArchive,
  onAutoRename,
  onCompactConversation,
  onCopyConversation,
  onExtractMemories,
  onTogglePin,
  onToggleStar,
}: {
  conversation: Doc<"conversations">;
  copied: boolean;
  isCompacting: boolean;
  isExtracting: boolean;
  canCompactConversation: boolean;
  canExtractMemories: boolean;
  onArchive: () => void;
  onAutoRename: () => void;
  onCompactConversation: () => void;
  onCopyConversation: () => void;
  onExtractMemories: () => void;
  onTogglePin: () => void;
  onToggleStar: () => void;
}) {
  return (
    <>
      <DropdownMenuItem
        disabled={!conversation.pinned && conversation.messageCount === 0}
        onClick={(event) => {
          event.stopPropagation();
          onTogglePin();
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
        onClick={(event) => {
          event.stopPropagation();
          onToggleStar();
        }}
      >
        <Star className="mr-2 h-4 w-4" />
        {conversation.starred ? "Unstar" : "Star"}
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onArchive();
        }}
      >
        <Archive className="mr-2 h-4 w-4" />
        Archive
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onCopyConversation();
        }}
        disabled={conversation.messageCount === 0}
      >
        {copied ? (
          <Check className="mr-2 h-4 w-4" />
        ) : (
          <Copy className="mr-2 h-4 w-4" />
        )}
        {copied ? "Copied!" : "Copy conversation"}
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onCompactConversation();
        }}
        disabled={isCompacting || !canCompactConversation}
      >
        {isCompacting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Shrink className="mr-2 h-4 w-4" />
        )}
        {isCompacting ? "Compacting..." : "Compact conversation"}
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(event) => {
          event.stopPropagation();
          onAutoRename();
        }}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Auto-rename
      </DropdownMenuItem>

      {canExtractMemories && (
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onExtractMemories();
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
    </>
  );
}

function ConversationPreferencesMenu({
  currentWidth,
  showComparisonStats,
  showMessageStats,
  onToggleComparisonStats,
  onToggleMessageStats,
  onWidthChange,
}: {
  currentWidth: ChatWidth;
  showComparisonStats: boolean;
  showMessageStats: boolean;
  onToggleComparisonStats: (checked: boolean) => void;
  onToggleMessageStats: (checked: boolean) => void;
  onWidthChange: (width: ChatWidth) => void;
}) {
  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Maximize2 className="mr-2 h-4 w-4" />
          Chat Width
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuLabel>Layout Width</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={currentWidth}
            onValueChange={(value) => onWidthChange(value as ChatWidth)}
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
            onCheckedChange={onToggleMessageStats}
          >
            Message Statistics
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showComparisonStats}
            onCheckedChange={onToggleComparisonStats}
          >
            Comparison Statistics
          </DropdownMenuCheckboxItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
