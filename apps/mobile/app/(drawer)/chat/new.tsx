import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@blah-chat/backend/convex/_generated/api";
import { ChatInput } from "@/components/chat/ChatInput";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { useState, useCallback, useRef } from "react";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import { MessageSquare } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/lib/theme/colors";

export default function NewChatScreen() {
  const router = useRouter();
  const modelSelectorRef = useRef<BottomSheetModal>(null);
  const [selectedModel, setSelectedModel] = useState("openai:gpt-4o");
  const [isSending, setIsSending] = useState(false);

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const createConversation = useMutation(api.conversations.create);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const sendMessage = useMutation(api.chat.sendMessage);

  const handleSend = useCallback(
    async (content: string) => {
      if (isSending) return;

      setIsSending(true);

      // Haptic feedback on send
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        // Create conversation first
        const conversationId = (await createConversation({
          model: selectedModel,
        })) as string;

        // Send the first message
        await sendMessage({
          conversationId,
          content,
          modelId: selectedModel,
        });

        // Navigate to the chat screen
        router.replace(`/chat/${conversationId}`);
      } catch (error) {
        console.error("Failed to create conversation:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsSending(false);
      }
    },
    [createConversation, sendMessage, selectedModel, router, isSending],
  );

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModel(modelId);
  }, []);

  const openModelSelector = useCallback(() => {
    modelSelectorRef.current?.present();
  }, []);

  return (
    <BottomSheetModalProvider>
      <Stack.Screen
        options={{
          title: "New Chat",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.emptyState}>
          <MessageSquare size={80} color={colors.secondary} />
          <Text style={styles.title}>Start a new conversation</Text>
          <Text style={styles.subtitle}>
            Type your message below to begin chatting
          </Text>
        </View>

        <ChatInput
          onSend={handleSend}
          onModelPress={openModelSelector}
          currentModel={selectedModel}
          disabled={isSending}
        />
      </KeyboardAvoidingView>

      <ModelSelector
        ref={modelSelectorRef}
        selectedModel={selectedModel}
        onSelect={handleModelSelect}
      />
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 24,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.mutedForeground,
    marginTop: 8,
    textAlign: "center",
  },
});
