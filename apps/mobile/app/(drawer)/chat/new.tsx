import { getMobileModels } from "@blah-chat/ai";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  Brain,
  ChevronDown,
  PenLine,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ChatInputSendPayload } from "@/components/chat";
import { ChatInput, type ChatInputRef, MessageList } from "@/components/chat";
import { ModelPicker } from "@/components/chat/ModelPicker";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import type { Doc, Id } from "@/lib/convex";
import { haptic } from "@/lib/haptics";
import {
  useCreateConversation,
  useSendMessage,
  useStarterSuggestions,
} from "@/lib/hooks";
import { usePreferences } from "@/lib/hooks/usePreferences";
import {
  getTimeGreeting,
  type SuggestionIcon,
} from "@/lib/prompts/suggestions";
import { layout, palette, spacing, typography } from "@/lib/theme/designSystem";

type Message = Doc<"messages">;

const FALLBACK_MODEL = "openai:gpt-5-mini";
const PROMPT_ICON_MAP: Record<SuggestionIcon, typeof Sparkles> = {
  sparkles: Sparkles,
  brain: Brain,
  zap: Zap,
  penLine: PenLine,
};

export default function NewChatScreen() {
  const router = useRouter();
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  const { suggestions: starterSuggestions } = useStarterSuggestions();
  const prefs = usePreferences();

  const initialModel = useMemo(() => {
    if (!prefs) return FALLBACK_MODEL;
    const mode = prefs.newChatModelSelection as string;
    if (mode === "fixed") {
      return prefs.defaultModel || FALLBACK_MODEL;
    }
    // "recent" mode — use defaultModel as fallback (recent model tracking not available on mobile yet)
    return prefs.defaultModel || FALLBACK_MODEL;
  }, [prefs]);

  const [selectedModel, setSelectedModel] = useState(FALLBACK_MODEL);

  // Sync selectedModel when prefs load
  useEffect(() => {
    if (initialModel !== FALLBACK_MODEL) {
      setSelectedModel(initialModel);
    }
  }, [initialModel]);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
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
    async ({ content, attachments }: ChatInputSendPayload) => {
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

        await sendMessage({
          conversationId,
          content,
          modelId: selectedModel,
          attachments,
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

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    setIsModelPickerOpen(false);
  }, []);

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
          title="New Chat"
          leftAction="menu"
          subtitle={modelBadge}
        />

        {/* Content */}
        {optimisticMessages.length === 0 && draftText.trim().length === 0 ? (
          <View
            style={{
              flex: 1,
              paddingTop: spacing.xxl,
              paddingHorizontal: spacing.lg,
            }}
          >
            <Text
              style={{
                fontFamily: typography.heading,
                fontSize: 28,
                color: palette.starlight,
                marginBottom: spacing.xl,
              }}
            >
              {getTimeGreeting()}
            </Text>

            <View style={{ gap: spacing.xs }}>
              {starterSuggestions.map((prompt, index) => {
                const Icon = PROMPT_ICON_MAP[prompt.icon];
                return (
                  <Reanimated.View
                    key={prompt.id}
                    entering={FadeIn.delay(index * 100).duration(250)}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        handleSend({
                          content: prompt.text,
                        })
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing.sm,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.md,
                        borderRadius: layout.radius.md,
                        borderWidth: 1,
                        borderColor: palette.glassBorder,
                        backgroundColor: palette.glassLow,
                      }}
                    >
                      <Icon size={16} color={palette.roseQuartz} />
                      <Text
                        style={{
                          flex: 1,
                          fontFamily: typography.body,
                          fontSize: 14,
                          color: palette.starlight,
                        }}
                      >
                        {prompt.text}
                      </Text>
                      <ArrowRight size={14} color={palette.starlightDim} />
                    </TouchableOpacity>
                  </Reanimated.View>
                );
              })}
            </View>
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
          onDraftChange={setDraftText}
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
