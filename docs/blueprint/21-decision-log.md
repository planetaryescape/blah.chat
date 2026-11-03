# 21: Decision log

This log records the modernization planning session on 2026-11-03 for an existing application. BK is the decision-maker. Entries marked **BK** record explicit requirements, not approval of every implementation detail. Entries attributed to **GPT-6.1, recommendation delegated by BK** are PROPOSED, with assumptions in [22](22-open-questions.md). They are not settled product choices. Repository constraints are identified separately. Change an accepted decision by adding a replacement entry; do not erase its history. There were no substantive design reversals in the supplied conversation and no earlier chat is assumed.

## The arc, briefly

1. BK requested an exhaustive code audit, current research and a blueprint, using parallel researchers.
2. He added feature disposition and routing scholarship, without approving a general deletion sweep.
3. He requested an E2B computer, beyond the existing code executor, and user-added skills with explicit and automatic activation.
4. He explicitly retired Smart Assistant, not the chat agent or shared task/voice features.
5. He reported unwanted TTS list labels, then requested automatic compaction near 80% and cache optimization.
6. He requested visual artifacts, including HTML, and a fresh comparison of integration providers.
7. He asked for better question cards, loading and tool progress, pointing to his newer Notto agent.
8. He added agent-created skills and schedules.
9. Research found a modern stack with concrete security, accounting and contract failures; this changed the recommended work order, not BK's requirements.
10. We propose small compatible repairs and gated new capabilities. No application change, install, paid call, commit or deployment was authorized or performed by this planning work.

## Decisions

### D-001: Deliver evidence-backed research and a modernization blueprint, not implementation. (BK)
- **Why:** BK requested evaluation, current research and a blueprint. Source claims, proposed design and runtime measurements must remain distinguishable.
- **Constraint:** Preserve root AGENTS.md, existing documentation and unrelated experiments. No installs, commits, application edits, paid calls or deployment changes in this assignment.
- **Evidence:** [Curated research](../research/modernization-review.md), especially its evidence ledger and source registry.

### D-002: Preserve server-owned durable generation and the repository's engineering constraints. (Inherited repository constraint)
- **Why:** Messages must survive page refresh through Convex actions, partial persistence and subscriptions. Bun, normalized schema, API envelopes, centralized prompts/model definitions, all-call cost tracking, structured logging and non-native dialogs remain required.
- **Option excluded by the constraint:** A browser-owned request stream as the sole producer.
- **Evidence:** [AGENTS.md](../../AGENTS.md), [current generation](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/backend/convex/generation.ts#L794-L1033).

### D-003: Purge Smart Assistant completely while preserving user content and shared features. (BK)
- **Principle (BK):** "kill smart assistant featuree. purge it from codebase"
- **Scope:** Meeting/transcript workspace, both extraction endpoints, review panels, settings/preferences, feature-only prompts/models/exports, active docs and generated references. It is not a ban on assistant message roles, task tools, memory, voice, notes or model recommendations.
- **Unsettled migration:** Historical classification and retention choices remain Q20/Q4; see [16](16-smart-assistant-removal.md). Removal approval is not authorization to destroy existing tasks/notes/spend.

### D-004: Remove app-generated list-item announcements from read-aloud. (BK)
- **BK asked:** "the TTS when reading something with a list keeps saying list item, that's dumb, why would it do that?"
- **Fact:** Preparation inserts literal "List item", "Item" and nesting labels. An isolated source-expression probe reproduced the insertion; no audio was heard.
- **Proposed repair:** Change the deterministic list adapter, preserving actual words, ordinals, task state and source mapping. Do not globally delete the phrase or replace the speech provider. [11](11-rendering-and-narration.md), S7.

### D-005: Add automatic context compaction near 80% and optimize caching. (BK)
- **Principle (BK):** "we need to also add auto-compaction at like 80% context usage or something. and make sure that we'r eoptimised for caching"
- **Boundary:** Approximate intent, not an approved exact denominator/default/TTL. Existing opt-in browser compaction at 75% is insufficient because its occupancy and source selection are wrong. Proposed server plan and portable checkpoints: D-018, Q6/Q7, [05](05-context-and-caching.md).

### D-006: Give the agent an E2B computer for tasks beyond code execution. (BK)
- **Principle (BK):** "instead of just code execution we can now use e2b to actually give this agent a computer to perform tasks on."
- **Boundary:** Existing E2B code execution is reused. This request does not authorize credentials, purchases, unrestricted internet or autonomous consequential actions. Those policies are Q15/Q3/Q4. [07](07-tools-and-computer.md).

### D-007: Let users add skills and invoke them explicitly or let the agent select a relevant skill. (BK)
- **Principle (BK):** "I also want to implement skills so that a user can add skills and the agents can use those skills when asked directly by the user or when they find a task that could use them"
- **Boundary:** Both invocation paths are in scope. Sharing, automatic-discovery defaults, script permissions and import sources remain Q11/Q12/Q14. Developer `.agents/skills` is not the product library. [08](08-skills.md).

### D-008: Support artifacts as useful answers, including HTML visuals. (BK)
- **Principle (BK):** "Sometimes it's easier to answer users with an artifact and html can show better visuals."
- **Fact:** Canvas/card code exists, but data-shape failures, mode gating and absent HTML preview prevent treating it as the requested experience.
- **Boundary:** JavaScript, publication and network access are not implied. Q23/D-024; [10](10-artifacts-and-interactions.md).

### D-009: Research routing improvements, feature integration/removal and integration-provider alternatives. (BK)
- **BK asked:** "there's probably better autorouter technology and scholarship now, do some research"
- **BK asked:** "please research if we could maybe move to a better player in that space for integrations."
- **Boundary:** No learned router, connector provider or removal beyond Smart Assistant has been approved. Compare workflows and evidence, not package novelty or catalog size. [06](06-model-routing.md), [09](09-integrations.md), Q9/Q10/Q18.

### D-010: Make interruptions and questions actionable, well-designed cards. (BK)
- **Principle (BK):** "and we need nicer cards when we interupt the user and ask them questions etc."
- **Proposed mechanism:** Durable authored clarification controls outside collapsed activity. Distinct server-authorized exact-effect approvals are D-025, not an inferred permission grant. [10](10-artifacts-and-interactions.md).

### D-011: Learn from the newer Notto agent and its interface/progress work. (BK)
- **Why:** BK explicitly supplied `~/code/notto/product-stack` as prior work.
- **Provenance:** GitHub `41593a0caf0ac3d00e7744aaae3dbf7be0669de0` is not fetched GitLab origin/main `7791c38f070f8ea996ef53615a39ffa6ebe2037c`. Source reads used pinned commits, excluding nine dirty paths.
- **Constraint:** No identified copying license; Q21 gates implementation/test copying. Adapt hierarchy/state behavior, not finance-specific semantics, Roboto/theme, HTTP/SSE, Redis or BullMQ. [19](19-reuse-map.md).

### D-012: Give the agent a tool to create reusable skills. (BK)
- **Principle (BK):** "and we need to give it a tool to create skills for itself."
- **Boundary:** This approves the capability, not silent publication or privileged self-modification. Reviewed drafts are the proposed default under Q13/D-027. [08](08-skills.md).

### D-013: Let the agent propose schedules for automation. (BK)
- **Principle (BK):** "and to set schedules for automating tasks and all that."
- **Boundary:** Existing `scheduledPrompts` schema has no audited active runner. Schedule consent, recurrence, channels, budgets and unattended actions remain Q3/Q16/Q17. [12](12-schedules.md).

### D-014: Repair directly callable authorization and paid-action gaps before expanding autonomy. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED order, Q1; S1/S2.
- **Why:** Search trusts a caller-supplied victim user ID; file/source reads and auxiliary paid actions bypass normal chat admission. Framework migration does not fix alternate public endpoints. [Research](../research/modernization-review.md#private-data-and-paid-actions-need-first-repair).
- **Option not recommended:** Treating UI auth/hidden buttons as protection for public Convex functions. [13](13-privacy-safety-compliance.md).

### D-015: Keep native structured tool results and apply model-facing boundaries only in provider conversion. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED technical direction, Q19; S3.
- **Why:** Universal tagged strings break object consumers, citations, success/error labels and artifacts. Fix the shared contract rather than regex-parsing wrappers in every UI. Preserve incognito restrictions and prompt-injection controls. [07](07-tools-and-computer.md).

### D-016: Record every physical provider call in an idempotent, payer-correct usage ledger. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED, Q3/Q8; S3/S18.
- **Why:** Locked SDK6 `usage` is last-step, stopped text spend is omitted, daily aggregates lose dimensions and ordinary chat ignores BYOK. Derive aggregates from events; separate reported/estimated/unknown. Never sum per-step plus aggregate usage or count reasoning twice. [14](14-cost-model.md).

### D-017: Unify admission, immutable retry, leased ownership and monotonic settlement. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED, Q19/Q3; S3/S8.
- **Why:** Chronological retry deletes other branches; fixed-age locks and alternate entrypoints permit overlaps; late enrichment can flip complete to error; client IDs do not dedupe sends. Keep owned release protections, branch/comparison semantics and partials. No claim of exactly-once remote effects. [04](04-durable-generation.md).

### D-018: Plan exact server-side requests and use portable branch-aware checkpoints. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED mechanism for D-005, Q6/Q7; S4/S18.
- **Why:** Context occupancy is not lifetime billable usage. Include serialized tools/media/system/new turn plus output/safety reserves, preflight each provider step, and retain checkpoint plus recent atomic tool groups. Original transcript is immutable. Cache stable prefixes within current permissions; provider-native compaction remains optional. [05](05-context-and-caching.md).

### D-019: Repair one deterministic routing policy before adding a learned or hosted router. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED, Q18/Q8; S5.
- **Why:** Embedding accounting validation fails; direct-key fallback and exhausted bins can ignore capabilities/exclusions; seeds and sticky labels are disconnected. RouteLLM and 2026 LLMRouterBench support representative evaluation and curated candidates, not a universal savings claim. All fallbacks must pass the same eligibility filter. [06](06-model-routing.md).

### D-020: Upgrade compatible security/maintenance cohorts before elective major migrations. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED, Q1/Q22; S1/S3/S6/S15.
- **Why:** AI6 maintenance fixes do not require AI7; Tavily still lacks declared AI7 support. Expo/RN/React, Clerk internals, Tiptap, test tooling and transitive overrides need coordinated updates. Next's observed 16.4.4 excludes the scheduled November 3 security fixes; recheck before choosing a security target.
- **Options not recommended:** Workspace-wide latest/fix-latest, forced peer overrides, native React upgrades outside Expo's matrix, or treating package age as exploit proof. [Research matrix](../research/modernization-review.md#upgrade-compatible-cohorts-instead-of-everything).

### D-021: Spike Convex Workflow without selecting a wholesale runtime replacement. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED evaluation preference, Q19; S8.
- **Why:** It fits existing ownership and can park/resume bounded steps. WorkflowAgent is an alternative if a measured requirement demands it; Eve remains an experiment with two failed crash probes and synthetic billing. Never merely retry the whole side-effecting action. [04](04-durable-generation.md).

### D-022: Make incognito, sharing and deletion end-to-end data contracts. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED, Q4/Q5/Q7/Q8; S2/S17.
- **Why:** Incognito/CLI cascades omit child records, IndexedDB erasure diverges and share queries return full internal rows. Retain account partitioning, AES-GCM, ownership checks, reference-safe blob cleanup and password-share fail-closed behavior. No claim that app deletion erases backups or processor copies. [13](13-privacy-safety-compliance.md).

### D-023: Propose one Quiet workbench concept, preserving blah.chat's identity. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED, Q2; S6/S16.
- **Why:** One answer/artifact is primary; human decisions stay visible; activity recedes into durable disclosure. Keep indigo/rose, existing typography and editor-inspired dark materials. Narrow screens retain the same task/decision with full-screen outputs. This is not a BK-approved redesign or a Notto theme transplant. [03](03-design-concept.md).

### D-024: Migrate canvas into typed, version-pinned artifacts and start HTML without scripts. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED implementation of D-008, Q23/Q5; S9.
- **Why:** Explicit artifact/base-revision IDs prevent first-active-document writes and lost edits; message references pin historical versions. Static isolated HTML/CSS can satisfy visual answers without arbitrary JS. Sandbox/CSP alone do not prove arbitrary JS has no egress. Keep source/export fallback. [10](10-artifacts-and-interactions.md).

### D-025: Separate clarification, approval and progress over one durable interaction protocol. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED mechanism for D-010, Q5/Q19; S8/S9.
- **Why:** A question gathers data; an approval grants one exact action; activity reports executor evidence. Authenticated compare-and-swap consumes one answer/resume intent. No native dialogs, approval-on-timeout, implicit yes, fake percentages or client-age failure declarations. [10](10-artifacts-and-interactions.md).

### D-026: Repair Composio's application boundary and compare Nango before choosing a replacement. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED shortlist, Q9/Q10; S10.
- **Why:** Preserve existing per-chat opt-in; fix exact-account dispatch, auth attempts, reconnect and revocation outbox. Nango is a credible current agent-tool challenger, not only OAuth plumbing. Pipedream is a broad-catalog option with a production minimum; Arcade adds policy plus OAuth/data-policy work. Migration assumes explicit reconnect, not supported token export. [09](09-integrations.md).

### D-027: Use private immutable Agent Skills packages, progressive activation and reviewed self-authored drafts. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED policy for D-007/D-012, Q11/Q12/Q13/Q14; S11.
- **Why:** Packaging is portable, but ACLs, execution permission and safety are app responsibilities. User-enabled automatic activation remains required; publication is explicit-only by default until BK decides. Load text without E2B; scripts need separate isolation. Never auto-import local coding skills or modify privileged prompts. [08](08-skills.md).

### D-028: Allocate clean E2B environments lazily with fenced actions, private observations and hard limits. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED policy for D-006, Q3/Q4/Q5/Q15; S12.
- **Why:** Reuse code gateway; separate computer sessions from runs. Initial scripts are offline; no authenticated browser, host profile, credentials, snapshots/forks, purchases or arbitrary scripts in writable desktops. VNC viewOnly is not a server ACL. Timeouts can leave unknown effects and pause is not deletion/cancellation. [07](07-tools-and-computer.md).

### D-029: Review schedule revisions; ship reminders before bounded read/draft agent jobs. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED policy for D-013, Q3/Q16/Q17; S13.
- **Why:** Durable occurrence IDs, timezone/DST policy, fresh permissions and budgets prevent silent catch-up/overlap. Scheduling does not propagate auth or approve future writes. Legacy scheduledPrompts become unarmed drafts; notification retry never reruns the task. [12](12-schedules.md).

### D-030: Deliver session-sized usable releases and keep exact-artifact promotion safeguards. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED order, Q1; S1 plus per-rung spikes.
- **Why:** Each rung adds one observable end-to-end outcome with at most two unknowns; at most one unusable F1. No giant runtime rewrite rung. Production promotion remains separately authorized, with backend compatibility and rollback; inherited production-protection blocker must be checked. [20](20-roadmap.md).

### D-031: Preserve existing CLI, mobile and desktop contracts; add no new TUI. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED sequencing, Q22; S15.
- **Why:** Four apps already exist. New states/review/stop/output references need compatible projections, not web-only silent failures. Keep desktop automatic-release suspension until its own gates pass; do not independently bump native components. [17](17-cli.md), [18](18-mobile-and-desktop.md).

### D-032: Retire schemas only after writers stop and retained data reconciles. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED migration policy, Q4/Q20; S14/S17.
- **Why:** Preserve IDs, tasks, notes, cost totals and historical truth. Proposed old task source→transcript; ambiguous spend→neutral historical classification, not fabricated provenance. Migrate modular/BYOD/deployed data and stale-client writers before validator contraction. No speculative orphan-audio deletion. [16](16-smart-assistant-removal.md).

### D-033: Validate the candidate with deterministic failure-oriented fixtures; keep live canaries separately approved. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED gates, Q1/Q3; S1-S18 as scoped.
- **Why:** Current smoke targets an independent deployment, auth failures can skip core E2E and release scripts hide failed commands. Local test/typecheck failures have missing-install/stale-dist confounders. Required scenarios must actually execute; missing cases/auth are not passes. [15](15-observability-and-evals.md).

### D-034: Keep metadata-first structured tracing separate from financial and authorization truth. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED, Q4/Q8/Q18; S3/S16.
- **Why:** Correlation must cross Convex boundaries explicitly. Redact before every exporter; incognito content must not leak. Langfuse is optional and version-specific; sampled traces cannot be the usage ledger or run state. Export failures must not change completed answers. [15](15-observability-and-evals.md).

### D-035: Resolve one executable catalog snapshot for UI, admission, routing and pricing. (GPT-6.1, recommendation delegated by BK)
- **Status:** PROPOSED, Q8/Q18; S5/S18.
- **Why:** Database picker rows, shared AI configuration and router-local profiles currently disagree in authority. Persist actual route/model/payer and capability/pricing versions; retain old versions for historical display/cost. Do not assume a custom picker row has a working provider adapter. [06](06-model-routing.md), [14](14-cost-model.md).
