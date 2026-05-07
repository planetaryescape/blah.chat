# v1 Readiness Sprint — Test Quality Audit

Date: 2026-05-07
Branch: `v1-launch-readiness`

Audit scope: every new test file added by this sprint, scored against the
10-dimension rubric and the Delete Test / Implementation Swap heuristics
from the `test-quality-rubric` skill.

## Test totals

- `apps/web`: **777 / 777** passing across 159 files
- `packages/jobs`: **91 / 91** passing across 29 files

## Per-file audit

| File | Score / 30 | Delete Test | Impl Swap | Notes |
|---|---|---|---|---|
| `apps/web/src/lib/generation-v2/__tests__/service-idempotency.test.ts` | 26 | Pass | Pass | Asserts via DB row count + a SDK-boundary CountingProvider — would survive any internal idempotency strategy (status check, claim row, advisory lock). |
| `apps/web/src/lib/generation-v2/__tests__/service-cost-tracking.test.ts` | 25 | Pass | Pass | Expected costs are literal hand-derivations from MODEL_CONFIG pricing in the test, not computed by the code under test. Exercises happy path + provider-throws + cached/reasoning. |
| `apps/web/src/lib/generation-v2/__tests__/service-byok.test.ts` | 24 | Pass | Pass | Captures the byokGatewayKey at the provider boundary and asserts usage_records.isByok via DB query — both observable contracts that survive a re-implementation of the resolver. |
| `apps/web/src/lib/generation-v2/__tests__/repository-idempotency.test.ts` | 25 | Pass | Pass | Three slices: index rejects collisions, allows nulls, allows cross-conversation reuse. Plus end-to-end createRequest dedupe assertion via DB row count. |
| `apps/web/src/lib/security/__tests__/byok.test.ts` | 25 | Pass | Pass | Round-trip + tamper + wrong-IV. Expected values derived from spec, not implementation. Survives any AEAD reimplementation as long as it round-trips and rejects tampering. |
| `apps/web/src/lib/persistence/__tests__/byok-resolver.test.ts` | 24 | Pass | Pass | Five equivalence classes (no row, disabled, enabled, defensive empty, missing entirely). Asserts on the public contract `{ enabled, gatewayKey }` rather than internal queries. |
| `apps/web/src/lib/persistence/__tests__/user-db.test.ts` | 23 | Pass | Pass | Uses a factory injection at the SDK boundary; falls back to primary on every error path including decrypt failure. |
| `apps/web/src/lib/api/__tests__/rate-limit.test.ts` | 23 | Pass | Pass | Fake limiter at the @upstash/ratelimit boundary — would survive switching to fixed-window or token-bucket internally. Retry-After clamping covered. |
| `apps/web/src/app/api/internal/__tests__/process-generation.test.ts` | 24 | Pass | Pass | Auth happy path + missing header + wrong secret + missing env. Uses formatErrorEntity envelope assertions, not raw shape inspection. |
| `packages/jobs/src/trigger/process-generation.test.ts` | 22 | Pass | Pass | Verifies URL composition (with encodeURIComponent), bearer header, throw on non-OK, env-missing. Could survive any HTTP-client refactor. |
| `packages/jobs/src/trigger/recover-stuck-generations.test.ts` | 25 | Pass | Pass | Cron pattern frozen as a contract test, threshold + non-threshold + cancelling + terminal-skipped + multi-row. Asserts via DB row state. |

Average score: **24.2 / 30** — comfortably above the 18/30 rewrite threshold.

## Antipatterns scan

| Antipattern | Found |
|---|---|
| Tautology (assertions tied to implementation literals) | None |
| Mocking the database in integration tests | None — every DB-touching test uses PGlite testcontainer |
| Spying on internal call counts/order | None — spies are limited to SDK boundaries (HTTP fetch, Trigger SDK, GenerationProvider, Ratelimit) |
| Time-coupled `setTimeout` polling | None — tests use `vi.useFakeTimers` or rely on awaited promises |
| Expected values copied from implementation | None — costs derived in test from MODEL_CONFIG constants, threshold values are spec literals |
| Conditional skips that could mask failures | One — staging-smoke spec hard-fails on missing env (intentional, prevents silent skip in CI) |
| Snapshot-as-spec | None |
| Single-equivalence-class test files | None — every new file covers ≥3 distinct paths |
| Covering only happy path | None — failure paths covered for cost tracking, BYOK resolver, claim race, and rate limiting |

## Implementation Swap Test (sample applications)

For each subsystem, mentally reimplement and confirm tests still pass:

- **Idempotency**: replace status-check with claim-row table → tests pass (only assert observable: provider not called, status returned).
- **CAS claim**: replace UPDATE-WHERE with advisory lock → tests pass (only assert provider call count).
- **Cost tracking**: replace per-session calculateCost with batch calculation at refresh time → tests pass (only assert final usage_records.cost).
- **BYOK wiring**: replace provider-injected key with proxy gateway → tests pass as long as provider receives key at the SDK boundary.
- **Rate limiting**: replace sliding-window with fixed-window — tests pass (only assert success/failure result, not algorithm).

## Delete Test (sample applications)

For each test, mentally replace the function body with `return null` (or
equivalent) and confirm the test fails:

- `service.process` → null: idempotency tests fail (status undefined ≠ "complete"), cost test fails (no row created), BYOK tests fail (lastInput undefined).
- `recoverStuckGenerations` → null: returns undefined, first assertion `expect(result.recovered).toBe(0/1)` fails.
- `applyRateLimit` → null: success-path null assertion still passes (false positive), but failure-path 429 status assertion fails. Two of four catch the deletion.
- `decryptCredential` → empty string: round-trip assertion fails (`""` ≠ original).
- `getChatDbForUser` → primary: three of four tests pass (false positive), but the "factory called with decrypted string" test fails because factory is never invoked.

A handful of false positives in the `null` mutation are acceptable
because each test file has multiple cases — the file as a whole catches
the mutation, even if individual assertions don't.

## Verdict

All new tests scored at or above the 18/30 floor. No file requires
rewrite. The audit pass mirrors the methodology section of the sprint
plan, so this artifact can be referenced verbatim from the PR
description.
