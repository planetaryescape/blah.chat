import { getMobileModels } from "@blah-chat/ai";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";
import { Menu, MessagesSquare } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChatInput, type ChatInputRef, MessageList } from "@/components/chat";
import { ModelPicker } from "@/components/chat/ModelPicker";
import { haptic } from "@/lib/haptics";
import { useCreateConversation, useSendMessage } from "@/lib/hooks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type Message = Doc<"messages">;

const DEFAULT_MODEL = "openai:gpt-5-mini";

export default function NewChatScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();

  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const pendingNavigationRef = useRef<Id<"conversations"> | null>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  const models = useMemo(() => getMobileModels(), []);
  const selectedModelConfig = useMemo(
    () => models.find((m) => m.id === selectedModel),
    [models, selectedModel],
  );

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => chatInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      if (isSending) return;
      setIsSending(true);

      haptic.medium();

      const now = Date.now();

      try {
        const optimisticUserMessage: Message = {
          _id: `optimistic-user-${now}` as Id<"messages">,
          _creationTime: now,
          conversationId: "new" as Id<"conversations">,
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
          conversationId: "new" as Id<"conversations">,
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

        const conversationId = await createConversation({
          model: selectedModel,
        });

        pendingNavigationRef.current = conversationId;

        await sendMessage({
          conversationId,
          content,
          modelId: selectedModel,
        });

        router.replace(`/(drawer)/chat/${conversationId}`);
      } catch {
        haptic.error();
        setOptimisticMessages([]);
      } finally {
        setIsSending(false);
      }
    },
    [createConversation, sendMessage, selectedModel, router, isSending],
  );

  const handleOpenDrawer = useCallback(() => {
    haptic.light();
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    setIsModelPickerOpen(false);
  }, []);

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
          <Text
            style={{
              flex: 1,
              fontFamily: typography.heading,
              fontSize: 18,
              color: palette.starlight,
              marginLeft: spacing.sm,
            }}
          >
            New Chat
          </Text>
        </View>

        {/* Content */}
        {optimisticMessages.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: spacing.xl,
              backgroundColor: palette.void,
            }}
          >
            <MessagesSquare
              size={48}
              color={palette.starlightDim}
              strokeWidth={1.5}
            />
            <Text
              style={{
                fontFamily: typography.heading,
                fontSize: 18,
                color: palette.starlight,
                marginTop: spacing.lg,
                textAlign: "center",
              }}
            >
              Start a conversation
            </Text>
            <Text
              style={{
                fontFamily: typography.body,
                fontSize: 14,
                color: palette.starlightDim,
                marginTop: spacing.sm,
                textAlign: "center",
              }}
            >
              Type a message below to begin
            </Text>
          </View>
        ) : (
          <MessageList
            messages={[]}
            conversationId={"new" as Id<"conversations">}
            optimisticMessages={optimisticMessages}
          />
        )}

        {/* Input */}
        <ChatInput
          ref={chatInputRef}
          onSend={handleSend}
          onModelPress={() => setIsModelPickerOpen(true)}
          modelName={selectedModelConfig?.name || selectedModel}
          disabled={isSending}
          isSending={isSending}
          placeholder="Start a new conversation..."
        />

        {/* Model Picker */}
        <ModelPicker
          isOpen={isModelPickerOpen}
          onClose={() => setIsModelPickerOpen(false)}
          selectedModel={selectedModel}
          onSelectModel={handleModelSelect}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
