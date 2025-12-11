# Phase 8: Documentation & Knowledge Transfer

## Overview

Document API architecture, create mobile integration guide, update CLAUDE.md patterns, establish best practices. Enable team and future mobile developers to understand and extend the system.

## Context & Grand Scope

### Why This Phase Exists
Phases 0-7 built production-ready API. Phase 8 ensures knowledge isn't siloed in one person's head. Documentation = force multiplier: every developer becomes productive faster, fewer bugs, better maintenance.

### Dependencies
- **Previous phases**: All (0-7) - document what's been built ✅
- **Blocks**: None (final phase)
- **Critical path**: Required before external mobile dev handoff

## Research & Decision Rationale

### Industry Patterns Analyzed

**1. API Documentation Standards**

| Format | Pros | Cons | Use Case |
|--------|------|------|----------|
| **OpenAPI** | Machine-readable, SDK generation | Verbose | Public APIs |
| **Markdown** | Human-readable, easy to edit | Not machine-readable | Internal docs |
| **Interactive (Postman)** | Testable, shareable | Maintenance burden | Onboarding |
| **Code Comments** | Co-located with code | Hard to discover | Implementation details |

**Stripe approach**:
- OpenAPI spec (machine-readable)
- Generated docs site (stripe.com/docs)
- Interactive examples (test mode)
- Client libraries (auto-generated)

**2. Documentation Hierarchy**

```
1. README (project overview, quick start)
2. Getting Started (tutorials, first request)
3. API Reference (endpoints, parameters, responses)
4. Guides (authentication, pagination, errors)
5. Best Practices (performance, security)
6. Examples (common use cases)
7. Changelog (migration guides)
```

**3. Mobile Integration Docs**

Critical sections:
1. Setup (dependencies, initialization)
2. Authentication (Clerk integration)
3. Core Flows (send message, list conversations)
4. Error Handling (retry, offline)
5. Performance (caching, pagination)
6. Testing (mocks, fixtures)

### Decisions Made

**Decision 1: Markdown-First**
- OpenAPI spec for reference (auto-generate later)
- Markdown guides for onboarding (easy to edit)
- Code examples inline (copy-paste ready)
- Rationale: Agility > perfection, iterate fast

**Decision 2: Practical Over Comprehensive**
- 80/20 rule: Document 20% that covers 80% of use cases
- Focus: Core flows (send message, list conversations)
- Skip: Edge cases, deprecated endpoints
- Rationale: Ship documentation users actually read

**Decision 3: Update CLAUDE.md**
- Add API patterns section
- Document hybrid approach (Convex + API)
- Migration guide (for future developers)
- Rationale: AI assistant needs project context

**Decision 4: Living Documentation**
- Version control (Git)
- Changelog (track updates)
- Ownership (assign maintainer)
- Rationale: Avoid stale docs (worse than no docs)

## Current State Analysis

### How blah.chat Docs Work Today

**1. Existing Documentation** (from `/Users/bhekanik/code/planetaryescape/blah.chat/docs/`):
- `spec.md` - Full specification (schema, features)
- `implementation/*.md` - Original implementation phases
- `ENVELOPE_PATTERN_IMPLEMENTATION.md` - Envelope format
- `LOGGING.md` - Logging patterns
- `CLAUDE.md` - AI assistant context

**2. Missing Documentation**:
- ❌ API reference (no endpoint list)
- ❌ Mobile integration guide
- ❌ Authentication flow docs
- ❌ Error handling guide
- ❌ Performance best practices
- ❌ Testing guide
- ❌ Changelog

**3. CLAUDE.md Gaps**:
- No API migration context
- No hybrid pattern explanation
- No mobile considerations
- No React Query patterns

### Specific Files/Patterns

**Documentation to create**:
1. `docs/api/README.md` - API overview
2. `docs/api/reference.md` - Endpoint reference
3. `docs/api/authentication.md` - Auth guide
4. `docs/api/mobile-integration.md` - Mobile guide
5. `docs/api/best-practices.md` - Patterns
6. `docs/api/CHANGELOG.md` - Version history
7. Update `CLAUDE.md` - AI context

## Target State

### What We're Building

```
docs/
├── api/
│   ├── README.md                   # API overview, architecture
│   ├── reference.md                # Endpoint reference
│   ├── authentication.md           # Auth flow, Clerk integration
│   ├── mobile-integration.md       # React Native guide
│   ├── best-practices.md           # Performance, patterns
│   ├── examples.md                 # Common use cases
│   ├── testing.md                  # Testing guide
│   └── CHANGELOG.md                # Version history
├── api-migration/                  # Phase guides (already created)
│   ├── phase-0-foundation.md
│   ├── phase-1-mutations.md
│   └── ...
└── CLAUDE.md (updated)             # Add API patterns
```

### Success Looks Like

**1. API Overview (docs/api/README.md)**
```markdown
# blah.chat API

Personal AI chat assistant API with multi-model support, real-time streaming, and resilient generation.

## Quick Start

### 1. Authentication
Get token from Clerk dashboard:
\`\`\`bash
export API_TOKEN="your_clerk_token"
\`\`\`

### 2. Create Conversation
\`\`\`bash
curl -X POST https://blah.chat/api/v1/conversations \\
  -H "Authorization: Bearer $API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Test Chat","modelId":"openai:gpt-4o"}'
\`\`\`

### 3. Send Message
\`\`\`bash
curl -X POST https://blah.chat/api/v1/conversations/{id}/messages \\
  -H "Authorization: Bearer $API_TOKEN" \\
  -d '{"content":"Hello","modelId":"openai:gpt-4o"}'
\`\`\`

## Architecture

- **Foundation**: Next.js 15 API routes
- **Database**: Convex (real-time, vector search)
- **Auth**: Clerk (JWT)
- **Real-time**: SSE (Server-Sent Events)
- **Caching**: React Query + HTTP Cache-Control

## Endpoints

See [API Reference](./reference.md) for full list.

## Mobile Integration

See [Mobile Integration Guide](./mobile-integration.md) for React Native setup.
```

**2. Mobile Integration Guide**
```markdown
# Mobile Integration Guide

React Native guide for blah.chat API.

## Prerequisites

- React Native 0.70+
- @tanstack/react-query 5.x
- Clerk Expo SDK
- EventSource polyfill (for SSE)

## Installation

\`\`\`bash
npm install @tanstack/react-query @clerk/clerk-expo eventsource
\`\`\`

## Setup

### 1. Configure Clerk

\`\`\`typescript
// App.tsx
import { ClerkProvider } from "@clerk/clerk-expo";

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      {/* app */}
    </ClerkProvider>
  );
}
\`\`\`

### 2. Configure React Query

\`\`\`typescript
// providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchInterval: 10000, // Poll every 10s
    },
  },
});

export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
\`\`\`

### 3. Create API Client

\`\`\`typescript
// lib/api.ts
import { useAuth } from "@clerk/clerk-expo";

export function useAPI() {
  const { getToken } = useAuth();

  const api = {
    async get(endpoint: string) {
      const token = await getToken();
      const response = await fetch(\`https://blah.chat/api/v1\${endpoint}\`, {
        headers: {
          Authorization: \`Bearer \${token}\`,
        },
      });
      const json = await response.json();
      return json.data; // Unwrap envelope
    },

    async post(endpoint: string, data: any) {
      const token = await getToken();
      const response = await fetch(\`https://blah.chat/api/v1\${endpoint}\`, {
        method: "POST",
        headers: {
          Authorization: \`Bearer \${token}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const json = await response.json();
      return json.data;
    },
  };

  return api;
}
\`\`\`

## Core Flows

### List Conversations

\`\`\`typescript
import { useQuery } from "@tanstack/react-query";
import { useAPI } from "./lib/api";

function ConversationList() {
  const api = useAPI();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get("/conversations"),
  });

  if (isLoading) return <ActivityIndicator />;

  return (
    <FlatList
      data={conversations}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => navigate("Chat", { id: item._id })}>
          <Text>{item.title}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
\`\`\`

### Send Message

\`\`\`typescript
import { useMutation } from "@tanstack/react-query";

function ChatInput({ conversationId, modelId }) {
  const api = useAPI();
  const [content, setContent] = useState("");

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: (content: string) =>
      api.post(\`/conversations/\${conversationId}/messages\`, {
        content,
        modelId,
      }),
    onSuccess: () => {
      setContent(""); // Clear input
    },
  });

  return (
    <View>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Type message..."
      />
      <Button
        title={isPending ? "Sending..." : "Send"}
        onPress={() => sendMessage(content)}
        disabled={isPending}
      />
    </View>
  );
}
\`\`\`

## Error Handling

\`\`\`typescript
const { mutate } = useMutation({
  mutationFn: sendMessageFn,
  onError: (error) => {
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
\`\`\`

## Performance

### Caching

React Query caches responses automatically:
- Conversations: 30s stale time
- Messages: 10s stale time
- Preferences: 5min stale time

### Pagination

\`\`\`typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ["conversations"],
  queryFn: ({ pageParam = 1 }) =>
    api.get(\`/conversations?page=\${pageParam}\`),
  getNextPageParam: (lastPage) =>
    lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
});

<FlatList
  data={data?.pages.flatMap((page) => page.items)}
  onEndReached={() => hasNextPage && fetchNextPage()}
/>
\`\`\`

## Testing

Use MSW (Mock Service Worker) for API mocking:

\`\`\`typescript
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
        },
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
\`\`\`

## Troubleshooting

### Issue: 401 Unauthorized
**Solution**: Check Clerk token expiration. Call \`getToken({ skipCache: true })\`.

### Issue: Slow performance
**Solution**: Enable React Query DevTools, check stale times, reduce polling intervals.

### Issue: Duplicate messages
**Solution**: Use unique keys in \`queryKey\`, avoid refetching on every focus.

## Next Steps

- [API Reference](./reference.md)
- [Best Practices](./best-practices.md)
- [Examples](./examples.md)
```

**3. Updated CLAUDE.md**
```markdown
## API Architecture (Added)

### Hybrid Approach

blah.chat uses **dual architecture**:

1. **Web**: Convex client SDK (real-time WebSocket subscriptions)
2. **Mobile**: REST API + React Query (HTTP polling + SSE streaming)

**Why hybrid?**
- Convex SDK: Superior web UX (instant updates, <100ms latency)
- REST API: Mobile compatibility (React Native, iOS, Android)

### API Patterns

**1. Envelope Format** (all responses):
\`\`\`typescript
{
  status: "success" | "error",
  sys: { entity, id?, timestamps },
  data: T,        // On success
  error: string   // On error
}
\`\`\`

**2. Authentication** (Clerk JWT):
\`\`\`typescript
const token = await getToken();
fetch("/api/v1/endpoint", {
  headers: { Authorization: \`Bearer \${token}\` },
});
\`\`\`

**3. Mutations** (write operations):
\`\`\`typescript
// React Query mutation
const { mutate } = useMutation({
  mutationFn: (data) => apiClient.post("/conversations", data),
  onMutate: (data) => {
    // Optimistic update
    queryClient.setQueryData(["conversations"], (old) => [...old, data]);
  },
  onError: (err, data, context) => {
    // Rollback on error
    queryClient.setQueryData(["conversations"], context.previous);
  },
});
\`\`\`

**4. Queries** (read operations):
\`\`\`typescript
// Hybrid query (Convex for web, API for mobile)
const { data } = useConversations(); // Auto-detects platform
\`\`\`

**5. Real-Time** (SSE for mobile):
\`\`\`typescript
const { messages } = useMessagesSSE(conversationId);
// Streams message updates via Server-Sent Events
\`\`\`

### Migration Context

**Phase 0-7 Complete** (as of 2025-12-10):
- Phase 0: Foundation (auth, DAL, envelope)
- Phase 1: Mutations (POST/PATCH/DELETE endpoints)
- Phase 2: React Query (useMutation hooks)
- Phase 3: Queries (GET endpoints, polling)
- Phase 4: Actions (long-running operations)
- Phase 5: SSE (real-time streaming)
- Phase 6: Resilient generation (validated)
- Phase 7: Performance (caching, optimization)

**Key Files**:
- `src/lib/api/dal/*` - Data Access Layer
- `src/lib/hooks/mutations/*` - React Query mutations
- `src/lib/hooks/queries/*` - Hybrid queries
- `src/app/api/v1/*` - REST endpoints

**Resilient Generation** (unchanged):
- Still uses Convex actions (10min timeout)
- partialContent updates every 100ms
- Survives page refresh, tab close, browser crash

### Mobile Considerations

When building mobile features:
1. **Use API endpoints** (not Convex SDK)
2. **Add to React Query hooks** (mutations/queries)
3. **Test platform detection** (isPlatformMobile)
4. **Validate offline behavior** (queue mutations)
5. **Monitor battery drain** (reduce polling)

See `docs/api/mobile-integration.md` for full guide.
```

## Implementation Steps

### Step 1: Create API Overview

**Goal**: High-level API introduction

**Action**: Create README.md

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/docs/api/README.md`

**Code**: (See "Success Looks Like" section above for full content)

### Step 2: Create API Reference

**Goal**: Endpoint documentation

**Action**: Create reference.md

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/docs/api/reference.md`

**Code**:
```markdown
# API Reference

Base URL: `https://blah.chat/api/v1`

## Authentication

All endpoints require Clerk JWT token:
\`\`\`
Authorization: Bearer <token>
\`\`\`

## Conversations

### List Conversations
\`\`\`
GET /conversations?page=1&pageSize=20
\`\`\`

**Response:**
\`\`\`json
{
  "status": "success",
  "sys": { "entity": "list" },
  "data": {
    "items": [
      {
        "_id": "conv_123",
        "title": "Chat about React",
        "modelId": "openai:gpt-4o",
        "updatedAt": 1702209600000
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "hasNext": true
    }
  }
}
\`\`\`

### Create Conversation
\`\`\`
POST /conversations
\`\`\`

**Body:**
\`\`\`json
{
  "title": "New Chat",
  "modelId": "openai:gpt-4o"
}
\`\`\`

**Response:** `201 Created`

### Update Conversation
\`\`\`
PATCH /conversations/:id
\`\`\`

**Body:**
\`\`\`json
{
  "title": "Renamed Chat"
}
\`\`\`

### Delete Conversation
\`\`\`
DELETE /conversations/:id?permanent=false
\`\`\`

**Response:** `204 No Content`

## Messages

### List Messages
\`\`\`
GET /conversations/:id/messages
\`\`\`

### Send Message
\`\`\`
POST /conversations/:id/messages
\`\`\`

**Body:**
\`\`\`json
{
  "content": "Hello, world!",
  "modelId": "openai:gpt-4o"
}
\`\`\`

**Response:** `202 Accepted` (generation happens async)

### Update Message
\`\`\`
PATCH /messages/:id
\`\`\`

### Delete Message
\`\`\`
DELETE /messages/:id
\`\`\`

## Preferences

### Get Preferences
\`\`\`
GET /preferences
\`\`\`

### Update Preferences
\`\`\`
PATCH /preferences
\`\`\`

**Body:**
\`\`\`json
{
  "theme": "dark",
  "sendOnEnter": true
}
\`\`\`

## Actions (Long-Running)

### Trigger Search
\`\`\`
POST /actions/search
\`\`\`

**Body:**
\`\`\`json
{
  "query": "React hooks",
  "limit": 10
}
\`\`\`

**Response:** `202 Accepted` with jobId

### Poll Job Status
\`\`\`
GET /actions/jobs/:jobId
\`\`\`

**Response:**
\`\`\`json
{
  "status": "success",
  "data": {
    "jobId": "job_123",
    "status": "complete",
    "result": { ... }
  }
}
\`\`\`

## Real-Time (SSE)

### Stream Messages
\`\`\`
GET /sse/messages/:conversationId
\`\`\`

**Response:** `text/event-stream`

**Events:**
- `message-created`
- `message-updated`
- `message-deleted`
- `ping`

## Error Responses

All errors follow envelope format:
\`\`\`json
{
  "status": "error",
  "sys": { "entity": "error" },
  "error": {
    "message": "Resource not found",
    "code": "NOT_FOUND",
    "details": { ... }
  }
}
\`\`\`

**Error Codes:**
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `VALIDATION_ERROR` (400)
- `RATE_LIMIT` (429)
- `INTERNAL_ERROR` (500)
```

### Step 3: Create Mobile Integration Guide

**Goal**: React Native onboarding

**Action**: Create mobile-integration.md

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/docs/api/mobile-integration.md`

**Code**: (See "Success Looks Like" section above for full content)

### Step 4: Create Best Practices Guide

**Goal**: Document patterns and anti-patterns

**Action**: Create best-practices.md

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/docs/api/best-practices.md`

**Code**:
```markdown
# API Best Practices

## Performance

### 1. Use Stale-While-Revalidate
\`\`\`typescript
// Show cached data instantly, fetch fresh in background
useQuery({
  staleTime: 30000,        // Data fresh for 30s
  refetchInterval: 60000,  // Refetch every 60s
});
\`\`\`

### 2. Optimize Polling
\`\`\`typescript
// Poll only when needed
useQuery({
  refetchInterval: (data) => {
    // Stop polling when complete
    if (data?.status === "complete") return false;
    // Exponential backoff
    return Math.min(1000 * 2 ** retryCount, 10000);
  },
});
\`\`\`

### 3. Batch Requests
\`\`\`typescript
// BAD: Multiple requests
for (const id of conversationIds) {
  await api.get(\`/conversations/\${id}\`);
}

// GOOD: Single batch request
await api.get(\`/conversations?ids=\${conversationIds.join(",")}\`);
\`\`\`

## Error Handling

### 1. Retry with Backoff
\`\`\`typescript
useMutation({
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
\`\`\`

### 2. Handle Specific Errors
\`\`\`typescript
onError: (error) => {
  switch (error.code) {
    case "UNAUTHORIZED":
      // Redirect to login
      navigation.navigate("Login");
      break;
    case "RATE_LIMIT":
      // Show toast, queue mutation
      toast.error("Too many requests");
      break;
    default:
      // Generic error
      toast.error(error.message);
  }
}
\`\`\`

### 3. Graceful Degradation
\`\`\`typescript
// Show cached data even if refetch fails
useQuery({
  staleTime: 30000,
  refetchOnError: false, // Don't clear cache on error
});
\`\`\`

## Security

### 1. Never Log Tokens
\`\`\`typescript
// BAD
console.log("Token:", token);

// GOOD
console.log("Token: [REDACTED]");
\`\`\`

### 2. Validate Inputs
\`\`\`typescript
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).max(200),
  modelId: z.string().min(1),
});

const result = schema.safeParse(input);
if (!result.success) {
  throw new Error("Invalid input");
}
\`\`\`

### 3. Rate Limiting
\`\`\`typescript
// Respect 429 responses
if (error.status === 429) {
  const retryAfter = error.headers.get("Retry-After");
  await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
}
\`\`\`

## Caching

### 1. Use Query Keys Effectively
\`\`\`typescript
// Include all params in key
queryKey: ["conversations", { page, pageSize, archived }]

// Invalidate related queries
queryClient.invalidateQueries({ queryKey: ["conversations"] });
\`\`\`

### 2. Optimistic Updates
\`\`\`typescript
onMutate: async (newData) => {
  await queryClient.cancelQueries({ queryKey: ["data"] });
  const previous = queryClient.getQueryData(["data"]);
  queryClient.setQueryData(["data"], (old) => [...old, newData]);
  return { previous };
},
onError: (err, newData, context) => {
  queryClient.setQueryData(["data"], context.previous);
},
\`\`\`

### 3. Selective Invalidation
\`\`\`typescript
// Don't invalidate everything
queryClient.invalidateQueries({ queryKey: ["conversations"] }); // Good
queryClient.invalidateQueries(); // Bad (nukes entire cache)
\`\`\`

## Real-Time

### 1. Disconnect When Inactive
\`\`\`typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      sseClient.disconnect(); // Save battery
    } else {
      sseClient.connect();
      api.get("/conversations").then(setData); // Catch up
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
}, []);
\`\`\`

### 2. Deduplicate Updates
\`\`\`typescript
// Track seen message IDs
const seenIds = new Set();

sseClient.onEvent((event) => {
  if (seenIds.has(event.data.id)) return; // Skip duplicate
  seenIds.add(event.data.id);
  // ... process event
});
\`\`\`

## Testing

### 1. Mock API Responses
\`\`\`typescript
import { rest } from "msw";

const handlers = [
  rest.get("/api/v1/conversations", (req, res, ctx) => {
    return res(
      ctx.json({
        status: "success",
        data: { items: [] },
      })
    );
  }),
];
\`\`\`

### 2. Test Error States
\`\`\`typescript
test("shows error on network failure", async () => {
  server.use(
    rest.get("/api/v1/conversations", (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );

  render(<ConversationList />);
  expect(await screen.findByText("Error")).toBeInTheDocument();
});
\`\`\`

### 3. Test Loading States
\`\`\`typescript
test("shows skeleton while loading", async () => {
  render(<ConversationList />);
  expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  await waitForElementToBeRemoved(() => screen.getByTestId("skeleton"));
});
\`\`\`
```

### Step 5: Create Changelog

**Goal**: Track API changes

**Action**: Create CHANGELOG.md

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/docs/api/CHANGELOG.md`

**Code**:
```markdown
# API Changelog

## v1.0.0 (2025-12-10)

**Initial Release**

### Added
- 🎉 REST API v1 launched
- ✅ Conversations CRUD (create, read, update, delete)
- ✅ Messages CRUD with streaming generation
- ✅ Preferences management
- ✅ Long-running actions (search, transcription)
- ✅ Real-time updates via SSE
- ✅ Authentication via Clerk JWT
- ✅ HTTP caching (Cache-Control headers)
- ✅ Envelope response format
- ✅ Error codes and handling
- ✅ Mobile-ready (React Native compatible)

### Architecture
- Next.js 15 API routes
- Convex backend
- React Query for client state
- SSE for real-time streaming
- Resilient generation (survives page refresh)

### Endpoints
- `GET /api/v1/conversations` - List conversations
- `POST /api/v1/conversations` - Create conversation
- `PATCH /api/v1/conversations/:id` - Update conversation
- `DELETE /api/v1/conversations/:id` - Delete conversation
- `POST /api/v1/conversations/:id/messages` - Send message
- `GET /api/v1/conversations/:id/messages` - List messages
- `PATCH /api/v1/messages/:id` - Update message
- `DELETE /api/v1/messages/:id` - Delete message
- `GET /api/v1/preferences` - Get preferences
- `PATCH /api/v1/preferences` - Update preferences
- `POST /api/v1/actions/search` - Trigger search
- `GET /api/v1/actions/jobs/:id` - Poll job status
- `GET /api/v1/sse/messages/:id` - Stream message updates

### Performance
- API p95 latency: <200ms
- Bundle size: 185KB (gzip)
- Cache hit rate: 85%
- Lighthouse score: 92/100

### Documentation
- API Reference
- Mobile Integration Guide
- Best Practices
- Testing Guide

---

## Future Versions

### v1.1.0 (Planned - Q1 2026)
- [ ] Batch operations (bulk delete)
- [ ] WebSockets alternative (for iOS push)
- [ ] Offline queue sync
- [ ] GraphQL endpoint (optional)
- [ ] OpenAPI spec generation

### v2.0.0 (Planned - Q2 2026)
- [ ] Breaking changes (TBD)
- [ ] New features (TBD)
```

### Step 6: Update CLAUDE.md

**Goal**: Add API context for AI assistant

**Action**: Update CLAUDE.md

**Files**:
- Update `/Users/bhekanik/code/planetaryescape/blah.chat/CLAUDE.md`

**Code**: (See "Success Looks Like" section above for content to add)

### Step 7: Create Examples Document

**Goal**: Copy-paste ready code snippets

**Action**: Create examples.md

**Files**:
- Create `/Users/bhekanik/code/planetaryescape/blah.chat/docs/api/examples.md`

**Code**:
```markdown
# API Examples

Common use cases with copy-paste ready code.

## Authentication

### Get Token (React Native)
\`\`\`typescript
import { useAuth } from "@clerk/clerk-expo";

function useAPIToken() {
  const { getToken } = useAuth();

  return async () => {
    const token = await getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }
    return token;
  };
}
\`\`\`

## Conversations

### List Conversations
\`\`\`typescript
const { data: conversations } = useQuery({
  queryKey: ["conversations"],
  queryFn: () => api.get("/conversations"),
});
\`\`\`

### Create Conversation
\`\`\`typescript
const { mutate: createConversation } = useMutation({
  mutationFn: (input) => api.post("/conversations", input),
  onSuccess: (conversation) => {
    navigation.navigate("Chat", { id: conversation._id });
  },
});

createConversation({
  title: "New Chat",
  modelId: "openai:gpt-4o",
});
\`\`\`

### Delete Conversation with Confirmation
\`\`\`typescript
const { mutate: deleteConversation } = useMutation({
  mutationFn: (id) => api.delete(\`/conversations/\${id}\`),
  onMutate: async (id) => {
    // Optimistic update
    await queryClient.cancelQueries({ queryKey: ["conversations"] });
    const previous = queryClient.getQueryData(["conversations"]);
    queryClient.setQueryData(["conversations"], (old) =>
      old.filter((c) => c._id !== id)
    );
    return { previous };
  },
  onError: (error, id, context) => {
    queryClient.setQueryData(["conversations"], context.previous);
    Alert.alert("Error", "Failed to delete conversation");
  },
});

const handleDelete = (id) => {
  Alert.alert(
    "Delete Conversation",
    "Are you sure?",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteConversation(id) },
    ]
  );
};
\`\`\`

## Messages

### Send Message with Optimistic Update
\`\`\`typescript
const { mutate: sendMessage } = useMutation({
  mutationFn: (input) =>
    api.post(\`/conversations/\${input.conversationId}/messages\`, input),

  onMutate: async (input) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ["messages", input.conversationId] });

    // Snapshot previous
    const previous = queryClient.getQueryData(["messages", input.conversationId]);

    // Optimistic message
    const optimisticMessage = {
      _id: \`temp-\${Date.now()}\`,
      role: "user",
      content: input.content,
      status: "pending",
      createdAt: Date.now(),
    };

    // Apply optimistic update
    queryClient.setQueryData(["messages", input.conversationId], (old) => [
      ...old,
      optimisticMessage,
    ]);

    return { previous, optimisticMessage };
  },

  onSuccess: (data, input, context) => {
    // Replace temp with real message
    queryClient.setQueryData(["messages", input.conversationId], (old) =>
      old.map((m) => (m._id === context.optimisticMessage._id ? data : m))
    );
  },

  onError: (error, input, context) => {
    // Rollback
    queryClient.setQueryData(["messages", input.conversationId], context.previous);
    Alert.alert("Failed to send", error.message);
  },
});

sendMessage({
  conversationId: "conv_123",
  content: "Hello!",
  modelId: "openai:gpt-4o",
});
\`\`\`

### Edit Message
\`\`\`typescript
const { mutate: editMessage } = useMutation({
  mutationFn: ({ id, content }) => api.patch(\`/messages/\${id}\`, { content }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["messages"] });
  },
});
\`\`\`

## Preferences

### Update Theme
\`\`\`typescript
const { mutate: updateTheme } = useMutation({
  mutationFn: (theme) => api.patch("/preferences", { theme }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["preferences"] });
  },
});

<Select onValueChange={(theme) => updateTheme(theme)}>
  <option value="light">Light</option>
  <option value="dark">Dark</option>
  <option value="system">System</option>
</Select>
\`\`\`

## Search

### Trigger Search and Poll Result
\`\`\`typescript
const [jobId, setJobId] = useState(null);

// Trigger search
const { mutate: triggerSearch } = useMutation({
  mutationFn: (query) => api.post("/actions/search", { query }),
  onSuccess: (data) => {
    setJobId(data.jobId);
  },
});

// Poll job status
const { data: job } = useQuery({
  queryKey: ["job", jobId],
  queryFn: () => api.get(\`/actions/jobs/\${jobId}\`),
  enabled: jobId !== null,
  refetchInterval: (data) => {
    if (data?.status === "complete" || data?.status === "error") {
      return false; // Stop polling
    }
    return 2000; // Poll every 2s
  },
});

// Results
const results = job?.status === "complete" ? job.result.results : [];
\`\`\`

## Real-Time (SSE)

### Stream Messages
\`\`\`typescript
import { useEffect, useState } from "react";
import { SSEClient } from "@/lib/sse";

function useMessagesSSE(conversationId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const client = new SSEClient({
      url: \`/api/v1/sse/messages/\${conversationId}\`,
      onEvent: (event) => {
        switch (event.type) {
          case "message-created":
            setMessages((prev) => [...prev, event.data]);
            break;
          case "message-updated":
            setMessages((prev) =>
              prev.map((m) => (m._id === event.data.id ? { ...m, ...event.data } : m))
            );
            break;
        }
      },
    });

    client.connect();
    return () => client.disconnect();
  }, [conversationId]);

  return messages;
}
\`\`\`

## Error Handling

### Global Error Handler
\`\`\`typescript
// QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      onError: (error) => {
        if (error.status === 401) {
          // Redirect to login
          router.replace("/login");
        } else if (error.status === 429) {
          toast.error("Rate limit exceeded. Please wait.");
        } else {
          toast.error(error.message || "Something went wrong");
        }
      },
    },
  },
});
\`\`\`
```

## Testing & Validation

### Documentation Quality Checklist

**1. Completeness**
- [ ] All endpoints documented
- [ ] All parameters explained
- [ ] All error codes listed
- [ ] Mobile guide complete
- [ ] Examples for common flows

**2. Accuracy**
- [ ] Code examples tested (run and work)
- [ ] URLs correct (https://blah.chat/api/v1)
- [ ] Types match implementation
- [ ] Error responses match actual

**3. Usability**
- [ ] Quick start <5min to first request
- [ ] Copy-paste ready code snippets
- [ ] Clear navigation (links between docs)
- [ ] Screenshots/diagrams where helpful

**4. Maintenance**
- [ ] Versioned (v1.0.0)
- [ ] Changelog established
- [ ] Ownership assigned (who updates?)
- [ ] Review schedule (quarterly?)

### User Testing

**Onboard New Developer**:
1. Give them only the docs (no verbal explanation)
2. Ask them to:
   - Setup mobile project
   - Authenticate
   - List conversations
   - Send message
3. Time to completion: Target <30min
4. Collect feedback: What was confusing?

## Success Criteria

- [ ] API README created (overview, quick start)
- [ ] API reference created (all endpoints)
- [ ] Mobile integration guide created (React Native)
- [ ] Best practices documented
- [ ] Examples documented (10+ snippets)
- [ ] Changelog created (v1.0.0)
- [ ] CLAUDE.md updated (API patterns section)
- [ ] User tested (new developer onboarded)
- [ ] Team reviewed (approved by 2+ engineers)
- [ ] Published (accessible to external mobile devs)

## Common Pitfalls

### Pitfall 1: Stale Documentation
**Problem**: Docs outdated after 6 months
**Solution**: Assign owner, quarterly review, link to CI (fail on drift)

### Pitfall 2: Over-Documentation
**Problem**: 100 pages no one reads
**Solution**: 80/20 rule - document common use cases only

### Pitfall 3: Code Without Context
**Problem**: Examples work but don't explain why
**Solution**: Add comments, link to concepts

### Pitfall 4: Missing Migration Guides
**Problem**: Breaking change, no upgrade path
**Solution**: Document migration in changelog with examples

### Pitfall 5: No Feedback Loop
**Problem**: Don't know what's confusing
**Solution**: Add "Was this helpful?" buttons, track clicks

## Next Steps

After completing Phase 8:

**Launch**:
1. Publish docs to public site (docs.blah.chat)
2. Share with mobile dev team
3. Collect feedback (iterate on docs)
4. Monitor adoption (analytics on doc views)

**Maintenance**:
1. Assign owner (update docs with API changes)
2. Schedule quarterly review
3. Track stale docs (last updated date)
4. Improve based on support questions

**Future Enhancements**:
1. OpenAPI spec generation (auto-sync with code)
2. Interactive playground (try API in browser)
3. SDK generation (TypeScript, Swift, Kotlin)
4. Video tutorials (screen recordings)

**Congratulations** - API migration complete! 🎉

All 8 phases done:
- ✅ Phase 0: Foundation
- ✅ Phase 1: Mutations
- ✅ Phase 2: React Query
- ✅ Phase 3: Queries
- ✅ Phase 4: Actions
- ✅ Phase 5: Real-Time
- ✅ Phase 6: Resilient Generation
- ✅ Phase 7: Performance
- ✅ Phase 8: Documentation

Ready for production mobile app launch.
