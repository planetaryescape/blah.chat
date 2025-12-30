import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc, Id } from "@blah-chat/backend/convex/_generated/dataModel";
import {
  type BottomSheetModal,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import { useAction, useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import { colors } from "@/lib/theme/colors";
import type { Attachment } from "@/lib/utils/fileUtils";

type Message = Doc<"messages">;
type Conversation = Doc<"conversations">;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as Id<"conversations">;
  const modelSelectorRef = useRef<BottomSheetModal>(null);
  const [selectedModel, setSelectedModel] = useState<string | undefined>();
  const [isRecording, setIsRecording] = useState(false);

  const prevMessagesRef = useRef<Message[]>([]);

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const conversation = useQuery(api.conversations.get, { conversationId }) as
    | Conversation
    | null
    | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex query (94+ modules)
  const messages = useQuery(api.messages.list, { conversationId }) as
    | Message[]
    | undefined;

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const sendMessageMutation = useMutation(api.chat.sendMessage);

  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
  const transcribeAudio = useAction(api.transcription.transcribeAudio);

  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const prevMessages = prevMessagesRef.current;

    for (const msg of messages) {
      if (msg.role !== "assistant") continue;

      const prevMsg = prevMessages.find((m) => m._id === msg._id);
      if (!prevMsg) continue;

      if (
        (prevMsg.status === "generating" || prevMsg.status === "pending") &&
        msg.status === "complete"
      ) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      }
    }

    prevMessagesRef.current = messages;
  }, [messages]);

  const handleSend = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      const modelId = selectedModel || conversation?.model || "openai:gpt-4o";

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        await (sendMessageMutation as (args: any) => Promise<any>)({
          conversationId,
          content,
          modelId,
          attachments:
            attachments && attachments.length > 0 ? attachments : undefined,
        });
      } catch (error) {
        console.error("Failed to send message:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [conversationId, sendMessageMutation, conversation, selectedModel],
  );

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModel(modelId);
  }, []);

  const openModelSelector = useCallback(() => {
    modelSelectorRef.current?.present();
  }, []);

  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
  }, []);

  const handleTranscript = useCallback(
    (text: string, audioAttachment?: Attachment) => {
      setIsRecording(false);
      if (text) {
        handleSend(text, audioAttachment ? [audioAttachment] : undefined);
      }
    },
    [handleSend],
  );

  const handleCancelRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const isGenerating = messages?.some(
    (m) => m.status === "generating" || m.status === "pending",
  );

  if (conversation === undefined || messages === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.foreground} />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  if (conversation === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Conversation not found</Text>
      </View>
    );
  }

  return (
    <BottomSheetModalProvider>
      <Stack.Screen
        options={{
          title: conversation.title || "Chat",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <MessageList messages={messages} conversationId={id} />
        {isRecording ? (
          <VoiceRecorder
            onTranscript={handleTranscript}
            onCancel={handleCancelRecording}
            transcribeAudio={transcribeAudio}
            generateUploadUrl={generateUploadUrl}
          />
        ) : (
          <ChatInput
            onSend={handleSend}
            onModelPress={openModelSelector}
            currentModel={selectedModel || conversation.model}
            isGenerating={isGenerating}
            generateUploadUrl={generateUploadUrl}
            onStartRecording={handleStartRecording}
          />
        )}
      </KeyboardAvoidingView>

      <ModelSelector
        ref={modelSelectorRef}
        selectedModel={selectedModel || conversation.model}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.mutedForeground,
  },
  errorText: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.foreground,
  },
});
