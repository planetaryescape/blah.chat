import { getMobileModels } from "@blah-chat/ai";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useRouter } from "expo-router";
import { ArrowLeft, MessagesSquare } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChatInput, MessageList } from "@/components/chat";
import { ModelPicker } from "@/components/chat/ModelPicker";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import { useCreateConversation, useSendMessage } from "@/lib/hooks";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type Message = Doc<"messages">;

const DEFAULT_MODEL = "openai:gpt-5-mini";

export default function NewChatScreen() {
  const router = useRouter();
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();

  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const pendingNavigationRef = useRef<Id<"conversations"> | null>(null);

  const models = useMemo(() => getMobileModels(), []);
  const selectedModelConfig = useMemo(
    () => models.find((m) => m.id === selectedModel),
    [models, selectedModel],
  );

  const handleSend = useCallback(
    async (content: string) => {
      if (isSending) return;
      setIsSending(true);

      // Haptic feedback on send
      haptic.medium();

      const now = Date.now();

      try {
        // Create optimistic user message
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

        // Create optimistic assistant message (pending)
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

        // Create conversation first
        const conversationId = await createConversation({
          model: selectedModel,
        });

        pendingNavigationRef.current = conversationId;

        // Send message
        await sendMessage({
          conversationId,
          content,
          modelId: selectedModel,
        });

        // Navigate to the new conversation
        router.replace(`/(app)/chat/${conversationId}`);
      } catch {
        haptic.error();
        setOptimisticMessages([]);
      } finally {
        setIsSending(false);
      }
    },
    [createConversation, sendMessage, selectedModel, router, isSending],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

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
          <AnimatedPressable
            onPress={handleBack}
            style={{ padding: spacing.xs }}
          >
            <ArrowLeft size={24} color={palette.starlight} />
          </AnimatedPressable>
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
