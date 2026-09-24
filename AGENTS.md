# blah.chat

Personal AI chat assistant: all models (OpenAI, Gemini, Claude), mid-chat switching, conversation branching, cost tracking.

## Package Manager

Bun only (`bun install`, `bun add`, `bunx`, `bun run`); no npm/pnpm/yarn/npx. `bun.lock` is the only lockfile; delete a stray `package-lock.json`.

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

- **Resilient generation**: Messages must survive page refresh. Generation runs server-side via Trigger.dev tasks (`packages/jobs`) writing to Postgres; clients attach over SSE and reconcile — no client-only streaming. See `apps/web/src/lib/generation-v2/`.
- **API envelopes**: Every response wrapped via `formatEntity`/`formatEntityList`/`formatErrorEntity` from `src/lib/utils/formatEntity.ts`.
- **Normalized schema**: Postgres + Drizzle (`packages/persistence-postgres/src/schema.ts`). No nested documents. Junction tables for M:N. Schema changes require a generated migration (`bun run db:generate` in the package).
- **Cost tracking**: Log tokens/cost on every LLM call.
- **Pino logging**: Structured JSON in API routes.
- **One component per file** unless tightly coupled helper.
- **No browser dialogs**: no `confirm()`/`alert()`/`prompt()`. Use shadcn AlertDialog/toast/Dialog.

## Centralization Rules

- **Prompts**: All LLM prompts in `packages/shared/src/prompts/` (or `@blah-chat/ai` prompt modules). Don't hardcode them in jobs/routes/UI.
- **Models**: Import from `packages/ai/src/models.ts` / `apps/web/src/lib/ai/models.ts`. Don't hardcode model ID strings.

## Design Philosophy

Avoid generic AI aesthetic. Distinctive, creative, surprising.

- Unique fonts (not Inter/Roboto). Dark theme. Layered backgrounds, high-impact motion.
- Inspiration: code editor themes (Rose Pine, Tokyo Night, Vesper).

## Git Workflow

Feature branches + PRs; don't commit directly to main.

## Session Completion

Work is done when it is pushed.

1. Run quality gates (tests, lint, build)
2. `git pull --rebase && git push`
3. Verify `git status` shows up to date
