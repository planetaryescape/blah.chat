# Kickoff prompt for the first implementation session

Paste this into the existing checkout after BK authorizes a scoped implementation session. Do not assume a fresh clone, clean installation, provider budget or production permission. This prompt requests no action during the research session itself.

---

You are modernizing the existing blah.chat application. Its audited source baseline on 2026-11-03 is HEAD/fetched `origin/main` `04866f80a6236716ebf8d8c5a79001727f85f4bf`. The plan distinguishes BK's explicit requirements from unapproved implementation recommendations. It is not a specification written before the app existed.

## Read before changing anything

1. Read root `AGENTS.md` without rewriting it, then `docs/blueprint/README.md`, `21-decision-log.md` and `22-open-questions.md`. Read every numbered chapter in the README, including the design concept and platform contracts. Use `20-roadmap.md` for execution order, not chapter numbering.
2. Read `docs/research/modernization-review.md`, `reports/blah-chat-modernization-review.md`, and the relevant raw notes/source permalinks. Reuse their evidence; do not start another broad research wave. Verify the changed source against the actual current checkout and recheck only time-sensitive package/advisory/API facts the rung relies on.
3. Inspect current branch/HEAD/working tree. Preserve every unrelated tracked/untracked change, including `.build/` and `experiments/eve-runtime` artifacts. Work on an authorized feature branch/worktree; never reset/clean someone else's work or commit to main. Record drift from the audited pin before applying a plan.
4. Ask what implementation scope is authorized and select one dependency-ready roadmap rung. No authorization means stop at planning/briefing. A blueprint, available credential or “automation” requirement is not permission for paid calls, account connections, external writes, data migration, deployment, commit or push. Obtain any such action's separate scope first; once delivery/commit is authorized, follow the repository's branch/quality/push workflow rather than promising local edits are released.

## Phase 0: ask only at the boundary being crossed

- **First security release:** confirm Q1 priority, authorized isolated environment/test-auth/seed and install scope; complete S1/S2. P0 aliases in chapter13 must be fixed or explicitly fail-closed. Tell BK planning has not changed current deployments; obtain an operator's scoped action rather than letting live exposure wait for all architecture work.
- **Retirement:** D-003 already approves removing Smart Assistant, not deleting user tasks/notes/audio/spend. Stop producers under rung2; Q20/Q4/Q22 plus S14/S17 gate retained-data migration/contraction and removal of temporary adapters. Do not leave a permanent feature flag or claim full purge while compatibility residue remains.
- **Small visible fixes:** TTS/native-result/branch retry do not need every future table or a workflow choice. Use existing seams, preserved design and fake providers first. Listening still needs explicit provider budget; no audio-heard claim from text tests.
- **New UI/private state:** Q2 scoped comps, Q4 retention, Q5 responder/resource scope and Q22 supported reader barrier before enabling waits or private resources. Ordinary endpoint fixes need not wait for a new visual concept approval.
- **Paid/provider/cache/eval:** Q3 numeric hard envelopes and explicit live budget, Q7 state/TTL, Q8 payer/processor/region and Q18 dataset/quality gates before real calls or exports. Default no-network fake fixtures; no speculative prewarming or real sends as tests.
- **Skills/schedules:** Q11–Q14 determine import/binding/publication/script policy; Q16/Q17 recurrence, consent, delivery and output policy before arming. Draft/review does not mean active. Text skills use zero E2B; reminders use no model. Scheduled jobs start read/draft-only.
- **Connections/computer:** Q9/Q10 name target sandbox apps and broker terms; separate consent for any actual write. Q14/Q15/Q3/Q4 set selected inputs/template/network/resources/retention before E2B starts. No host profile, secret injection, authenticated browsing or purchases by implication.
- **Reuse/native:** Q21 before copying Notto implementation/tests; Q22 for supported native versions and authorized signing/store/update work. Desktop automatic releases remain suspended until separately approved channel restoration.

Unanswered later questions do not block an independent authorized security/TTS repair. They do block the capability that depends on them. Preserve the assumptions as assumptions, and ask rather than silently turning “missing policy” into unlimited authority.

## Build one narrow release

1. Choose the rung's concrete demo and at most two named new unknowns. If the scope needs a third or cannot fit one working session, propose an inserted lettered rung. F1 is optional and the only permitted unusable turn. Do not make the whole schema or SDK7 a foundation prerequisite.
2. Read chapter03 before touching the affected experience. For new central UI show seeded narrow/wide comps/key moments for approval, then build that approved slice. Keep answer/artifact primary, Activity subordinate and required Question/Approval visible. Brief any authorized delegate with the ledger/outline, domain decision IDs and comp, not only button behavior.
3. Use chapter02 as canonical fields/states. Legacy `messages.status` stays unchanged; optional `messages.runProjection={runId,status,version,wait?}` carries new waits. Recovery/readers must understand it before wait writers start. One shared Run/Attempt/Tool call/Interaction/Artifact/Usage owner; no client-generated authority or fake model execution.
4. Use chapter02's canonical discriminated usage attribution: Run/Attempt for chat; `admittedOperations`/`operationAttempts` for standalone paid work. One `usageEvents` owner records exact dispatch hashes/payer/pricing, stable physical/evidence/correction keys and matching reservation subjects. Rung6 may adopt chat first; rung7 adopts standalone attribution without fake transcript rows. Early auth/bounds/existing accountable recording does not wait for both variants or a framework.
5. Preserve authority corrections: human artifact saves authenticate current artifact/parent edit rights before the same revision CAS; agent writes still require live lease/cancel/terminal fences. Every actual schedule occurrence has finite `scheduledFor`; impossible local slots remain diagnostics. Direct management uses nonce/domain consent without a fabricated Run/Interaction. Future-only pause/edit advances `admissionEpoch` only and preserves admitted reviewed version/consent; Stop/Revoke fence execution. Scheduled connections use exact reviewed pins/consent/current policy, not output-chat selection.
6. Read chapter19 before reuse. Notto GitHub `41593a0caf0ac3d00e7744aaae3dbf7be0669de0` differs from fetched GitLab origin `7791c38f070f8ea996ef53615a39ffa6ebe2037c`. No automatic clone, fetch, private-copy or credential access. After permission, compare exact selected paths/pin and retain required provenance/notices. Borrow invariants, not finance prompts/theme/HTTP-SSE/Redis/BullMQ architecture.
7. Add the smallest needed records/indexes. Deploy optional schema/readers first only to an authorized isolated/staged backend, validate actual old/new data/BYOD/client coexistence, then enable the new writer. Never manually edit generated API/schema files or dual-execute real effects to test projections. Contraction is a separately approved data gate.

## Verify with bounded Bun commands

The commands below are **examples for the later authorized implementation**, not commands executed or passing during planning. Inspect current manifests/task graph first. Do not install packages automatically, use another package manager, run all-app root dev or broadly format the repository. Queue heavy local work and cap child workers; inside an already queued command run children directly.

From repository root, after authorized S1 restoration/dependency build:

```sh
agent-work run -- env RAYON_NUM_THREADS=4 UV_THREADPOOL_SIZE=4 bun run build --filter=@blah-chat/web
agent-work run -- env RAYON_NUM_THREADS=4 UV_THREADPOOL_SIZE=4 bun run typecheck --filter=@blah-chat/web
agent-work run -- env RAYON_NUM_THREADS=4 UV_THREADPOOL_SIZE=4 bun --filter=@blah-chat/web run test:run --maxWorkers=4
agent-work run -- env RAYON_NUM_THREADS=4 UV_THREADPOOL_SIZE=4 bun --filter=@blah-chat/backend run test:run --maxWorkers=4
agent-work run -- bun run lint --filter=@blah-chat/web
agent-work run -- bun run package-docs:check
```

These scoped examples do not cover shared/backend lint or explicit backend offline typecheck; add/verify their chapter15 scope instead of assuming missing workspace scripts ran. Direct package tests require current built dependency exports. Select targeted tests first and retain assertion/skip/task counts; no `|| true`, swallowed exit, missing-auth skip or node-count-as-coverage. Use `agent-work status`/`agent-work cancel <own-id>` for owned jobs, never global process kills.

Run the actual candidate with compatible synthetic backend/auth/fake fetch and the rung's journey. Existing CI smoke of a separate deployment is only liveness. Keep credentials/private prompts out of fixtures, logs, screenshots and optional exporters. Inspect real provider serialization, validators, effect counts and persistence; a permissive helper mock is not the boundary. A failed required check blocks the release, not a cue to change assertions until green.

## Release only with its own authorization

Follow chapter20's shared release contract and existing `docs/packaging.md`/release/rollback workflows. Record source SHA, immutable artifact ID, backend/schema compatibility, runtime/lock, required executed tests and actual demo. For changed backend/schema, validate compatible additive rollout before artifact promotion. Verify the inherited production-environment protection blocker through an authorized operator; workflow conditions alone do not prove it resolved.

Promote the exact verified artifact, never rebuild a substitute or infer candidate health from an old deployment. CLI/native use their own real channels; no automatic store submission/desktop unsuspension. Keep previous verified artifact and retained readers/run versions, new-start kill switches and a demonstrated compatible rollback. Never erase financial facts, replay unknown effects, re-enable revoked grants, contract schema to make rollback compile or silently restore vulnerable dependencies.

End the session with what the user can now do, actual release/artifact evidence, checks that ran and their limits, unresolved blockers and next rung. If deployment/commit permission was absent, report “verified locally/staged, not released” accurately; do not call it shipped. Update decisions/questions with attributed evidence only within authorized scope.

---
