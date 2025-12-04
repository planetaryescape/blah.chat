# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project: blah.chat

Personal AI chat assistant - self-hosted ChatGPT alternative with multi-model support, RAG memory system, cost tracking, and full data ownership.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Database**: Convex (real-time, vector search)
- **Auth**: Clerk
- **AI**: Vercel AI SDK (OpenAI, Anthropic, Google, Ollama)
- **UI**: shadcn/ui, Tailwind CSS v4, Framer Motion
- **Linting/Formatting**: Biome
- **Package Manager**: Bun

---

## Development Commands

```bash
# Development
bun dev                    # Start dev server (localhost:3000)

# Build
bun run build             # Production build
bun start                 # Run production build

# Code Quality
bun run lint              # Biome lint check
bun run format            # Biome format --write
```

---

## Key Architecture Patterns

### Resilient Generation (Critical Feature)

Message generation **must survive page refresh/tab close**. Never lose responses.

Architecture:
1. User message → immediate DB insert with `status: "pending"`
2. Trigger Convex action (runs server-side, up to 10min)
3. Action streams from LLM, periodically updates DB with `partialContent`
4. Client subscribes to message via reactive query - auto-updates
5. On reconnect: see completed response from DB

Message states: `pending` | `generating` | `complete` | `error`

Schema fields:
- `status`, `partialContent`, `error`
- `generationStartedAt`, `generationCompletedAt`

**Never use client-only streaming** - always persist server-side.

### API Envelope Pattern

All API responses wrapped in standard envelope:

```typescript
// Success
{ status: "success", sys: { id?, entity, timestamps? }, data: T }

// List
{ status: "success", sys: { entity: "list" }, data: Entity<T>[] }

// Error
{ status: "error", sys: { entity: "error" }, error: string | {...} }
```

Use formatters from `src/lib/utils/formatEntity.ts`:
- `formatEntity(data, "user")`
- `formatEntityList(items, "post")`
- `formatErrorEntity(error)`

Frontend: **always unwrap `.data`** before using.

### Convex Integration

- **Queries**: Real-time reactive data subscriptions
- **Mutations**: Optimistic updates, immediate writes
- **Actions**: Long-running (LLM calls, external APIs)
- **Schema**: See `docs/spec.md` lines 1302-1568 for full schema

Key tables: `users`, `conversations`, `messages`, `memories`, `projects`, `bookmarks`, `shares`, `scheduledPrompts`, `usageRecords`

### Memory System (RAG)

1. Extract facts from conversations (LLM analysis)
2. Generate embeddings, store with vector index
3. On new message: vector search relevant memories
4. Inject into system prompt

Use `gpt-4o-mini` for extraction (cost optimization).

### Hybrid Search

Combine full-text + semantic (vector) search:
- Convex search index for keywords
- Vector index for meaning
- Merge with RRF (Reciprocal Rank Fusion)

### Cost Tracking

Per-message: `inputTokens`, `outputTokens`, `cost` (USD)
Daily aggregates: `usageRecords` table
Model pricing: config file (easy updates)

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Sign in/up pages
│   ├── (main)/          # Authenticated app
│   │   ├── chat/[conversationId]/
│   │   ├── projects/, memories/, bookmarks/
│   │   ├── search/, usage/, templates/
│   │   └── settings/
│   └── api/             # Route handlers
├── components/
│   ├── ui/              # shadcn components
│   ├── chat/            # Chat UI
│   ├── sidebar/         # Conversation list
│   └── ...
├── lib/
│   ├── ai/              # Model configs, providers, memory logic
│   ├── utils/           # formatEntity, cost, tokens, search
│   └── logger.ts        # Pino
├── convex/              # Convex schema, queries, mutations, actions
├── hooks/               # React hooks
└── types/               # TypeScript types
```

---

## Design Philosophy

**Avoid generic AI aesthetic**. Make it distinctive, creative, surprising.

- **Typography**: Unique fonts, NOT Inter/Roboto/Arial
- **Colors**: Cohesive theme, dominant colors + sharp accents
- **Motion**: High-impact animations, staggered reveals
- **Backgrounds**: Layers, gradients, depth - NOT flat solids
- **Theme**: Dark primary (user preference), playful personality (name: "blah.chat")

Draw inspiration: code editor themes (Rosé Pine, Tokyo Night, Vesper), unique web apps.

---

## AI Components Strategy

**Vercel AI Elements**: Design inspiration only

Evaluated for integration but incompatible with resilient generation:
- AI Elements: client-side streaming (loses data on refresh)
- blah.chat: server-side Convex actions (persists to DB)

Reference for:
- Action toolbar patterns
- Loading animations
- Input UX (suggestions, attachments)

Do NOT use for:
- Core message rendering
- Streaming logic
- State management

---

## Phased Implementation

See `docs/implementation/README.md` for full plan.

**Phase 0**: Design system (foundation)
**Phase 1**: Auth + Convex setup
**Phase 2A**: **Resilient chat** (CRITICAL - test refresh mid-generation)
**Phase 2B**: Chat UX polish
**Phase 2C**: Conversations sidebar
**Phase 3**: Multi-model support (10+ models)
**Phase 4-7**: Files, voice, RAG memory, search, cost tracking
**Phase 8-11**: Advanced features, sharing, export/import, polish

Current status: Phase 0 setup complete, ready for implementation.

---

## Critical Rules

1. **Resilient generation**: MUST survive page refresh - use Convex actions
2. **API envelopes**: Every response wrapped, no raw data
3. **No generic design**: Creative, distinctive, contextual aesthetics
4. **Biome only**: Use `bun run lint` and `bun run format` - NOT Prettier/ESLint
5. **Type safety**: Strict TypeScript throughout
6. **Convex schema**: Follow schema in `docs/spec.md` exactly
7. **Cost tracking**: Log tokens/cost on every LLM call
8. **Pino logging**: Structured JSON logs in API routes

---

## Environment Variables

Required for development:
```bash
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
```

Optional: Ollama, PostHog, TTS providers.

---

## Testing Checklist

**After Phase 2A (MVP)**:
- [ ] Send message → works
- [ ] Responses stream in
- [ ] **Refresh mid-generation → response completes** (CRITICAL)
- [ ] Cost tracked per message

**After Phase 3**:
- [ ] 10+ models working
- [ ] Switch models mid-conversation
- [ ] Model-specific features (thinking effort)

---

## Common Pitfalls

- 10min Convex action limit: chunk long generations if needed
- Generic AI look: review design first, iterate until distinctive
- Memory extraction cost: use `gpt-4o-mini`, not `gpt-4o`
- Embedding costs: batch operations, generate async
- Context window: implement truncation early (Phase 8)

---

## Additional Context

- React Compiler enabled: `reactCompiler: true` in `next.config.ts`
- Path alias: `@/*` → `./src/*`
- Tailwind v4: PostCSS-based, check `@tailwindcss/postcss`
- shadcn/ui: Install with `bunx shadcn@latest add <component>`

---

Full spec: `docs/spec.md`
Implementation phases: `docs/implementation/*.md`
