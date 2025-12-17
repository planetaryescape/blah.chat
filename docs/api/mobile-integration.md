# Mobile Integration Guide

React Native guide for blah.chat API.

## Prerequisites

- React Native 0.70+
- @tanstack/react-query 5.x
- Clerk Expo SDK
- EventSource polyfill (for SSE)

## Installation

```bash
npm install @tanstack/react-query @clerk/clerk-expo eventsource
```

## Setup

### 1. Configure Clerk

```typescript
// App.tsx
import { ClerkProvider } from "@clerk/clerk-expo";

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      {/* Your app */}
    </ClerkProvider>
  );
}
```

### 2. Configure React Query

```typescript
// providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5min
      gcTime: 30 * 60 * 1000,        // 30min
      refetchOnWindowFocus: false,   // Don't refetch on tab switch
      refetchOnMount: false,         // Use cache
      refetchOnReconnect: true,      // Refetch after offline
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: false,
      gcTime: 0,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 3. Create API Client

```typescript
// lib/api.ts
import { useAuth } from "@clerk/clerk-expo";

const BASE_URL = "https://blah.chat/api/v1";

export function useAPI() {
  const { getToken } = useAuth();

  const api = {
    async get<T>(endpoint: string): Promise<T> {
      const token = await getToken();
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await response.json();

      if (json.status === "error") {
        throw new Error(json.error.message || "Request failed");
      }

      return json.data; // Unwrap envelope
    },

    async post<T>(endpoint: string, data: any): Promise<T> {
      const token = await getToken();
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const json = await response.json();

      if (json.status === "error") {
        throw new Error(json.error.message || "Request failed");
      }

      return json.data;
    },

    async patch<T>(endpoint: string, data: any): Promise<T> {
      const token = await getToken();
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const json = await response.json();

      if (json.status === "error") {
        throw new Error(json.error.message || "Request failed");
      }

      return json.data;
    },

    async delete(endpoint: string): Promise<void> {
      const token = await getToken();
      await fetch(`${BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
  };

  return api;
}
```

## Core Flows

### List Conversations

```typescript
import { useQuery } from "@tanstack/react-query";
import { useAPI } from "./lib/api";
import { FlatList, Text, TouchableOpacity, ActivityIndicator } from "react-native";

function ConversationList({ navigation }) {
  const api = useAPI();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get("/conversations"),
  });

  if (isLoading) return <ActivityIndicator />;

  return (
    <FlatList
      data={conversations?.items || []}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => navigation.navigate("Chat", { id: item._id })}
        >
          <Text>{item.title}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
```

### Send Message

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View, TextInput, Button } from "react-native";

function ChatInput({ conversationId, modelId }) {
  const api = useAPI();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: (content: string) =>
      api.post(`/conversations/${conversationId}/messages`, {
        content,
        modelId,
      }),
    onSuccess: () => {
      setContent(""); // Clear input
      // Invalidate messages to refetch
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  return (
    <View>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Type message..."
        editable={!isPending}
      />
      <Button
        title={isPending ? "Sending..." : "Send"}
        onPress={() => sendMessage(content)}
        disabled={isPending || !content.trim()}
      />
    </View>
  );
}
```

### Display Messages with Real-Time Updates

```typescript
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import EventSource from "eventsource";

function useMessages(conversationId: string) {
  const api = useAPI();
  const { getToken } = useAuth();

  // Initial fetch
  const { data: initialMessages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => api.get(`/conversations/${conversationId}/messages`),
  });

  const [messages, setMessages] = useState(initialMessages?.items || []);

  // SSE for real-time updates
  useEffect(() => {
    if (!initialMessages) return;

    setMessages(initialMessages.items);

    let eventSource: EventSource;

    const setupSSE = async () => {
      const token = await getToken();

      eventSource = new EventSource(
        `https://blah.chat/api/v1/messages/stream/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      eventSource.addEventListener("message-created", (event: any) => {
        const newMessage = JSON.parse(event.data);
        setMessages((prev) => [...prev, newMessage]);
      });

      eventSource.addEventListener("message-updated", (event: any) => {
        const updatedMessage = JSON.parse(event.data);
        setMessages((prev) =>
          prev.map((m) =>
            m._id === updatedMessage._id
              ? { ...m, ...updatedMessage }
              : m
          )
        );
      });
    };

    setupSSE();

    return () => {
      eventSource?.close();
    };
  }, [conversationId, initialMessages]);

  return messages;
}

function ChatView({ conversationId }) {
  const messages = useMessages(conversationId);

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <View>
          <Text>{item.role}: {item.partialContent || item.content}</Text>
          {item.status === "generating" && <ActivityIndicator />}
        </View>
      )}
    />
  );
}
```

## Error Handling

```typescript
const { mutate } = useMutation({
  mutationFn: sendMessageFn,
  onError: (error: any) => {
    if (error.status === 401) {
      // Auth error → re-login
      navigation.navigate("Login");
    } else if (error.status === 429) {
      // Rate limit
      Alert.alert("Too many requests", "Please wait and try again");
    } else {
      // Generic error
      Alert.alert("Error", error.message);
    }
  },
});
```

## Performance

### Caching

React Query caches responses automatically:
- Conversations: 5min stale time
- Messages: 5min stale time
- Preferences: 1h stale time

### Pagination

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";

function useConversations() {
  return useInfiniteQuery({
    queryKey: ["conversations"],
    queryFn: ({ pageParam = 1 }) =>
      api.get(`/conversations?page=${pageParam}&pageSize=20`),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
  });
}

function ConversationList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useConversations();

  return (
    <FlatList
      data={data?.pages.flatMap((page) => page.items) || []}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator /> : null
      }
    />
  );
}
```

## Testing

Use MSW (Mock Service Worker) for API mocking:

```typescript
import { rest } from "msw";
import { setupServer } from "msw/native";

const server = setupServer(
  rest.get("https://blah.chat/api/v1/conversations", (req, res, ctx) => {
    return res(
      ctx.json({
        status: "success",
        data: {
          items: [
            { _id: "conv1", title: "Test Chat", modelId: "openai:gpt-4o" },
          ],
          pagination: { page: 1, pageSize: 20, total: 1, hasNext: false },
        },
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Troubleshooting

### Issue: 401 Unauthorized

**Solution**: Check Clerk token expiration. Call `getToken({ skipCache: true })`.

### Issue: Slow performance

**Solution**: Enable React Query DevTools, check stale times, reduce polling intervals.

### Issue: Duplicate messages

**Solution**: Use unique keys in `queryKey`, avoid refetching on every focus.

### Issue: SSE not working

**Solution**: Ensure EventSource polyfill is installed. Check token is included in headers.

## Next Steps

- [API Reference](./reference.md)
- [Best Practices](./best-practices.md)
- [Examples](./examples.md)
