import { useLocalSearchParams } from "expo-router";
import { Send, Square } from "lucide-react-native";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Placeholder message type
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// Placeholder messages for UI development
const PLACEHOLDER_MESSAGES: Message[] = [
  { id: "1", role: "user", content: "Hello, how are you?" },
  {
    id: "2",
    role: "assistant",
    content:
      "Hello! I'm doing well, thank you for asking. How can I help you today?",
  },
  { id: "3", role: "user", content: "Can you explain how React Native works?" },
  {
    id: "4",
    role: "assistant",
    content:
      "React Native is a framework for building native mobile applications using React. It allows you to write your app's UI using React components, which then get translated into native platform components.\n\nKey concepts:\n- **Bridge**: Communicates between JavaScript and native code\n- **Native Components**: React components map to native UI elements\n- **Hot Reloading**: See changes instantly during development",
  },
];

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <View
      className={`px-4 py-2 ${isUser ? "items-end" : "items-start"}`}
    >
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary rounded-br-sm"
            : "bg-secondary rounded-bl-sm"
        }`}
      >
        <Text
          className={`text-base ${
            isUser ? "text-primary-foreground" : "text-foreground"
          }`}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [inputHeight, setInputHeight] = useState(44);
  const [isGenerating, setIsGenerating] = useState(false);

  const hasContent = input.trim().length > 0;

  const handleSend = () => {
    if (!hasContent) return;
    // TODO: Send message via Convex mutation
    setInput("");
  };

  const handleStop = () => {
    // TODO: Stop generation via Convex mutation
    setIsGenerating(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Message list */}
      <FlatList
        data={PLACEHOLDER_MESSAGES}
        renderItem={({ item }) => <MessageBubble message={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        inverted={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Chat input */}
      <View
        className="px-4 pb-2 border-t border-border bg-background"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        <View className="flex-row items-end gap-2 py-2">
          {/* Text input */}
          <View className="flex-1 bg-secondary rounded-2xl px-4 py-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Message..."
              placeholderTextColor="#71717a"
              multiline
              className="text-foreground text-base"
              style={{
                minHeight: 24,
                maxHeight: 120,
                height: Math.min(Math.max(inputHeight, 24), 120),
              }}
              onContentSizeChange={(e) => {
                setInputHeight(e.nativeEvent.contentSize.height);
              }}
            />
          </View>

          {/* Send/Stop button */}
          {isGenerating ? (
            <Pressable
              className="w-10 h-10 items-center justify-center rounded-full bg-destructive"
              onPress={handleStop}
            >
              <Square size={16} className="text-destructive-foreground" fill="currentColor" />
            </Pressable>
          ) : (
            <Pressable
              className={`w-10 h-10 items-center justify-center rounded-full ${
                hasContent ? "bg-primary" : "bg-secondary"
              }`}
              onPress={handleSend}
              disabled={!hasContent}
            >
              <Send
                size={18}
                className={hasContent ? "text-primary-foreground" : "text-muted-foreground"}
              />
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
