import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Plus, Send } from "lucide-react-native";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { userId } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState("");
  const [inputHeight, setInputHeight] = useState(44);

  const hasContent = input.trim().length > 0;

  const handleSend = () => {
    if (!hasContent) return;
    // TODO: Create conversation and navigate
    // router.push(`/(drawer)/chat/${newConversationId}`);
    setInput("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Empty state */}
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-semibold text-foreground mb-2">
          blah.chat
        </Text>
        <Text className="text-muted-foreground text-center">
          Start a conversation with any AI model
        </Text>
      </View>

      {/* Chat input */}
      <View
        className="px-4 pb-2 border-t border-border bg-background"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        <View className="flex-row items-end gap-2 py-2">
          {/* Attachment button */}
          <Pressable
            className="w-10 h-10 items-center justify-center rounded-full bg-secondary"
            onPress={() => {
              // TODO: Open attachment picker
            }}
          >
            <Plus size={20} className="text-foreground" />
          </Pressable>

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

          {/* Send button */}
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
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
