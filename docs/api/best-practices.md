# API Best Practices

Production patterns for performance, security, and reliability.

## Performance

### 1. Use Stale-While-Revalidate

Show cached data instantly, fetch fresh in background:

```typescript
useQuery({
  queryKey: ["conversations"],
  queryFn: fetchConversations,
  staleTime: 30000,        // Data fresh for 30s
  refetchInterval: 60000,  // Background refresh every 60s
});
```

**Result**: Instant UI, always up-to-date.

### 2. Optimize Polling

Poll only when needed, use exponential backoff:

```typescript
useQuery({
  queryKey: ["job", jobId],
  queryFn: () => api.get(`/actions/jobs/${jobId}`),
  refetchInterval: (data) => {
    // Stop polling when complete
    if (data?.status === "complete" || data?.status === "error") {
      return false;
    }
    // Exponential backoff: 1s → 2s → 4s → 8s → 10s (max)
    return Math.min(1000 * 2 ** (data?.retryCount || 0), 10000);
  },
});
```

**Saves**: 90% of unnecessary API calls.

### 3. Batch Requests

Avoid N+1 queries:

```typescript
// ❌ BAD: N requests
for (const id of conversationIds) {
  await api.get(`/conversations/${id}`);
}

// ✅ GOOD: 1 batched request
const conversations = await api.get(`/conversations?ids=${conversationIds.join(",")}`);
```

### 4. Use Pagination

Load incrementally with infinite scroll:

```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ["conversations"],
  queryFn: ({ pageParam = 1 }) =>
    api.get(`/conversations?page=${pageParam}&pageSize=20`),
  getNextPageParam: (lastPage) =>
    lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
  initialPageParam: 1,
});

// In component
<FlatList
  data={data?.pages.flatMap((page) => page.items)}
  onEndReached={() => hasNextPage && fetchNextPage()}
  onEndReachedThreshold={0.5}
/>
```

### 5. Prefetch on Hover/Focus

Reduce perceived latency:

```typescript
const queryClient = useQueryClient();

const handleHover = (conversationId: string) => {
  queryClient.prefetchQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => api.get(`/conversations/${conversationId}/messages`),
  });
};

<TouchableOpacity
  onPressIn={() => handleHover(item._id)}
  onPress={() => navigate("Chat", { id: item._id })}
>
  {/* ... */}
</TouchableOpacity>
```

## Error Handling

### 1. Retry with Exponential Backoff

```typescript
useMutation({
  mutationFn: sendMessage,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

**Pattern**: 1s → 2s → 4s → 8s (max 30s)

### 2. Handle Specific Error Codes

```typescript
onError: (error: any) => {
  switch (error.code) {
    case "UNAUTHORIZED":
      // Token expired → re-login
      navigation.navigate("Login");
      break;
    case "RATE_LIMIT":
      // Show retry timer
      const retryAfter = error.details?.retryAfter || 60;
      toast.error(`Rate limited. Try again in ${retryAfter}s`);
      break;
    case "VALIDATION_ERROR":
      // Show field-specific errors
      setFieldErrors(error.details?.fields);
      break;
    default:
      // Generic error
      toast.error(error.message || "Something went wrong");
  }
}
```

### 3. Graceful Degradation

Show cached data even if refetch fails:

```typescript
useQuery({
  queryKey: ["conversations"],
  queryFn: fetchConversations,
  staleTime: 30000,
  refetchOnError: false, // Don't clear cache on error
  placeholderData: keepPreviousData, // Show old data while loading
});
```

### 4. Offline Support

Queue mutations when offline:

```typescript
const { mutate } = useMutation({
  mutationFn: sendMessage,
  onError: (error) => {
    if (!navigator.onLine) {
      // Queue for later
      offlineQueue.enqueue({ fn: sendMessage, args });
      toast.info("Message queued. Will send when online.");
    }
  },
});

// Auto-process queue when online
window.addEventListener("online", () => {
  offlineQueue.processAll();
});
```

## Security

### 1. Never Log Tokens

```typescript
// ❌ BAD
console.log("Token:", token);
console.log("Request:", { headers: { Authorization: `Bearer ${token}` } });

// ✅ GOOD
console.log("Token: [REDACTED]");
console.log("Request:", { headers: { Authorization: "[REDACTED]" } });
```

### 2. Validate All Inputs

```typescript
import { z } from "zod";

const sendMessageSchema = z.object({
  content: z.string().min(1, "Content required").max(5000, "Too long"),
  modelId: z.string().min(1, "Model required"),
  thinkingEffort: z.enum(["low", "medium", "high"]).optional(),
});

const validated = sendMessageSchema.safeParse(input);
if (!validated.success) {
  throw new Error(validated.error.errors[0].message);
}
```

### 3. Respect Rate Limits

```typescript
if (error.status === 429) {
  const retryAfter = Number(error.headers.get("Retry-After")) || 60;
  // Wait before retrying
  await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
  // Retry request
  return retry();
}
```

### 4. Sanitize User Content

```typescript
// Prevent XSS in message content
import DOMPurify from "isomorphic-dompurify";

const sanitizedContent = DOMPurify.sanitize(userInput);
```

## Caching

### 1. Use Effective Query Keys

```typescript
// ✅ GOOD: Include all params in key
queryKey: ["conversations", { page, pageSize, archived, sortBy }]

// ❌ BAD: Missing params → stale data
queryKey: ["conversations"]
```

### 2. Invalidate Precisely

```typescript
// ✅ GOOD: Invalidate only affected queries
queryClient.invalidateQueries({ queryKey: ["conversations"] });
queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });

// ❌ BAD: Nukes entire cache
queryClient.invalidateQueries();
```

### 3. Optimistic Updates

```typescript
const { mutate: deleteConversation } = useMutation({
  mutationFn: (id) => api.delete(`/conversations/${id}`),
  
  onMutate: async (id) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ["conversations"] });
    
    // Snapshot previous
    const previous = queryClient.getQueryData(["conversations"]);
    
    // Optimistic update
    queryClient.setQueryData(["conversations"], (old: any) => ({
      ...old,
      items: old.items.filter((c: any) => c._id !== id),
    }));
    
    return { previous };
  },
  
  onError: (error, id, context) => {
    // Rollback on error
    queryClient.setQueryData(["conversations"], context.previous);
    toast.error("Failed to delete");
  },
  
  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  },
});
```

### 4. Background Updates

```typescript
// Silently refresh data in background
queryClient.prefetchQuery({
  queryKey: ["conversations"],
  queryFn: fetchConversations,
  staleTime: 5000, // Only refetch if data is >5s old
});
```

## Real-Time (SSE)

### 1. Disconnect When Inactive

Save battery, reduce server load:

```typescript
useEffect(() => {
  let eventSource: EventSource;
  
  const handleVisibilityChange = () => {
    if (document.hidden) {
      eventSource?.close(); // Disconnect when tab hidden
    } else {
      setupSSE(); // Reconnect when tab visible
      // Catch up with missed updates
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    }
  };
  
  document.addEventListener("visibilitychange", handleVisibilityChange);
  
  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    eventSource?.close();
  };
}, [conversationId]);
```

### 2. Deduplicate Events

Prevent duplicate UI updates:

```typescript
const seenMessageIds = useRef(new Set<string>());

eventSource.addEventListener("message-updated", (event) => {
  const data = JSON.parse(event.data);
  
  // Skip if already processed
  const key = `${data._id}-${data.updatedAt}`;
  if (seenMessageIds.current.has(key)) return;
  
  seenMessageIds.current.add(key);
  
  // Process update
  setMessages((prev) => 
    prev.map((m) => m._id === data._id ? { ...m, ...data } : m)
  );
});
```

### 3. Handle Reconnection

```typescript
eventSource.onerror = () => {
  eventSource.close();
  
  // Exponential backoff retry
  const delay = Math.min(1000 * 2 ** retryCount, 30000);
  setTimeout(() => {
    setupSSE();
    retryCount++;
  }, delay);
};
```

## Testing

### 1. Mock API Responses

```typescript
import { rest } from "msw";
import { setupServer } from "msw/native";

const handlers = [
  rest.get("https://blah.chat/api/v1/conversations", (req, res, ctx) => {
    return res(
      ctx.json({
        status: "success",
        data: {
          items: [
            { _id: "conv1", title: "Test", modelId: "openai:gpt-4o" },
          ],
          pagination: { page: 1, total: 1, hasNext: false },
        },
      })
    );
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 2. Test Error States

```typescript
test("shows error on network failure", async () => {
  server.use(
    rest.get("https://blah.chat/api/v1/conversations", (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );
  
  render(<ConversationList />);
  
  expect(await screen.findByText(/error/i)).toBeInTheDocument();
});
```

### 3. Test Loading States

```typescript
test("shows skeleton while loading", async () => {
  render(<ConversationList />);
  
  expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  
  await waitForElementToBeRemoved(() => screen.getByTestId("skeleton"));
  
  expect(screen.getByText("Test Chat")).toBeInTheDocument();
});
```

### 4. Test Optimistic Updates

```typescript
test("shows message immediately, then syncs with server", async () => {
  const { user } = render(<ChatInput conversationId="conv1" />);
  
  // Type and send
  await user.type(screen.getByPlaceholderText("Type message..."), "Hello");
  await user.click(screen.getByText("Send"));
  
  // Optimistic message appears immediately
  expect(screen.getByText("Hello")).toBeInTheDocument();
  expect(screen.getByText("Sending...")).toBeInTheDocument();
  
  // Wait for server confirmation
  await waitFor(() => {
    expect(screen.getByText("Sent")).toBeInTheDocument();
  });
});
```

## Monitoring

### 1. Track Performance

```typescript
import { trackAPIPerformance } from "@/lib/api/monitoring";

const startTime = performance.now();

const response = await api.get("/conversations");

trackAPIPerformance({
  endpoint: "/conversations",
  method: "GET",
  duration: performance.now() - startTime,
  status: 200,
  cacheHit: response.headers.get("x-cache-hit") === "true",
});
```

### 2. Log Errors

```typescript
onError: (error) => {
  // Structured logging
  logger.error({
    type: "api_error",
    endpoint: "/conversations",
    method: "POST",
    error: error.message,
    status: error.status,
    userId: user?.id,
  });
  
  // Send to error tracking (Sentry, etc)
  Sentry.captureException(error, {
    tags: { endpoint: "/conversations" },
  });
}
```

### 3. Monitor Cache Hit Rate

```typescript
// Track cache effectiveness
const cacheStats = {
  hits: 0,
  misses: 0,
  hitRate: () => (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100,
};

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated") {
    if (event.query.state.dataUpdatedAt === event.query.state.dataUpdateCount) {
      cacheStats.hits++;
    } else {
      cacheStats.misses++;
    }
  }
});

console.log(`Cache hit rate: ${cacheStats.hitRate()}%`);
```

## Common Pitfalls

### Pitfall 1: Over-Fetching

**Problem**: Fetching all conversations when only need count

**Solution**: Use dedicated count endpoint
```typescript
// ❌ BAD
const { data } = useQuery({
  queryKey: ["conversations"],
  queryFn: () => api.get("/conversations?pageSize=1000"),
});
const count = data?.items.length;

// ✅ GOOD
const { data: count } = useQuery({
  queryKey: ["conversations", "count"],
  queryFn: () => api.get("/conversations/count"),
});
```

### Pitfall 2: Stale Closures

**Problem**: Event handlers capture old state

**Solution**: Use refs or latest state
```typescript
// ❌ BAD: Captures initial messages
useEffect(() => {
  eventSource.addEventListener("message-created", () => {
    setMessages([...messages, newMessage]); // Stale!
  });
}, []);

// ✅ GOOD: Always latest state
useEffect(() => {
  eventSource.addEventListener("message-created", () => {
    setMessages((prev) => [...prev, newMessage]);
  });
}, []);
```

### Pitfall 3: Missing Cleanup

**Problem**: Memory leaks from unclosed connections

**Solution**: Clean up in useEffect return
```typescript
useEffect(() => {
  const eventSource = new EventSource(url);
  
  return () => {
    eventSource.close(); // Always cleanup
  };
}, [url]);
```

### Pitfall 4: Ignoring HTTP Cache Headers

**Problem**: Not using server cache hints

**Solution**: Respect Cache-Control headers
```typescript
// Server sends: Cache-Control: private, max-age=30, stale-while-revalidate=60
useQuery({
  queryKey: ["conversations"],
  queryFn: fetchConversations,
  staleTime: 30000,  // Match max-age
  gcTime: 90000,     // max-age + swr
});
```

## Next Steps

- [API Reference](./reference.md) - Full endpoint docs
- [Examples](./examples.md) - Copy-paste snippets
- [Mobile Integration](./mobile-integration.md) - React Native guide
