# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project:- **Description**: Personal AI chat assistant with access to all models (OpenAI, Gemini, Claude), mid-chat switching, conversation branching, and transparent cost tracking.

---

## 💰 Money Feature

**CRITICAL**: AI chat generation with resilient streaming - what users pay for

**Core functionality**: Multi-model AI chat with real-time streaming responses
**Critical path**: User sends message → server-side generation → DB persistence → reactive client updates
**If broken**: No business - users can't get AI responses

### Key Files (Mission-Critical)

| File | Purpose | Lines |
|------|---------|-------|
| `packages/backend/convex/generation.ts` | Main generation action - streaming, tools, error handling | ~1450 |
| `packages/backend/convex/messages.ts` | Message mutations, status updates, partial content | ~730 |
| `packages/backend/convex/chat.ts` | Send message mutation, triggers generation | ~650 |
| `packages/ai/src/models.ts` | Shared model configs (source of truth) | ~575 |
| `apps/web/src/lib/ai/models.ts` | Web-specific model extensions + AUTO_MODEL | ~1050 |
| `apps/web/src/lib/ai/registry.ts` | Model instantiation via Gateway | - |

### Dependencies
- Vercel AI Gateway (all models)
- Convex (real-time DB + 10min actions)
- Clerk (auth)

### What MUST Work
1. Message sends without error
2. Response streams in real-time
3. Page refresh preserves partial response
4. Cost tracked per message
5. Tools execute (web search, code execution)

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

## Testing

**Philosophy:** Test like a user, not like a developer. See `docs/testing/testing-philosophy.md` for full guide.

### Commands

```bash
bun run test              # Vitest watch mode
bun run test:run          # Single run
bun run test:e2e          # Playwright E2E
```

### Test Categories

| Type | Framework | Location |
|------|-----------|----------|
| Unit/Integration | Vitest | `**/*.test.ts` |
| Convex | convex-test | `convex/__tests__/` |
| E2E | Playwright | `e2e/` |

### Key Principles

1. **Accessibility queries** - `getByRole`, `getByLabelText` over `getByTestId`
2. **Mock boundaries only** - Network/Convex, not components
3. **Test behavior** - User interactions → visible outcomes
4. **Use existing factories** - `src/lib/test/factories.ts`

See `docs/testing/` for implementation phases.

---

## Key Architecture Patterns

### Auth Architecture (Defense-in-Depth)

**Layer 1 - Middleware** (`apps/web/src/proxy.ts`):
- Uses Clerk's `clerkMiddleware` for authentication
- Convenience redirect: `/` → `/app` for authenticated users
- Admin route protection: checks `sessionClaims.publicMetadata.isAdmin`
- Calls `auth.protect()` for non-public routes

**Layer 2 - Pages/Layouts**:
- Check auth state (`useAuth`, `useConvexAuth`)
- Handle redirects based on role/state
- Examples: auth layout redirects signed-in users, admin layout checks `isCurrentUserAdmin`

**Layer 3 - DAL (Convex)** - The true security boundary:
- Every query/mutation verifies auth via `getCurrentUser(ctx)`
- Role checks in functions (e.g., `user.isAdmin !== true`)
- API routes use `withAuth()` wrapper

**Why**: CVE-2025-29927 showed middleware can be bypassed. Defense-in-depth ensures security even if one layer fails.

See `docs/architecture/authentication.md` for full details.

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

### API Architecture (Hybrid)

**Web**: Convex client SDK (real-time WebSocket)
**Mobile**: REST API + React Query (HTTP + SSE)

Key files: `src/lib/api/dal/*`, `src/lib/hooks/mutations/*`, `src/lib/hooks/queries/*`, `src/app/api/v1/*`

Mobile: Use API endpoints (not Convex SDK), add to React Query hooks. See `docs/api/mobile-integration.md`.

### Schema Design Principles

**CRITICAL**: Use normalized, SQL-ready schema design. Avoid nested documents.

**Why Normalize:**
- 40% smaller documents (faster queries, lower storage)
- 10x faster cascade deletes (junction tables vs array scans)
- Queryable relationships (analytics, reporting)
- No data drift (single source of truth)
- Atomic updates (change one field without touching others)

**When to Normalize** (Always prefer this):
```typescript
// ✅ GOOD - Normalized with junction table
defineTable("messages", { ... })
defineTable("attachments", {
  messageId: v.id("messages"),
  userId: v.id("users"),
  storageId: v.id("_storage"),
  ...
})

// ❌ BAD - Nested array (bloats documents)
defineTable("messages", {
  attachments: v.optional(v.array(v.object({ ... }))),
  ...
})
```

**When Nesting is Acceptable** (Rare cases):
- Small, fixed-size metadata (2-3 fields, never grows)
- Data never queried independently
- Always deleted with parent
- Example: `{ lat: number, lng: number }` for location

**Junction Tables for M:N Relationships:**
```typescript
// Many-to-many: Projects ↔ Conversations
defineTable("projectConversations", {
  projectId: v.id("projects"),
  conversationId: v.id("conversations"),
  addedAt: v.number(),
  addedBy: v.id("users"),
})
  .index("by_project", ["projectId"])
  .index("by_conversation", ["conversationId"])
  .index("by_project_conversation", ["projectId", "conversationId"]);
```

**Required Indexes:**
- Foreign key fields (e.g., `userId`, `conversationId`)
- Composite indexes for common queries
- Vector indexes for embeddings (1536 dimensions)
- Search indexes for full-text search

**Reference**: See `docs/architecture/schema-normalization.md` for complete migration history and patterns.

### TypeScript Type Handling in Convex

**Problem**: With 94+ Convex modules, TypeScript hits recursion limits when resolving `internal.*` and `api.*` types, causing "Type instantiation is excessively deep" errors.

**Official Convex Recommendation**: Extract 90% of logic to plain TypeScript helper functions, keep query/mutation/action wrappers thin (10%). This avoids the type recursion entirely.

**Pragmatic Workaround** (when helpers not feasible):

```typescript
// Pattern: Cast ctx.runQuery to any + @ts-ignore on reference + Assert return type
const result = ((await (ctx.runQuery as any)(
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.path.to.query,
  { args },
)) as ReturnType);

// For mutations
await ((ctx.runMutation as any)(
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.path.to.mutation,
  { args },
)) as Promise<void>);

// For actions
const result = ((await (ctx.runAction as any)(
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.path.to.action,
  { args },
)) as ReturnType);
```

**Benefits:**
- ✅ Full type safety on return values (IDE autocomplete, compile-time checking)
- ✅ Only bypasses problematic parameter type inference
- ✅ Explicit return types make code self-documenting
- ✅ Consistent pattern across codebase

**When to Use:**
- Actions calling internal queries/mutations/actions
- Actions calling public queries (via `api.*`)
- Any `ctx.runQuery/Mutation/Action` causing type depth errors

**Example Locations:**
- `convex/transcription.ts` - getCurrentUser, recordTranscription
- `convex/search/hybrid.ts` - getCurrentUser, fullTextSearch, vectorSearch
- `convex/ai/generateTitle.ts` - getConversationMessages
- See git history for full list of implementations

**Alternative Pattern** (tried but failed):
```typescript
// ❌ This still causes recursion errors
const result = await (ctx.runQuery as (
  ref: any,
  args: any,
) => Promise<ReturnType>)(
  internal.path.to.query, // TypeScript still evaluates this type
  { args },
);
```

The `@ts-ignore` is necessary because TypeScript evaluates the `internal.*` / `api.*` reference type **before** applying the cast.

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

### Dexie Caching Layer (Local-First)

**Flow**: `Convex → useQuery → useEffect → cache.bulkPut → Dexie → useLiveQuery → Component`

**Key Files**:
- `src/lib/cache/db.ts` - Schema (10 tables)
- `src/hooks/useCacheSync.ts` - Sync hooks
- `src/hooks/useOptimisticMessages.ts` - Optimistic UI (React state only)
- `src/lib/offline/messageQueue.ts` - Offline queue

**Tables**: conversations, messages, notes, tasks, projects, attachments, toolCalls, sources, pendingMutations, userPreferences

**Sync Hooks**: useMessageCacheSync, useConversationCacheSync, useNoteCacheSync, useTaskCacheSync, useProjectCacheSync, useMetadataCacheSync, usePreferenceCacheSync

**CRITICAL Rules**:

1. **Optimistic messages NEVER touch Dexie** - React state only, dedup'd by role+timestamp(5s)+model
2. **Cascade delete messages**: Always delete attachments/toolCalls/sources with message
   ```typescript
   await Promise.all([
     cache.messages.delete(messageId),
     cache.attachments.where("messageId").equals(messageId).delete(),
     cache.toolCalls.where("messageId").equals(messageId).delete(),
     cache.sources.where("messageId").equals(messageId).delete(),
   ]);
   ```
3. **SSR safety**: Only use cache in "use client" components
4. **Use sync hooks**: Not raw Convex queries for cached tables
5. **Orphan detection**: Handled by sync hooks for messages/conversations

**Offline**: pendingMutations queued, exponential backoff (2s→4s→8s), auto-retry on reconnect

**Cleanup**: 30 days messages/notes, 90 days completed tasks, runs on app start

**Limitations**: Notes/tasks/projects lack orphan detection, metadata cleaned via cascade or time

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
  - Simplifies integration with Vercel AI Gateway (host order fallbacks, parameters).

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
9. **Testing**: Follow user-centric philosophy in `docs/testing/testing-philosophy.md`
10. **One component per file**: Unless tightly coupled helper only used by parent. Layout components in `components/layout/`, feature components in feature directories.

---

## AI Code Anti-Patterns (AVOID)

**CRITICAL**: These patterns slow development. Prevent them upfront.

### Comments
- ❌ NO comments explaining standard features or self-documenting code
- ❌ NO comments restating what code does (`// increment counter` before `count++`)
- ✅ ONLY comment complex logic, workarounds, gotchas, non-obvious decisions

### TypeScript
- ❌ NO lazy `any` - check existing types/library types first
- ❌ NO unnecessary `as` casting - use proper typing or type guards
- ❌ NO duplicate type definitions - search codebase before creating
- ❌ NO over-annotating inferred types - let TS infer when obvious
- ✅ USE library types (React.FC, Express types, etc.)
- ✅ USE utility types (Partial, Pick, Omit, ReturnType)

### Code Style
- ❌ NO verbose if/else when ternary works
- ❌ NO intermediate variables for simple operations
- ❌ NO old-style for loops - use forEach/map/filter
- ❌ NO explicit null checks when optional chaining works (`foo?.bar`)
- ❌ NO overly defensive null checks everywhere
- ✅ USE destructuring and spread operators
- ✅ USE existing utils from codebase before writing new ones

### Structure
- ❌ NO over-engineering simple problems
- ❌ NO unnecessary abstractions for one-time operations
- ❌ NO excessive validation for impossible scenarios
- ❌ NO multiple implementation attempts left in code
- ❌ NO patches on patches - refactor cohesively
- ✅ KEEP functions focused (SRP) - extract if >200 lines
- ✅ DRY - parameterize similar logic, don't copy-paste

### Dead Code
- ❌ NO leaving unused functions/variables/imports
- ❌ NO commented-out code blocks
- ❌ NO orphaned handlers/endpoints/configs
- ✅ DELETE what's not used

### Incomplete Work
- ❌ NO half-implemented features
- ❌ NO mixed old/new patterns from partial migrations
- ❌ NO frontend expecting data backend doesn't provide
- ✅ COMPLETE the feature or don't start it
- ✅ TRACE data flows end-to-end: UI → API → DB → Response → UI

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

---

## Issue Tracking (Beads/bd)

**Use `bd` for all issue tracking** - not GitHub issues. Issues live in `.beads/` directory.

```bash
# Essential commands
bd list                           # View all issues
bd ready                          # Unblocked tasks (what to work on next)
bd create "Title" -p 0            # Create priority-0 task
bd show <id>                      # View issue details
bd update <id> --status in_progress
bd update <id> --status done
bd sync                           # Sync with git remote
bd dep add <child> <parent>       # Link dependencies
```

**Workflow:**
- Before starting: `bd ready` to see available tasks
- When starting work: `bd update <id> --status in_progress`
- When done: `bd update <id> --status done`
- Always: `bd sync` before/after git operations

**Why bd:**
- Git-native (no external service)
- AI-friendly CLI (no web UI context switching)
- Works offline
- Hash-based IDs prevent merge conflicts

**Docs**: https://github.com/steveyegge/beads

---

## Codebase Health (2026-01-11)

**Monorepo Structure**:
- apps/: web (Next.js), cli, mobile, raycast
- packages/: ai (shared), backend (Convex), byod-schema, config, shared

**Stats**: ~44k TS/TSX files, 84 Convex modules, 822 test files

**Money Feature Health**: GOOD
- generation.ts, chat.ts, messages.ts all present and functional
- E2E tests cover resilient generation flow

**Known Tech Debt**:
- 13 TODO/FIXME markers in backend
- 415 console.log calls (should use structured logging)
- 551 @ts-ignore (known Convex type recursion - documented workaround)
- Backend test coverage: 8 test files for 84 modules

**Open Issues**: Run `bd list` or `bd ready` to see current tasks


## Git Workflow

**NEVER commit directly to main.** Always use feature branches and PRs.

```bash
# Create feature branch before starting work
git checkout -b feat/description   # or fix/description

# When done, push branch and create PR
git push -u origin HEAD
gh pr create --title "..." --body "..."
```

**Why**: Direct commits bypass code review, CI checks, and make rollbacks harder.

---

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Use `bd create` for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - `bd update <id> --status done` for finished work
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
