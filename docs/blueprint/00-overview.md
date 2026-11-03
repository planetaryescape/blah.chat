# 00: Overview

## What blah.chat is

Modernize the existing personal AI assistant so BK can ask for useful work, review a result and make the few decisions that require him. Keep conversation history, model switching, branches and persisted generation. Add the requested agent capabilities without turning every answer into a tool dashboard. This is a plan for the application at `04866f80a6236716ebf8d8c5a79001727f85f4bf`, reviewed on 2026-11-03, not a new product specification (D-001, D-002).

Four surfaces already exist:

- Web: Next.js chat, settings and workspaces in `apps/web`.
- CLI: the existing terminal client in `apps/cli`; no new TUI is proposed.
- Mobile: Expo/React Native in `apps/mobile`.
- Desktop: the Tauri application in `apps/desktop`; automatic desktop releases remain suspended until its own release gates pass.

Convex remains the system of record. Clients observe saved messages; closing a browser must not own or terminate generation. Reconnection, process recovery and exactly-once external effects are different guarantees. The existing producer delivers refresh resilience, not proof that an interrupted remote action is safe to replay. [01](01-architecture.md) separates these boundaries; [04](04-durable-generation.md) specifies proposed execution changes (D-002, D-017, D-031).

Baseline evidence: [workspace inventory](../../research_notes/blah-chat-modernization-review/baseline.md#deterministic-inventory), [generation persistence](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/backend/convex/generation.ts#L794-L1033), [desktop release suspension](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/docs/packaging.md#L27-L30).

## Who it's for

The first user is BK. Existing authenticated users, collaborators, public-share viewers and self-hosted/BYOD users have contracts we must preserve or explicitly migrate. We have no agreed acquisition target, enterprise buyer, team-organization model or growth forecast. Existing `users` and conversation participation remain the ownership model (D-022, D-031).

## The useful-work loop

1. BK asks a question or describes a task, choosing context, a model or Auto, and any enabled skills or connections.
2. The server verifies access, resolves the actual model/payer and admits bounded work. The client distinguishes an unsent request from a saved request.
3. The agent answers or uses authorized tools. Partial text and real activity survive refresh. Long conversations use an authorized branch-specific context plan rather than losing earlier constraints.
4. When information is missing, a clarification card asks for it. When authority is missing, a separate approval card describes one exact effect. Neither is disguised as progress.
5. BK reads the answer or opens its pinned artifact revision, edits/exports where supported, or accepts/denies a bounded decision. A receipt says what actually happened, including partial or uncertain effects.
6. A reviewed skill can make a later task easier. A reviewed schedule can bring a reminder or bounded read/draft result back without an open browser. Neither grants new permissions by itself.

Steps 1–3 already exist in part. Durable human waits, general artifacts, product skills, computers and an active schedule runner are proposed additions or repairs, not current capabilities (D-005–D-013, D-015–D-018, D-024–D-029). Acceptance: drive this loop with fake providers on the candidate application, including refresh, denial, stop and a lost acknowledgement; do not substitute a screenshot of a card for working continuation.

## What it should feel like

**Quiet workbench is ASSUMED, pending Q2.** The answer or artifact gets attention; activity recedes until needed. A required decision stays visible, and saved work remains where BK left it. The proposal keeps blah.chat's existing indigo/rose identity and editor-inspired dark atmosphere; [03](03-design-concept.md) owns the full concept and approval gate (D-023).

## What already exists

The reviewed stack already includes Next 16, React 19, AI SDK 6, Convex, Streamdown, Shiki, Mermaid, a worker renderer, Virtuoso and account-partitioned Dexie caching. E2B code execution, Composio selection, canvas documents, task/note tools, memory and speech preparation also exist. A newer package name is not a reason to replace them (D-020).

Existing code is not proof of an end-to-end experience. Canvas has result/identity failures and no general HTML preview; clarification controls do not durably park a run; `scheduledPrompts` is schema without an audited active runner. TTS explicitly inserts structural list labels. See the [reconciled findings](../research/modernization-review.md#conflicting-conclusions-resolved-against-cited-evidence), [artifact trace](../../research_notes/blah-chat-agent-experience/artifacts-interactions.md#actual-artifact-path) and [narration evidence](../../research_notes/blah-chat-modernization-review/narration.md#local-evidence-actually-collected).

## Principles

1. **Repair trust first.** Direct public authorization and paid-action gaps can bypass otherwise correct UI. Fix or safely disable those paths before expanding autonomy (D-014).
2. **Keep the durable producer.** Messages survive refresh because the server persists them. A browser stream or new workflow library must not become the only owner (D-002, D-021).
3. **Preserve history.** Retry adds an attempt or sibling; compaction adds a checkpoint. Neither deletes unrelated branches or rewrites the original transcript (D-017, D-018).
4. **Permissions belong in executors.** A skill, OAuth connection, schedule or model-generated tool call is not permission to send, spend or expose data (D-025–D-029).
5. **Charge what actually ran.** Each physical provider call has an idempotent usage record with its actual payer. Stop, error and lost acknowledgement do not make incurred cost disappear (D-016).
6. **Make waiting honest.** Human waits are durable states, not spinners or age-based failures. Progress comes from executor evidence; completion comes from saved output and receipts (D-025).
7. **Integrate before adding another owner.** Extend `toolCalls`, use one `interactions` store and migrate canvas to artifacts. Avoid a parallel run or approval system for each capability (D-015, D-024, D-025, D-028).
8. **Ship a useful increment.** A security repair or corrected read-aloud must not wait for every proposed table, major upgrade or agent engine. Each release has an observed user outcome and rollback path (D-020, D-030, D-033).

## Scope and feature disposition

BK approved Smart Assistant removal only. Other rows are PROPOSED recommendations; KEEP does not certify correctness, and DEFER means deferred, not rejected. The detailed inventory belongs in [16](16-smart-assistant-removal.md) and the usable-release ladder in [20](20-roadmap.md). Assumptions and gates are in [22](22-open-questions.md).

| Capability | Disposition | Work and boundary | Decision / chapter |
|---|---|---|---|
| Durable chat, model switching, branches, comparison | KEEP | Repair retry, admission, cancel and settlement; preserve original messages | D-002, D-017; [04](04-durable-generation.md) |
| Notes, projects, tasks/deadlines, RAG, memory, incognito, shared voice tools | KEEP | Retain shared features; repair ACL, deletion and actual costs rather than treating their names as Smart Assistant code | D-003, D-014, D-022; [13](13-privacy-safety-compliance.md), [16](16-smart-assistant-removal.md) |
| Smart Assistant meeting/transcript workspace | REMOVE | Approved full feature purge; retained tasks/notes/history need explicit migration, not deletion | D-003, D-032; [16](16-smart-assistant-removal.md) |
| Auto and model recommendations | INTEGRATE | One executable catalog, hard eligibility on every fallback and deterministic baseline first | D-009, D-019, D-035; [06](06-model-routing.md) |
| Context meter, compaction and caching | INTEGRATE | Server request plan, portable branch checkpoint, trigger near 80% of usable input; exact defaults open | D-005, D-018; [05](05-context-and-caching.md), Q6/Q7 |
| Canvas and visual answers | INTEGRATE | One typed artifact owner, pinned revisions, static isolated HTML/CSS first | D-008, D-024; [10](10-artifacts-and-interactions.md), Q23 |
| Questions, approvals and activity | INTEGRATE | Authored durable decisions and quiet executor-backed progress; no generic yes-as-authorization | D-010, D-025; [10](10-artifacts-and-interactions.md) |
| Markdown, code, math, citations and read-aloud | INTEGRATE | Keep renderer assets, prove worker parity and sanitizer policy; remove generated list labels without removing author text | D-004, D-020; [11](11-rendering-and-narration.md) |
| Existing E2B code executor → computer tasks | SPIKE | Reuse gateway; clean lazy environments, private observations, leases and explicit limits before desktop enablement | D-006, D-028; [07](07-tools-and-computer.md), S12 |
| User-added and agent-created skills | INTEGRATE | Private pinned packages; explicit and enabled automatic use; reviewed self-authored drafts | D-007, D-012, D-027; [08](08-skills.md), S11 |
| Composio and possible replacement | SPIKE | Repair current account/attempt/revoke boundary; compare Nango on the same approved tasks before provider selection | D-009, D-026; [09](09-integrations.md), S10 |
| Schedules | INTEGRATE | Reviewed reminders first, then bounded read/draft jobs with occurrence ledger; legacy rows remain unarmed | D-013, D-029; [12](12-schedules.md), S13 |
| SDK7, learned/hosted routing, Convex Workflow | SPIKE | Evaluate independently after compatible repairs; none is a prerequisite for initial security fixes | D-019–D-021; [04](04-durable-generation.md), [06](06-model-routing.md) |
| CLI, mobile and desktop | KEEP | Shared nouns, states, stop/review/output receipts; release each through its existing channel | D-031; [17](17-cli.md), [18](18-mobile-and-desktop.md) |
| Arbitrary-JS artifacts, public skill marketplace, autonomous consequential writes | DEFER | Separate security, consent and product evidence required; not implied by visual answers or scheduling | D-024, D-027–D-029; Q11–Q17/Q23 |

## Non-goals

- No framework/database rewrite, new tenant-organization layer, new TUI or simultaneous all-latest dependency update. These are not needed to fix the traced contracts (D-002, D-020, D-031).
- No claim of exactly-once external effects, perfect model safety, guaranteed dollar savings or measured latency improvements. No such production evidence was collected (D-016, D-017, D-033).
- No silent credential injection, purchases, authenticated desktop browsing, automatic skill publication or unattended writes. These remain gated policies, not interpretations of BK's capability requests (D-006, D-012, D-013; Q3/Q13–Q17).
- No deletion of shared task/voice/memory features or user data under the Smart Assistant purge. Historical classification remains Q20 (D-003, D-032).
- No implementation, installation, paid experiment, migration or deployment in this planning assignment. Future execution needs scoped authorization (D-001).

## First release gate

The proposed first priority is web/backend security and reliability, pending Q1. S1 establishes a reproducible quality baseline; S2 exercises every affected public alias with synthetic owner/collaborator/outsider/anonymous records and zero unauthorized storage/provider calls. Candidate tests must actually execute. Existing smoke against a separate deployment is not candidate proof. Preserve exact-artifact staging/promotion and verify the documented production-protection blocker before any authorized promotion (D-014, D-030, D-033).

Later capability releases add their own gates rather than blocking this small repair on a giant schema rebuild. [13](13-privacy-safety-compliance.md), [15](15-observability-and-evals.md) and [20](20-roadmap.md) define the evidence required. No gate is claimed passed by this blueprint.

## Glossary

| Term | Meaning |
|---|---|
| Conversation | Saved message DAG and its authorized selected path; not an organization or a single provider session |
| Run | One admitted unit of agent work, possibly parked and resumed; owned by `agentRuns` |
| Attempt | One physical execution attempt within a run; a retry gets another identity |
| Tool call | Persisted app record in existing `toolCalls`; provider call IDs are not global identities |
| Interaction | Durable clarification or exact-effect approval; one store, different authority semantics |
| Artifact | Owned output with immutable revisions; message references pin a specific revision |
| Context checkpoint | Authorized branch summary with immutable coverage/provenance; never a replacement transcript |
| Skill | Private versioned instruction package; it may request capabilities but cannot grant them |
| Schedule occurrence | One reviewed schedule version at one scheduled instant; retrying delivery does not rerun work |
| Effect certainty | Whether a remote effect is confirmed, absent or uncertain; independent of transport success |

Canonical fields and status spelling are in [02](02-data-model.md). The [decision log](21-decision-log.md) distinguishes BK's requirements from proposed implementation; [22](22-open-questions.md) keeps unresolved choices unresolved.
