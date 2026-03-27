import { getMobileModels } from "@blah-chat/ai";
import Clipboard from "@react-native-clipboard/clipboard";
import { toast } from "burnt";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronDown, SquarePen } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  type AttachmentInput,
  ChatInput,
  type ChatInputRef,
  type ChatInputSendPayload,
  ComparisonModelPicker,
  EditMessageModal,
  MessageActionSheet,
  MessageList,
  MessageListSkeleton,
  TemplatePicker,
  ThinkingEffortPicker,
} from "@/components/chat";
import { ModelPicker } from "@/components/chat/ModelPicker";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import {
  clearChatDraft,
  readChatDraft,
  writeChatDraft,
} from "@/lib/chat/drafts";
import type { Doc, Id } from "@/lib/convex";
import { haptic } from "@/lib/haptics";
import {
  useBranchMessage,
  useConversation,
  useDeleteMessage,
  useEditMessage,
  useMessages,
  useRegenerateMessage,
  useSendMessage,
  useUpdateModel,
} from "@/lib/hooks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type Message = Doc<"messages">;

const DEDUP_WINDOW_MS = 30000;

export default function ChatScreen() {
  const router = useRouter();
  const { id, messageId } = useLocalSearchParams<{
    id: string;
    messageId?: string | string[];
  }>();
  const conversationId = id as Id<"conversations">;
  const focusMessageId = useMemo(() => {
    if (!messageId) return null;
    if (Array.isArray(messageId)) {
      return (messageId[0] ?? null) as Id<"messages"> | null;
    }
    return messageId as Id<"messages">;
  }, [messageId]);

  const conversation = useConversation(conversationId);
  const messages = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const updateModel = useUpdateModel();
  const deleteMessage = useDeleteMessage();
  const editMessage = useEditMessage();
  const regenerateMessage = useRegenerateMessage();
  const branchMessage = useBranchMessage();

  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isThinkingPickerOpen, setIsThinkingPickerOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isComparePickerOpen, setIsComparePickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [draftText, setDraftText] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<AttachmentInput[]>(
    [],
  );
  const [thinkingEffort, setThinkingEffort] = useState<
    "none" | "low" | "medium" | "high"
  >("none");
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [composerModel, setComposerModel] = useState("openai:gpt-5-mini");
  const [scrollToBottomKey, setScrollToBottomKey] = useState(0);
  const [actionSheetMessage, setActionSheetMessage] = useState<Message | null>(
    null,
  );
  const [isRegenerateMode, setIsRegenerateMode] = useState(false);
  const [editModalMessage, setEditModalMessage] = useState<Message | null>(
    null,
  );
  const chatInputRef = useRef<ChatInputRef>(null);

  const models = useMemo(() => getMobileModels(), []);
  const selectedModel = composerModel;
  const selectedModelConfig = useMemo(
    () => models.find((m) => m.id === selectedModel),
    [models, selectedModel],
  );

  useEffect(() => {
    const draft = readChatDraft(String(conversationId));
    if (draft) {
      setDraftText(draft.text);
      setDraftAttachments(draft.attachments);
      setComposerModel(
        draft.selectedModel ?? conversation?.model ?? "openai:gpt-5-mini",
      );
      setThinkingEffort(draft.thinkingEffort);
      setIsComparisonMode(draft.comparisonMode);
      setSelectedModels(draft.selectedModels);
      return;
    }

    setDraftText("");
    setDraftAttachments([]);
    setComposerModel(conversation?.model ?? "openai:gpt-5-mini");
    setThinkingEffort("none");
    setIsComparisonMode(false);
    setSelectedModels([]);
  }, [conversation?.model, conversationId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      writeChatDraft(String(conversationId), {
        text: draftText,
        attachments: draftAttachments,
        selectedModel: composerModel,
        thinkingEffort,
        comparisonMode: isComparisonMode,
        selectedModels,
        quote: null,
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    composerModel,
    conversationId,
    draftAttachments,
    draftText,
    isComparisonMode,
    selectedModels,
    thinkingEffort,
  ]);

  const isLoading = conversation === undefined || messages === undefined;
  const hasError = conversation === null;

  const streamingHapticFiredRef = useRef<string | null>(null);
  const completionHapticRef = useRef<string | null>(null);

  // Haptic on assistant completion (replaces eager-clear effect)
  useEffect(() => {
    if (!messages) return;
    const latest = messages[messages.length - 1];
    if (
      latest?.role === "assistant" &&
      latest.status === "complete" &&
      completionHapticRef.current !== latest._id
    ) {
      haptic.success();
      completionHapticRef.current = latest._id;
    }
  }, [messages]);

  useEffect(() => {
    if (!messages) return;
    const latest = messages[messages.length - 1];
    if (
      latest?.role === "assistant" &&
      latest.status === "generating" &&
      (latest.content || latest.partialContent) &&
      streamingHapticFiredRef.current !== latest._id
    ) {
      haptic.light();
      streamingHapticFiredRef.current = latest._id;
    }
  }, [messages]);

  useEffect(() => {
    streamingHapticFiredRef.current = null;
    completionHapticRef.current = null;
    setOptimisticMessages([]);
  }, [conversationId]);

  const handleSend = useCallback(
    async ({ content, attachments }: ChatInputSendPayload) => {
      if (isSending || !conversationId) return;
      setIsSending(true);
      setScrollToBottomKey((current) => current + 1);

      haptic.medium();

      const now = Date.now();

      try {
        const optimisticUserMessage: Message = {
          _id: `optimistic-user-${now}` as Id<"messages">,
          _creationTime: now,
          conversationId,
          userId: "me" as Id<"users">,
          role: "user",
          content,
          status: "complete",
          createdAt: now,
          updatedAt: now,
          siblingIndex: 0,
          isActiveBranch: true,
        };

        const optimisticAssistantMessage: Message = {
          _id: `optimistic-assistant-${now}` as Id<"messages">,
          _creationTime: now + 1,
          conversationId,
          userId: "assistant" as Id<"users">,
          role: "assistant",
          content: "",
          status: "pending",
          model: selectedModel,
          createdAt: now + 1,
          updatedAt: now + 1,
          siblingIndex: 0,
          isActiveBranch: true,
        };

        setOptimisticMessages([
          optimisticUserMessage,
          optimisticAssistantMessage,
        ]);

        const sendTarget =
          typeof conversationId === "string" &&
          conversationId.startsWith("local_conv_")
            ? { localConversationId: conversationId }
            : { conversationId };

        await sendMessage({
          ...sendTarget,
          content,
          ...(isComparisonMode && selectedModels.length >= 2
            ? { models: selectedModels }
            : { modelId: selectedModel }),
          thinkingEffort,
          attachments,
        });

        clearChatDraft(String(conversationId));
        setDraftText("");
        setDraftAttachments([]);

        // Keep input focused after send
        chatInputRef.current?.focus();
      } catch (_error) {
        haptic.error();
        toast({ preset: "error", title: "Failed to send message" });
        setOptimisticMessages([]);
      } finally {
        setIsSending(false);
      }
    },
    [
      conversationId,
      isComparisonMode,
      isSending,
      selectedModel,
      selectedModels,
      sendMessage,
      thinkingEffort,
    ],
  );

  const handleModelSelect = useCallback(
    async (modelId: string) => {
      setIsModelPickerOpen(false);

      if (isRegenerateMode && actionSheetMessage) {
        setIsRegenerateMode(false);
        try {
          haptic.medium();
          await regenerateMessage({
            messageId: actionSheetMessage._id,
            modelId,
          });
          haptic.success();
        } catch {
          haptic.error();
          toast({ preset: "error", title: "Failed to regenerate" });
        }
        setActionSheetMessage(null);
        return;
      }

      if (conversationId && modelId !== selectedModel) {
        const previousModel = selectedModel;
        try {
          setComposerModel(modelId);
          await updateModel({ conversationId, model: modelId });
        } catch {
          setComposerModel(previousModel);
          haptic.error();
          toast({ preset: "error", title: "Failed to switch model" });
        }
      }
    },
    [
      conversationId,
      selectedModel,
      updateModel,
      isRegenerateMode,
      actionSheetMessage,
      regenerateMessage,
    ],
  );

  const handleMessageLongPress = useCallback((message: Message) => {
    haptic.selection();
    setActionSheetMessage(message);
  }, []);

  const handleCloseActionSheet = useCallback(() => {
    setActionSheetMessage(null);
  }, []);

  const handleCopy = useCallback((message: Message) => {
    const content = message.content || "";
    Clipboard.setString(content);
    toast({ preset: "done", title: "Copied" });
    haptic.success();
    setActionSheetMessage(null);
  }, []);

  const handleEdit = useCallback((message: Message) => {
    setActionSheetMessage(null);
    setEditModalMessage(message);
  }, []);

  const handleEditSave = useCallback(
    async (content: string) => {
      if (!editModalMessage) return;
      try {
        haptic.medium();
        await editMessage({
          messageId: editModalMessage._id,
          content,
        });
        haptic.success();
      } catch {
        haptic.error();
        toast({ preset: "error", title: "Failed to edit message" });
      }
      setEditModalMessage(null);
    },
    [editMessage, editModalMessage],
  );

  const handleEditCancel = useCallback(() => {
    setEditModalMessage(null);
  }, []);

  const handleRegenerate = useCallback((message: Message) => {
    setActionSheetMessage(message);
    setIsRegenerateMode(true);
    setIsModelPickerOpen(true);
  }, []);

  const handleBranch = useCallback(
    async (message: Message) => {
      try {
        haptic.medium();
        const result = await branchMessage({ messageId: message._id });
        haptic.success();
        toast({ preset: "done", title: "Branch created" });
        router.push(`/(drawer)/chat/${result.conversationId}`);
      } catch {
        haptic.error();
        toast({ preset: "error", title: "Failed to branch" });
      }
      setActionSheetMessage(null);
    },
    [branchMessage, router],
  );

  const handleDelete = useCallback(
    (message: Message) => {
      Alert.alert(
        "Delete Message",
        "Are you sure you want to delete this message? This will also delete all replies.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                haptic.medium();
                await deleteMessage({ messageId: message._id });
                haptic.success();
                toast({ preset: "done", title: "Deleted" });
              } catch {
                haptic.error();
                toast({ preset: "error", title: "Failed to delete" });
              }
            },
          },
        ],
      );
      setActionSheetMessage(null);
    },
    [deleteMessage],
  );

  const currentMessages = (messages ?? []) as Message[];

  const messageKeys = useMemo(() => {
    if (currentMessages.length === 0) return new Set<string>();
    return new Set(
      currentMessages.map((m: Message) => {
        const timeBucket = Math.floor(m.createdAt / DEDUP_WINDOW_MS);
        if (m.role === "user") {
          return `user:${m.content?.slice(0, 50)}:${timeBucket}`;
        }
        return `assistant:${timeBucket}`;
      }),
    );
  }, [currentMessages]);

  const filteredOptimistic = useMemo(
    () =>
      optimisticMessages.filter((opt) => {
        const timeBucket = Math.floor(opt.createdAt / DEDUP_WINDOW_MS);
        if (opt.role === "user") {
          const key = `user:${opt.content?.slice(0, 50)}:${timeBucket}`;
          return !messageKeys.has(key);
        }
        const key = `assistant:${timeBucket}`;
        return !messageKeys.has(key);
      }),
    [optimisticMessages, messageKeys],
  );

  const newChatButton = (
    <TouchableOpacity
      onPress={() => {
        haptic.light();
        router.push("/(drawer)/chat/new");
      }}
      style={{ padding: spacing.xs }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <SquarePen size={22} color={palette.starlight} />
    </TouchableOpacity>
  );

  const modelBadge = (
    <TouchableOpacity
      onPress={() => {
        haptic.light();
        setIsModelPickerOpen(true);
      }}
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        backgroundColor: palette.glassLow,
        borderRadius: layout.radius.full,
        borderWidth: 1,
        borderColor: palette.glassBorder,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          fontFamily: typography.body,
          fontSize: 11,
          color: palette.starlight,
        }}
      >
        {selectedModelConfig?.name || selectedModel}
      </Text>
      <ChevronDown size={12} color={palette.starlightDim} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <ScreenHeader
          title="Chat"
          leftAction="menu"
          rightAction={newChatButton}
          subtitle={modelBadge}
        />
        <MessageListSkeleton />
      </SafeAreaView>
    );
  }

  if (hasError) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.xl,
          }}
        >
          <Text
            style={{
              fontFamily: typography.heading,
              fontSize: 18,
              color: palette.error,
              textAlign: "center",
            }}
          >
            Conversation not found
          </Text>
          <TouchableOpacity
            onPress={() => {
              haptic.light();
              router.back();
            }}
            style={{
              marginTop: spacing.lg,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              backgroundColor: palette.glassLow,
              borderRadius: layout.radius.full,
            }}
          >
            <Text
              style={{
                fontFamily: typography.bodySemiBold,
                fontSize: 15,
                color: palette.starlight,
              }}
            >
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "transparent" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScreenHeader
          title={conversation.title}
          leftAction="menu"
          rightAction={newChatButton}
          subtitle={modelBadge}
        />

        {/* Messages */}
        <MessageList
          messages={messages || []}
          conversationId={conversationId}
          optimisticMessages={filteredOptimistic}
          focusMessageId={focusMessageId}
          onMorePress={handleMessageLongPress}
          onEdit={handleEdit}
          onRegenerate={handleRegenerate}
          onBranch={handleBranch}
          scrollToBottomKey={scrollToBottomKey}
        />

        {/* Input */}
        <ChatInput
          ref={chatInputRef}
          onSend={handleSend}
          value={draftText}
          onChangeText={setDraftText}
          attachments={draftAttachments}
          onAttachmentsChange={setDraftAttachments}
          modelName={selectedModelConfig?.name || selectedModel}
          onModelPress={() => setIsModelPickerOpen(true)}
          onThinkingPress={() => setIsThinkingPickerOpen(true)}
          onTemplatePress={() => setIsTemplatePickerOpen(true)}
          onComparePress={() => setIsComparePickerOpen(true)}
          conversationId={conversationId}
          disabled={isSending}
          isSending={isSending}
        />

        {/* Model Picker */}
        <ModelPicker
          isOpen={isModelPickerOpen}
          onClose={() => {
            setIsModelPickerOpen(false);
            if (isRegenerateMode) {
              setIsRegenerateMode(false);
              setActionSheetMessage(null);
            }
          }}
          selectedModel={selectedModel}
          onSelectModel={handleModelSelect}
        />
        <ThinkingEffortPicker
          isOpen={isThinkingPickerOpen}
          value={thinkingEffort}
          onClose={() => setIsThinkingPickerOpen(false)}
          onSelect={(value) => {
            setThinkingEffort(value);
            setIsThinkingPickerOpen(false);
          }}
        />
        <TemplatePicker
          isOpen={isTemplatePickerOpen}
          onClose={() => setIsTemplatePickerOpen(false)}
          onSelectTemplate={(prompt) => {
            setDraftText((current) =>
              current.trim().length > 0 ? `${current}\n${prompt}` : prompt,
            );
            setIsTemplatePickerOpen(false);
          }}
        />
        <ComparisonModelPicker
          isOpen={isComparePickerOpen}
          selectedModels={selectedModels}
          onClose={() => setIsComparePickerOpen(false)}
          onConfirm={(models) => {
            setSelectedModels(models);
            setIsComparisonMode(models.length >= 2);
            setIsComparePickerOpen(false);
          }}
        />

        {/* Message Action Sheet */}
        <MessageActionSheet
          isOpen={!!actionSheetMessage && !isRegenerateMode}
          onClose={handleCloseActionSheet}
          message={actionSheetMessage}
          onCopy={handleCopy}
          onEdit={handleEdit}
          onRegenerate={handleRegenerate}
          onBranch={handleBranch}
          onDelete={handleDelete}
        />

        {/* Edit Message Modal */}
        <EditMessageModal
          visible={!!editModalMessage}
          initialContent={editModalMessage?.content || ""}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
