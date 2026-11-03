# blah.chat: modernization blueprint

> Preserve durable multi-model chat across web, CLI, mobile and desktop, repair trust boundaries, then add useful artifacts, decisions, skills, schedules and a bounded remote computer.

This is an **existing-app modernization plan**, audited on **2026-11-03** at HEAD and freshly fetched `origin/main` **`04866f80a6236716ebf8d8c5a79001727f85f4bf`**. The application and its existing design precede this session. There was no previous blueprint; existing architecture/runbooks remain intact. Root [AGENTS.md](../../AGENTS.md) is preserved, including inherited engineering constraints; current paths are clarified in [01](01-architecture.md).

BK requested evaluation, current research and this blueprint, not implementation. **No application code, installation, paid model/sandbox call, migration, deployment or commit is authorized by these documents.** The 35 entries in [21](21-decision-log.md) distinguish explicit BK requirements, inherited constraints and unapproved GPT-6.1 recommendations. The 23 questions and 18 spikes in [22](22-open-questions.md) remain open; a planning assumption is not permission. The [kickoff](KICKOFF.md) is a prompt to use after scoped implementation authorization, not an instruction to start it now (D-001).

## Reading order

Read the decision log before proposing a change of direction, then read the numbered set in order. The roadmap is the execution order; chapter order is the system reference. Each domain points to its decisions and unresolved policies.

| # | Document | What it covers |
|---|---|---|
| 00 | [Overview](00-overview.md) | Current product, four surfaces, useful-work loop, scope and non-goals |
| 01 | [Architecture](01-architecture.md) | Existing versus proposed ownership, narrow seams, packages, envelopes and transport |
| 02 | [Data model](02-data-model.md) | Canonical fields/states, indexes/idempotency, additive projection and migration |
| 03 | [Design concept](03-design-concept.md) | Proposed Quiet workbench, journeys, tokens, hierarchy and design gate |
| 04 | [Durable generation](04-durable-generation.md) | Admission, attempts, branch-safe retry, leases, cancellation, terminal settlement and waits |
| 05 | [Context and caching](05-context-and-caching.md) | Exact request budget, portable checkpoints, near-80% trigger and provider cache differences |
| 06 | [Model routing](06-model-routing.md) | Executable catalog, eligibility/fallback, deterministic baseline, scholarship and evaluation |
| 07 | [Tools and computer](07-tools-and-computer.md) | Native tool results/effects, existing E2B gateway, offline scripts and bounded desktop |
| 08 | [Skills](08-skills.md) | Private packages/imports, explicit and enabled automatic use, reviewed self-authored drafts |
| 09 | [Integrations](09-integrations.md) | Existing per-chat selection, exact accounts/lifecycle/cleanup, Composio repair and challengers |
| 10 | [Artifacts and interactions](10-artifacts-and-interactions.md) | Canvas migration, exact revisions, static HTML, clarification, approval and truthful activity |
| 11 | [Rendering and narration](11-rendering-and-narration.md) | Sanitizer/math/worker parity, code/sources/reading/accessibility and list TTS repair |
| 12 | [Schedules](12-schedules.md) | Reviewed recurrence/consent, reminders, occurrence/delivery ledger and bounded read/draft jobs |
| 13 | [Privacy, safety and compliance](13-privacy-safety-compliance.md) | P0 public aliases, ACLs, shares/incognito/erasure, credentials/processors and capability boundaries |
| 14 | [Cost model](14-cost-model.md) | Physical calls/payer/usage, corrections/reservations, cache/compute/connector units |
| 15 | [Observability and evals](15-observability-and-evals.md) | Actual baseline checks, candidate gates, deterministic corpus and metadata-first optional traces |
| 16 | [Smart Assistant removal](16-smart-assistant-removal.md) | Approved full purge, exact residue map, retained-data/BYOD/stale-client migration |
| 17 | [CLI](17-cli.md) | Actual existing commands/transport and separately proposed scriptable run/review/output increments |
| 18 | [Mobile and desktop](18-mobile-and-desktop.md) | Actual Convex mobile/Tauri shell, independent native cohorts and compatibility/release gates |
| 19 | [Reuse map](19-reuse-map.md) | Exact Notto dual-remote pins, patterns/paths/counts, copying permission and public OSS references |
| 20 | [Roadmap](20-roadmap.md) | 33 numbered rungs plus 2a/2b, optional F1, maintenance recipes, all decisions/F01–F50 mapped |
| 21 | [Decision log](21-decision-log.md) | 37 attributed requirements/constraints/recommendations; no invented prior agreements |
| 22 | [Open questions](22-open-questions.md) | 23 explicit policy assumptions and 18 evidence spikes |
| — | [Kickoff](KICKOFF.md) | Paste-in prompt for the first separately authorized implementation session |

## Summary

- **Keep the stack and durable owner.** Next 16/React 19/AI SDK 6/Convex already exist; scheduled generation persists partials for observing clients. Browser resilience is not journaled execution or exactly-once external effects. Bun, API envelopes, normalized schema, centralized prompts/models and all-call cost tracking remain constraints (D-002, D-017, D-020).
- **Repair reachable exposure first.** All public search/file/source/paid aliases need direct-call protection; guard or fail-close them before expanding authority. Candidate validation must exercise the changed artifact, not an independently healthy deployment. Planning itself has not protected production (D-014, D-030, D-033).
- **Retire Smart Assistant completely.** This is BK's approved removal, including routes/actions/prompts/settings/exports/generated residue. Preserve shared tasks/deadlines, voice, notes/projects, memory and recommendations; stop producers, reconcile retained data, then contract supported schemas. No permanent hidden flag (D-003, D-032).
- **Ship small visible repairs early.** Remove app-inserted list labels, preserve native results/valid continuation, make retry branch-safe and count real physical calls/payer correctly. None waits for all proposed tables or a workflow framework (D-004, D-015–D-017).
- **Plan actual input.** Separate lifetime spend from exact serialized context, reserve output/safety, checkpoint authorized ancestry and trigger server compaction near 80% usable input under reviewed policy. Stable cache prefixes never preserve revoked permissions (D-005, D-018, D-035).
- **Route what is allowed before predicting quality.** Repair deterministic eligibility/catalog and every fallback; preserve manual choice and recommendation opt-out. Learned/hosted routing needs representative quality/cost/privacy evidence, not historical benchmark savings (D-009, D-019, D-035).
- **Produce work and ask clearly.** Migrate canvas to exact artifact revisions; static isolated HTML first, arbitrary JS deferred. Clarification gathers data; approval authorizes one described effect; progress comes from executor evidence. All share durable ownership, not another browser runtime (D-008, D-010, D-024, D-025).
- **Add skills and automation without self-granted power.** Private pinned instruction packages support explicit and owner-enabled automatic activation. Agent tools create reviewed drafts, not privileged self-modification. Reminders precede fresh bounded read/draft scheduled jobs; consent does not approve future writes (D-007, D-012, D-013, D-027, D-029).
- **Keep integrations/computers gated.** Repair Composio lifecycle/account/action policy; Nango is proposed primary challenger, not selected provider. Reuse E2B code execution, then clean offline scripts and a bounded desktop. No credentials, authenticated browsing, purchases or unattended consequential jobs by implication (D-006, D-009, D-026, D-028).
- **Preserve identity and clients.** Quiet workbench is proposed under Q2: retain indigo/rose character and existing type, make answer/artifact primary, keep activity subordinate and required decisions visible. Learn pinned Notto hierarchy, not its theme/transport/private code without permission. Maintain CLI/native readers and no new TUI; desktop automatic releases stay suspended (D-011, D-023, D-031).

## What was verified, and what was not

The [measured ledger](15-observability-and-evals.md#what-was-actually-measured) separates execution from source inspection. Package docs passed for 27 packages and web Biome passed for 793 files. Backend tests could not launch; web Vitest reported 323 passed/13 failed tests and TypeScript 3,792 diagnostics in an incomplete install with confirmed stale built exports. These are not clean-install upstream regression counts. The isolated speech expression reproduced `List item`; the full parser import was blocked by missing `marked`. A lock-aware audit found advisories, not exploit proof or a validated production-only scan.

No production build, authenticated E2E, browser/accessibility/native journey, real OAuth/model/computer run or heard audio was verified. No production protection, deployed schema, invoice/latency/savings or compliance certification is asserted. Registry/advisory/pricing observations are dated 2026-11-03; in particular observed Next 16.4.4 is not the announced November 3 security fix. Recheck at implementation (D-020/D-033).

### Blueprint validation

Local documentation checks on 2026-11-03 found 25 blueprint files, 35 decision definitions, 23 questions and 18 spikes. The index covers all 23 numbered chapters and KICKOFF. Every decision and F01–F50 has a roadmap bucket; all 34 product rungs have the required acceptance fields.

The unmodified stock command `python3 -I /Users/bhekanik/.dotfiles/.skills/blueprint/scripts/check_blueprint.py docs/blueprint` passed with actual output: `25 documents, 35 decisions, 41 spikes/questions: 0 errors, 0 warnings`. Research/report paths now use hyphenated names; parenthesized mobile paths and the packaging line citation use immutable source permalinks. No checker workaround or ignored error is used. External URLs were not re-fetched in this finalization. This validates documentation links/structure, not application behavior or approval of the proposed contracts.

## Research and raw sources

Start with the [report](../../reports/blah-chat-modernization-review.md) and [curated synthesis](../research/modernization-review.md). The synthesis provides severity-ordered F01–F50, compatibility/feature-disposition matrices, conflicting-claim reconciliation, source/permalink registry and limitations. All 15 raw notes belong to this request, not an invented earlier study:

| Audit notes | Experience notes |
|---|---|
| [Baseline](../../research_notes/blah-chat-modernization-review/baseline.md), [dependencies](../../research_notes/blah-chat-modernization-review/dependencies.md), [generation](../../research_notes/blah-chat-modernization-review/generation.md) | [Artifacts/interactions](../../research_notes/blah-chat-agent-experience/artifacts-interactions.md) |
| [Data/security](../../research_notes/blah-chat-modernization-review/data-security.md), [frontend](../../research_notes/blah-chat-modernization-review/frontend.md), [routing/disposition](../../research_notes/blah-chat-modernization-review/routing-feature-disposition.md) | [Integrations](../../research_notes/blah-chat-agent-experience/integrations.md) |
| [Agent prior art](../../research_notes/blah-chat-modernization-review/agent-prior-art.md), [rendering prior art](../../research_notes/blah-chat-modernization-review/rendering-prior-art.md), [computer/skills](../../research_notes/blah-chat-modernization-review/computer-skills.md) | [Notto reuse](../../research_notes/blah-chat-agent-experience/notto-reuse.md) |
| [Narration](../../research_notes/blah-chat-modernization-review/narration.md), [context/caching](../../research_notes/blah-chat-modernization-review/context-caching.md) | [Schedules/self-created skills](../../research_notes/blah-chat-agent-experience/schedules-self-skills.md) |

## Rules for coding agents

1. **The canonical execution surface stays server-owned.** Drive the actual candidate client/backend/binary to verify a promise. A displayed card, reconnect recipe or mocked completion helper is not durable execution evidence (D-002/D-033).
2. **Read decisions before changing direction.** Recommendations D-014–D-035 remain PROPOSED; ask at the relevant Q boundary. Add an attributed replacement if an accepted decision changes; never rewrite BK's words or invent a reversal.
3. **Run only the spikes this rung needs, before relying on their answer.** Default to synthetic records/fake fetch/clocks. Accounts, paid calls, live effects, schema migrations and promotion need scoped permission; possessing credentials does not grant it.
4. **Keep one owner and the exact state vocabulary.** Use [02](02-data-model.md), unchanged legacy message states and optional `messages.runProjection={runId,status,version,wait?}`. No parallel toolRuns/actionApprovals/document store, fake successful question or waiting_for_user Run state (D-015/D-017/D-025).
5. **Use the resolved canonical usage attribution.** [02](02-data-model.md#canonical-usage-attribution)/[14](14-cost-model.md#immutable-events-then-projections) specify Run/Attempt versus standalone admitted operation/physical Attempt, exact request hash/payer lineage, correction keys and matching reservations through one ledger. No fake chat rows or loosely optional IDs. [20](20-roadmap.md#canonical-handoff-before-new-writers) stages chat adoption in rung 6 and standalone adoption in rung 7; early authenticated/bounded recording remains independent.
6. **Preserve edit and schedule authority.** Human artifact saves use authenticated current edit rights before the shared revision CAS, not a finished agent lease. Gap/missing-day diagnostics are not fictional UTC occurrences. Direct schedule management uses nonce/consent without a fake Run. Future-only pause/edit fences new admission while admitted work retains reviewed version/consent; Stop/Revoke fence continuation. Scheduled connections use exact reviewed pins/consent, never implicit output-chat selections ([10](10-artifacts-and-interactions.md), [12](12-schedules.md)).
7. **Reuse before rewriting, with permission.** [19](19-reuse-map.md) records exact dual Notto pins and private-copy limitation Q21. Do not clone/fetch/copy automatically or transplant its runtime/branding.
8. **Keep the workbench quiet and prove its journeys.** Approve scoped new comps before central UI; required decisions and outputs stay outside Activity. Keep saved/unsent/approved/succeeded/uncertain distinct across surfaces (D-023/D-025/D-031).
9. **Use Bun and scoped queued checks.** Heavy local commands use `agent-work`, at most four workers. No all-app root dev surprise, bulk formatter run or latest dependency sweep. Inspect actual task scope; missing scripts/skips/stale dist are not passes.
10. **Release compatible artifacts, not optimistic labels.** Follow [20](20-roadmap.md#one-release-contract-scoped-to-the-changed-surface): additive readers/schema first when needed, exact candidate proof, separately approved backend/promotion, retained old runs/readers and rollback. No global teardown, user-data deletion or silent security downgrade.

Before rung 1, obtain implementation/isolation/install scope and Q1 sequencing; complete S1/S2. Paid/live work additionally needs Q3/Q8; new UI Q2; retention/collaboration Q4/Q5; migration Q20/Q22; provider/skill/schedule/computer choices wait for their later Q gates. The [complete assumption table](22-open-questions.md#product-questions-for-bk) defines Q1–Q23 rather than pretending these policies are settled.

## Delivery update, 2026-11-03

BK subsequently authorized building this blueprint and explicitly selected merge
and deployment through the existing release channel. Work starts with rung 1;
later capability policies remain unresolved at their stated boundaries. The
planning-session statements above remain the record of what was authorized then,
not a prohibition on this later implementation. [D-036](21-decision-log.md#d-036-begin-implementation-with-rung-1-and-carry-reviewed-work-through-merge-and-deployment-bk-2026-11-03) records this replacement of D-001's research-only scope.

Rung 1's security repair is deployed. Artifact
`dpl_AHDcdMQwsY9kymPFNWr5YTJtujFQ`, source
`c30441201494fc9a560c415b777e8ffa0147f540`, passed authenticated staged and
production send/refresh/persisted-response journeys before and after
[exact-artifact promotion](https://github.com/planetaryescape/blah.chat/actions/runs/41731489607).
A separate non-admin test account was used; no administrator session or temporary
Vercel bypass state was saved into CI. The bypass was revoked after staging setup.

The follow-up [CI renewal repair](https://github.com/planetaryescape/blah.chat/pull/583)
merged at `4b96b9fbeae9575fe9e089c730025b184168ce45`.
[Merged-main CI](https://github.com/planetaryescape/blah.chat/actions/runs/41737412330)
passed all required checks and all three deployed-liveness smoke tests, with no
authenticated test skipped. This test/docs-only commit did not rebuild the
verified production artifact. Liveness remains separate from exact-candidate
generation proof.

Retirement proceeds through rung 2a's executable/UI removal and compatible usage
readers, then rung 2's future-writer switch. D-037 approves
`model_recommendations` for future calls only. Historical reconciliation and
schema contraction remain gated by Q20/Q22; this update does not claim retirement
or those later rungs deployed.

BK separately approved the protected-branches-only `Production` environment
policy. The API now reports that policy; candidate checks and authenticated
staged journeys remain required. See [packaging](../packaging.md#external-production-environment-blocker).
