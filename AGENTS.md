# CLAUDE.md

Personal AI chat assistant: all models (OpenAI, Gemini, Claude), mid-chat switching, conversation branching, cost tracking.

## Package Manager

**Bun exclusively.** Never npm/pnpm/yarn/npx.

- `bun install`, `bun add`, `bunx`, `bun run`
- If `package-lock.json` exists, delete it. Only `bun.lock`.

## Commands

```bash
bun dev                    # Dev server (localhost:3000)
bun run build              # Production build
bun run lint               # Biome lint (NOT Prettier/ESLint)
bun run format             # Biome format --write
bun run test               # Vitest watch
bun run test:run           # Vitest single run
bun run test:e2e           # Playwright E2E
```

## Critical Rules

- **Resilient generation**: Messages MUST survive page refresh. Server-side Convex actions, never client-only streaming.
- **API envelopes**: Every response wrapped via `formatEntity`/`formatEntityList`/`formatErrorEntity` from `src/lib/utils/formatEntity.ts`.
- **Normalized schema**: No nested documents. Junction tables for M:N.
- **Cost tracking**: Log tokens/cost on every LLM call.
- **Pino logging**: Structured JSON in API routes.
- **One component per file** unless tightly coupled helper.
- **No browser dialogs**: Never `confirm()`/`alert()`/`prompt()`. Use shadcn AlertDialog/toast/Dialog.

## Centralization Rules

- **Prompts**: All LLM prompts in `packages/backend/convex/lib/prompts/`. Never hardcode in actions/routes/UI.
- **Models**: Import from `packages/ai/src/models.ts` / `apps/web/src/lib/ai/models.ts`. Never hardcode model ID strings.

## Design Philosophy

Avoid generic AI aesthetic. Distinctive, creative, surprising.

- Unique fonts (NOT Inter/Roboto). Dark theme. Layered backgrounds, high-impact motion.
- Inspiration: code editor themes (Rose Pine, Tokyo Night, Vesper).

## Development Principles

- **Don't ship features just because you can.** Every feature has maintenance cost. Question whether it's needed before building.
- **Leave the code better than you found it.** Small improvements while you're in the area — cleaner types, better names, removed dead paths.
- **Fix features and process before creating new features.** Existing broken/incomplete things take priority over shiny new things.

## Anti-Patterns

- No lazy `any` — check existing/library types first
- No explanatory comments on self-documenting code
- No dead code, commented-out blocks, orphaned handlers
- No half-implemented features — complete or don't start
- Trace data flows end-to-end: UI → API → DB → Response → UI

## Git Workflow

**Never commit directly to main.** Feature branches + PRs only.

## Issue Tracking (bd)

```bash
bd list                    # All issues
bd ready                   # Unblocked tasks
bd create "Title" -p 0     # New task
bd update <id> --status in_progress
bd update <id> --status done
bd sync                    # Before/after git ops
```

## Session Completion

Work is NOT complete until `git push` succeeds.

1. File issues for remaining work (`bd create`)
2. Run quality gates (tests, lint, build)
3. Update issue status
4. `git pull --rebase && bd sync && git push`
5. Verify `git status` shows up to date
