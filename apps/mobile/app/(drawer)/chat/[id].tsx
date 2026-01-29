import { getMobileModels } from "@blah-chat/ai";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import Clipboard from "@react-native-clipboard/clipboard";
import { DrawerActions } from "@react-navigation/native";
import { toast } from "burnt";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Menu } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChatInput,
  type ChatInputRef,
  EditMessageModal,
  MessageActionSheet,
  MessageList,
} from "@/components/chat";
import { ModelPicker } from "@/components/chat/ModelPicker";
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
  const navigation = useNavigation();
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
  const chatInputRef = useRef<ChatInputRef>(null);

  const models = useMemo(() => getMobileModels(), []);
  const selectedModel = conversation?.model || "openai:gpt-5-mini";
  const selectedModelConfig = useMemo(
    () => models.find((m) => m.id === selectedModel),
    [models, selectedModel],
  );

  const isLoading = conversation === undefined || messages === undefined;
  const hasError = conversation === null;

  const prevMsgCountRef = useRef(messages?.length ?? 0);
  const streamingHapticFiredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!messages) return;

    const currentCount = messages.length;
    const prevCount = prevMsgCountRef.current;

    if (currentCount > prevCount && optimisticMessages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      const hasOptimisticAssistant = optimisticMessages.some(
        (m) => m.role === "assistant",
      );

      if (hasOptimisticAssistant && latestMessage?.role === "assistant") {
        if (latestMessage.status === "complete") {
          haptic.success();
        }
        setOptimisticMessages([]);
      }
    }

    prevMsgCountRef.current = currentCount;
  }, [messages, optimisticMessages]);

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
  }, [conversationId]);

  const handleSend = useCallback(
    async (content: string) => {
      if (isSending || !conversationId) return;
      setIsSending(true);

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

        await sendMessage({
          conversationId,
          content,
          modelId: selectedModel,
        });

        // Keep input focused after send
        chatInputRef.current?.focus();
      } catch {
        haptic.error();
        setOptimisticMessages([]);
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, sendMessage, selectedModel, isSending],
  );

  const handleOpenDrawer = useCallback(() => {
    haptic.light();
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

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
        }
        setActionSheetMessage(null);
        return;
      }

      if (conversationId && modelId !== selectedModel) {
        try {
          await updateModel({ conversationId, model: modelId });
        } catch {
          // Silent fail
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

  const DEDUP_WINDOW_MS = 30000;
  const WINDOW_BUCKET = DEDUP_WINDOW_MS;

  const messageKeys = new Set(
    (messages || []).map((m) => {
      const timeBucket = Math.floor(m.createdAt / WINDOW_BUCKET);
      if (m.role === "user") {
        return `user:${m.content?.slice(0, 50)}:${timeBucket}`;
      }
      return `assistant:${timeBucket}`;
    }),
  );

  const filteredOptimistic = optimisticMessages.filter((opt) => {
    const timeBucket = Math.floor(opt.createdAt / WINDOW_BUCKET);
    if (opt.role === "user") {
      const key = `user:${opt.content?.slice(0, 50)}:${timeBucket}`;
      return !messageKeys.has(key);
    }
    const key = `assistant:${timeBucket}`;
    return !messageKeys.has(key);
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
          <TouchableOpacity
            onPress={() => {
              haptic.light();
              handleOpenDrawer();
            }}
            style={{ padding: spacing.xs }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Menu size={24} color={palette.starlight} />
          </TouchableOpacity>
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
          ref={chatInputRef}
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
