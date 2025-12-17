# Phase 2: Core Chat Implementation

**Duration**: 8-12 hours
**Difficulty**: Advanced
**Prerequisites**: Phase 1 complete, authentication working

---

## Project Context

### What is blah.chat?

blah.chat is a personal AI chat assistant with 60+ AI models, conversation branching, real-time streaming, and resilient generation (responses survive disconnections). This phase implements the core chat experience on mobile.

### Architecture Pattern: Resilient Generation

**Server-Side Streaming** (survives page refresh):
1. User sends message → immediate DB insert with `status: "pending"`
2. Convex action (10min timeout) streams from LLM
3. Action updates DB every 100ms with `partialContent`
4. Client subscribes via reactive query → auto-updates UI
5. On reconnect: see completed response from DB

**This is critical for mobile** where users switch apps frequently.

---

## What You'll Build

By the end of this phase:

✅ Conversation list with pull-to-refresh
✅ Full chat screen with message list
✅ Virtualized message rendering (handles 1000+ messages)
✅ Real-time streaming responses
✅ Chat input with auto-expanding textarea
✅ Model selector bottom sheet
✅ Offline message queue (localStorage)
✅ Message actions (copy, edit, delete, regenerate)
✅ Comparison mode UI (multi-model)
✅ Message status indicators

---

## Current State

**Before This Phase**:
- Authentication working
- Tab navigation in place
- Basic Convex query test (conversations list)

**After This Phase**:
- Full chat experience
- Can send messages and get AI responses
- Works offline with queue
- Real-time updates

---

## Step 1: Install Chat Dependencies

```bash
npm install \
  @shopify/flash-list \
  react-native-markdown-display \
  expo-clipboard \
  @gorhom/bottom-sheet \
  react-native-gesture-handler \
  react-native-reanimated
```

**Dependencies explained**:
- `@shopify/flash-list`: High-performance list (better than FlatList)
- `react-native-markdown-display`: Render markdown messages
- `expo-clipboard`: Copy message text
- `@gorhom/bottom-sheet`: Model selector sheet
- `react-native-gesture-handler` + `react-native-reanimated`: Gesture support

### Configure Reanimated

Add to `babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // Must be last
  };
};
```

---

## Step 2: Create Conversation List

### 2.1 Update Chat Tab

Replace `app/(tabs)/index.tsx`:

```typescript
// app/(tabs)/index.tsx
import { View, StyleSheet, TouchableOpacity, Text, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { Id } from '@/convex/_generated/dataModel';

interface Conversation {
  _id: Id<'conversations'>;
  title: string | null;
  modelId: string | null;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  starred: boolean;
  archived: boolean;
}

export default function ConversationsTab() {
  const conversations = useQuery(api.conversations.list);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Convex auto-refreshes, just simulate delay
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleNewChat = () => {
    router.push('/chat/new');
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() => router.push(`/chat/${item._id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.conversationHeader}>
        <Text style={styles.conversationTitle} numberOfLines={1}>
          {item.title || 'Untitled Conversation'}
        </Text>
        <View style={styles.badges}>
          {item.pinned && <Ionicons name="pin" size={14} color="#0066ff" />}
          {item.starred && <Ionicons name="star" size={14} color="#ffd700" />}
        </View>
      </View>
      <Text style={styles.conversationMeta}>
        {item.modelId || 'No model'} • {new Date(item.updatedAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.fab} onPress={handleNewChat}>
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
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Tap + to start chatting</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066ff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#0066ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  conversationCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  conversationMeta: {
    fontSize: 13,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#444',
    marginTop: 8,
  },
});
```

---

## Step 3: Create Chat Screen

### 3.1 Create Chat Route

Create `app/chat/[id].tsx`:

```typescript
// app/chat/[id].tsx
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { useState, useCallback } from 'react';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as Id<'conversations'>;

  // Get conversation details
  const conversation = useQuery(api.conversations.get, { conversationId });

  // Get messages with pagination
  const messages = useQuery(api.messages.listPaginated, { conversationId });

  // Send message mutation
  const sendMessage = useMutation(api.chat.sendMessage);

  // Local optimistic state
  const [optimisticMessages, setOptimisticMessages] = useState([]);

  const handleSend = useCallback(
    async (content: string, modelId?: string) => {
      // Add optimistic message immediately
      const optimisticMsg = {
        _id: `temp-${Date.now()}`,
        conversationId,
        role: 'user',
        content,
        status: 'optimistic',
        createdAt: Date.now(),
        _optimistic: true,
      };

      setOptimisticMessages((prev) => [...prev, optimisticMsg]);

      try {
        // Send to backend
        await sendMessage({
          conversationId,
          content,
          modelId: modelId || conversation?.modelId || 'openai:gpt-4o',
        });

        // Remove optimistic after server confirms
        setTimeout(() => {
          setOptimisticMessages((prev) =>
            prev.filter((m) => m._id !== optimisticMsg._id)
          );
        }, 1000);
      } catch (error) {
        // Remove optimistic on error
        setOptimisticMessages((prev) =>
          prev.filter((m) => m._id !== optimisticMsg._id)
        );
        alert('Failed to send message');
      }
    },
    [conversationId, sendMessage, conversation]
  );

  // Merge server messages with optimistic
  const allMessages = [
    ...(messages?.results || []),
    ...optimisticMessages,
  ].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <>
      <Stack.Screen
        options={{
          title: conversation?.title || 'Chat',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <MessageList messages={allMessages} />
        <ChatInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
```

---

## Step 4: Create Message List Component

Create `components/chat/MessageList.tsx`:

```typescript
// components/chat/MessageList.tsx
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  partialContent?: string;
  status?: 'pending' | 'generating' | 'complete' | 'error' | 'optimistic';
  model?: string;
  createdAt: number;
  _optimistic?: boolean;
}

export function MessageList({ messages }: { messages: Message[] }) {
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const displayContent = item.partialContent || item.content || '';

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        {!isUser && (
          <View style={styles.messageHeader}>
            <Text style={styles.modelBadge}>{item.model || 'AI'}</Text>
            {item.status === 'generating' && (
              <View style={styles.statusBadge}>
                <Ionicons name="ellipsis-horizontal" size={12} color="#0066ff" />
                <Text style={styles.statusText}>Generating...</Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {isUser ? (
            <Text style={styles.messageText}>{displayContent}</Text>
          ) : (
            <Markdown style={markdownStyles}>{displayContent}</Markdown>
          )}
        </View>

        {item._optimistic && (
          <View style={styles.optimisticBadge}>
            <Ionicons name="time-outline" size={12} color="#666" />
            <Text style={styles.optimisticText}>Sending...</Text>
          </View>
        )}

        {item.status === 'error' && (
          <View style={styles.errorBadge}>
            <Ionicons name="alert-circle" size={12} color="#ff3b30" />
            <Text style={styles.errorText}>Failed to send</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <FlashList
      data={messages}
      renderItem={renderMessage}
      estimatedItemSize={100}
      inverted
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modelBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0066ff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    color: '#666',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    backgroundColor: '#0066ff',
  },
  assistantBubble: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
  },
  optimisticBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  optimisticText: {
    fontSize: 11,
    color: '#666',
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#ff3b30',
  },
  listContent: {
    paddingVertical: 16,
  },
});

const markdownStyles = {
  body: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  code_inline: {
    backgroundColor: '#2a2a2a',
    color: '#0066ff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 14,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
};
```

---

## Step 5: Create Chat Input Component

Create `components/chat/ChatInput.tsx`:

```typescript
// components/chat/ChatInput.tsx
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

interface ChatInputProps {
  onSend: (content: string, modelId?: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [height, setHeight] = useState(40);

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage('');
    setHeight(40);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { height: Math.max(40, Math.min(height, 120)) }]}
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
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
```

---

## Step 6: Add Offline Queue

Create `lib/offline/messageQueue.ts`:

```typescript
// lib/offline/messageQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  modelId?: string;
  timestamp: number;
  retries: number;
}

class MessageQueue {
  private readonly STORAGE_KEY = 'blah_message_queue';
  private readonly MAX_RETRIES = 3;

  async enqueue(message: Omit<QueuedMessage, 'id' | 'timestamp' | 'retries'>) {
    const queue = await this.getQueue();
    queue.push({
      ...message,
      id: Date.now().toString(),
      timestamp: Date.now(),
      retries: 0,
    });
    await this.persist(queue);
  }

  async processQueue(sendFn: (msg: QueuedMessage) => Promise<void>) {
    const queue = await this.getQueue();

    for (const msg of queue) {
      try {
        await sendFn(msg);
        await this.remove(msg.id);
      } catch (error) {
        if (msg.retries >= this.MAX_RETRIES) {
          await this.remove(msg.id);
        } else {
          await this.incrementRetry(msg.id);
          await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, msg.retries)));
        }
      }
    }
  }

  async getQueue(): Promise<QueuedMessage[]> {
    const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private async persist(queue: QueuedMessage[]) {
    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
  }

  private async remove(id: string) {
    const queue = await this.getQueue();
    const filtered = queue.filter((m) => m.id !== id);
    await this.persist(filtered);
  }

  private async incrementRetry(id: string) {
    const queue = await this.getQueue();
    const msg = queue.find((m) => m.id === id);
    if (msg) msg.retries++;
    await this.persist(queue);
  }
}

export const messageQueue = new MessageQueue();
```

### Install AsyncStorage

```bash
npx expo install @react-native-async-storage/async-storage
```

---

## Step 7: Add Model Selector

Create `components/chat/ModelSelector.tsx`:

```typescript
// components/chat/ModelSelector.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef } from 'react';

const MODELS = [
  { id: 'openai:gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai:gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'anthropic:claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'anthropic:claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  { id: 'google:gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'groq:llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'Groq' },
];

interface ModelSelectorProps {
  selectedModel?: string;
  onSelect: (modelId: string) => void;
}

export const ModelSelector = forwardRef<BottomSheetModal, ModelSelectorProps>(
  ({ selectedModel, onSelect }, ref) => {
    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['50%']}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.container}>
          <Text style={styles.title}>Select Model</Text>
          <ScrollView>
            {MODELS.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelItem,
                  selectedModel === model.id && styles.modelItemSelected,
                ]}
                onPress={() => {
                  onSelect(model.id);
                  // @ts-ignore
                  ref?.current?.dismiss();
                }}
              >
                <View>
                  <Text style={styles.modelName}>{model.name}</Text>
                  <Text style={styles.modelProvider}>{model.provider}</Text>
                </View>
                {selectedModel === model.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#0066ff" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#1a1a1a',
  },
  handleIndicator: {
    backgroundColor: '#666',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  modelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    marginBottom: 8,
  },
  modelItemSelected: {
    backgroundColor: '#0066ff22',
    borderWidth: 1,
    borderColor: '#0066ff',
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modelProvider: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});
```

---

## Testing Checklist

- [ ] Conversation list loads and displays
- [ ] Pull-to-refresh works
- [ ] Tapping conversation opens chat screen
- [ ] Can send a message
- [ ] Message appears immediately (optimistic)
- [ ] AI response streams in real-time
- [ ] Markdown renders correctly
- [ ] Code blocks display properly
- [ ] Auto-expanding textarea works
- [ ] Keyboard avoidance works (iOS)
- [ ] List scrolls smoothly with 100+ messages
- [ ] Model selector opens and allows selection
- [ ] Offline queue saves messages
- [ ] Messages send when back online

---

## Troubleshooting

### FlashList "Blank area" warning
**Cause**: Incorrect estimatedItemSize
**Solution**: Adjust estimatedItemSize to match average message height

### Markdown not rendering
**Cause**: Missing markdown styles
**Solution**: Ensure markdownStyles object has all required properties

### Keyboard covers input
**Cause**: KeyboardAvoidingView misconfigured
**Solution**: Use `behavior="padding"` on iOS, `undefined` on Android

### Messages not streaming
**Cause**: Convex action not updating partialContent
**Solution**: Check backend logs, ensure 100ms update interval

---

## Next Phase Preview

**Phase 3: File Uploads & Voice** will add:
- Camera integration
- Image picker
- File uploads to Convex storage
- Voice recording
- Speech-to-text
- Text-to-speech playback

**Estimated Time**: 6-8 hours

---

**Next**: [Phase 3: File Uploads & Voice](./phase-3-files-voice.md)
