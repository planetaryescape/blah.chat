# API Examples

Copy-paste ready code for common use cases.

## Authentication

### Get Token (React Native)

```typescript
import { useAuth } from "@clerk/clerk-expo";

export function useAPIToken() {
  const { getToken } = useAuth();

  return async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    return token;
  };
}
```

## Conversations

### Create and Navigate to New Chat

```typescript
const { mutate: createChat } = useMutation({
  mutationFn: () =>
    api.post("/conversations", {
      title: "New Chat",
      modelId: "openai:gpt-4o",
    }),
  onSuccess: (conversation) => {
    navigation.navigate("Chat", { id: conversation._id });
  },
});

<Button onPress={() => createChat()}>New Chat</Button>
```

### Delete with Confirmation

```typescript
const { mutate: deleteConversation } = useMutation({
  mutationFn: (id: string) => api.delete(`/conversations/${id}`),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ["conversations"] });
    const previous = queryClient.getQueryData(["conversations"]);
    queryClient.setQueryData(["conversations"], (old: any) => ({
      ...old,
      items: old.items.filter((c: any) => c._id !== id),
    }));
    return { previous };
  },
  onError: (error, id, context) => {
    queryClient.setQueryData(["conversations"], context.previous);
    Alert.alert("Error", "Failed to delete conversation");
  },
});

const handleDelete = (id: string) => {
  Alert.alert("Delete Conversation", "Are you sure?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: () => deleteConversation(id),
    },
  ]);
};
```

### Archive/Unarchive

```typescript
const { mutate: toggleArchive } = useMutation({
  mutationFn: (id: string) => api.post(`/conversations/${id}/archive`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  },
});
```

## Messages

### Send with Optimistic Update

```typescript
const { mutate: sendMessage } = useMutation({
  mutationFn: (input: { conversationId: string; content: string; modelId: string }) =>
    api.post(`/conversations/${input.conversationId}/messages`, {
      content: input.content,
      modelId: input.modelId,
    }),

  onMutate: async (input) => {
    await queryClient.cancelQueries({ queryKey: ["messages", input.conversationId] });

    const previous = queryClient.getQueryData(["messages", input.conversationId]);

    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      role: "user" as const,
      content: input.content,
      status: "pending" as const,
      createdAt: Date.now(),
    };

    queryClient.setQueryData(["messages", input.conversationId], (old: any) => ({
      ...old,
      items: [...old.items, optimisticMessage],
    }));

    return { previous, optimisticMessage };
  },

  onSuccess: (data, input, context) => {
    queryClient.setQueryData(["messages", input.conversationId], (old: any) => ({
      ...old,
      items: old.items.map((m: any) =>
        m._id === context.optimisticMessage._id ? data : m
      ),
    }));
  },

  onError: (error, input, context) => {
    queryClient.setQueryData(["messages", input.conversationId], context.previous);
    Alert.alert("Failed to send", error.message);
  },
});
```

### Edit Message

```typescript
const { mutate: editMessage } = useMutation({
  mutationFn: ({ id, content }: { id: string; content: string }) =>
    api.patch(`/messages/${id}`, { content }),
  onSuccess: (_, { id }) => {
    queryClient.invalidateQueries({ queryKey: ["messages"] });
  },
});
```

### Regenerate Response

```typescript
const { mutate: regenerateMessage } = useMutation({
  mutationFn: (messageId: string) =>
    api.post(`/messages/${messageId}/regenerate`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["messages"] });
  },
});

<Button onPress={() => regenerateMessage(message._id)}>
  Regenerate
</Button>
```

## Preferences

### Update Theme

```typescript
const { mutate: updateTheme } = useMutation({
  mutationFn: (theme: "light" | "dark" | "system") =>
    api.patch("/preferences", { theme }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["preferences"] });
  },
});

<Select onValueChange={(value) => updateTheme(value)}>
  <option value="light">Light</option>
  <option value="dark">Dark</option>
  <option value="system">System</option>
</Select>
```

### Update Default Model

```typescript
const { mutate: updateDefaultModel } = useMutation({
  mutationFn: (modelId: string) =>
    api.patch("/preferences", { defaultModel: modelId }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["preferences"] });
  },
});
```

## Search

### Hybrid Search with Polling

```typescript
const [jobId, setJobId] = useState<string | null>(null);

// Trigger search
const { mutate: triggerSearch, isPending: isTriggering } = useMutation({
  mutationFn: (query: string) =>
    api.post("/actions/search", { query, limit: 10, searchType: "hybrid" }),
  onSuccess: (data) => {
    setJobId(data.jobId);
  },
});

// Poll job status
const { data: job, isLoading } = useQuery({
  queryKey: ["job", jobId],
  queryFn: () => api.get(`/actions/jobs/${jobId}`),
  enabled: jobId !== null,
  refetchInterval: (data) => {
    if (data?.status === "complete" || data?.status === "error") {
      return false; // Stop polling
    }
    return 2000; // Poll every 2s
  },
});

// Usage
<SearchBar
  onSearch={(query) => triggerSearch(query)}
  loading={isTriggering || isLoading}
/>

{job?.status === "complete" && (
  <SearchResults results={job.result.results} />
)}
```

## Real-Time (SSE)

### Stream Message Updates

```typescript
function useMessagesSSE(conversationId: string) {
  const api = useAPI();
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);

  // Initial fetch
  const { data: initialMessages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => api.get(`/conversations/${conversationId}/messages`),
  });

  // SSE updates
  useEffect(() => {
    if (!initialMessages) return;

    setMessages(initialMessages.items);

    let eventSource: EventSource;

    const setupSSE = async () => {
      const token = await getToken();

      eventSource = new EventSource(
        `https://blah.chat/api/v1/messages/stream/${conversationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
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
            m._id === updatedMessage._id ? { ...m, ...updatedMessage } : m
          )
        );
      });

      eventSource.addEventListener("message-deleted", (event: any) => {
        const { id } = JSON.parse(event.data);
        setMessages((prev) => prev.filter((m) => m._id !== id));
      });
    };

    setupSSE();

    return () => {
      eventSource?.close();
    };
  }, [conversationId, initialMessages, getToken]);

  return messages;
}

// Usage
function ChatView({ conversationId }: { conversationId: string }) {
  const messages = useMessagesSSE(conversationId);

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <MessageBubble
          message={item}
          isGenerating={item.status === "generating"}
        />
      )}
    />
  );
}
```

## Pagination

### Infinite Scroll

```typescript
function useConversationsPaginated() {
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
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useConversationsPaginated();

  const conversations = data?.pages.flatMap((page) => page.items) || [];

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => <ConversationItem conversation={item} />}
      onEndReached={() => hasNextPage && fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator /> : null
      }
    />
  );
}
```

## Error Handling

### Global Error Handler

```typescript
// QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error: any) => {
        if (error.status === 401) {
          router.replace("/login");
        } else if (error.status === 429) {
          toast.error("Rate limit exceeded. Please wait.");
        } else {
          toast.error(error.message || "Something went wrong");
        }
      },
    },
    queries: {
      onError: (error: any) => {
        if (error.status === 401) {
          router.replace("/login");
        }
      },
    },
  },
});
```

### Retry with Backoff

```typescript
const { mutate, error, failureCount } = useMutation({
  mutationFn: sendMessage,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  onError: (error, variables, context) => {
    console.log(`Failed after ${failureCount} attempts:`, error.message);
  },
});
```

## File Upload

### Upload with Progress

```typescript
const { mutate: uploadFile } = useMutation({
  mutationFn: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return api.post("/upload", formData, {
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 100)
        );
        setUploadProgress(percentCompleted);
      },
    });
  },
});
```

## Offline Support

### Queue Mutations

```typescript
class OfflineQueue {
  private queue: Array<{ fn: () => Promise<any>; id: string }> = [];

  enqueue(fn: () => Promise<any>) {
    const id = crypto.randomUUID();
    this.queue.push({ fn, id });
    this.persist();
  }

  async processAll() {
    for (const { fn, id } of this.queue) {
      try {
        await fn();
        this.remove(id);
      } catch (error) {
        console.error("Failed to process queued operation:", error);
      }
    }
  }

  private persist() {
    localStorage.setItem("offline-queue", JSON.stringify(this.queue));
  }

  private remove(id: string) {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.persist();
  }
}

const offlineQueue = new OfflineQueue();

// Usage
const { mutate } = useMutation({
  mutationFn: sendMessage,
  onError: (error) => {
    if (!navigator.onLine) {
      offlineQueue.enqueue(() => sendMessage(variables));
      toast.info("Message queued for when you're online");
    }
  },
});

// Process queue when online
window.addEventListener("online", () => {
  offlineQueue.processAll();
});
```

## Next Steps

- [API Reference](./reference.md) - Full endpoint documentation
- [Best Practices](./best-practices.md) - Performance and security patterns
- [Mobile Integration](./mobile-integration.md) - React Native setup guide
