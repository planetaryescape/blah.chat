# API Reference

Base URL: `https://blah.chat/api/v1`

## Authentication

All endpoints require Clerk JWT token in Authorization header:

```
Authorization: Bearer <token>
```

Get token in React Native:
```typescript
const { getToken } = useAuth();
const token = await getToken();
```

## Conversations

### List Conversations

```http
GET /conversations?page=1&pageSize=20&archived=false
```

**Query Parameters:**
- `page` (optional): Page number, default 1
- `pageSize` (optional): Items per page, default 20, max 100
- `archived` (optional): Include archived, default false

**Response:** `200 OK`
```json
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
```

**Cache:** `private, max-age=30, stale-while-revalidate=60`

### Get Conversation

```http
GET /conversations/:id
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "sys": {
    "entity": "conversation",
    "id": "conv_123"
  },
  "data": {
    "_id": "conv_123",
    "title": "Chat about React",
    "modelId": "openai:gpt-4o",
    "createdAt": 1702209600000,
    "updatedAt": 1702209650000
  }
}
```

**Cache:** `private, max-age=300, stale-while-revalidate=600`

### Create Conversation

```http
POST /conversations
```

**Body:**
```json
{
  "title": "New Chat",
  "modelId": "openai:gpt-4o",
  "systemPrompt": "You are a helpful assistant" // optional
}
```

**Response:** `201 Created`
```json
{
  "status": "success",
  "sys": {
    "entity": "conversation",
    "id": "conv_456"
  },
  "data": {
    "_id": "conv_456",
    "title": "New Chat",
    "modelId": "openai:gpt-4o",
    "createdAt": 1702209700000,
    "updatedAt": 1702209700000
  }
}
```

### Update Conversation

```http
PATCH /conversations/:id
```

**Body:**
```json
{
  "title": "Renamed Chat" // Only field that can be updated
}
```

**Response:** `200 OK`

### Delete Conversation

```http
DELETE /conversations/:id?permanent=false
```

**Query Parameters:**
- `permanent` (optional): Permanent delete vs archive, default false

**Response:** `204 No Content`

### Archive Conversation

```http
POST /conversations/:id/archive
```

**Response:** `200 OK`

### Pin Conversation

```http
POST /conversations/:id/pin
```

**Response:** `200 OK`

### Star Conversation

```http
POST /conversations/:id/star
```

**Response:** `200 OK`

## Messages

### List Messages

```http
GET /conversations/:id/messages?page=1&pageSize=50
```

**Query Parameters:**
- `page` (optional): Page number, default 1
- `pageSize` (optional): Items per page, default 50, max 200

**Response:** `200 OK`
```json
{
  "status": "success",
  "sys": { "entity": "list" },
  "data": {
    "items": [
      {
        "_id": "msg_123",
        "conversationId": "conv_123",
        "role": "user",
        "content": "Hello!",
        "status": "complete",
        "createdAt": 1702209600000
      },
      {
        "_id": "msg_124",
        "conversationId": "conv_123",
        "role": "assistant",
        "content": "Hi there!",
        "model": "openai:gpt-4o",
        "status": "complete",
        "createdAt": 1702209602000
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 50,
      "total": 25,
      "hasNext": false
    }
  }
}
```

**Cache:** `private, max-age=30, stale-while-revalidate=60`

### Send Message

```http
POST /conversations/:id/messages
```

**Body:**
```json
{
  "content": "Hello, world!",
  "modelId": "openai:gpt-4o",
  "models": ["openai:gpt-4o", "anthropic:claude-3-5-sonnet"], // For comparison mode
  "thinkingEffort": "medium", // Optional, for reasoning models
  "attachments": [ // Optional
    {
      "type": "file",
      "name": "document.pdf",
      "storageId": "storage_123",
      "mimeType": "application/pdf",
      "size": 102400
    }
  ]
}
```

**Response:** `202 Accepted`
```json
{
  "status": "success",
  "sys": { "entity": "message" },
  "data": {
    "_id": "msg_125",
    "conversationId": "conv_123",
    "role": "user",
    "content": "Hello, world!",
    "status": "pending",
    "createdAt": 1702209700000
  }
}
```

**Note:** Response generation happens asynchronously. Use SSE or polling to get assistant response.

### Delete Message

```http
DELETE /messages/:id
```

**Response:** `204 No Content`

### Regenerate Message

```http
POST /messages/:id/regenerate
```

**Body:**
```json
{
  "modelId": "openai:gpt-4o" // optional, defaults to original model
}
```

**Response:** `202 Accepted` - New message created

## Preferences

### Get Preferences

```http
GET /preferences
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "sys": { "entity": "preferences" },
  "data": {
    "theme": "dark",
    "sendOnEnter": true,
    "defaultModel": "openai:gpt-4o"
  }
}
```

**Cache:** `private, max-age=3600, stale-while-revalidate=7200`

### Update Preferences

```http
PATCH /preferences
```

**Body:**
```json
{
  "theme": "light",
  "sendOnEnter": false
}
```

**Response:** `200 OK`

## Actions (Long-Running)

### Trigger Transcription

```http
POST /actions/transcribe
```

**Body:**
```json
{
  "audioUrl": "https://example.com/audio.mp3",
  "language": "en" // optional
}
```

**Response:** `202 Accepted`
```json
{
  "status": "success",
  "sys": { "entity": "job" },
  "data": {
    "jobId": "job_123",
    "status": "pending"
  }
}
```

### Trigger Hybrid Search

```http
POST /search/hybrid
```

**Body:**
```json
{
  "query": "React hooks",
  "limit": 10,
  "searchType": "hybrid" // "hybrid" | "semantic" | "fulltext"
}
```

**Response:** `202 Accepted`

### Poll Job Status

```http
GET /actions/jobs/:jobId
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "sys": { "entity": "job" },
  "data": {
    "jobId": "job_123",
    "status": "complete", // "pending" | "running" | "complete" | "error"
    "result": {
      "results": [...],
      "duration": 1234
    },
    "error": null
  }
}
```

**Polling Strategy:**
```typescript
refetchInterval: (data) => {
  if (data?.status === "complete" || data?.status === "error") {
    return false; // Stop polling
  }
  return 2000; // Poll every 2s
}
```

## Real-Time (SSE)

### Stream Conversation Updates

```http
GET /conversations/stream
```

**Headers:**
```
Accept: text/event-stream
```

**Response:** `text/event-stream`

**Event Types:**
- `conversation-created` - New conversation added
- `conversation-updated` - Conversation modified
- `conversation-deleted` - Conversation removed
- `ping` - Keepalive (every 30s)

### Stream Message Updates

```http
GET /messages/stream/:conversationId
```

**Headers:**
```
Accept: text/event-stream
```

**Response:** `text/event-stream`

**Event Types:**
- `message-created` - New message added
- `message-updated` - Message content/status changed (partialContent updates)
- `message-deleted` - Message removed
- `ping` - Keepalive (every 30s)

**Event Format:**
```
event: message-updated
data: {"_id":"msg_123","partialContent":"Hello, I'm","status":"generating"}

event: message-updated
data: {"_id":"msg_123","partialContent":"Hello, I'm Claude","status":"generating"}

event: message-updated
data: {"_id":"msg_123","content":"Hello, I'm Claude, how can I help?","status":"complete"}
```

**Client Implementation:**
```typescript
const eventSource = new EventSource(
  `/api/v1/messages/stream/${conversationId}`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);

eventSource.addEventListener("message-updated", (event) => {
  const data = JSON.parse(event.data);
  // Update message in state
});
```

### Stream Preference Updates

```http
GET /preferences/stream
```

Same format as message stream, emits `preference-updated` events.

## Error Responses

All errors follow envelope format:

```json
{
  "status": "error",
  "sys": { "entity": "error" },
  "error": {
    "message": "Resource not found",
    "code": "NOT_FOUND",
    "details": {
      "resource": "conversation",
      "id": "conv_invalid"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Rate Limiting

- **Limit**: 50 messages/day per user (free tier)
- **Header**: `Retry-After` (seconds to wait)
- **Response**: 429 with error message

```json
{
  "status": "error",
  "sys": { "entity": "error" },
  "error": {
    "message": "Daily message limit reached (50/50)",
    "code": "RATE_LIMIT",
    "details": {
      "limit": 50,
      "used": 50,
      "resetAt": "2025-01-16T00:00:00Z"
    }
  }
}
```

## Versioning

- Current version: **v1**
- Base URL includes version: `/api/v1/`
- Breaking changes → new version (v2)
- Deprecation: 6 months notice minimum

## Performance

### Response Times (p95)

- List conversations: <100ms
- Get single conversation: <50ms
- Send message: <200ms (user message create)
- Generate response: 5-30s (async, via SSE)

### Payload Sizes (gzip)

- List conversations (20 items): ~8KB
- List messages (50 items): ~15KB
- Single conversation: ~0.5KB
- Single message: ~0.3KB

## Additional Endpoints

### Health Check

```http
GET /health
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "sys": { "entity": "health" },
  "data": {
    "status": "ok",
    "timestamp": 1702209600000
  }
}
```

**Note:** No authentication required.

### Extract Memories

```http
POST /memories/extract
```

**Body:**
```json
{
  "conversationId": "conv_123",
  "limit": 50
}
```

**Response:** `202 Accepted`
```json
{
  "status": "success",
  "sys": { "entity": "job" },
  "data": {
    "jobId": "job_456",
    "status": "pending"
  }
}
```

## Next Steps

- [Mobile Integration Guide](./mobile-integration.md) - React Native setup
- [Best Practices](./best-practices.md) - Performance, security
- [Examples](./examples.md) - Copy-paste code snippets
