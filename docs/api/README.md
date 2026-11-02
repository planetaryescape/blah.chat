# blah.chat API

Personal AI chat assistant API with multi-model support, real-time streaming, and resilient generation.

## Quick Start

### 1. Authentication

Get your API token from Clerk:

```bash
export API_TOKEN="your_clerk_jwt_token"
```

### 2. Create Conversation

```bash
curl -X POST https://blah.chat/api/v1/conversations \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chat","modelId":"openai:gpt-4o"}'
```

**Response:**
```json
{
  "status": "success",
  "sys": {
    "entity": "conversation",
    "id": "conv_abc123"
  },
  "data": {
    "_id": "conv_abc123",
    "title": "Test Chat",
    "modelId": "openai:gpt-4o",
    "updatedAt": 1702209600000
  }
}
```

### 3. Send Message

```bash
curl -X POST https://blah.chat/api/v1/conversations/conv_abc123/messages \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, world!","modelId":"openai:gpt-4o"}'
```

**Response:** `202 Accepted` - Generation happens asynchronously

## Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Database**: Convex (real-time, vector search)
- **Auth**: Clerk (JWT tokens)
- **Real-time**: SSE (Server-Sent Events)
- **Caching**: React Query + HTTP Cache-Control
- **AI**: Vercel AI SDK with Gateway (10+ models)

### Hybrid Approach

blah.chat uses **dual architecture**:

1. **Web**: Convex client SDK (real-time WebSocket subscriptions)
   - Instant updates (<100ms latency)
   - Reactive queries (automatic re-renders)
   - Best for web apps

2. **Mobile**: REST API + React Query (HTTP polling + SSE)
   - React Native compatible
   - Standard HTTP caching
   - Best for mobile apps

### Resilient Generation

**Critical feature**: Message generation **survives page refresh/tab close**.

**How it works**:
1. User sends message → API creates DB record (status: `pending`)
2. Convex action streams from LLM, updates DB with `partialContent` every ~100ms
3. Client subscribes to message via reactive query → sees updates in real-time
4. On reconnect: message still there with completed response from DB

**Message states**: `pending` → `generating` → `complete` | `error`

## API Response Format

All responses use **envelope pattern**:

```typescript
// Success
{
  "status": "success",
  "sys": {
    "entity": "conversation",
    "id": "conv_123",
    "timestamps": {
      "created": "2025-01-15T10:00:00Z",
      "updated": "2025-01-15T10:05:00Z",
      "retrieved": "2025-01-15T10:10:00Z"
    }
  },
  "data": {
    // Entity data here
  }
}

// Error
{
  "status": "error",
  "sys": { "entity": "error" },
  "error": {
    "message": "Resource not found",
    "code": "NOT_FOUND",
    "details": {}
  }
}

// List
{
  "status": "success",
  "sys": { "entity": "list" },
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "hasNext": true
    }
  }
}
```

**Always unwrap `.data`** before using in client code.

## Core Endpoints

### Conversations
- `GET /api/v1/conversations` - List conversations
- `POST /api/v1/conversations` - Create conversation
- `GET /api/v1/conversations/:id` - Get single conversation
- `PATCH /api/v1/conversations/:id` - Update conversation
- `DELETE /api/v1/conversations/:id` - Delete conversation
- `POST /api/v1/conversations/:id/archive` - Archive conversation
- `POST /api/v1/conversations/:id/pin` - Pin conversation
- `POST /api/v1/conversations/:id/star` - Star conversation

### Messages
- `GET /api/v1/conversations/:id/messages` - List messages
- `POST /api/v1/conversations/:id/messages` - Send message (triggers generation)
- `PATCH /api/v1/messages/:id` - Update message
- `DELETE /api/v1/messages/:id` - Delete message
- `POST /api/v1/messages/:id/regenerate` - Regenerate response

### Preferences
- `GET /api/v1/preferences` - Get user preferences
- `PATCH /api/v1/preferences` - Update preferences

### Actions (Long-Running)
- `POST /api/v1/actions/transcribe` - Trigger transcription
- `POST /api/v1/actions/search` - Trigger hybrid search
- `GET /api/v1/actions/jobs/:id` - Poll job status

### Real-Time (SSE)
- `GET /api/v1/messages/stream/:conversationId` - Stream message updates
- `GET /api/v1/preferences/stream` - Stream preference updates

## Performance

### Caching Strategy

- **Lists** (conversations, messages): 30s fresh, 60s stale-while-revalidate
- **Single items**: 5min fresh, 10min stale
- **Static data** (preferences): 1h fresh, 2h stale
- **Real-time** (SSE, generation): no cache

### Payload Optimization

- Automatic compaction (removes null/undefined/empty fields)
- 30-40% size reduction on average
- Example: 450KB → 280KB for typical conversation list

### React Query Defaults

```typescript
{
  staleTime: 5 * 60 * 1000,      // 5min (trust Convex for updates)
  gcTime: 30 * 60 * 1000,        // 30min (keep cache longer)
  refetchOnWindowFocus: false,   // Don't refetch on tab switch
  refetchOnMount: false,         // Use cache on component mount
  refetchOnReconnect: true,      // Refetch after offline
}
```

## Error Handling

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `202 Accepted` - Async operation started
- `204 No Content` - Success with no response body
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Codes

- `UNAUTHORIZED` - Auth required
- `FORBIDDEN` - No permission
- `NOT_FOUND` - Resource missing
- `VALIDATION_ERROR` - Invalid input
- `RATE_LIMIT` - Too many requests
- `INTERNAL_ERROR` - Server error

### Retry Strategy

```typescript
// Recommended retry config
{
  retry: (failureCount, error) => {
    if (error.status >= 400 && error.status < 500) return false; // Don't retry 4xx
    return failureCount < 2; // Retry 5xx/network twice
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
}
```

## Documentation

- **[API Reference](./reference.md)** - Full endpoint documentation
- **[Mobile Integration Guide](./mobile-integration.md)** - React Native setup
- **[Best Practices](./best-practices.md)** - Performance, security, patterns
- **[Examples](./examples.md)** - Copy-paste ready code snippets
- **[Changelog](./CHANGELOG.md)** - Version history

## Mobile Integration

See **[Mobile Integration Guide](./mobile-integration.md)** for React Native setup with:
- Clerk authentication
- React Query configuration
- SSE polyfill (EventSource)
- Optimistic updates
- Error handling
- Testing strategies

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/blah.chat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/blah.chat/discussions)
- **Email**: support@blah.chat

## License

MIT - See [LICENSE](../../LICENSE) for details.
