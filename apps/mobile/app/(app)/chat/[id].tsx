import { getMobileModels } from "@blah-chat/ai";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChatInput, MessageList } from "@/components/chat";
import { ModelPicker } from "@/components/chat/ModelPicker";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import {
  useConversation,
  useMessages,
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

  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

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
      } catch (error) {
        console.error("Failed to send message:", error);
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
      if (conversationId && modelId !== selectedModel) {
        try {
          await updateModel({ conversationId, model: modelId });
        } catch (error) {
          console.error("Failed to update model:", error);
        }
      }
    },
    [conversationId, selectedModel, updateModel],
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
          optimisticMessages={filteredOptimistic}
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
          onClose={() => setIsModelPickerOpen(false)}
          selectedModel={selectedModel}
          onSelectModel={handleModelSelect}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
