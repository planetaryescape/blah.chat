# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project:- **Description**: Personal AI chat assistant with access to all models (OpenAI, Gemini, Claude), mid-chat switching, conversation branching, and transparent cost tracking.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Database**: Convex (real-time, vector search)
- **Auth**: Clerk
- **AI**: Vercel AI SDK with Gateway (OpenAI, Anthropic, Google, Groq, Cerebras, xAI, Perplexity, OpenRouter, Ollama)
- **UI**: shadcn/ui, Tailwind CSS v4, Framer Motion
- **Linting/Formatting**: Biome
- **Package Manager**: Bun

**CRITICAL**: This project uses **Bun exclusively**. Never use npm, pnpm, yarn, or npx commands. Always use:
- `bun install` (not `npm install`)
- `bun add` (not `npm install <package>`)
- `bunx` (not `npx`)
- `bun run` for scripts

If you see `package-lock.json`, delete it immediately - only `bun.lock` should exist.

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

### Email System

All transactional emails MUST use React Email for consistent, beautiful rendering:
- **Library**: `@react-email/components` + `@react-email/render`
- **Provider**: Resend (via `@convex-dev/resend` component)
- **Templates**: Store in `convex/emails/templates/` with Node runtime (`"use node"`)
- **Components**: Use shared components from `convex/emails/components/` (EmailContainer, EmailButton)
- **Styling**: Inline styles only (email clients don't support CSS classes)
- **Testing**: Use `testMode: true` with `delivered@resend.dev` address

**Directory structure**:
```
convex/emails/
├── templates/       # Individual email templates
├── components/      # Shared email components
├── utils/          # Email sending logic
└── test/           # Email tests
```

**Never use plain text or raw HTML strings** - always use React Email components for all transactional emails.

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

### Dependency Management

**Check before installing**: Before adding a new dependency, ALWAYS check `package.json` to see if:
1. The dependency is already installed.
2. A similar dependency (e.g., `date-fns` vs `dayjs`) is already present that can solve the problem.
**Goal**: Minimize bundle size and avoid duplicate libraries doing the same thing.

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

### Prompt Management

All LLM prompts must be centralized in `src/lib/prompts/`.
- **Do not** hardcode prompts in Convex actions, API routes, or UI components.
- Create a dedicated file for each feature (e.g., `triage.ts`, `memory.ts`).
- Use named exports (e.g., `export const TRIAGE_PROMPT = ...`).
- Import prompts into actions/functions where needed.
- **Why**: Ensures centralized version control, easier editing, reusability, and consistency across the app.

### Model Management

All AI model definitions and configuration must live in `src/lib/ai/models.ts`.
- **Do not** hardcode model IDs (e.g., `"gpt-4"`, `"claude-3-opus"`) in strings throughout the app.
- Import `MODEL_CONFIG` from `@/lib/ai/models` and use the constants (e.g., `MODEL_CONFIG["openai:gpt-4o"].id`).
- When calling `aiGateway`, `generateText`, etc., always use the configuration object.
- **Why**:
  - Single source of truth for model IDs, pricing, and capabilities.
  - Easier to swap models globally (e.g., deprecating a model).
  - Prevents typos and configuration drift.
  - Simplifies integration with Vercel AI Gateway (provider order, parameters).

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
AI_GATEWAY_API_KEY=  # Vercel AI Gateway (replaces individual provider keys)
```

Optional: Ollama (for local models), PostHog, TTS providers.

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

## AI SDK Tool Calling (Vercel AI SDK v5)

**Multi-step tool calling** requires `stopWhen` parameter, NOT `maxSteps`:

```typescript
import { streamText, stepCountIs } from "ai";

const result = streamText({
  model,
  messages,
  tools: { myTool },
  stopWhen: stepCountIs(5), // Continue until 5 steps OR no more tool calls
});
```

**Key learnings**:
- `maxSteps` is deprecated/different behavior in v5
- `stopWhen: stepCountIs(N)` enables proper multi-step continuation
- Tool results use `output` property, not `result` (in step data)
- Always check `finishReason` and step count in logs for debugging

---

## Additional Context

- React Compiler enabled: `reactCompiler: true` in `next.config.ts`
- Path alias: `@/*` → `./src/*`
- Tailwind v4: PostCSS-based, check `@tailwindcss/postcss`
- shadcn/ui: Install with `bunx shadcn@latest add <component>`

---

Full spec: `docs/spec.md`
Implementation phases: `docs/implementation/*.md`
