# 20: Roadmap

## Build philosophy

We are improving a working application, not building a replacement before anyone can use it. Start with safer existing chat, then make each new capability useful end to end. This was the PROPOSED release order under the original planning scope (D-001, D-030). D-036 subsequently authorizes implementation, merge and deployment beginning with rung 1; later policies remain gated by their stated questions.

- Skateboard → scooter → bicycle → motorbike → car: stop after any released rung and the previous working product remains available.
- A rung fits one working session and adds one observable outcome. Each names at most two new unknowns. If its acceptance cannot fit that session, insert a lettered rung before starting; never declare a half-working subsystem complete.
- There are **33 numbered product rungs plus retirement prerequisite 2a and completion 2b: 35 planned product releases**. Rung 2a separates executable retirement and compatible accounting readers from the future-writer switch in rung 2. The other extra slices keep imports/activation/authoring, schedule review/delivery/jobs, connector lifecycle/reads/effects and script/desktop execution out of omnibus sessions. They are not a requirement to fund every capability at once.
- At most one unusable foundation turn, F1, is allowed. Skip it if the existing candidate can already be built and tested reproducibly. Do not introduce all proposed tables there.
- Security, retirement producers, TTS and native-result repairs use existing seams. Add Run/Attempt/Usage records only where needed; add interactions, checkpoints and each domain's records with that capability ([02](02-data-model.md), D-014–D-018). The precise incremental table is [02](02-data-model.md#adopt-only-the-records-a-release-needs).
- Product numbers are stable. A blocked 2b does not block an independent TTS repair; a blocked preview domain does not block skill text or reminder work. Execute only dependency-ready rungs, recording the chosen release and its deferred gates. New autonomy cannot bypass earlier security/accounting/ownership dependencies.
- Every promise below is explicitly a **proposed demo promise, not a BK quote**. No wording invents another product agreement.
- “Tests pass” is required but insufficient. A rung also needs its candidate demo, applicable [03 design gate](03-design-concept.md#the-design-gate), real release-channel evidence and compatible rollback. A static/browser prototype is not a deployed feature.

## Phase 0: accounts and spikes

Ask which owner actions are already satisfied; do not create accounts, retrieve credentials, clone private repos, change policies or fund calls automatically. Read [22](22-open-questions.md) for exact Q/S definitions. Each spike is run only for its affected release, not all 18 before rung 1.

| # | Owner action / decision | Needed by |
|---|---|---|
| A1 | Authorize implementation scope, Q1 priority and isolated synthetic candidate environment; supply an approved test-auth/seed method without secrets in docs. Authorize installs separately if needed. | F1/rung 1; S1/S2 |
| A2 | Authorize the specific backend deployment/staging/promotion and verify production-environment protections. A source patch alone does not protect current deployed users. | Each actual release, not this planning session |
| A3 | Approve Q20 exact retained-data classifications/window and Q4 migration-manifest retention; authorize hosted/BYOD inventory, dry run, migration and contraction separately. | 2b; S14/S17 |
| A4 | Review Q2 comps; settle relevant Q4/Q5/Q22 data/reader boundaries before enabling new waits/private resources. | Central new UI, 15–27 as applicable |
| A5 | Set Q3 numerical limits/live-call budgets and Q8 actual payer/provider/region terms. Until then use fake providers and block new paid autonomy. | Live listening, provider/cache/router canaries, 27–33 |
| A6 | Approve Q23 static preview delivery origin/terms and hosting; script permission remains separate and deferred. | 21; S9 |
| A7 | Name Q9 sandbox apps/accounts/actions and Q10 acceptable provider/data terms; perform approved OAuth registration/consent. Approve any actual send separately. | 28–30; S10 |
| A8 | Approve Q14/Q15 templates/interpreters/network policy and Q4 observation/computer TTL; authorize bounded E2B starts. | 31–33; S12 |
| A9 | Approve Q22 supported native/client versions and signing/store/update work; Q21 separately gates any Notto code/test copying. | Affected client releases; never a prerequisite for design-level adaptation |

Before first release, S1 must establish supported frozen-install/build evidence and S2 must exercise every affected public alias. No paid provider is necessary. S3 is introduced for real fake-provider action tests as those paths change; S7 is local parser/handoff first, with listening separately approved. S8 is a bounded continuation decision before rung 19, not a selected framework or a prerequisite for reminders/TTS.

### Protect current exposures while the ladder is pending

Planning has changed no deployed protection. F01–F04 remain source-traced release blockers until an authorized operator verifies the actual deployment, fixes or temporarily fail-closes every affected public alias, and attaches direct-call evidence. Do not wait for the full roadmap, a vendor evaluation or a giant schema migration. If permission to deploy is absent, report the unresolved exposure and requested operator action plainly; never imply a committed guard protects production. Disable the unsafe boundary, not unrelated features permanently. Selected integration writes without enforceable account/action policy stay unavailable while repaired. Advisory-matched untrusted render/ingestion paths need an applicable patched build or explicit temporary mitigation before their release (D-014, D-020, D-026).

## One release contract, scoped to the changed surface

Every rung's **Done when** includes this contract. It does not demand all live providers or all 18 spikes for every patch ([15](15-observability-and-evals.md#release-evidence-and-rollback), D-030/D-033).

1. Freeze candidate source SHA, manifest/lock/runtime, generated API/schema versions, affected clients and selected/executed/skipped tests. Required tests, auth, fixtures and commands must execute and propagate failure. Candidate smoke is separate from deployed liveness.
2. Run changed-surface lint/typecheck/tests and required dependency builds, then the affected production build. Exercise one deterministic candidate send→partial→refresh→complete plus the rung's specific journey where chat execution is affected. A docs-only/native-independent patch uses its actual corresponding contract; no universal paid canary.
3. For additive data work, deploy optional schema/indexes and compatible readers first to an authorized isolated/staged backend; verify actual validator/data compatibility and supported old readers. Enable one writer only after that proof. Do not collapse schema deployment and destructive contraction into one unobserved command. Include modular/BYOD generation and S17 only when that schema surface changes.
4. Through the existing real channel, stage the compatible backend and immutable candidate artifact. Record backend source separately if compatibility rollout uses a preceding commit. An authorized operator verifies exact artifact/source identity, required manual staged sign-in/send/refresh and environment protection, then approves promotion. Do not rebuild a substitute at promotion. CLI/native releases use their own channels; desktop automatic releases remain suspended.
5. Record the previous verified artifact/backend range, new-start kill switch, retained readers/runs/data and rollback demonstration. Rolling back a writer cannot erase new records, restore unsafe endpoints, resurrect revoked grants or replay effects. Old Runs retain their `runnerVersion`; contract schema only in a separate authorized gate.
6. For user-facing change, approve the scoped comp/key moments before building new central UI, then walk keyboard/touch/reading/focus/reduced-motion and narrow/wide/both-theme journeys. Existing small repair keeps existing design; Q2 does not block removing spoken filler. New browser/device claims require real evidence, not source comments.

### F1: Optional isolated candidate baseline

**Previously:** Existing local dependencies/dist make failures ambiguous. **Now:** We can build and test a known source candidate without touching user experiments or production.

**Proposed demo promise, not BK quote:** “The failing check tells me something about this candidate, not a stale installation.”

**Build:** S1 isolated authorized frozen install, scoped web/backend quickstart, correct package-script failure handling and explicit tracked-source gates; no application schema foundation (D-020/D-033; [15](15-observability-and-evals.md)).

**Design:** None; no product redesign.

**New unknowns:** S1/install reproducibility; S1/candidate test-auth and fake-provider wiring.

**Demo:** Build exact candidate; deliberately fail a declared command and a refresh fixture; both gates fail with useful output.

**Done when:** Source/runtime/dist provenance and executed checks are recorded; required auth cannot skip. This is the sole permitted turn without a usable product release. If it grows beyond one session, narrow the candidate seam instead of scaffolding the full platform.

**Left out:** New run tables, provider calls, optional SDK/toolchain majors and all-native builds.

## Rung 1: Skateboard — private data and paid helpers reject unauthorized calls

**Previously:** Alternate public Convex references bypass normal UI protections. **Now:** Every named P0 alias is secured or explicitly unavailable before any private read/paid call.

**Proposed demo promise, not BK quote:** “Sharing one chat does not expose my other chats or let a stranger spend my credits.”

**Build:** F01–F04 public-boundary inventory, internal trusted file/search primitives, source parent ACL and bounded authenticated retained summarization. Retire or temporarily fail-close extraction while rung 2 removes it. Include all aliases and zero-call assertions; no new tables (D-014; [13](13-privacy-safety-compliance.md#p0-endpoint-map-including-aliases)).

**Design:** Existing legitimate search/notes flow stays familiar; denied/temporarily unavailable paths give a specific error, not a misleading success.

**New unknowns:** S2/public alias visibility and legitimate caller compatibility; S2/auxiliary admission before inference.

**Demo:** Two synthetic owners and a public share; outsider/anonymous tries both search aliases, file helpers, sources and paid helpers. Then owner uses legitimate retained paths.

**Done when:** No unauthorized rows/storage/embed/model requests; legitimate supported flow works or clearly names the temporary fail-closed boundary. S1/S2 and the exact candidate/promotion contract pass. An old healthy production smoke is not proof.

**Left out:** Workflow, long-term ledger redesign, remote exploitation and every new capability.

## Rung 2a: Remove Smart Assistant entrypoints and executable source

**Previously:** The retired workspace/actions can still be reached. **Now:** The feature no longer starts work; shared voice/tasks/notes remain.

**Proposed demo promise, not BK quote:** “The meeting assistant is gone, and my tasks and voice input still work.”

**Build:** Route/nav/settings/panels/actions/prompts/model-config/exports/docs purge; move the shared deadline prompt and stop ordinary retired preference writes. Add compatible `model_recommendations` schema/readers and feature-bucket isolation without switching existing triage writers yet (D-037). Keep historical schema readers temporarily until 2b, with a named contraction condition, not a permanent feature flag (D-003/D-032; [16](16-smart-assistant-removal.md)).

**Design:** No empty retired destination or replacement meeting shell; retained work stays where it was.

**New unknowns:** S14/shared deadline/export consumers; S14/stale extraction callers and pending-job inventory.

**Demo:** Visit retired route and directly call both old functions: no provider work. Create a task with a relative deadline; transcribe a synthetic clip only with authorized transport; exercise task/note/project reads and mock recommendation opt-out.

**Done when:** Candidate source/API/export inventory has no executable meeting/transcript feature. Existing content/financial totals are untouched, stale extraction references cannot invoke a provider, and the deployed schema/readers accept the additive category while retaining old records. Existing recommendation writers still use the legacy category until rung 2; this is not full marker/schema removal. Record the remaining 2b owner and unresolved migration window in release evidence.

**Left out:** Guessed note/audio deletion and validator contraction before data migration.

## Rung 2: Stop mislabeled future recommendation accounting

**Previously:** The retired workspace is gone, but unrelated recommendation calls still write its accounting marker. **Now:** New recommendation, triage and preview calls use their own category; history remains unchanged.

**Proposed demo promise, not BK quote:** “New model recommendations no longer appear as work from the removed feature.”

**Build:** The source implementation switches existing classification, analysis and preview usage writers to the approved `model_recommendations` category after rung 2a's deployed schema/reader proof (D-037). It gates preview context reads with the existing authenticated conversation and message queries, then checks the caller's existing monthly budget before inference; a zero budget remains unlimited. Preview context uses active-branch messages when branch metadata exists and falls back to all messages for legacy conversations without active flags, before applying the existing assistant exclusion and context window. Provider selection, opt-out, collaborator access and caller cost attribution remain unchanged; no new inference path or ledger is introduced. Coordinator-owned release evidence must verify the writer/reader journey in the deployed artifact.

**Design:** Use the compatible usage views already deployed in 2a; retain historical labels rather than fabricating their original purpose.

**New unknowns:** S3/future feature-bucket isolation under existing daily aggregation; S14/no stale recommendation writer remains.

**Demo:** Fake-provider recommendation, triage and preview calls produce only the new category. Seed a legacy same-user/date/model row first, repeat with reversed insertion order, and verify its fields stay unchanged while new totals accrue correctly. Opt-out still makes no inference call.

**Done when:** Every affected future writer records the approved category through the real validator, existing rows/totals reconcile, and the exact deployed writer/reader journey passes. Action tests must show denied preview callers and over-budget owners do no provider or usage work, a zero budget still allows preview, active-branch context excludes newer discarded turns, legacy conversations retain their message context, and owners and collaborators retain access with the caller charged. No historical row is relabeled. Rung 2b remains separately incomplete. This checkout alone is not deployed-release evidence.

**Left out:** Historical task/usage mapping, old-client/BYOD contraction and unrelated per-attempt/payer accounting redesign.

## Rung 2b: Finish retirement with retained-data reconciliation

**Previously:** Stopped producers coexist with historical labels/compatibility adapters. **Now:** Supported deployments contain retained data without live retired feature fields, endpoints or adapters.

**Proposed demo promise, not BK quote:** “The purge is complete without losing my old tasks, notes or spend.”

**Build:** Q20-approved mapping, restricted dry-run manifest, bounded resumable migration, supported-client/BYOD barrier, schema/API/export contraction and removal of temporary adapters. Inventory old jobs/notification links; preserve history/research only (D-003/D-032; [16](16-smart-assistant-removal.md#migration-order)).

**Design:** Historical usage is truthfully labelled; no invented meeting-versus-recommendation attribution.

**New unknowns:** S14/retained values and twice-run reconciliation; S17/supported deployment and restore coexistence.

**Demo:** Interrupt/resume the synthetic migration, run it twice, compare IDs/counts/links/token/cost totals, then restore an older fixture through versioned preflight.

**Done when:** Authorized staged then supported deployed schema validates; exact residue checklist passes, both extraction functions absent, zero live retired values, unchanged user-content totals and documented historical exceptions. No permanent flag/tombstone remains.

**Left out:** Broad data cleanup. If Q20 is unanswered, keep this explicitly incomplete and ship independent rung 3; do not claim full purge.

## Rung 3: Read lists without synthetic announcements

**Source implementation:** The deterministic adapter no longer inserts unordered-item or nesting announcements. Ordered ordinals, task state, source mapping and typed nested-item membership remain; preparation and segment identity are versioned. This source change is not deployment or listening proof.

**Proposed demo promise, not BK quote:** “I hear the list, not an announcement before every bullet.”

**Build:** Deterministic token adapter, item/depth metadata, changed policy/mapping version and adversarial parser plus parser-to-player POST-body fixtures; retain real ordinals/task state (D-004; [11](11-rendering-and-narration.md#small-deterministic-list-change)).

**Design:** Existing play/pause/stop and source following stay familiar; no new narration mode or provider switch.

**Release checks:** Independent exact-artifact verification, deployed signed-in playback/POST sequence, and S7/authorized selected-voice joins and final sample.

**Demo:** Nested bullets, list starting at 7, checked task, author's literal “list item” and distinctive last sentence; inspect actual prepared POST sequence, then listen only after explicit call budget.

**Done when:** No generated label/empty segment, substantive content/source order/ending preserved, cancellation and cache identity remain isolated. Run source and handoff tests, then verify deployed playback and a selected-voice sample on the exact staged artifact. Ship an audio-facing claim only with the listening gate; otherwise report text/handoff-only evidence and keep release listening approval pending.

**Left out:** Full-message AI rewrite, quieter technical tables/code, unrelated audio cache flush or all rendering repairs.

## Rung 4: Tool answers retain their real values and failures

**Previously:** Tagged strings break results/citations and obsolete continuation parts trigger generic fallback. **Now:** Existing tools reach the model, database and UI through valid distinct contracts.

**Proposed demo promise, not BK quote:** “A calculation shows its value, and a failed tool is not called successful.”

**Build:** Native result preservation, typed model-output conversion, SDK6 tool-only continuation and typed artifact consumer repair; retain legacy readers as needed (D-015; [07](07-tools-and-computer.md#one-tool-execution-contract), [10](10-artifacts-and-interactions.md#current-path-and-repairs-to-preserve)).

**Design:** Existing compact tool/card/source appearance; correct content before new visual hierarchy.

**New unknowns:** S3/native-to-model adapter compatibility; S3/real schema-shaped result consumers.

**Demo:** Fake calculator success, task failure, search citation and document result, including tool-only final answer; refresh and inspect saved rows.

**Done when:** Native object survives all consumers, real SDK validator accepts continuation, failures remain failures and no regex wrapper parser proliferates. No Workflow/table redesign required.

**Left out:** Durable human waits and general artifact manifests.

## Rung 5: Retry and offline replay preserve branches

**Previously:** Old retry deletes a chronological tail and send replay can spend twice. **Now:** Retry adds a sibling; the same submitted request resolves to original IDs.

**Proposed demo promise, not BK quote:** “Trying again never deletes my other answer or sends the same turn twice.”

**Build:** DAG-target retry and stable owner-scoped request/hash dedupe across optimistic/offline/HTTP/admission; explicit failed/unsent reconciliation. Use a minimal indexed receipt or shared Run slice only if needed, never another permanent owner (D-017; [04](04-durable-generation.md#one-admission-owner)).

**Design:** Failed drafts remain editable/retryable; saved means acknowledged. Existing branches/comparison alternatives remain visible.

**New unknowns:** S3/lost-ack replay through actual queue; S3/comparison and old-branch target resolution.

**Demo:** Fail branch A, create successful B, retry A; lose send response after commit and replay with options/media intact. Reuse ID with changed payload.

**Done when:** Every original row/metadata survives; one logical submission/admission; conflicting hash rejects; optimistic phantom disappears or becomes clearly unsent.

**Left out:** Concurrent branch generation policy expansion and new queue/transport service.

## Rung 6: Every chat attempt contributes the right cost once

**Previously:** Last-step totals and stopped/error paths under-record usage. **Now:** Chat's physical calls settle independently of answer state.

**Proposed demo promise, not BK quote:** “My receipt includes the work that ran, even when I stopped it.”

**Build:** Minimum Run/Attempt/Usage slice, per-step keys, complete-dimension projections, estimated/unknown correction semantics; remove duplicate lifetime/context increment. No blanket new-domain schema (D-016; [14](14-cost-model.md#immutable-events-then-projections)).

**Design:** Small receipt marks reported/estimated/unsettled; context and monthly spend are distinct.

**New unknowns:** S3/per-request SDK usage and stop settlement; S3/idempotent aggregate/correction arithmetic.

**Demo:** Three fake priced steps, continuation, failed retry and stop; duplicate/reorder settlement; reconcile estimated amount to reported amount.

**Done when:** Sum of per-request tiered costs, once-only projection, no aggregate-plus-step/cache/reasoning double charge, retained historical totals. Canonical `attribution.kind=run` and stable physical/evidence/correction keys pass actual validators. Chat-only initial adoption does not invent auxiliary Runs; standalone writers follow the defined operation variant in rung7.

**Left out:** Live invoice certainty and standalone-operation writer adoption (rung7), not its already specified attribution contract.

## Rung 7: The admitted user's keys and instructions govern every retained call

**Previously:** BYOK settings do not control normal chat and scheduled prompt building misses custom instructions. **Now:** Explicit payer/identity reaches actual request-scoped providers and auxiliary work.

**Proposed demo promise, not BK quote:** “My selected key and instructions are actually used, including preparation calls.”

**Build:** Credential-scoped provider construction, explicit background-owner preference reads, retained auxiliary bounds/attribution and successful auxiliary image schema/startup repair. Adopt chapter02's `admittedOperations`/`operationAttempts` for standalone calls in the same usage ledger; an existing authenticated recorder may bridge an earlier repair until that writer migrates, never remain a second owner (D-016/D-035; [04](04-durable-generation.md#immutable-branch-retry-and-background-identity), [14](14-cost-model.md#actual-payer-request-scoped-credentials)).

**Design:** Missing allowed credentials yields actionable error, not silent platform fallback; image error/stop remains truthful.

**New unknowns:** S3/concurrent payer and uncached background isolation; S3/auxiliary operation identity/schema-valid successful storage.

**Demo:** Concurrent synthetic keys, no ambient auth, disabled/blank-slate instructions, missing key, nested deadline/summary and image completion/stop-before-start through real validators.

**Done when:** Actual fake request headers/instructions and ledger payer match principal; rejected calls cause no inference. Standalone summarization success/retry/stop/duplicate settlement/correction preserves exact request hash, separate physical attempts and matching reservation, with zero fake conversation/message/Run rows. Split image repair into a lettered rung before starting if the bounded implementation cannot fit this session; the attribution contract is already specified, not a new policy decision.

**Left out:** New providers or silently broadened BYOD privacy promise.

## Rung 8: Stop and recovery cannot corrupt another run

**Previously:** Fixed-age locks, chunk-only cancellation and late enrichment permit overlaps or state reversal. **Now:** Owned progress/cancel/settlement fences keep saved outcomes truthful.

**Proposed demo promise, not BK quote:** “Stop prevents new work, preserves what happened and never damages the next answer.”

**Build:** One minimal admission/lifecycle owner across existing entries, leased epoch/heartbeat, independent silence/abort, monotonic terminal claim, separate enrichment and preserved tool-effect receipts (D-017; [04](04-durable-generation.md#states-leases-and-terminal-fences)).

**Design:** Quiet actual phase and stop state; no rollback claim or client-age failure.

**New unknowns:** S3/alternate admission/lease races; S3/silent operation cancellation and late outcomes.

**Demo:** Healthy stream past 61 seconds; stop silent provider; start B; deliver A's stale finish/recovery/tool events; fail enrichment after completion.

**Done when:** No second unintended admission, B lock/content untouched, completed answer stays complete, cancelled partials/usage/effects retained. Unknown remote outcomes do not replay.

**Left out:** A selected durable workflow or transparent crash recovery of arbitrary effects.

## Rung 9: Search, REST lists and shared payloads match their contracts

**Previously:** REST archived argument fails validation, vector hits are unhydrated and shares return internal/full-tree records. **Now:** Supported clients get complete authorized data and bounded public projections.

**Proposed demo promise, not BK quote:** “Search and archived lists work, and a share exposes only what I chose.”

**Build:** Real-validator archive semantics/OpenAPI/SDK parity, authorized bounded vector hydration and allowlisted share DTO; settle selected-path/snapshot Q5 before widening/changing sharing (D-022/D-031; [13](13-privacy-safety-compliance.md#public-sharing-is-a-separate-projection)).

**Design:** Existing search/list/share surfaces; no new navigation. Sensitive internal fields never appear in network payloads.

**New unknowns:** S2/actual route/SDK/vector contracts; S2/legacy share compatibility under approved projection.

**Demo:** Normal/archived/project list through SDK, vector-only hit with {_id,_score}, public share containing seeded private fields/inactive siblings.

**Done when:** Correct hydrated results/filters and envelopes, no private field leakage or revoked-share bytes; old clients have compatible supported projection.

**Left out:** New search engine and password-share bypass.

## Rung 10: Delete and incognito expiry erase the same owned data

**Previously:** Incognito/CLI cascades and unmounted local caches retain children. **Now:** Every supported deletion follows one reference-safe policy.

**Proposed demo promise, not BK quote:** “An expired private chat does not linger in hidden rows or my offline cache.”

**Build:** Shared web/REST/CLI/incognito cascade, explicit erasure signal, durable-cache incognito exclusion, late-worker fences and bounded deletion as needed; Q4 policy first (D-022; [02](02-data-model.md#acl-deletion-and-retention), [13](13-privacy-safety-compliance.md#cache-and-deletion-need-the-same-owner)).

**Design:** Existing delete confirmation distinguishes visible deletion from pending processor cleanup; archive/filter is not erasure.

**New unknowns:** S17/reference-safe child/blob erasure; S2/offline unmounted-cache reconciliation.

**Demo:** Delete from CLI/expire while detail unmounted; another client offline reconnects; delayed worker returns; shared blob has a surviving authorized owner.

**Done when:** Intended children/private cache gone, independent authorized content retained, no resurrection or universal-backup-erasure claim. Actual staged schema evidence only if tombstones/batching are added.

**Left out:** Deleting unrelated notes/files and undisclosed backup purge.

## Rung 11: Markdown safety and math do not change with answer length

**Previously:** Plugin replacement omits sanitize/math and worker HTML removes interactive semantics. **Now:** One tested safe block contract covers short/long/stream/completed text.

**Proposed demo promise, not BK quote:** “The same answer remains readable and safe when it finishes.”

**Build:** Explicit sanitize/protocol/image policy, wired math/chemistry with narrow trust, strict bounded diagrams, static-only worker fallback or typed parity; preserve React controls (D-020/D-022; [11](11-rendering-and-narration.md#one-semantic-rendering-contract)).

**Design:** Familiar answer/theme, raw source fallback; no flashing length-triggered product change.

**New unknowns:** S6/real parser/plugin policy; S6/worker/diagram/math parity.

**Demo:** Same hostile and ordinary fixtures at 4,999/5,000/5,001 units, random partial delimiters, worker timeout and completion; intercept network requests.

**Done when:** No unauthorized execution/request, math/source recoverable, controls retained and current content not overwritten by stale render. Apply narrow rendering security maintenance first where required.

**Left out:** Shiki4/performance claims and general HTML artifact execution.

## Rung 12: Code and citations are usable with keyboard and touch

**Previously:** Wrap is inert, copy failures/hover controls are inaccessible and citation targets do not exist. **Now:** Controls change the real content presentation and reach the right source.

**Proposed demo promise, not BK quote:** “I can copy exact code and open the source this answer actually cites.”

**Build:** Real wrap/raw-copy/error handling, fenced-block parsing, per-message source map/expansion/focus, valid complete-color-token consumption and selection dismissal fix (D-023/D-033; [11](11-rendering-and-narration.md#reading-source-navigation-and-controls)).

**Design:** Scope comp to code header/source disclosure; visible focus/coarse-pointer controls, no extra editor on ordinary fences.

**New unknowns:** S6/code/source control handoff; S6/focus/native-selection preservation.

**Demo:** Unlabelled/tilde/c++ fence, denied clipboard, long unbroken line, two collapsed [1] citations and short/cross-message selection.

**Done when:** Copy bytes are exact, wrap changes layout, correct authorized source opens/focuses and native selection/focus remain usable in both themes/narrow widths.

**Left out:** Global virtualizer replacement or renderer benchmark claims.

## Rung 13: Reading survives scrolling, streaming and remounts

**Previously:** Pagination/follow/shortcut/announcer owners disagree. **Now:** Reader intent controls the viewport and completion is announced once.

**Proposed demo promise, not BK quote:** “I can read or select earlier work without the answer pulling me away.”

**Build:** Actual scroll-root pagination, one follow/reading/selection owner per mode, element-aware bindings, row-mounted action focus, status-transition announcer and bounded grapheme/final flush; stable view/config/cache identity. Measure before optimizing (D-011/D-023/D-033; [11](11-rendering-and-narration.md#scroll-selection-and-keyboard)).

**Design:** Scoped reading/key moments and restrained persisted work disclosure; Notto invariant adaptation only under Q21.

**New unknowns:** S6/499→500-group focus and anchor transitions; S16/stream/replay/full-tree cost baseline.

**Demo:** Prepend, compare streams, delayed math/images, keyboard PageUp, selection, mobile keyboard/IME, reduced motion, virtual-row remount and same-ID completion.

**Done when:** Recorded anchor/selection/focus survives, no eager-load loop/duplicate speech, terminal text fully flushed. Publish measured baseline and only justified bounded memo/worker/cache fixes; no unmeasured speed claim.

**Left out:** Mandatory plan rail, wholesale UI library/compiler adoption and arbitrary threshold tuning.

## Rung 14: The context meter describes the next request

**Previously:** Lifetime/all-branch accounting controls send and model switching. **Now:** Exact serialized target input and reserves determine fit.

**Proposed demo promise, not BK quote:** “The context warning tells me whether this request fits this model.”

**Build:** Ephemeral ContextPlan, target serialization, replace-only occupancy and hard guard including media/tools/new turn, output/reasoning/safety/tool growth and each continuation (D-018/D-035; [05](05-context-and-caching.md#one-server-owned-request-planner)).

**Design:** Compact active/usable input with approximate marker, selected model/output reserve disclosure and useful oversize next action.

**New unknowns:** S4/serialized multimodal/tool counting bounds; S4/model-switch and next-step fit.

**Demo:** Huge inactive sibling, small active path, giant attachment/tool result and smaller target switch; inspect real fake-provider request.

**Done when:** Only authorized selected input counted once, actual dispatch fits or refuses before inference, unknown count not zero; original history remains readable.

**Left out:** Automatic summary and provider-native state.

## Rung 15: Continue with a branch-aware portable checkpoint

**Previously:** Compaction summarizes all branches/first characters into another chat. **Now:** Explicit preparation preserves this conversation and audited source coverage.

**Proposed demo promise, not BK quote:** “Earlier constraints and my latest correction survive preparing a long chat.”

**Build:** Immutable contextCheckpoints, selected ancestry/atomic tool groups, bounded summarizer/schema/coverage, exact retained tail, publication CAS and prior-pointer recovery (D-018; [05](05-context-and-caching.md#immutable-checkpoint-plus-recent-tail)).

**Design:** View summary/covered range/originals, no forced navigation or summary presented as new factual answer.

**New unknowns:** S4/constraint/correction/source fidelity; S4/lease/branch/cancel publication races.

**Demo:** Old requirement, late correction, inactive secret, complete tool pair; duplicate request and branch edit during fake summary.

**Done when:** One validated fitting checkpoint, originals unchanged, no inactive source/leaked authority/dangling pair; failed/stale preparation leaves usable prior state.

**Left out:** Default automatic trigger and perfect semantic-preservation promises.

## Rung 16: Prepare context automatically near 80% usable input

**Previously:** User must trigger the repaired checkpoint. **Now:** Server admission/continuation prepares it before exceeding the reviewed budget.

**Proposed demo promise, not BK quote:** “A long task prepares its context without moving me to a new chat.”

**Build:** Q6-approved approximate threshold/default/tail and hysteresis, growth preflight, bounded retry/no-progress behavior under existing Run phases (D-005/D-018; [05](05-context-and-caching.md#trigger-concurrency-and-recovery)).

**Design:** Quiet Preparing context row; same draft/URL/anchor, recoverable retry/cancel/hard-fit choices.

**New unknowns:** S4/threshold and tool-growth policy; S4/durable trigger/hysteresis failure behavior.

**Demo:** Boundary below/at trigger, large next tool growth, two clients, summary timeout and stop; browser closes before completion.

**Done when:** One server-owned preparation, fitting continuation, no repeated no-progress summaries, no silent last-30 fallback. Default remains gated until approved fidelity/latency evidence.

**Left out:** Provider-native compaction/long TTL experiments.

## Rung 17: Stable prompts and honest cache receipts

**Previously:** Fresh early datetime and unqualified cache fields obscure cache behavior. **Now:** Deterministic authorized prefixes and measured token categories explain actual reuse.

**Proposed demo promise, not BK quote:** “Cache optimization never reuses stale instructions or another user's private context.”

**Build:** Stable versioned prompt/tool ordering, changing suffix, scoped identity and per-route cache usage/write/iteration normalization; start supported implicit/short-lived behavior (D-005/D-018/D-034; [05](05-context-and-caching.md#cache-layout-within-current-authority), [14](14-cost-model.md#price-nonoverlapping-units)).

**Design:** On-demand reported cache/cost receipt; no fabricated warm-cache badge or percentage saving.

**New unknowns:** S18/selected locked adapter wire forwarding; S18/scoped nonoverlapping cache pricing/invalidation.

**Demo:** Fake appended requests retain stable prefix; edit/revoke changes identity; raw provider fixtures normalize reads/writes/iterations once. Any real cold/warm test has separate Q3/Q7/Q8 approval.

**Done when:** Actual body and ledger fixtures agree, no permission retained for a hit; unknown fields remain unknown. Record real results if authorized, otherwise no realized-savings claim.

**Left out:** New paid cache objects/extended TTL/native signed history by default.

## Rung 18: Auto and recommendations use one eligible catalog

**Previously:** Classifier accounting/bypass/fallback ignore real requirements. **Now:** Manual intent and repaired deterministic selection obey the same executable model policy.

**Proposed demo promise, not BK quote:** “Auto picks a capable allowed model, or tells me why none can run.”

**Build:** Typed embedding accounting, canonical catalog snapshot, local constraints before embeddings, real ContextPlan demand/MIME/risk composition, consumed examples/prior-route propagation and universal fallback eligibility; recommendation server opt-out (D-009/D-019/D-035; [06](06-model-routing.md)).

**Design:** Actual model and optional Why this model, not candidate contest/uncalibrated correctness score; existing preference controls retained.

**New unknowns:** S5/catalog-to-executor eligibility; S5/stateful/direct-only fallback and recommendation behavior.

**Demo:** Excluded default, image versus document, tool/schema demand, classifier outage, zero pool, manual model, prior-label follow-up and recommendation disabled; fake adapters only.

**Done when:** Zero policy violations, no surprise auxiliary call, deterministic reason/identity and preserved cost/partial/effect facts. Optional learned/hosted comparison is a later evidence branch, not this release's promise.

**Left out:** Online bandit, universal quality cascade, vendor upload or fixed savings promise.

## Rung 19: Answer a durable question and resume once

**Previously:** Clarification returns text/spans and does not park execution. **Now:** One authored card survives refresh and one accepted response continues the same Run.

**Proposed demo promise, not BK quote:** “I can come back to the question later without restarting completed work.”

**Build:** Complete bounded S8 decision first; choose explicit Convex continuation or demonstrated Workflow, not wholesale runtime rewrite. Add interactions, saved boundary, optional messages.runProjection and recovery/client capability guard; one answer/resume CAS (D-010/D-021/D-025; [04](04-durable-generation.md#durable-park-and-resume), [10](10-artifacts-and-interactions.md#questions-and-approvals)).

**Design:** Q2-approved single/multiple/text controls outside Activity, paused state, acknowledgement/inline errors/Stop; one semantic announcer. Add CLI read/watch/clarification and native safe handoff as needed, not a new TUI.

**New unknowns:** S8/bounded park-resume and crash boundary; S15/supported wait projection and answer receipt.

**Demo:** Fake two-step task asks, all tabs close, two clients answer, losing/expired/stopped request cannot resume; prior tool effect count unchanged.

**Done when:** No action held open, one answer/resume admission, wait survives ten-minute legacy recovery, old clients cannot authorize or falsely complete. Keep saved boundary/responder on rollback.

**Left out:** Whole agent engine migration and live write approvals.

## Rung 20: Open and edit the exact artifact this answer created

**Previously:** Canvas mode/first-active identity makes documents unreliable. **Now:** A normal turn creates a version-pinned document/code artifact with safe editing/export.

**Proposed demo promise, not BK quote:** “This card opens that answer's saved version, and my edits are not overwritten.”

**Build:** One artifact owner migrating canvas/history, explicit message/revision refs and base-revision CAS, durable draft/status/operation receipt, normal-mode safe tool availability. Preserve recoverable legacy content/unknown provenance (D-008/D-024; [10](10-artifacts-and-interactions.md#artifacts-as-ordinary-answers)).

**Design:** Artifact hero and shared revision marker, Preview/Source/Versions/Export, mobile full-screen Back and CLI exact-source export; Q2/Q4/Q5/Q22 gate enablement.

**New unknowns:** S9/canvas mapping and one-writer coexistence; S9/idempotent revision/conflict journey.

**Demo:** Two artifacts, v1 card after v3, human save after producing Run terminates, user-agent concurrent edit, lost commit acknowledgement and refresh/stop while draft updates; late agent write still rejects.

**Done when:** Correct historical bytes, one committed revision per operation, losing edit retained, authorized read/export and narrow return focus. Source/owned image/file references use the same manifest, no new spending pathway.

**Left out:** HTML execution/public publication or invented old message associations.

## Rung 21: Receive a static visual HTML answer

**Previously:** An HTML code file has no general visual preview. **Now:** A normal eligible turn can answer with an isolated static HTML/CSS visual.

**Proposed demo promise, not BK quote:** “A visual explanation is easier to inspect than another wall of prose.”

**Build:** Q23/A6-approved private preview delivery, fragment allowlist, trusted header policy, opaque sandbox, no scripts/forms/navigation/external resources, bounded source/text/export fallback (D-008/D-024; [10](10-artifacts-and-interactions.md#static-html-isolation)).

**Design:** Approved wide/narrow visual/source/error key moments; artifact stays outside Activity and manual close is respected.

**New unknowns:** S9/private delivery/direct-navigation isolation; S9/static browser egress and resource corpus.

**Demo:** Create request-path visual in normal chat, refresh/open pinned version on narrow/wide, inject script/meta/CSS/link attempts, fail preview and export exact source.

**Done when:** Real Chromium/Firefox/WebKit tests show no unauthorized execution/navigation/requests; text/source remains useful. If hosting gate is unmet, ship source-only under rung 20 and mark this preview rung incomplete.

**Left out:** Arbitrary JS, CDN/runtime installs and claimed universal offline browser sandbox.

## Rung 22: Add a private text skill and use it directly

**Previously:** Developer skills are not a user library. **Now:** The user can add/review/publish a bounded instruction package and explicitly invoke its pinned version.

**Proposed demo promise, not BK quote:** “I can teach this repeatable approach once and ask for it by name.”

**Build:** Q11/Q12-reviewed private versions/files/bindings/import boundary, safe editor/folder/ZIP validation, immutable review/publication, shared /skill picker, progressive resource reads. Limit initial package to text/references; scripts inventory is inert (D-007/D-027; [08](08-skills.md)).

**Design:** Library with readable instructions/provenance/errors and exact version chip; no computer spinner or hidden package body in shared chat.

**New unknowns:** S11/package/path/YAML/archive validation; S11/pinned explicit invocation and owner isolation.

**Demo:** Add tiny safe package, reject traversal/secret/oversize fixture, review exact bytes, select it, answer, refresh and revoke. Text-only flow makes zero E2B calls.

**Done when:** Current owner alone reads/publishes/uses version, edits invalidate review, required source remains faithful across context changes. If implementing ZIP extraction exceeds the session, ship editor/folder first and insert 22b for ZIP; do not weaken validation to keep a date.

**Left out:** Remote marketplace/Git fetch, automatic discovery and script execution.

## Rung 23: Enable relevant skills automatically without widening authority

**Previously:** Skill use requires direct selection. **Now:** Owner-enabled published versions can be selected when relevant.

**Proposed demo promise, not BK quote:** “The agent finds an enabled skill when it helps, and ignores it when it does not.”

**Build:** Separate automatic_and_explicit binding, deterministic scoped catalog, live activation check, dedupe/resource/version/context/cache provenance and conflict/blocked handling (D-007/D-027; [08](08-skills.md#explicit-and-automatic-use)).

**Design:** Quiet Used skill vN/reason; discoverability toggle and scope in library, not confirmation spam.

**New unknowns:** S11/positive-versus-decoy selection; S11/scope precedence/context reload and revoke.

**Demo:** Relevant task, near-match, explicit-only model bypass, duplicate name, conflicting skills, unreviewed v2, smaller-model switch and compaction reload.

**Done when:** Only eligible owner-enabled pins activate, no silent version/capability upgrade, false positives/negatives recorded; irrelevant task creates no machine.

**Left out:** Training from private traffic or automatic package publication.

## Rung 24: Ask the agent to draft a reusable skill

**Previously:** Users author/import packages themselves. **Now:** A tool captures a selected procedure into the same reviewed private draft workflow.

**Proposed demo promise, not BK quote:** “Save this approach as a draft I can inspect before using.”

**Build:** proposeSkill/revise draft, selected branch/source hashes, placeholders/secret blocking, same validator/review and explicit publish/binding; auxiliary calls charged (D-012/D-027; [08](08-skills.md#agent-created-skills-capture-the-procedure-not-the-secrets)).

**Design:** Purpose/source selection and exclusions first, instruction/file diff and Publish/Edit/Discard; suggestions are nonpersistent unless Q13 approves otherwise.

**New unknowns:** S11/procedure extraction versus private-content retention; S11/draft revision/publication races.

**Demo:** Select workflow turns, exclude sibling/customer secret, create/revise draft, cancel/retry, inspect exact bytes and publish; model cannot publish itself.

**Done when:** No hidden transcript harvesting, secrets removed/blocked, source ACL and retention apply, unreviewed draft absent from activation and no host prompt/skill edits.

**Left out:** Unsolicited persistent drafts, autonomous self-modification or script permission.

## Rung 25: Review a schedule without starting it

**Previously:** Legacy scheduledPrompts rows have no audited active runner. **Now:** Conversation/management can save a validated unarmed schedule and preview exact future times.

**Proposed demo promise, not BK quote:** “I can see exactly what would run and when before I arm it.”

**Build:** Owner drafts/immutable versions, Q16 recurrence/zone/gap/fold/month-day rules and next-five preview, review hashes/nonces; legacy rows become unarmed reviewed inputs only (D-013/D-029; [12](12-schedules.md#deterministic-time-and-reviewed-preview)).

**Design:** Task/timezone/next offsets primary, unsupported send clearly stated, Edit/Cancel and explicit unarmed status.

**New unknowns:** S13/bounded local-time resolver; S13/exact-version preview/review identity.

**Demo:** UTC/DST/non-hour/half-hour/date-line fixtures, once/month31/gap/fold; edit revision and attempt stale confirmation. No paid call or firing.

**Done when:** Impossible slots are bounded recurrenceDiagnostics, never fabricated scheduledFor; reminder needs no fake Run; direct-management nonce does not fabricate Interaction. Legacy active flag grants nothing.

**Left out:** Reminder delivery, live model job, raw cron/RRULE and precise-minute SLA.

## Rung 26: A reviewed reminder arrives with the browser closed

**Previously:** Schedules are reviewable drafts only. **Now:** A confirmed reminder delivers one in-app occurrence with pause/revoke/history.

**Proposed demo promise, not BK quote:** “Remind me at that reviewed time, even when this tab is closed.”

**Build:** Confirm consent+one wake-up transaction, occurrence/delivery keys, skip/misfire/overlap policy, reconciliation and global execution pause; Q3/Q16/Q17 configured limits (D-029; [12](12-schedules.md#arm-fire-revalidate-settle)).

**Design:** Scheduled receipt and View/Pause; history distinguishes calendar diagnostic, skipped and delivered. No success toast before durable delivery.

**New unknowns:** S13/wake-up/occurrence dedupe and stale callbacks; S13/delivery retry and downtime reconciliation.

**Demo:** Confirm, close client, advance fake clock; duplicate callback, pause/edit/revoke race and notification retry. Open result without reexecuting.

**Done when:** One reviewed occurrence/notification, no model/compute calls, no historical catch-up burst, paused future callback no-op. Authorized real-channel dummy reminder verifies server-owned delivery.

**Left out:** Agent jobs, email/push, Workflow prerequisite and unattended writes.

## Rung 27: A scheduled read/draft task returns a saved result

**Previously:** Only reviewed reminder text fires. **Now:** Each approved occurrence admits one bounded shared Run over pinned inputs/skills.

**Proposed demo promise, not BK quote:** “My scheduled task brings back a draft, not permission for hidden actions.”

**Build:** Q3 numeric reservations and Q17 read/draft consent, explicit background owner, pinned versions/current ACL, one occurrence→Run, owner-only output conversation, safe continuation and delivery-only retries (D-013/D-029; [12](12-schedules.md#revalidation-is-continuous)).

**Design:** Exact occurrence result/output/receipt, relevant blocked dependency action and visible wait; no interruption of live interactive branch.

**New unknowns:** S13/occurrence admission under current policy/budget; S13/pinned dependency revocation and output/delivery separation.

**Demo:** Fake scheduled brief uses selected owned text/skill; two-step pause-future-only/edit retains the reviewed second step with zero later admissions; Stop/Revoke prevents that step. Revoke skill/input, expire consent, race budget; notification fails after successful output.

**Done when:** One charged bounded Run/output, denied dependency prevents dispatch, notification retry does not regenerate. Connections are allowed only after rungs 28/29 and must use reviewed scheduleVersionConnections pins/consent, never output-chat selection.

**Left out:** Computer allocation, recursive schedule/skill mutation or unattended consequential effects.

## Rung 28: Connect, reconnect and disable the intended account

**Previously:** Reconnect can overwrite working identity and revoke loses cleanup. **Now:** One selected account has durable verified attempts and honest cleanup.

**Proposed demo promise, not BK quote:** “Cancelling reconnect keeps my old account, and disconnect tells me what remains to clean up.”

**Build:** Existing Composio boundary first: server callbacks/config/scope allowlist, separate auth attempts/cap reservations/state consumption, active-account promotion and revision, outbox/cleanup; safe callback logs. Q9/Q10 select one sandbox app, not whole catalog migration (D-026; [09](09-integrations.md#records-lifecycle-and-auth-attempts)).

**Design:** Account/scopes/processor and pending/verified/disabled-cleanup states, mobile auth return/handoff matching same attempt.

**New unknowns:** S10/exact auth/account lifecycle; S10/revoke/outage/reconnect identity and cleanup.

**Demo:** Fake broker first; separately authorized sandbox OAuth success/cancel/replay/two accounts; disconnect during provider outage then reconcile. No send.

**Done when:** Active ID preserved until verified replacement, remote IDs retained, state single-use, caps transactional, grants/sessions invalidated on revision change. Native callback has its own real-device gate, otherwise explicitly unavailable.

**Left out:** General tool discovery, vendor migration or claims upstream grants/logs were universally erased.

## Rung 29: Read from that account and draft locally; compare the challenger

**Previously:** Account lifecycle is sound but arbitrary discovered operations are not authorized. **Now:** A small reviewed read catalog returns bounded provenance and a local draft.

**Proposed demo promise, not BK quote:** “Use this account for this chat, read this item and draft a response here.”

**Build:** Exact account/revision dispatch, small stable action/schema/resource allowlist, typed errors/cursor/result artifacts/context budgets and cancellation/unknown receipts. S10 compares same deterministic fixtures for Composio/Nango; other vendors only for named gaps (D-009/D-026; [09](09-integrations.md#adapter-and-dispatch-contract)).

**Design:** Per-chat default-off account selector, result/source/local draft primary, tested-action labels instead of catalog promises.

**New unknowns:** S10/exact-account bounded read/local-draft journey; S10/challenger fit on approved workflow and terms.

**Demo:** Seeded item, wrong account/user, revoked-after-build, large pages, structured failure and injected send instruction; draft exists only in app.

**Done when:** Only granted reads execute, zero external draft/send/write, result fits next request, provider choice recorded from evidence or deferred. Migration if chosen needs an additional lettered opt-in reconnect/canary release, never token-row copying.

**Left out:** Provider-side draft creation, sending and silent cross-account/provider fallback.

## Rung 30: Review one exact connector effect before dispatch

**Previously:** Integration work stops at local draft. **Now:** One separately enabled sandbox effect can be allowed once or denied with a truthful receipt.

**Proposed demo promise, not BK quote:** “Nothing is sent until I approve this account, destination and exact content.”

**Build:** Shared approval Interaction, canonical content/attachment/account hashes, atomic grant consumption/effect intent, live recheck and endpoint-specific idempotency/reconciliation. Q3/Q8/Q9/Q10 plus explicit real-effect authorization required (D-025/D-026; [10](10-artifacts-and-interactions.md#approval-request), [09](09-integrations.md#benchmark-migration-and-rollback)).

**Design:** Q2-approved full effect preview, Send once/Don't send, approved-not-started distinct from sent; complete web review handoff if client lacks full surface.

**New unknowns:** S10/exact operation approval and changed-payload races; S10/remote-success/lost-ack reconciliation.

**Demo:** Mock transport denial/expiry/changed recipient/replay/two tabs, then separately authorized one allowlisted sandbox effect. Lose ack and restart; no automatic resend.

**Done when:** Zero unapproved/cross-account/duplicate logical dispatches, known success has provider receipt, uncertainty remains actionable. A disabled real-send button is a valid intermediate demonstration, not a completed live-effect release.

**Left out:** Persistent Always allow, scheduled writes, arbitrary service actions and GUI commits.

## Rung 31: Existing E2B analysis has owned, bounded execution

**Previously:** Stateless Python/JS exists without durable owner/compute admission/cancel. **Now:** Selected-file analysis keeps its compatible behavior under proven limits and cleanup.

**Proposed demo promise, not BK quote:** “Run this analysis in a clean bounded environment and keep its output.”

**Build:** S12 version/template/bundling proof, trusted gateway operation/ticket, minimal computer intent/session/lease/reservation, native output/owned artifact export, process cancel/terminate and usage. Keep Next proxy until direct bundling proved (D-006/D-028; [07](07-tools-and-computer.md#e2b-runtime-and-gateway)).

**Design:** Analysis result stays primary, start only after actual admission, Stop and cleanup status; no live viewer.

**New unknowns:** S12/current gateway/SDK/template compatibility; S12/owned allocation, cancel/export/compute settlement.

**Demo:** Fake create-success/lost-ack, two workers, timeout/child process, safe plot/file and export escape; then approved bounded dummy-data code run with actual resources recorded.

**Done when:** One reconciled machine per intent, hard policy configured before start, only selected inputs, owned outputs survive kill, no orphan concealed. Lifecycle event identity dedupes cost; raw URLs/secrets absent.

**Left out:** Persistent desktop, arbitrary skill scripts, network or credential injection.

## Rung 32: Run one reviewed skill script offline

**Previously:** Skill scripts are visible but inert. **Now:** A pinned published file can process selected inputs in a separate clean offline code machine.

**Proposed demo promise, not BK quote:** “Use this reviewed script without access to my host, secrets or other files.”

**Build:** Q14 approved interpreter/prebuilt dependency policy, immutable file/hash/structured args, isolated staging/export/no-follow boundary, bounded children/time/bytes and cancellation; shared skill/Run/Artifact/Usage identities (D-027/D-028; [08](08-skills.md#agent-created-skills-capture-the-procedure-not-the-secrets), [07](07-tools-and-computer.md#computer-and-script-inputs)).

**Design:** Exact script/version/input review and compact saved-output card, clear compatibility/denied requirement; no unexplained machine on text activation.

**New unknowns:** S11/pinned script authorization and compatibility; S12/offline isolation and hostile filesystem export.

**Demo:** Safe fixture generates CSV; hostile sibling script tries host/network/secret/install/symlink swap and long child process; stop and refresh.

**Done when:** Only approved bytes/inputs execute, no host mount/secret/network/runtime install, process stopped or environment terminated, exact output retained and compute/usage attributed.

**Left out:** Scripts in authenticated/writable desktops and automatic dependency installation.

## Rung 33: Work in a clean remote desktop and return a saved result

**Previously:** Only clean code execution is enabled. **Now:** A bounded local desktop task observes/acts under one fenced controller and returns an owned artifact.

**Proposed demo promise, not BK quote:** “Use a clean remote computer for this file task, and show me what was saved.”

**Build:** Q15-approved offline local task/template, pinned model adapter and fresh image observations, validated action union/epoch, private screenshot polling first, expiry/pause/resume/terminate reconciliation; shared output/approval/run owners (D-006/D-028; [07](07-tools-and-computer.md#session-and-action-state-machines)).

**Design:** Computer separate from Artifact, actual observed state/last image/task/Stop, narrow full-screen Back; no writable VNC disguised as viewer.

**New unknowns:** S12/desktop initialization and observation/action adapter; S12/fenced lifecycle/privacy/cleanup under crash and pause failure.

**Demo:** Approved dummy file opens in pinned local app, bounded task saves output; refresh, stale worker, pause/resume/disk-only fallback, cancel and delete. Verify unauthorized screenshot/control denial.

**Done when:** Output is saved/authorized independently of VM, one writer, stale action refused, actual resources/cost/cleanup evidence recorded, no indefinite paused retention. A lost action ack is uncertain, not re-clicked automatically.

**Left out:** Public/authenticated browsing, credentials/purchases/GUI commits, snapshots/forks, manual takeover and live VNC. Public-web tasks require a separate lettered release after Q15/S12 prove destination/egress semantics; offline desktop completion grants no network authority.

## Maintenance releases are small cohorts, not another rewrite prerequisite

These are release **recipes to instantiate beside the nearest affected rung**. Assign stable letters when scheduling, such as 4b for AI6 maintenance; do not interpret the table as permission to apply every update in one session. Each instance inherits the complete release contract and scoped design gate, has at most the two named unknowns, and must leave a working product. Before/after is an unchanged user journey running on the reviewed patched/supported cohort; its proposed demo promise is “The same task still works on the supported patched build,” not a BK quote (D-020/D-030/D-031).

| Cohort / timing | Build, design and exact demo/done | At most two new unknowns | Left out |
|---|---|---|---|
| Next/analyzer security, as soon as a fixed stable pair is verified | Exact applicable patched Next 16/analyzer pair, lock/advisory recheck and candidate sign-in/send/partial/refresh/render journey. Verify the existing deployment/promotion protections; UI unchanged. If no applicable fix is published, document the affected boundary and authorized temporary mitigation. | S1/fixed release and nested graph; S1/candidate build and deployed compatibility | Invented patch version, framework rewrite or claiming 16.4.4 closes the announced fixes |
| AI6/provider security, before broad tool enablement | Exact then-current stable AI6/provider/OpenRouter2 compatible graph; fake multi-step/tools/abort/usage plus refreshed durable answer. Verify provider-utils affected copies eliminated; UI unchanged. | S1/parent/nested graph; S3/provider wire/usage behavior | AI7, Tavily peer forcing, runtime swap |
| Mermaid/security sanitizer, urgent affected renderer release | Verified patched 11.x, explicit strict config and hostile/ordinary diagram fixtures; same source/control/download journey, no unauthorized requests. | S6/diagram graph/API; S6/SVG/policy behavior | Mermaid 12/new render stack |
| KaTeX integration, separate session | Tested 0.18 lineage with Tiptap/rehype nested graph, chemistry/MathML/worker fixtures; equation/copy/fallback stays useful. | S1/nested peer graph; S6/math semantics | Forced 0.19/all overrides |
| Document ingestion parent migration, separate from math | Format-reachable parser/yauzl/file-type fix or explicit bounded disabled path, hostile-size/format and actual selected-file retrieval demo. | S1/consumer/runtime API; S2/parser resource/reachability | Global CJS→ESM transitive override |
| Telemetry/build transitives, one owning parent per instance | Applicable fflate/OTel/protobuf/Babel/diff/esbuild/fast-copy/selector/glob parent fixes; real parent contract and no leaked sentinel, re-audit exact graph. Deepmerge/minimatch/stream-json ambiguity remains tracked unless proved. | S1/affected nested edge; owning build/telemetry behavior | Declaring every feed hit exploitable or latest fixed |
| Node/Bun alignment, then separate Biome/Turbo/test-browser cohorts | One instance per runtime or tool family: frozen macOS/Linux, actual package builds/CLI shutdown; or lint diagnostics; or pinned affected selection; or matching Playwright browser fixtures. Demonstrate deliberate failure remains fatal. | S1/selected tool compatibility; S15/affected client/runtime only | Bulk format rewrite, all tools latest |
| Web React pair / Convex+helpers+test / Query cohort / Tiptap cohort | **Four independent instances**, each same retained send/refresh or relevant persistence/editor journey; exact runtime/codegen/auth/peer/built-export checks. Compatible backend/readers first if needed. | S1/selected cohort graph; its S3/S6/S15 journey | Elective major/framework/React Compiler adoption |
| Mobile SDK54 maintenance | Exact published SDK54 map, Metro React resolution, Reanimated/Worklets compatible pair and matching rebuilt iOS/Android dev clients; keyboard/gesture/chat/kill-reopen demo. Both native builds recorded, no unavailable-host skip called pass. | S15/Metro/native graph; S15/device lifecycle | Expo55–58 in same session |
| Mobile recording migration | Expo Audio consumer/config migration; permission-denied/record/stop/interruption/upload-to-fake-transcription/insert intent on device. Preserve shared voice after retirement. | S15/native audio API; S15/background/permission behavior | Paid transcription by default or deleting voice |
| Clerk Core3 | **Separate compatible web/backend then mobile instances** with an explicit mixed-reader/token policy; login/logout/JWT/refresh/offline/deep-link/session restore demos; old internal overrides removed coherently. If mixed version unsupported, resolve compatibility in a bounded spike before either ships. | S15/token/provider compatibility; S15/platform callback/restoration | An untested all-client auth flip |
| Existing CLI compatibility / new command increments | First retained SDK/RPC/envelope/retry/delete tests; later small show/watch/answer or exact-export command set alongside its domain rung. Actual built subprocess help/output/exits and real terminal wait/error demo; ship agent CLI guidance only with implemented commands. | S15/subprocess/codec contract; S15/auth/reconnect/reader barrier | New TUI, undocumented global flags/automatic terminal approval |
| Desktop shell hardening; distribution remains separate | First synthetic origin/deep-link/log/IPC/main-companion state tests on native shell; no host bridge. A later separately authorized signed build/finalization/updater/rollback instance must pass before automatic-release resumption. | S15/shell route/capability; S15/signed distribution only when requested | Silent release unsuspension, sidecar/host automation |

Every raw dependency advisory action belongs to one of these owning-parent cohorts or an explicitly tracked applicability question in [research](../research/modernization-review.md#upgrade-compatible-cohorts-instead-of-everything). The observed Next 16.4.4 excludes the announced November 3 fixes: recheck the actual fixed stable Next/analyzer pair immediately before selection; never invent 16.4.5 or claim closure from age/latest alone. Native Rust/CocoaPods/Gradle/vendor xlsx provenance was not fully audited and needs separately scoped evidence before claims.

Elective AI7, direct Google/Anthropic client API migrations, TS6→7, Shiki4/code-plugin, Vitest5/Vite8, Table9/Compiler, tsup9 and Expo55→58 remain **independent evidence branches**, not core-ladder prerequisites. Each accepted branch gets its own lettered one-session release with exact consumer tests, compatible rollback and no third unknown; Expo advances one published SDK/binary cohort at a time. S5 optional learned/hosted routing and S18 native-compaction/extended-cache work additionally require Q3/Q7/Q8/Q18 consent and a concrete measured benefit. Do not automatically fund these branches to fill a roadmap.

## Requirement, decision and finding coverage

The [report](../../reports/blah-chat-modernization-review.md) and [synthesis](../research/modernization-review.md) own evidence; this table assigns implementation/release buckets, not new approval. Every D-001–D-036 has an owner here.

| Decisions / requirement | Domain and release bucket |
|---|---|
| D-001/D-036/D-002: historical research scope replaced by authorized delivery; preserve durable architecture/repo rules | README delivery update; [21](21-decision-log.md); [01](01-architecture.md); rung 1 and every release contract |
| D-003/D-032/D-037: complete approved Smart Assistant purge, preserved data | [16](16-smart-assistant-removal.md); 2a, 2 and 2b, not a permanent flag or historical relabeling |
| D-004: list narration | [11](11-rendering-and-narration.md); 3 |
| D-005/D-018: approximate 80% compaction/caching | [05](05-context-and-caching.md); 14–17; optional native/cache branch later |
| D-006/D-028: E2B computer | [07](07-tools-and-computer.md); 31–33; network/control expansion separately gated |
| D-007/D-012/D-027: added/automatic/self-created skills | [08](08-skills.md); 22–24, 32 for separately permitted scripts |
| D-008/D-024: visual artifacts | [10](10-artifacts-and-interactions.md); 20–21; JS deferred |
| D-009/D-019/D-035: routing/catalog scholarship and provider research | [06](06-model-routing.md), [09](09-integrations.md); 18, 28–30; optional measured selection branch |
| D-010/D-025: better questions, decisions and progress | [10](10-artifacts-and-interactions.md); 8/13 real status, 19 durable question, 30 exact effect |
| D-011: Notto experience reuse | [19](19-reuse-map.md); 13/19–21, Q21 before any code/test copy |
| D-013/D-029: schedules | [12](12-schedules.md); 25–27 |
| D-014/D-022: privacy/security/lifecycle | [13](13-privacy-safety-compliance.md); 1, 9–11; each new domain's ACL/erasure before enablement |
| D-015/D-016/D-017: native results, usage/payer/admission | [04](04-durable-generation.md), [07](07-tools-and-computer.md), [14](14-cost-model.md); 4–8 |
| D-020: compatible upgrades | Maintenance recipes beside affected rungs; optional majors not prerequisites |
| D-021: bounded continuation evaluation | [04](04-durable-generation.md); S8 before 19, one engine/version per admitted Run |
| D-023: Quiet workbench proposed concept | [03](03-design-concept.md); scoped comps before central new UI, existing repair intent preserved |
| D-030/D-033: usable releases and actual candidate evidence | [15](15-observability-and-evals.md); F1/1 and every release contract |
| D-031: CLI/mobile/desktop compatibility, no new TUI | [17](17-cli.md), [18](18-mobile-and-desktop.md); per-domain reader/hand-off gates and independent platform cohorts |
| D-034: privacy-first observability/evals | [15](15-observability-and-evals.md); metadata/call counts in 1/4–8, executor progress in 8/13/19, optional redacted sink only after policy |

| Findings | Action / domain | Release bucket |
|---|---|---|
| F01–F04 | Public read/file/source/paid authorization, all aliases; retire extraction | [13](13-privacy-safety-compliance.md); 1/2/2b |
| F05/F19/F23 | Actual BYOK/background owner, bounded auxiliary/model/image storage | [04](04-durable-generation.md), [14](14-cost-model.md); 7 |
| F06/F17/F26 | All-call financial ledger, separate occupancy, dimensional aggregates | [14](14-cost-model.md), [05](05-context-and-caching.md); 6/14 |
| F07/F21 | Immutable retry, keyed sends/offline/optimistic failure receipts | [04](04-durable-generation.md); 5 |
| F08/F22 | Native structured result/model serialization and valid continuation | [07](07-tools-and-computer.md); 4 |
| F09/F10/F20 | Admission/lease/cancel/terminal/enrichment and retained effect evidence | [04](04-durable-generation.md); 8/19 |
| F11 | Universal eligible routing/catalog and real inputs | [06](06-model-routing.md); 18 |
| F12/F25 | Central erasure/reference-safe blobs/incognito/cache/CLI | [13](13-privacy-safety-compliance.md); 10 |
| F13/F14/F31/F32/F49 | Exact account/action, lifecycle, callback/mobile/typed errors/budgets/cleanup/no-secret logs | [09](09-integrations.md), [18](18-mobile-and-desktop.md); safe logging/disabled effects in1, 28–30 and native callback cohort |
| F15/F35/F43 | Sanitize/math/worker/diagram policy and feature parity | [11](11-rendering-and-narration.md); 11 and narrow renderer maintenance |
| F16/F33/F34/F50 | Candidate gate, truthful release-script failure, coverage/task discovery, scoped docs and affected history | [15](15-observability-and-evals.md), [01](01-architecture.md); F1/1 and owning tool cohort |
| F18 | Branch-aware checkpoint, exact plan and server automatic trigger | [05](05-context-and-caching.md); 14–16 |
| F24/F27/F28 | Share DTO, actual REST/SDK archive validator, vector hydration | [13](13-privacy-safety-compliance.md); 9 |
| F29 | Typed card/native adapter first, then explicit artifact ID/base revision/normal-turn creation | [10](10-artifacts-and-interactions.md); 4/20–21 |
| F30 | No age-guessed failure/fake completion; durable clarification and executor progress | [04](04-durable-generation.md), [10](10-artifacts-and-interactions.md); 8/13/19 |
| F36/F37/F38/F39 | Message-scoped citation, real code controls, valid focus tokens and native selection | [11](11-rendering-and-narration.md); 12 |
| F40/F41/F42/F44/F45/F46/F47 | Actual scroll root/focus/announcer/buffer/stable caches/measured full-tree work; mobile output return | [11](11-rendering-and-narration.md), [18](18-mobile-and-desktop.md); 13/20 and scoped S16/platform cohort |
| F48 | Exact source-mapped list repair/handoff/listening | [11](11-rendering-and-narration.md); 3 |

## Canonical handoff before new writers

Use [02](02-data-model.md)'s exact optional `messages.runProjection={runId,status,version,wait?}` and unchanged legacy message enum. Deploy recovery/read compatibility before wait writers. Schedule gap/missing-day diagnostics have no invented UTC instant; actual occurrence rows require finite `scheduledFor`. Direct schedule management uses reviewed nonce/consent without a fabricated Run/Interaction. Scheduled connection authority is reviewed version pins plus consent/current scope, never output-chat selection ([12](12-schedules.md), [09](09-integrations.md)).

**The attribution correction is specified, not an unresolved hold:** [02](02-data-model.md#canonical-usage-attribution)/[14](14-cost-model.md#immutable-events-then-projections) define required tagged Run/Attempt or admitted operation/operation-Attempt attribution. Standalone records retain authenticated owner/request dedupe, exact dispatch hash, real optional context, actual payer/credential/pricing lineage, physical/evidence/correction keys and matching reservation subjects. One usage settlement owner derives compatibility totals. Rung1 secures/bounds helpers using existing attributable recording; rung6 may adopt chat first; rung7 enables the standalone variant with its no-transcript success/retry/stop/duplicate-settlement fixture. None requires a fake chat, second ledger or whole workflow engine. These remain proposed implementation contracts under existing decisions, not permission to implement.

Human artifact authorization and live agent lease authorization meet only at the shared revision writer/CAS (rung20). Schedule future-only pause/edit changes admission fences, while admitted work retains its exact reviewed version/consent and live execution revocation checks (rung27). Keep those fixtures capability-specific; they are not new prerequisites for rung1/TTS or reminder-only delivery.

## After the car (not planned yet)

Arbitrary-JS artifacts, authenticated computers/manual takeover, broad public-browser tasks, unattended consequential schedules, public skill marketplace/sharing, online routing exploration and whole runtime replacement need new validated requirements, threat models and consent. The current ladder deliberately ends with a clean bounded desktop producing saved work. It does not quietly authorize those later capabilities.
