import { getMobileModels } from "@blah-chat/ai";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import Clipboard from "@react-native-clipboard/clipboard";
import { toast } from "burnt";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChatInput,
  EditMessageModal,
  MessageActionSheet,
  MessageList,
} from "@/components/chat";
import { ModelPicker } from "@/components/chat/ModelPicker";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
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

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as Id<"conversations">;

  const conversation = useConversation(conversationId);
  const messages = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const updateModel = useUpdateModel();
  const deleteMessage = useDeleteMessage();
  const editMessage = useEditMessage();
  const regenerateMessage = useRegenerateMessage();
  const branchMessage = useBranchMessage();

  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [actionSheetMessage, setActionSheetMessage] = useState<Message | null>(
    null,
  );
  const [isRegenerateMode, setIsRegenerateMode] = useState(false);
  const [editModalMessage, setEditModalMessage] = useState<Message | null>(
    null,
  );

  const models = useMemo(() => getMobileModels(), []);
  const selectedModel = conversation?.model || "openai:gpt-5-mini";
  const selectedModelConfig = useMemo(
    () => models.find((m) => m.id === selectedModel),
    [models, selectedModel],
  );

  const isLoading = conversation === undefined || messages === undefined;
  const hasError = conversation === null;

  // Track previous message count to detect new assistant messages
  // Must be before early returns to satisfy React hooks rules
  const prevMsgCountRef = useRef(messages?.length ?? 0);
  const streamingHapticFiredRef = useRef<string | null>(null);

  // Clear optimistic messages when real messages arrive
  useEffect(() => {
    if (!messages) return;

    const currentCount = messages.length;
    const prevCount = prevMsgCountRef.current;

    // If we have new messages and had optimistic ones
    if (currentCount > prevCount && optimisticMessages.length > 0) {
      // Check if there's a real assistant message now
      const latestMessage = messages[messages.length - 1];
      const hasOptimisticAssistant = optimisticMessages.some(
        (m) => m.role === "assistant",
      );

      if (hasOptimisticAssistant && latestMessage?.role === "assistant") {
        // Real assistant message arrived - clear optimistic and haptic success
        if (latestMessage.status === "complete") {
          haptic.success();
        }
        setOptimisticMessages([]);
      }
    }

    prevMsgCountRef.current = currentCount;
  }, [messages, optimisticMessages]);

  // Haptic when streaming starts (status: generating with content)
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

  // Reset haptic ref when conversation changes
  useEffect(() => {
    streamingHapticFiredRef.current = null;
  }, [conversationId]);

  const handleSend = useCallback(
    async (content: string) => {
      if (isSending || !conversationId) return;
      setIsSending(true);

      // Haptic feedback on send
      haptic.medium();

      const now = Date.now();

      try {
        // Create optimistic user message
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

        // Create optimistic assistant message (pending)
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

        await sendMessage({
          conversationId,
          content,
          modelId: selectedModel,
        });

        // Don't clear optimistic messages here - let dedup handle it
        // This ensures smooth transition when real messages arrive
      } catch {
        haptic.error();
        setOptimisticMessages([]);
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, sendMessage, selectedModel, isSending],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleModelSelect = useCallback(
    async (modelId: string) => {
      setIsModelPickerOpen(false);

      // Handle regenerate mode
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
        }
        setActionSheetMessage(null);
        return;
      }

      if (conversationId && modelId !== selectedModel) {
        try {
          await updateModel({ conversationId, model: modelId });
        } catch {
          // Silent fail - user can retry
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
        // Let createBranch default to true - creates sibling branch + regenerates
        await editMessage({
          messageId: editModalMessage._id,
          content,
        });
        haptic.success();
      } catch {
        haptic.error();
      }
      setEditModalMessage(null);
    },
    [editMessage, editModalMessage],
  );

  const handleEditCancel = useCallback(() => {
    setEditModalMessage(null);
  }, []);

  const handleRegenerate = useCallback((message: Message) => {
    // Store the message for when model is selected
    setActionSheetMessage(message);
    // Open model picker in regenerate mode
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
        router.push(`/chat/${result.conversationId}`);
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

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: palette.void }}
        edges={["top"]}
      >
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={palette.roseQuartz} />
        </View>
      </SafeAreaView>
    );
  }

  if (hasError) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: palette.void }}
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
          <AnimatedPressable
            onPress={handleBack}
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
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  // Deduplicate optimistic messages that now appear in real messages
  // 30s window accommodates slow networks
  const DEDUP_WINDOW_MS = 30000;
  const filteredOptimistic = optimisticMessages.filter((opt) => {
    if (opt.role === "user") {
      const exists = messages?.some(
        (m) =>
          m.role === "user" &&
          m.content === opt.content &&
          Math.abs(m.createdAt - opt.createdAt) < DEDUP_WINDOW_MS,
      );
      return !exists;
    }
    const exists = messages?.some(
      (m) =>
        m.role === "assistant" &&
        Math.abs(m.createdAt - opt.createdAt) < DEDUP_WINDOW_MS,
    );
    return !exists;
  });

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.void }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: palette.void }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: palette.glassBorder,
            height: layout.headerHeight,
          }}
        >
          <AnimatedPressable
            onPress={handleBack}
            style={{ padding: spacing.xs }}
          >
            <ArrowLeft size={24} color={palette.starlight} />
          </AnimatedPressable>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: typography.heading,
                fontSize: 16,
                color: palette.starlight,
              }}
            >
              {conversation.title}
            </Text>
          </View>
        </View>

        {/* Messages */}
        <MessageList
          messages={messages || []}
          conversationId={conversationId}
          optimisticMessages={filteredOptimistic}
          onMorePress={handleMessageLongPress}
          onEdit={handleEdit}
          onRegenerate={handleRegenerate}
          onBranch={handleBranch}
        />

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onModelPress={() => setIsModelPickerOpen(true)}
          modelName={selectedModelConfig?.name || selectedModel}
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
