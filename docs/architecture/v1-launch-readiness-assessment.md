# v1 Launch Readiness Assessment

Date: 2026-05-06

## Summary

The main blocker for v1 is not missing features. It is trust gaps in the core promises:

- Responses survive refresh, redeploys, and interruptions.
- Cost tracking is transparent and accurate.
- Bring Your Own Key and Bring Your Own Database do what the UI implies.
- The product can be deployed and verified with a real authenticated smoke test.

Do not launch v1 until these are fixed, hidden, or explicitly labeled as preview features.

## Recommended v1 Positioning

The strongest wedge is:

> A dependable, provider-neutral AI chat ledger for people who care where their data, money, and context go.

Avoid competing on "most features". Open WebUI, LibreChat, TypingMind, and AnythingLLM already set a broad feature bar. The better v1 angle is reliable hosted multi-model chat with resilient generation, branching, BYOK, export, and cost transparency.

Useful copy direction:

- Refresh-safe by design.
- Bring your own keys.
- See what each answer costs.
- Switch models mid-chat without losing the thread.
- No Docker. No lock-in. No mystery bill.

## P0 Blockers

### 1. Generation is not truly durable

Evidence:

- `apps/web/src/app/api/v1/generations/route.ts:44-47` starts processing with Next `after()`.
- `apps/web/src/app/api/v1/conversations/[id]/messages/route.ts:89-94` does the same.
- `apps/web/src/lib/generation-v2/runtime.ts:21-48` creates a Trigger client for secondary tasks, but core generation processing is still called from the request lifecycle.

Risk:

If the serverless function dies, redeploys, times out, or is evicted after returning `202`, nothing guarantees the pending generation resumes. This undermines the product's resilient-generation promise.

Minimal fix:

- Enqueue `service.process(requestId)` into Trigger or another durable job queue.
- Add a recovery job for `generation_requests` in `pending`, `running`, or `cancelling` older than a small threshold.
- Keep `after()` only as an optional local development fast-path.

Acceptance criteria:

- Send a message, close the tab mid-stream, redeploy or kill the web process, reopen, and confirm the generation resumes or finalizes cleanly.
- No duplicate assistant messages on reconnect.
- Failed generations are marked failed with a retry path.

### 2. Cost tracking is promised but incomplete on core chat

Evidence:

- README promises per-message token usage and cost breakdown: `README.md:18`.
- Provider currently returns token counts only: `apps/web/src/lib/generation-v2/provider.ts:193-201`.
- Service persists `usage?.costUsd`, but provider never supplies it: `apps/web/src/lib/generation-v2/service.ts:720-734`.
- `usage_records` is the canonical aggregate table: `packages/persistence-postgres/src/schema.ts:375-420`.
- Generation writes routing outcomes, but not usage records: `apps/web/src/lib/generation-v2/repository.ts:1442-1507`.

Risk:

The app claims transparent cost tracking but core generation may not feed the user-facing usage ledger.

Minimal fix:

- Use `calculateCost` from `@blah-chat/ai` with model pricing.
- Insert `usage_records` for every completed generation session.
- Include input, output, reasoning, cached tokens where available.
- Set `isByok` correctly once BYOK routing is implemented.

Acceptance criteria:

- Every completed assistant response creates a usage record.
- Conversation total and monthly total reflect newly generated messages.
- BYOK vs hosted-key cost attribution is correct.

### 3. BYOK exists in settings but is not used by generation

Evidence:

- BYOK saves encrypted keys: `apps/web/src/lib/persistence/byok.ts:132-165`.
- BYOK enable requires a Vercel Gateway key: `apps/web/src/lib/persistence/byok.ts:202-219`.
- BYOK encryption helper has no decrypt function: `apps/web/src/lib/security/byok.ts:51-64`.
- Generation uses env-backed gateway/model clients: `apps/web/src/lib/generation-v2/provider.ts:177-184` and `packages/ai/src/gateway.ts:23-40`.

Risk:

Users can enable BYOK but generation still appears to use server-configured credentials. This is a trust-breaking mismatch.

Minimal fix:

- Add `decryptCredential`.
- Resolve user's BYOK config during provider selection.
- Inject the user's gateway/provider key into the generation call.
- Fail fast with a clear message if BYOK is enabled but the required key is missing.

Alternative:

- Hide BYOK or label it as preview until provider calls actually use user keys.

Acceptance criteria:

- With app-level provider keys removed and user BYOK configured, chat still works.
- With BYOK enabled and user key removed, chat fails before generation starts with a clear error.
- Secrets never appear in logs.

### 4. BYOD is configured but core chat does not route through user DB

Evidence:

- BYOD resolver exists: `packages/persistence-postgres/src/byod/resolver.ts:47-85`.
- Main app DB accessor always returns global DB: `apps/web/src/lib/persistence/server.ts:14-23`.
- Runtime uses the global DB: `apps/web/src/lib/generation-v2/runtime.ts:21-25`.

Risk:

If BYOD is visible, users can reasonably assume chat data is stored in their database. Current core chat persistence still uses the global DB path.

Minimal fix:

- Introduce a `getUserPersistenceDb` or equivalent resolver.
- Route allowlisted chat data tables through the user DB.
- Keep identity/auth/config in the primary DB if needed.
- Block enabling BYOD until migrations and routing are complete.

Alternative:

- Hide BYOD or label it as experimental/admin preview.

Acceptance criteria:

- A BYOD-enabled user's new conversations and messages are written to the user's database.
- Disabling BYOD has a documented migration/export story.
- Health checks verify the user's database before enabling.

### 5. No real authenticated smoke gate

Evidence:

- CI runs lint, tests, and build, but no E2E: `.github/workflows/ci.yml:140-184`.
- E2E tests skip broadly when auth/chat is unavailable, for example:
- `apps/web/e2e/auth-and-first-chat.spec.ts:42`
- `apps/web/e2e/chat-flow.spec.ts:21`
- `apps/web/e2e/resilient-generation.spec.ts:36`

Risk:

CI can pass while login, first message, streaming, or persistence is broken.

Minimal fix:

- Add one required staging smoke E2E.
- Use one test user and one cheap model.
- Fail in CI if auth/chat setup is unavailable.

Acceptance criteria:

- Sign in test user.
- Send first chat message.
- Refresh during or after generation.
- Verify assistant response persists.
- Verify `/api/v1/health` returns 200 in staging/prod.

### 6. Deploy docs are stale against current runtime

Evidence:

- `SELF_HOSTING.md:14-20` describes Convex as the backend.
- Runtime health requires Postgres, Redis, R2, and Trigger: `apps/web/src/lib/persistence/health.ts:18-35`.
- Env parser requires Postgres, Redis, and R2 values: `packages/persistence-postgres/src/env.ts:3-20`.
- README still contains Convex-centric setup language: `README.md:149-166`.

Risk:

Users or operators following docs can deploy a broken app or incomplete environment.

Minimal fix:

- Update README and `SELF_HOSTING.md` to the current Postgres stack.
- Add a production env checklist.
- Document health-check expectations.

Acceptance criteria:

- Fresh deployment from docs reaches `/api/v1/health` with `200`.
- Required env vars match `parsePersistenceEnv`.
- Convex references are either removed or explicitly marked legacy/backup if still true.

## P1 Blockers

### 1. Generation request creation is non-transactional

Evidence:

- `apps/web/src/lib/generation-v2/repository.ts:334-415` inserts user message, edges, request, integration snapshots, assistant sessions, then updates active leaf across many awaits.
- No transaction surrounds the core write bundle.

Risk:

Partial failures can leave orphan messages, requests without sessions, or conversations pointing at missing/incomplete leaf messages.

Minimal fix:

- Wrap create/edit/regenerate/consolidation request creation in DB transactions.
- Keep external side effects outside the transaction where needed, but transactionally persist the conversation tree and request/session records.

### 2. Message sends are not idempotent

Evidence:

- `clientMessageId` is accepted: `apps/web/src/lib/generation-v2/repository.ts:343`.
- Message schema has `clientMessageId` but no unique index: `packages/persistence-postgres/src/schema.ts:306-327`.

Risk:

Retries, double clicks, or offline replay can create duplicate user messages and duplicate generations.

Minimal fix:

- Add a unique index on `(conversation_id, client_message_id)` where `client_message_id` is not null.
- On duplicate, return the existing generation/message bundle.

### 3. Send button can re-enable too early

Evidence:

- `ChatInput` calls `sendMessage(...)` and immediately clears `isSending`: `apps/web/src/components/chat/ChatInput.tsx:538-576`.
- Mutation lifecycle lives in `useSendMessage`: `apps/web/src/lib/hooks/mutations/useSendMessage.ts:101-195`.

Risk:

Rapid Enter/click can duplicate submits before server or generation state catches up.

Minimal fix:

- Use `mutateAsync` and `finally`, or wire the mutation `isPending` state into the input lock.

### 4. First-run onboarding can trap users

Evidence:

- Auto-router modal is non-dismissible: `apps/web/src/components/onboarding/AutoRouterPreferenceModal.tsx:120-126`.
- Save helpers do not check `res.ok`: `apps/web/src/components/onboarding/AutoRouterPreferenceModal.tsx:43-58`.

Risk:

First-run users can be blocked or misconfigured if preference APIs fail.

Minimal fix:

- Throw on non-OK fetch.
- Add retryable inline errors.
- Add a safe default or skip path.
- Disable manual selection until models are loaded.

### 5. Mobile model picker likely weak

Evidence:

- Fixed dialog height and inner height: `apps/web/src/components/chat/QuickModelSwitcher.tsx:308-319`.
- Category sidebar is fixed to `180px`: `apps/web/src/components/chat/CategorySidebar.tsx:21-23`.

Risk:

On small phones, the model picker can be cramped or hard to use.

Minimal fix:

- Use horizontal category tabs or drawer on small screens.
- Use flexible `h-full min-h-0` layout instead of fixed inner height.
- Keep footer/actions sticky and keyboard-safe.

### 6. No route-level app error boundary

Evidence:

- Existing `ErrorBoundary` component exists, but no `apps/web/src/app/**/error.tsx` files were found.

Risk:

Render crashes likely drop users into a generic Next error instead of branded recovery.

Minimal fix:

- Add app-level `error.tsx` with reload, home, and support/report actions.

### 7. No rate limiting wired

Evidence:

- `@upstash/ratelimit` dependency exists: `apps/web/package.json:99`.
- No `Ratelimit` or `@upstash/ratelimit` usage found in `apps/web/src`.

Risk:

Public, unauthenticated, or expensive endpoints are easier to abuse.

Minimal fix:

- Add simple IP/user buckets for public and expensive endpoints.
- Return friendly `429` API envelopes.

### 8. Release workflow migrates before production build/deploy

Evidence:

- Migration job runs first: `.github/workflows/release.yml:9-30`.
- Build/deploy happens after migration: `.github/workflows/release.yml:32-67`.
- Rollback workflow explicitly warns migrations are not automatically rolled back: `.github/workflows/rollback.yml:23-30`.

Risk:

A build or deploy failure after migrations can leave old production code on a new schema.

Minimal fix:

- Build artifact first.
- Run migration after a successful build.
- Deploy the prebuilt artifact.
- Keep migrations backward-compatible across at least one deploy.

## P2 / Fast Follow

These should not block web v1 unless positioning changes.

- Native mobile apps.
- Desktop app/update pipeline.
- Full RAG/knowledge base depth.
- MCP marketplace depth.
- Voice.
- Image generation.
- Team admin.
- Complex automations.
- Deep agent workflows.

## Current Strengths

- Product direction is strong: multi-model chat, branching, comparison, cost ledger, BYOK/BYOD, memory, tools, and resilient generation.
- Schema is mostly normalized and serious: messages, edges, sessions, checkpoints, usage, tool calls.
- Streaming replay and checkpoint concepts exist; the main gap is durable execution/recovery.
- Tool execution and source persistence are already part of the architecture.
- Operations docs exist for generation metrics, stuck messages, and alert thresholds: `docs/operations/runbooks.md` and `docs/operations/alert-thresholds.md`.
- Local checks reported by the production-readiness agent: `bun run typecheck`, `bun --filter=@blah-chat/web run build`, and `bun run lint` passed.

## Market Bar

Competitor docs and product pages show the 2026 baseline for serious AI chat apps:

- TypingMind: BYOK, local/private storage, multi-model chat, projects, web search, prompt library, cost estimation, token tracking, import/export.
- Open WebUI: multi-model chat, uploads, web search with citations, code execution, memory, folders/tags/pins, tools/plugins/MCP, analytics and cost tracking, deploy-anywhere story.
- LibreChat: agents, MCP, artifacts, web search, message search, memory, resumable streams, forking, temporary chat, import conversations, share links.
- AnythingLLM: local/cloud model providers, agents, chat logs, event logs, privacy/data handling docs, desktop/self-host/cloud/mobile surfaces.

Sources used:

- `https://www.typingmind.com/`
- `https://docs.openwebui.com/features/`
- `https://www.librechat.ai/docs/features`
- `https://docs.anythingllm.com/features/all-features`

Implications:

- Multi-model and BYOK alone are table stakes.
- Resumable streams are table stakes for serious chat apps.
- Search/export/attachments/privacy clarity are expected.
- Cost transparency is still a credible differentiation opportunity.
- Do not delay v1 for platform breadth. Win on reliability, trust, and clarity.

## Recommended v1 Readiness Sprint

1. Make core generation durable with queue and recovery.
2. Write real usage/cost records for every completed generation.
3. Fully wire BYOK or hide/preview-label it.
4. Fully wire BYOD for chat data or hide/preview-label it.
5. Add transactions and idempotency to message send/request creation.
6. Add required authenticated smoke E2E.
7. Update README and self-host docs to the current Postgres/Redis/R2/Trigger stack.
8. Fix first-run onboarding save/error handling.
9. Fix mobile model picker layout.
10. Fix send duplicate risk.
11. Add app-level error boundary.
12. Add basic rate limiting.
13. Adjust release flow so build succeeds before migrations affect production.

## Minimum Launch Gate

Run and require:

- `bun install --frozen-lockfile`
- `bun run lint`
- `bun run typecheck`
- `bun --filter=@blah-chat/web run build`
- `bun run test:run`
- Required staging E2E: sign in, send first chat, refresh mid/after generation, verify persistence.
- `/api/v1/health` returns 200 in production.

Production env checklist:

- Clerk keys and webhook secret.
- `AI_GATEWAY_API_KEY` or verified BYOK-only mode.
- `DATABASE_URL`.
- `UPSTASH_REDIS_REST_URL`.
- `UPSTASH_REDIS_REST_TOKEN`.
- R2 account, bucket, access key, secret key, endpoint/region config.
- Trigger secret/API URL where required.
- Sentry or equivalent error alerting.
- Uptime check hitting `/api/v1/health`.

## Do Not Delay v1 For

- Native apps.
- Full self-host platform polish beyond accurate docs.
- Team features.
- Image generation.
- Voice polish.
- Full MCP ecosystem.
- Advanced RAG.
- Agent marketplace.

These are useful fast-follow items, but they do not address the current v1 blocker: trust in the core chat loop.
