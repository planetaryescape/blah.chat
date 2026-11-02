# Phase 2: Core Chat Implementation

**Duration**: 8-12 hours
**Difficulty**: Advanced
**Prerequisites**: Phase 1 complete, authentication working

---

## What You'll Build

By the end of this phase:

- Conversation list with FlashList v2
- Full chat screen with message list
- Real-time streaming responses via `partialContent`
- Chat input with auto-expanding textarea
- Model selector bottom sheet (46 models)
- Optimistic UI updates
- Message actions (copy, regenerate)
- Resilient generation (survives app crash)

**This is the core feature** - chat with AI using the same Convex backend as web.

---

## Architecture: Resilient Generation

**Server-Side Streaming** (survives page refresh/app crash):

```
1. User sends message
   ↓
2. Immediate DB insert (status: "pending")
   ↓
3. Convex action (10min timeout) streams from LLM
   ↓
4. Action updates DB every ~200ms with partialContent
   ↓
5. Client subscribes via useQuery → auto-updates UI
   ↓
6. On reconnect: see completed response from DB
```

**Why this matters for mobile**: Users switch apps frequently. With resilient generation:
- App backgrounded → response continues server-side
- App killed → response saved in DB
- App reopened → see completed response via reactive query

**Critical Message States**:
- `pending`: User message created, waiting for generation
- `generating`: LLM streaming, `partialContent` updating
- `complete`: Generation finished, final `content` saved
- `error`: Generation failed

---

## Step 1: Install Chat Dependencies

```bash
cd apps/mobile
bun add \
  @shopify/flash-list \
  react-native-markdown-display \
  expo-clipboard \
  @gorhom/bottom-sheet \
  react-native-gesture-handler \
  react-native-reanimated
```

**Dependencies**:
- `@shopify/flash-list`: 5x faster than FlatList for long lists
- `react-native-markdown-display`: Render markdown in AI responses
- `expo-clipboard`: Copy message text
- `@gorhom/bottom-sheet`: Model selector

### Configure Reanimated

Update `apps/mobile/babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ["react-native-reanimated/plugin"], // Must be last
  };
};
```

### Configure app.config.js

Add gesture handler plugin to `apps/mobile/app.config.js`:

```javascript
plugins: [
  "expo-router",
  "expo-secure-store",
  [
    "react-native-reanimated/plugin",
    {
      globals: ["__reanimatedWorkletInit"],
    },
  ],
],
```

---

## Step 2: Create Conversation List

### 2.1 Update Chat Tab

Replace `apps/mobile/app/(tabs)/index.tsx`:

```typescript
// app/(tabs)/index.tsx
import { View, Text, TouchableOpacity, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "convex/react";
import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

type Conversation = Doc<"conversations">;

export default function ConversationsTab() {
  const conversations = useQuery(api.conversations.list);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Convex auto-refreshes via WebSocket, just show UI feedback
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleNewChat = () => {
    router.push("/chat/new");
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      className="bg-card p-4 mx-4 my-1.5 rounded-xl border border-border"
      onPress={() => router.push(`/chat/${item._id}`)}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-lg font-semibold text-foreground flex-1" numberOfLines={1}>
          {item.title || "Untitled Conversation"}
        </Text>
        <View className="flex-row gap-2 ml-2">
          {item.pinned && <Ionicons name="pin" size={14} color="#0066ff" />}
          {item.starred && <Ionicons name="star" size={14} color="#ffd700" />}
        </View>
      </View>
      <Text className="text-sm text-muted">
        {item.model || "No model"} • {new Date(item._creationTime).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background">
      <TouchableOpacity
        className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-primary items-center justify-center z-10 shadow-lg"
        onPress={handleNewChat}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <FlashList
        data={conversations || []}
        renderItem={renderConversation}
        estimatedItemSize={80}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0066ff"
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-24">
            <Ionicons name="chatbubbles-outline" size={64} color="#333" />
            <Text className="text-xl font-semibold text-muted mt-4">
              No conversations yet
            </Text>
            <Text className="text-base text-muted/60 mt-2">
              Tap + to start chatting
            </Text>
          </View>
        }
      />
    </View>
  );
}
```

---

## Step 3: Create Chat Screen

### 3.1 Create Chat Route

Create `apps/mobile/app/chat/[id].tsx`:

```typescript
// app/chat/[id].tsx
import { View, KeyboardAvoidingView, Platform, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { MessageList } from "@/src/components/chat/MessageList";
import { ChatInput } from "@/src/components/chat/ChatInput";
import { useState, useCallback, useRef } from "react";
import { BottomSheetModal, BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ModelSelector } from "@/src/components/chat/ModelSelector";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as Id<"conversations">;
  const modelSelectorRef = useRef<BottomSheetModal>(null);
  const [selectedModel, setSelectedModel] = useState<string | undefined>();

  // Reactive query - auto-updates when conversation changes
  const conversation = useQuery(api.conversations.get, { id: conversationId });

  // Reactive query - auto-updates when messages change (including partialContent)
  const messages = useQuery(api.messages.list, { conversationId });

  // Send message mutation
  const sendMessage = useMutation(api.chat.sendMessage);

  const handleSend = useCallback(
    async (content: string) => {
      const modelId = selectedModel || conversation?.model || "openai:gpt-4o";

      try {
        // sendMessage creates user message AND schedules AI generation
        // The AI response streams via partialContent updates
        await sendMessage({
          conversationId,
          content,
          model: modelId,
        });
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
    [conversationId, sendMessage, conversation, selectedModel]
  );

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const openModelSelector = () => {
    modelSelectorRef.current?.present();
  };

  // Loading state
  if (conversation === undefined || messages === undefined) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#0066ff" />
        <Text className="mt-4 text-base text-muted">Loading chat...</Text>
      </View>
    );
  }

  // Conversation not found
  if (conversation === null) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-xl font-semibold text-foreground">
          Conversation not found
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack.Screen
          options={{
            title: conversation.title || "Chat",
            headerStyle: { backgroundColor: "#000" },
            headerTintColor: "#fff",
          }}
        />
        <KeyboardAvoidingView
          className="flex-1 bg-background"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <MessageList messages={messages} />
          <ChatInput
            onSend={handleSend}
            onModelPress={openModelSelector}
            currentModel={selectedModel || conversation.model}
          />
        </KeyboardAvoidingView>

        <ModelSelector
          ref={modelSelectorRef}
          selectedModel={selectedModel || conversation.model}
          onSelect={handleModelSelect}
        />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
```

### 3.2 Create New Chat Screen

Create `apps/mobile/app/chat/new.tsx`:

```typescript
// app/chat/new.tsx
import { View, KeyboardAvoidingView, Platform, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@blah-chat/backend/convex/_generated/api";
import { ChatInput } from "@/src/components/chat/ChatInput";
import { useState, useCallback, useRef } from "react";
import { BottomSheetModal, BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ModelSelector } from "@/src/components/chat/ModelSelector";
import { Ionicons } from "@expo/vector-icons";

export default function NewChatScreen() {
  const router = useRouter();
  const modelSelectorRef = useRef<BottomSheetModal>(null);
  const [selectedModel, setSelectedModel] = useState("openai:gpt-4o");

  const createConversation = useMutation(api.conversations.create);
  const sendMessage = useMutation(api.chat.sendMessage);

  const handleSend = useCallback(
    async (content: string) => {
      try {
        // Create conversation first
        const conversationId = await createConversation({
          model: selectedModel,
        });

        // Send the first message
        await sendMessage({
          conversationId,
          content,
          model: selectedModel,
        });

        // Navigate to the chat screen
        router.replace(`/chat/${conversationId}`);
      } catch (error) {
        console.error("Failed to create conversation:", error);
      }
    },
    [createConversation, sendMessage, selectedModel, router]
  );

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const openModelSelector = () => {
    modelSelectorRef.current?.present();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack.Screen
          options={{
            title: "New Chat",
            headerStyle: { backgroundColor: "#000" },
            headerTintColor: "#fff",
          }}
        />
        <KeyboardAvoidingView
          className="flex-1 bg-background"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="chatbubble-ellipses-outline" size={80} color="#333" />
            <Text className="text-2xl font-bold text-foreground mt-6 text-center">
              Start a new conversation
            </Text>
            <Text className="text-base text-muted mt-2 text-center">
              Type your message below to begin chatting
            </Text>
          </View>

          <ChatInput
            onSend={handleSend}
            onModelPress={openModelSelector}
            currentModel={selectedModel}
          />
        </KeyboardAvoidingView>

        <ModelSelector
          ref={modelSelectorRef}
          selectedModel={selectedModel}
          onSelect={handleModelSelect}
        />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
```

---

## Step 4: Create Message List Component

Create `apps/mobile/src/components/chat/MessageList.tsx`:

```typescript
// src/components/chat/MessageList.tsx
import { View, Text, Platform, TouchableOpacity } from "react-native";
import { FlashList } from "@shopify/flash-list";
import Markdown from "react-native-markdown-display";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import type { Doc } from "@blah-chat/backend/convex/_generated/dataModel";

type Message = Doc<"messages">;

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const handleCopy = async (content: string) => {
    await Clipboard.setStringAsync(content);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    // Use partialContent while generating, content when complete
    const displayContent = item.partialContent || item.content || "";
    const isGenerating = item.status === "generating";

    return (
      <View className={`px-4 py-2 ${isUser ? "items-end" : "items-start"}`}>
        {/* Message header for assistant */}
        {!isUser && (
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-xs font-semibold text-primary uppercase tracking-wide">
              {item.model || "AI"}
            </Text>
            {isGenerating && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="ellipsis-horizontal" size={12} color="#0066ff" />
                <Text className="text-xs text-muted">Generating...</Text>
              </View>
            )}
          </View>
        )}

        {/* Message bubble */}
        <View
          className={`max-w-[80%] rounded-2xl p-3 ${
            isUser
              ? "bg-primary"
              : "bg-card border border-border"
          }`}
        >
          {isUser ? (
            <Text className="text-base text-foreground leading-relaxed">
              {displayContent}
            </Text>
          ) : (
            <Markdown style={markdownStyles}>{displayContent}</Markdown>
          )}
        </View>

        {/* Message actions for assistant */}
        {!isUser && item.status === "complete" && (
          <View className="flex-row gap-4 mt-2">
            <TouchableOpacity
              className="flex-row items-center gap-1"
              onPress={() => handleCopy(displayContent)}
            >
              <Ionicons name="copy-outline" size={14} color="#666" />
              <Text className="text-xs text-muted">Copy</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error state */}
        {item.status === "error" && (
          <View className="flex-row items-center gap-1 mt-1">
            <Ionicons name="alert-circle" size={12} color="#ff3b30" />
            <Text className="text-xs text-red-500">
              {item.error || "Generation failed"}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Reverse messages for inverted list (newest at bottom)
  const reversedMessages = [...messages].reverse();

  return (
    <FlashList
      data={reversedMessages}
      renderItem={renderMessage}
      estimatedItemSize={120}
      inverted
      contentContainerStyle={{ paddingVertical: 16 }}
      keyExtractor={(item) => item._id}
    />
  );
}

const markdownStyles = {
  body: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  code_inline: {
    backgroundColor: "#2a2a2a",
    color: "#0066ff",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 14,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: "#2a2a2a",
    color: "#fff",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: "#2a2a2a",
    color: "#fff",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  heading1: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700" as const,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600" as const,
    marginTop: 12,
    marginBottom: 6,
  },
  heading3: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600" as const,
    marginTop: 8,
    marginBottom: 4,
  },
  bullet_list: {
    marginVertical: 8,
  },
  ordered_list: {
    marginVertical: 8,
  },
  list_item: {
    marginVertical: 2,
  },
  link: {
    color: "#0066ff",
  },
  blockquote: {
    backgroundColor: "#1a1a1a",
    borderLeftWidth: 3,
    borderLeftColor: "#0066ff",
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
};
```

---

## Step 5: Create Chat Input Component

Create `apps/mobile/src/components/chat/ChatInput.tsx`:

```typescript
// src/components/chat/ChatInput.tsx
import { View, TextInput, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

interface ChatInputProps {
  onSend: (content: string) => void;
  onModelPress?: () => void;
  currentModel?: string;
}

// Map model IDs to display names
function getModelDisplayName(modelId?: string): string {
  if (!modelId) return "Select Model";
  const parts = modelId.split(":");
  if (parts.length < 2) return modelId;
  return parts[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ChatInput({ onSend, onModelPress, currentModel }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [height, setHeight] = useState(40);

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage("");
    setHeight(40);
  };

  const canSend = message.trim().length > 0;

  return (
    <View className="bg-background border-t border-border px-4 py-3">
      {/* Model selector button */}
      {onModelPress && (
        <TouchableOpacity
          className="flex-row items-center gap-1 mb-2"
          onPress={onModelPress}
        >
          <Ionicons name="cube-outline" size={14} color="#666" />
          <Text className="text-xs text-muted">
            {getModelDisplayName(currentModel)}
          </Text>
          <Ionicons name="chevron-down" size={12} color="#666" />
        </TouchableOpacity>
      )}

      <View className="flex-row items-end gap-3">
        <TextInput
          className="flex-1 bg-card rounded-2xl px-4 py-2.5 text-base text-foreground border border-border"
          style={{ height: Math.max(40, Math.min(height, 120)) }}
          placeholder="Message..."
          placeholderTextColor="#666"
          value={message}
          onChangeText={setMessage}
          multiline
          onContentSizeChange={(e) => {
            setHeight(e.nativeEvent.contentSize.height);
          }}
        />
        <TouchableOpacity
          className={`w-10 h-10 rounded-full bg-primary items-center justify-center ${
            !canSend ? "opacity-40" : ""
          }`}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

---

## Step 6: Create Model Selector

Create `apps/mobile/src/components/chat/ModelSelector.tsx`:

```typescript
// src/components/chat/ModelSelector.tsx
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { forwardRef, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";

// Subset of available models for mobile (can expand later)
const MODELS = [
  // OpenAI
  { id: "openai:gpt-4o", name: "GPT-4o", provider: "OpenAI", tier: "flagship" },
  { id: "openai:gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", tier: "fast" },
  { id: "openai:o1", name: "o1", provider: "OpenAI", tier: "reasoning" },
  { id: "openai:o1-mini", name: "o1 Mini", provider: "OpenAI", tier: "reasoning" },

  // Anthropic
  { id: "anthropic:claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic", tier: "flagship" },
  { id: "anthropic:claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "Anthropic", tier: "fast" },

  // Google
  { id: "google:gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", provider: "Google", tier: "fast" },
  { id: "google:gemini-exp-1206", name: "Gemini Exp 1206", provider: "Google", tier: "flagship" },

  // Fast providers
  { id: "groq:llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "Groq", tier: "fast" },
  { id: "cerebras:llama-3.3-70b", name: "Llama 3.3 70B", provider: "Cerebras", tier: "fast" },

  // xAI
  { id: "xai:grok-2-1212", name: "Grok 2", provider: "xAI", tier: "flagship" },
];

interface ModelSelectorProps {
  selectedModel?: string;
  onSelect: (modelId: string) => void;
}

export const ModelSelector = forwardRef<BottomSheetModal, ModelSelectorProps>(
  ({ selectedModel, onSelect }, ref) => {
    const snapPoints = useMemo(() => ["60%"], []);

    // Group models by provider
    const groupedModels = useMemo(() => {
      const groups: Record<string, typeof MODELS> = {};
      for (const model of MODELS) {
        if (!groups[model.provider]) {
          groups[model.provider] = [];
        }
        groups[model.provider].push(model);
      }
      return groups;
    }, []);

    const handleSelect = (modelId: string) => {
      onSelect(modelId);
      // @ts-ignore - ref type
      ref?.current?.dismiss();
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: "#1a1a1a" }}
        handleIndicatorStyle={{ backgroundColor: "#666" }}
      >
        <BottomSheetView className="flex-1 px-5">
          <Text className="text-2xl font-bold text-foreground mb-4">
            Select Model
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {Object.entries(groupedModels).map(([provider, models]) => (
              <View key={provider} className="mb-4">
                <Text className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  {provider}
                </Text>
                {models.map((model) => (
                  <TouchableOpacity
                    key={model.id}
                    className={`flex-row justify-between items-center p-4 rounded-xl mb-2 ${
                      selectedModel === model.id
                        ? "bg-primary/20 border border-primary"
                        : "bg-card"
                    }`}
                    onPress={() => handleSelect(model.id)}
                  >
                    <View>
                      <Text className="text-base font-semibold text-foreground">
                        {model.name}
                      </Text>
                      <Text className="text-xs text-muted mt-0.5 capitalize">
                        {model.tier}
                      </Text>
                    </View>
                    {selectedModel === model.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#0066ff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);
```

---

## Step 7: Add Chat Route to Expo Router

Create `apps/mobile/app/chat/_layout.tsx`:

```typescript
// app/chat/_layout.tsx
import { Stack } from "expo-router";

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#000" },
        headerTintColor: "#fff",
      }}
    />
  );
}
```

---

## Step 8: Update Root Layout for Gesture Handler

Update `apps/mobile/app/_layout.tsx` to include gesture handler:

```typescript
// app/_layout.tsx
import "../lib/polyfills"; // MUST BE FIRST LINE
import "../global.css"; // NativeWind styles

import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Slot } from "expo-router";
import Constants from "expo-constants";
import { tokenCache } from "@/lib/tokenCache";
import { convex } from "@/lib/convex";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const clerkPublishableKey = Constants.expoConfig?.extra?.clerkPublishableKey;

if (!clerkPublishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.\n" +
      "Add it to your .env file."
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        tokenCache={tokenCache}
      >
        <ClerkLoaded>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <Slot />
          </ConvexProviderWithClerk>
        </ClerkLoaded>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
```

---

## How Resilient Generation Works

### Message Flow

```typescript
// 1. User sends message via sendMessage mutation
await sendMessage({
  conversationId,
  content: "Hello",
  model: "openai:gpt-4o",
});

// 2. Backend creates user message + assistant message (status: pending)
// 3. Backend schedules Convex action for generation
// 4. Action streams from LLM, updates partialContent every ~200ms
// 5. Mobile subscribes via useQuery(api.messages.list)
// 6. FlashList auto-updates as partialContent changes
// 7. When complete, status changes to "complete"
```

### What Happens When App Crashes

1. **User sends message** → saved to DB immediately
2. **App crashes during generation**
3. **Server continues streaming** → updates `partialContent` in DB
4. **User reopens app**
5. **useQuery resumes subscription** → sees completed message

**No data lost. Ever.**

---

## Testing Checklist

- [ ] Conversation list loads with FlashList
- [ ] Pull-to-refresh shows indicator
- [ ] Tapping conversation opens chat screen
- [ ] New chat button creates conversation
- [ ] Can send a message
- [ ] Message appears immediately
- [ ] AI response streams in real-time (partialContent)
- [ ] Markdown renders correctly
- [ ] Code blocks display properly
- [ ] Model selector opens and allows selection
- [ ] Copy button works
- [ ] **Critical**: Close app during generation, reopen → see completed response

---

## Troubleshooting

### FlashList "Blank area" warning

**Cause**: Incorrect estimatedItemSize
**Fix**: Adjust estimatedItemSize to match average message height (~120 for messages)

### Messages not streaming

**Cause**: Backend not updating partialContent
**Fix**:
1. Check `cd packages/backend && bunx convex dev` is running
2. Verify `api.messages.list` query is subscribed
3. Check console for Convex errors

### Keyboard covers input

**Cause**: KeyboardAvoidingView misconfigured
**Fix**: Use `behavior="padding"` on iOS, `undefined` on Android

### Model selector not showing

**Cause**: BottomSheet not set up correctly
**Fix**:
1. Ensure `GestureHandlerRootView` wraps app
2. Ensure `BottomSheetModalProvider` wraps chat screen
3. Clear cache: `bunx expo start --clear`

### "Cannot resolve @blah-chat/backend"

**Cause**: Metro not watching workspace
**Fix**:
1. Verify `metro.config.js` has `watchFolders: [monorepoRoot]`
2. Run `bun install` from monorepo root
3. Restart: `bunx expo start --clear`

---

## Success Criteria

You're ready for Phase 3 when:

1. Conversation list shows conversations
2. Can create new chat and send messages
3. AI responses stream in real-time
4. Model selector works
5. **Resilient generation works** (app crash → response saved)

---

## Next Phase Preview

**Phase 3: Files & Voice** will cover:

- Image picker (camera + gallery)
- File upload to Convex storage
- Voice recording with waveform
- Speech-to-text transcription
- Text-to-speech playback

**Estimated Time**: 6-8 hours

---

**Next**: [Phase 3: Files & Voice](./phase-3-files-voice.md)
