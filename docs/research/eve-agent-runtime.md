# Eve agent runtime trial

Use the [runnable trial](../../experiments/eve-runtime/README.md) to evaluate Eve
before replacing any generation infrastructure. The current result supports a
production-backend trial, not a production migration.

## Recommendation

Keep Eve as a candidate for the agent runtime. Do not move ordinary chat or remove
Trigger.dev yet. The local trial demonstrated useful runtime behavior with thin
authored tools, but failed two crash-recovery checks within a 65-second deadline.
Reliable recovery is a required behavior for blah.chat.

The next experiment should run these same recovery scenarios against the intended
production Workflow backend. Prefer Vercel Workflow if managed deployment is the
goal. Do not build a custom local recovery service to rescue the evaluation.

Proceed only when the recovered session can complete work or report an explicit
terminal failure within an agreed user-facing deadline, without duplicating
external actions. Require a live provider/tool turn and a version-upgrade test too.

## Measured results

The [recorded baseline](../../experiments/eve-runtime/evidence/local-runtime.json)
ran on Node 26.7.0, macOS arm64, with Eve `1.0.0-rc.1`, AI SDK `7.0.137`, the
local filesystem Workflow backend, and just-bash. Model decisions and token counts
were scripted. Workflow execution and HTTP clients were real. No paid model calls
were made.

| Check | Result | Observation |
| --- | --- | --- |
| Reject unauthenticated session creation | Pass | HTTP 401 |
| Execute existing pricing logic as a tool | Pass | Cost matched blah.chat's pricing function |
| Disconnect a stream and replay through a fresh client | Pass | Final reply reconstructed; no events after the saved tail cursor |
| Read sandbox data after a process crash | Fail | Follow-up did not complete within 65 seconds |
| Resume a parked approval after a crash | Pass | Duplicate keyed approval delivery produced one completed write call |
| Reject an approval | Pass | Tool settled rejected, with no execution |
| Cancel an active tool | Pass | Original delivery reached cancelled status |
| Recover a tool interrupted by a process crash | Fail | Original delivery did not settle within 65 seconds |
| Export per-call usage | Pass | 11 completed synthetic calls reached the sink with 11 distinct accounting keys |

Both failures reproduced in repeated runs. The server became healthy again and
recorded streams remained readable. Logs included local queue transport failures
at startup. Those logs alone do not establish the root cause. The sandbox test
does not establish file loss: the resumed operation timed out before it could
return a result. The active-tool test likewise does not establish permanent loss
or duplicate execution. Recovery after a longer deadline remains unverified.

To reproduce, run `bun run trial` in `experiments/eve-runtime` after its build.
It exits nonzero for these failures and preserves the event snapshots.

## Integration consequences

Eve's current package requires Node 24+ and AI SDK 7; blah.chat uses AI SDK 6.
The isolated package built successfully and accepted a V3 model protocol fixture.
That supports testing a separate agent service without first upgrading the app.
It does not establish full AI SDK 6 provider compatibility.

Eve uses Workflow SDK, while current generation uses Trigger.dev, Postgres, and a
Redis event store. A production agent run should have one execution/recovery owner.
Do not let Trigger and Eve independently retry the same agent loop. Keep existing
background tasks separate.

`packages/streaming-core/src/index.ts` currently models text generation events.
Eve also emits tool, interaction, and task events. Preserving the current UI
requires an event adapter plus explicit representations for approvals and agent
activity. Merely translating text deltas will lose important behavior.

The app must still authorize conversation/session access, select tenant-scoped
credentials, persist product messages, and account for usage. This trial tested
only a single operator's bearer token and a local append-only accounting sink.
It did not test Clerk, tenant isolation, Composio, or production billing.

Before implementing an adapter, inspect these existing owners:

- `apps/web/src/lib/generation-v2/runtime.ts`: Trigger dispatch and runtime wiring.
- `apps/web/src/lib/generation-v2/service.ts`: request lifecycle and persistence.
- `apps/web/src/lib/generation-v2/composioTools.ts`: authenticated integration tools.
- `packages/streaming-core/src/index.ts`: client event contract.

## Gates before adoption

1. Re-run recovery tests on the production backend, including a crash after an
   external action succeeds but before its result is checkpointed.
2. Verify one real provider and one authorized application tool, then model
   switching and BYOK if those belong in the first agent release.
3. Verify Clerk authentication and cross-user session create, send, stream,
   approve, and cancel access. Application-owned access checks are still required.
4. Exercise an Eve version upgrade with an idle session, a running turn, and a
   pending approval. The documented self-hosted stranded-session behavior is an
   operational concern, not something this trial tested.
5. Compare integration code and ongoing infrastructure cost against keeping the
   current generation service. Adopt only if Eve replaces responsibilities rather
   than adding a second recovery system.

No production deployment, data migration, or framework fork is part of this trial.

## Verification

The isolated Eve production build, TypeScript check, scoped Biome check, and
diff-scoped anti-slop check passed. The runtime trial exited `1` with the two
recorded recovery failures. These are unresolved findings, not expected passes.

A full workspace build was also attempted with concurrency limited to four. It
hit the 120-second execution deadline while compiling unrelated desktop and
mobile apps. Its remaining run-owned native build job was cancelled. The full
workspace build is not verified by this trial.

## Upstream references

- [Execution and durability](https://eve.dev/docs/concepts/execution-model-and-durability)
- [Dynamic capabilities](https://eve.dev/docs/guides/dynamic-capabilities)
- [Self-hosting](https://eve.dev/docs/guides/deployment/self-hosting)
- [Multi-tenant outbound authentication](https://eve.dev/docs/patterns/multi-tenant-auth)
- [Instrumentation](https://eve.dev/docs/observability/instrumentation)
- [Changelog](https://eve.dev/changelog.md)

Implementation used the version-matched docs bundled in `node_modules/eve/docs`.
The linked website documents the latest release and may change.
