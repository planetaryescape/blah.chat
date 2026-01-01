# blah.chat Terminal UI Client

A terminal-based chat client for blah.chat, built with Ink (React for CLI) and shared hooks.

## Overview

This project creates a TUI (Terminal User Interface) client that connects to the same Convex backend as the web app, enabling users to chat with AI models directly from their terminal.

## Research & Background

### Why Ink?

**Claude Code uses Ink.** Anthropic's engineering team are "big fans of Ink" (confirmed via [Pragmatic Engineer newsletter](https://newsletter.pragmaticengineer.com/p/how-claude-code-is-built)). Their stack:
- **Framework**: Ink (React renderer for CLI)
- **Layout**: Yoga (Meta's constraints-based layout engine)
- **Language**: TypeScript

Ink was chosen because:
- React mental model - same patterns as web app
- Enables **shared hooks** between web and CLI
- Full TypeScript support, production-ready (29k+ GitHub stars)
- Declarative UI - define state, let React handle rendering
- Flexbox layouts via Yoga

**Alternatives Evaluated**:

| Framework | Status | Verdict |
|-----------|--------|---------|
| **Ink** | Production-ready, 29k stars | **Selected** |
| OpenTUI (SST) | Alpha (0.1.50), 39 dependents | Too immature |
| Blessed/Neo-blessed | Unmaintained since 2018 | Deprecated |
| Bubbletea | Go only | Wrong language |

### Shared Hooks Strategy

Since Ink uses React, we can **share hooks between web and CLI apps**.

**Hooks to share** (from `apps/web/src/lib/hooks/`):
- `useConversations` - conversation list query
- `useMessages` - paginated message query
- `useSendMessage` - send message mutation
- `useRegenerateMessage` - regenerate response
- `useArchiveConversation`, `useDeleteConversation`
- `useToggleStar`, `useTogglePin`
- `usePreferences`, `useUpdatePreferences`
- `useApiKeyValidation` - BYOK validation

**Hooks NOT shareable** (browser-dependent):
- 64 hooks in `src/hooks/` - DOM/keyboard/scroll/audio specific

### Auth Dependency Injection

The key challenge is authentication. Web uses Clerk React hooks, CLI needs token-based auth.

**Solution**: Make `useApiClient` dependency-injectable:

```typescript
// Shared interface
interface AuthContext {
  getToken: () => Promise<string | null>;
}

// Web implementation
function useApiClientWeb() {
  const { getToken } = useAuth(); // Clerk
  return useApiClient({ getToken });
}

// CLI implementation
function useApiClientCLI(storedToken: string) {
  return useApiClient({
    getToken: async () => storedToken
  });
}
```

### Transport Layer

**Use ConvexHttpClient directly** (not REST API):

```typescript
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(CONVEX_URL);
client.setAuth(jwtToken);
const conversations = await client.query(api.conversations.list);
```

**Why not REST API?**
- ConvexHttpClient = direct DB access, lower latency
- Works in Node.js (no React dependency needed for transport)
- Same queries/mutations as web app

### Real-time Updates

ConvexHttpClient doesn't support WebSocket subscriptions in Node.js. **Solution: Polling**.

```typescript
// Poll message.partialContent every 100ms during generation
while (message.status === "generating") {
  await sleep(100);
  message = await client.query(api.messages.get, { messageId });
  render(message.partialContent);
}
```

### Authentication Flow

Browser OAuth (like `gh` CLI):

1. User runs `blah login`
2. Opens browser → Clerk OAuth page
3. Local server receives callback with token
4. Token stored in `~/.blah/credentials.json`
5. Token auto-refreshed on expiry

## Architecture

### Monorepo Structure

```
apps/
├── web/                    # Next.js web app
├── cli/                    # NEW: Terminal client
│   ├── package.json
│   ├── bin/blah.js
│   └── src/
│       ├── index.tsx
│       ├── commands/
│       ├── components/
│       ├── hooks/
│       └── lib/

packages/
├── backend/                # Convex backend
├── hooks/                  # NEW: Shared React hooks
│   ├── package.json
│   └── src/
│       ├── queries/
│       ├── mutations/
│       └── client/
├── ai/                     # AI utilities
└── shared/                 # Shared types
```

### Key Backend Files

| File | Purpose |
|------|---------|
| `packages/backend/convex/conversations.ts` | Conversation queries |
| `packages/backend/convex/messages.ts` | Message queries |
| `packages/backend/convex/chat.ts` | sendMessage mutation |
| `packages/backend/convex/generation.ts` | Streaming logic |

### Message Generation Flow

1. User sends message → mutation creates user message + empty assistant message
2. Convex action triggers `generateResponse` (runs up to 10 minutes)
3. Action streams from LLM, updates `partialContent` every ~100ms
4. Client polls message status, renders `partialContent`
5. When `status: "complete"`, show final `content`

**Message statuses**: `pending` → `generating` → `complete` (or `error`/`stopped`)

## Implementation Phases

**Design-First Approach**: Phase 0 establishes the visual identity before any code. This ensures the TUI feels premium and intentional, not like an afterthought.

| Phase | Deliverable | Prerequisite |
|-------|-------------|--------------|
| [0](./phase-0-design.md) | **Design System** | None |
| [1A](./phase-1a-shared-hooks.md) | Shared hooks package | 0 |
| [1B](./phase-1b-cli-scaffold.md) | CLI with auth | 1A |
| [2A](./phase-2a-convex-integration.md) | Fetch conversations | 1B |
| [2B](./phase-2b-message-viewing.md) | View messages | 2A |
| [3A](./phase-3a-send-messages.md) | Send messages | 2B |
| [3B](./phase-3b-streaming.md) | Streaming responses | 3A |
| [4A](./phase-4a-conversation-management.md) | New chats, model selector | 3B |
| [4B](./phase-4b-search-settings.md) | Search, settings | 4A |
| [4C](./phase-4c-polish.md) | Keybindings, themes | 4B |

## Milestones

| Milestone | Phases | Goal |
|-----------|--------|------|
| **0: Design** | 0 | Visual identity, color palette, component specs |
| **1: Foundation** | 1A, 1B | Auth works, shared hooks exist |
| **2: Read-Only** | 2A, 2B | View conversations & messages |
| **3: Interactive** | 3A, 3B | Send messages, see streaming |
| **4: Full Features** | 4A-4C | Model selector, search, polish |

## User Configuration

**Keybindings** (both modes supported):

| Action | Vim | Arrows |
|--------|-----|--------|
| Navigate up | k | ↑ |
| Navigate down | j | ↓ |
| Select/Enter | Enter | Enter |
| Back/Cancel | Esc, q | Esc |
| Search | / | Ctrl+F |
| New chat | n | Ctrl+N |
| Switch model | m | Tab |
| Quit | :q | Ctrl+C |

**Settings stored in**: `~/.blah/config.json`

## Dependencies

### Shared Hooks Package

```json
{
  "name": "@blah-chat/hooks",
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "convex": "^1.17.0"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  }
}
```

### CLI App

```json
{
  "name": "@blah-chat/cli",
  "dependencies": {
    "ink": "^5.0.0",
    "ink-text-input": "^6.0.0",
    "ink-select-input": "^6.0.0",
    "@blah-chat/hooks": "workspace:*",
    "@blah-chat/backend": "workspace:*",
    "@clerk/clerk-sdk-node": "^5.0.0",
    "open": "^10.0.0",
    "conf": "^13.0.0",
    "commander": "^12.0.0"
  }
}
```

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| No real-time subscriptions | Poll at 100ms (acceptable latency) |
| Clerk OAuth in CLI | Use localhost callback server |
| Terminal scrollback limits | Virtual scroll with ink-scroll-area |
| Token expiry | Auto-refresh before expiry |

## Sources

- [How Claude Code is built](https://newsletter.pragmaticengineer.com/p/how-claude-code-is-built) - Anthropic engineering blog
- [Ink GitHub](https://github.com/vadimdemedes/ink) - React for CLI
- [Convex HTTP Client docs](https://docs.convex.dev/client/javascript) - Node.js usage
- [Clerk CLI authentication](https://clerk.com/docs/custom-flows/oauth-connections) - OAuth flow
