# 12: Schedules

Turn a conversational request into a reviewed schedule revision, then deliver a reminder or admit a fresh bounded read/draft run for each occurrence. BK requested schedules/automation (D-013); the consent, recurrence, limits and delivery design below is **proposed** under D-029, Q3/Q16/Q17 and S13. A task deadline is not a reminder, and schedule consent is not approval for future external writes. Use [02](02-data-model.md)'s records, [04](04-durable-generation.md)'s shared runs and [10](10-artifacts-and-interactions.md)'s decision cards.

Authority and unresolved gates: [21](21-decision-log.md), [22](22-open-questions.md).

## Existing implementation, not an armed automation system

Source baseline `04866f80a6236716ebf8d8c5a79001727f85f4bf`, reviewed on 2026-11-03:

| Existing source | Preserve / required change |
|---|---|
| [`scheduledPrompts`](../../packages/backend/convex/schema.ts#L994-L1017), [modular copy](../../packages/backend/convex/schema/shares.ts) | Legacy daily/weekly/monthly prompt/timezone/model/active rows are migration input. They lack reviewed revisions, consent, occurrence ledger and audited active runner. |
| [Crons](../../packages/backend/convex/crons.ts) | Existing maintenance jobs and `CUTOVER_PAUSE_CRONS` guard stay. No audited job runs `scheduledPrompts`. User schedules must not rewrite deployed cron source. |
| [Task tool](../../packages/backend/convex/ai/tools/taskManager.ts), [task records](../../packages/backend/convex/tasks.ts) | Keep task/deadline behavior. Neither path establishes notification delivery. LLM deadline parsing is not recurrence/timezone authority. |
| [Notification operations](../../packages/backend/convex/notifications.ts), [bell](../../apps/web/src/components/notifications/NotificationBell.tsx) | Reuse owner-scoped inbox; extend typed destinations/deduplication. Current in-app notifications do not prove email/push delivery. |
| [Admission](../../packages/backend/convex/chat.ts), [prompt builder](../../packages/backend/convex/lib/prompts/systemBuilder.ts) | Reuse internal authorization/model policy and durable output. Fix ambient-auth preference retrieval: scheduled functions carry no user auth. |
| [Recovery](../../packages/backend/convex/messages/recovery.ts) | Existing age-based pending/generating cleanup must recognize genuine shared run waits, not falsely fail them after ten minutes. |

This is a source-search finding, not an inspection of deployed legacy rows or an assertion about every historical deployment. Full evidence and primary sources: [schedules/self-skills research](../../research_notes/blah-chat-agent-experience/schedules-self-skills.md), [synthesis](../research/modernization-review.md#e2b-and-skills-add-capability-not-authority). No migration or job ran during planning.

## Three distinct intents

| Intent | Execution |
|---|---|
| “Add a task due Friday” | Existing task/deadline only. Never promise a reminder. |
| “Remind me Friday at 09:00” | `kind: reminder`: deliver reviewed text in-app; no model/computer at fire time. |
| “Every Friday, research these sources and draft a brief” | `kind: agent_job`: fresh owner-scoped read/draft run with pinned dependencies, hard reservation and saved output. |

Initial proposal is reminders first, then bounded read/draft jobs. No unattended send/post/delete/publish, computer allocation, credential handoff or recursive skill/schedule mutation (Q17). If a request asks to send weekly, the proposal must explicitly say that external sending is unsupported; do not silently reinterpret it as approved automation. A scheduled run may produce an ordinary output describing a suggested change, but cannot persist/arm more schedules, create skill drafts or publish skills through its tools.

## Revision, consent and occurrence records

All tables below are new planning contracts. Existing `users` is the owner boundary. Store instants as epoch milliseconds with `At` suffixes, except canonical occurrence field `scheduledFor`.

| Table | Minimum fields / invariants |
|---|---|
| `schedules` | `ownerUserId`, title, `kind`, `status`, `currentVersionId`, `nextRunAt?`, next nominal cursor/key, `scheduledFunctionId?`, `admissionEpoch`, `executionRevocationEpoch`, blocked reason, failure streak, timestamps, optional `legacyScheduledPromptId`. Index owner/status and status/nextRunAt. Only active/unexpired-consent revisions can fire. |
| `scheduleVersions` | Immutable `scheduleId`, owner, version/parent, task or reminder text, canonical recurrence/zone, gap/fold/month-day/misfire/overlap rules, start/end/count, `maxStartLagMs`, recurrence-engine/runtime fingerprint, preview hash, context selection, model/catalog/payer policy refs, hard execution-limit policy, approval-policy version, `contentHash`, author/source-message refs and creation time. Content hash covers all execution-relevant fields and pinned dependency hashes; review nonce/receipt metadata is outside immutable content. |
| `scheduleConsents` | Owner, exact `scheduleVersionId`/content hash, reviewed read/draft capabilities/data destinations, budget-policy hash/ceiling, actor, issue/expiry/revocation timestamps and policy version. Not an effect approval and never a model-provided boolean. |
| `scheduleVersionSkills` | Version-to-exact `skillVersionId` plus package hash and required/optional marker. No mutable latest version lookup. |
| `scheduleVersionConnections` | Version-to-owned exact connection/revision/account hash, permitted action/schema IDs, scopes/resource limits. Store refs, never tokens. |
| `scheduleOccurrences` | `ownerUserId`, `scheduleId`, `scheduleVersionId`, exact `scheduleConsentId`, `occurrenceKey`, nominal local date/time/zone/fold choice, resolved `scheduledFor`, `status`, reason/details, admission-time `admissionEpoch` and `executionRevocationEpoch`, enqueue/start/end timestamps, `runId?`, owner output conversation/revision refs, safe failure and usage projection. One logical occurrence key maps to at most one run. |
| `notificationDeliveries` | Owner/recipient, `scheduleOccurrenceId`, event type/channel, unique delivery key, delivery state, attempts/nextRetryAt, notification ID and output refs. Delivery retry never re-executes a task. |

Index occurrences by schedule/key, status/scheduledFor and run; consents by version and expiry; deliveries by key and retry time. Enforce unique mappings with indexed lookup plus insert in one mutation; an index alone is not a uniqueness constraint.

Agent execution uses shared `agentRuns`, `runAttempts`, `toolCalls`, `interactions`, `artifacts`, `usageEvents` and `budgetReservations`. A schedule run has `source: schedule`, `scheduleOccurrenceId`, and all canonical run fields in [02](02-data-model.md), including explicit owner/branch/version/lease identity. Do not create another run engine, output owner or approval store. A reminder needs an occurrence/delivery but no fake model run or zero-cost model attempt.

### Canonical states

```text
schedule:
draft -> review_required -> active
active -> paused|blocked|completed|revoked|review_required
paused|blocked -> review_required -> active
draft|review_required|paused|blocked -> revoked

occurrence:
pending -> running -> succeeded|failed|cancelled|blocked
pending -> skipped|blocked|cancelled
running -> waiting_for_input|waiting_for_approval
waiting_for_input|waiting_for_approval -> running|cancelled|failed|blocked
```

Schedule `status` is exactly `draft | review_required | active | paused | blocked | completed | revoked`; validation diagnostics are fields/results, not extra `validating/invalid` enum members. Occurrence `status` is exactly `pending | running | waiting_for_input | waiting_for_approval | succeeded | failed | cancelled | skipped | blocked`. Preparation/claim/backoff/reconciliation are phases/reasons. Shared runs retain `pending | running | waiting_for_input | waiting_for_approval | succeeded | failed | cancelled`; occurrence `blocked/skipped` do not invent shared run states.

A possible external effect with lost acknowledgement stays `toolCalls.status=unknown`, `effectCertainty=uncertain`; halt dependent work, preserve an occurrence blocked/failure reason and an actionable reconciliation card. Never represent that as a new run enum or a harmless retryable failure. Succeeded/failed/cancelled occurrence receipts are terminal; owner-requested rerun is a new reviewed run, not mutation of history.

## Proposed APIs and tools

Proposed modules are `packages/backend/convex/schedules/{crud,validation,recurrence,dispatch,occurrences,delivery}.ts` and factories in `packages/backend/convex/ai/tools/schedules.ts`. They do not exist yet. Use shared strict Zod contracts, Convex runtime validators and deterministic semantic checks. Reject unknown fields/nonfinite numbers, cap text/source/dependency counts and pages, and derive owner/run identity from the trusted context, never model arguments.

```ts
type Recurrence =
  | { kind: "once"; instantAt: number; displayZone: string }
  | { kind: "daily"; localTime: string; timezone: string; startDate: string;
      endDate?: string; maxOccurrences?: number }
  | { kind: "weekly"; localTime: string; timezone: string; startDate: string;
      weekdays: number[]; endDate?: string; maxOccurrences?: number }
  | { kind: "monthly"; localTime: string; timezone: string; startDate: string;
      dayOfMonth: number; endDate?: string; maxOccurrences?: number };

type ScheduleProposal = {
  title: string;
  kind: "reminder" | "agent_job";
  text: string;
  recurrence: Recurrence;
  contextSelection: SelectedOwnedInputs;
  skillVersionIds: Id<"skillVersions">[];
  connectionIds: Id<"connections">[];
  modelPolicyRef?: string;
  limitPolicyRef?: string;
};
```

`SelectedOwnedInputs` is an explicit bounded list of owned project/file/artifact revisions and source message/branch IDs, validated against current ACLs. It is not “read all future chat history.” Model proposals select only existing allowed policy profiles; they cannot invent budgets or grant themselves capabilities. Server-normalized revision adds all reviewed Q16 policies, connection/schema revisions, hash and consent requirements. Reminder proposals reject unnecessary model/skill/connection dependencies rather than implying they will run.

| Model-visible signature | Result / authority |
|---|---|
| `createSchedule({proposal})` | Save draft/review-required revision; return `{scheduleId,scheduleVersionId,status,contentHash,interactionId?,preview,nextFive,missingDependencies}`. Does not arm. |
| `updateSchedule({scheduleId,expectedVersionId,patch})` | Typed patch creates new immutable revision; increment admission fence and pause future dispatch while review pending. Already admitted work retains its reviewed old version/consent until it finishes, unless separately stopped/revoked. Return before/after diff, preview and current-run continuation receipt. Never continue hidden old firing. |
| `pauseSchedule({scheduleId,expectedVersionId,stopCurrentRun})` | Reduce authority immediately; return durable schedule state plus current-run stop receipt. Explicit boolean requests stop, not an approval grant. |
| `resumeSchedule({scheduleId,expectedVersionId})` | Return current dependency/consent check and review preview; does not silently renew consent or rearm. |
| `listSchedules({status?,kind?,cursor?,limit?})` | Owner-only bounded projection with timezone, next due and last outcome. Name ambiguity requires ID selection. |
| `getScheduleRuns({scheduleId,cursor?,limit?})` | Owner-only occurrence/run/output/status pages, no raw private connector dumps. |
| `cancelSchedule({scheduleId,expectedVersionId})` | Revoke future authority and request active-run stop; explain uncertain/already-completed effects. No data deletion. |

These are native result `data` fields; schedule `status` does not replace shared `ToolResult.status` from [07](07-tools-and-computer.md). A chat confirmation Interaction parks its tool/run in `waiting_for_approval`; a saved proposal without a pending interaction can succeed only as an **unarmed draft**. `review_required` is never a tool/run state or proof of activation.

Every mutation carries a stable client operation key, injected for model calls from durable run/tool-call identity. Store request hash/result on the created version or corresponding durable mutation event; identical replay returns the same IDs, changed payload under that key rejects. Do not deduplicate writes through a per-generation search cache.

Owner UI/CLI uses `schedules.proposeCreate/proposeUpdate/list/get/pause/revoke` and `confirmRevision({scheduleId,scheduleVersionId,expectedContentHash,reviewNonce,interactionId?,expectedInteractionVersion?,clientRequestId})`. Confirmation is an authenticated user-review operation denied by the model tool dispatcher. For a chat proposal, the shared `interactions(kind=approval)` request binds exact revision/policy/dependency/preview hashes, expiry and requested schedule authority; confirmation consumes it through the shared CAS. For direct management without a Run, use an expiring exact-revision review nonce on `scheduleVersions` and write the domain `scheduleConsents` receipt atomically; do not fabricate a Run/Attempt or create an incomplete Interaction. Both paths create the same consent and arming transaction. That consent is schedule permission only, not approval of future external effects. Answering “What timezone?” is a clarification, never confirmation of the finished schedule.

REST projections, if needed, use `GET/POST /api/v1/schedules`, `GET/PATCH /:id`, `POST /:id/{confirm,pause,resume,revoke}`, and `GET /:id/occurrences` over the same functions. Return `formatEntity`/list/error envelopes from [the actual module](../../apps/web/src/lib/utils/formatEntity.ts), private/no-store. Conflict/expired consent/unsupported recurrence/missing hard limit are typed errors with no paid call. Scope/binding/consent hashes cannot be compacted away from review DTOs.

## Deterministic time and reviewed preview

Q16's exact proposed defaults are **once/daily/weekly/monthly; confirmed IANA zone; preview next five; skip gap; earlier fold once; skip missing month day; skip missed jobs; skip-new overlap; raw cron/RRULE deferred**. Each rule appears in review; none is silently normalized. Numeric allowed start lag, expiry, rule bounds and retry limits remain unresolved Q3/Q16 and must be configured before arming/execution.

1. Capture a server reference instant for relative-date proposals and ask about ambiguity, AM/PM and zone. Browser timezone is a suggestion, not consent. One-off `instantAt` must be finite/future with explicit display zone; ambiguous gap/fold local input asks the user before converting it to an instant.
2. Recurrence stores strict `YYYY-MM-DD`, `HH:mm` and IANA timezone, not yesterday's UTC plus 24 hours. Weekdays are ISO **1=Monday … 7=Sunday**, unique/sorted, 1–7; month day is integer 1–31. Start/end/count must be possible, positive/bounded and mutually consistent. `maxOccurrences` counts nominal scheduled slots, including skipped ones, so downtime cannot extend reviewed authority. An end date is inclusive in the pinned local zone.
3. `resolveLocalOccurrence(localFields, timezone)` returns zero/one/two ordered UTC candidates. Zero means gap, two means fold. A round trip alone cannot detect both fold instants. Reuse locked `date-fns-tz@3.2.0` for rendering/conversion behind this adapter, but do not claim it already supplies this complete resolver. [Maintainer contract](https://github.com/marnusw/date-fns-tz#readme).
4. A concrete initial Intl resolver can enumerate minute-aligned UTC candidates within ±36 hours of the nominal fields interpreted as UTC and compare exact local date/hour/minute/second via `formatToParts` (`hourCycle:h23`, stable Gregorian calendar). This is bounded and supports future minute-precision rules with validated minute-aligned offsets; reject unsupported offset/range/ambiguity rather than guess. Cache only proven offset candidates as an optimization, with a complete enumeration fallback. S13 must establish runtime cost, supported-zone completeness and non-hour/date-line cases before release; changing the resolver/library cannot change Q16 semantics.
5. Apply gap skip/earlier-fold selection and monthly missing-day skip explicitly. “Last day” is a different future rule, not clamping day 31. Return skipped-slot explanations and continue bounded expansion until five executable future instants or schedule end. Never spin indefinitely looking for a valid date; an exhausted probe/horizon cap returns a validation error.
6. Preview returns local label, zone, numeric UTC offset, UTC `scheduledFor`, fold selection and skipped-slot warnings. Include next transition example where relevant. Store preview hash plus recurrence-engine version/runtime fingerprint; do not invent a portable `Intl` TZ database version. Runtime timezone-data changes trigger future-preview reconciliation; material change blocks future dispatch and creates a new review-required revision, not a rewritten instant under an already accepted occurrence key. Existing occurrence receipts stay immutable.

Occurrence identity is independent of callback/retry time:

```text
occurrenceKey = SHA256(canonical JSON {
  scheduleId, scheduleVersionId,
  nominalLocalDate, nominalLocalTime, timezone, selectedFold: "earlier"|"unique"
})
once key = SHA256(canonical JSON {scheduleId,scheduleVersionId,instantAt})
```

All `scheduleOccurrences` require finite `scheduledFor`, as in [02](02-data-model.md). A gap or missing month date has no actual executable instant: retain its nominal fields/skip reason in bounded `schedules.recurrenceDiagnostics` alongside the expansion cursor, with an authorized artifact checkpoint if diagnostics exceed the inline bound. Display those calendar skips in preview/history, but do not invent a UTC occurrence or weaken `scheduledFor` to optional. Actual-time slots skipped for overlap/misfire retain their normal occurrence keys and `scheduledFor`. Changing a revision produces new keys and fences old callbacks; approval/clock/browser refresh never creates another logical occurrence.

## Arm, fire, revalidate, settle

[Convex scheduling](https://docs.convex.dev/scheduling/scheduled-functions) is sufficient for the reminder slice: scheduling within a mutation commits atomically; scheduled actions are at-most-once and not automatically retried. User auth is not propagated. Canceling an already-running function cannot stop its body. Native UTC cron serialization does not serialize child jobs or supply owner overlap policy. Workflow is a separate S8/Q19 experiment for bounded waits, not a reminder prerequisite (D-021).

### Arming and firing transactions

1. **Confirm revision:** authenticated owner compares current version/hash, expiring review nonce and, when run-backed, pending interaction/version/expiry, plus current policy/dependencies and preview. Atomically consume the review receipt, write consent, set `active`, increment `admissionEpoch` and call `ctx.scheduler.runAt(nextRunAt, internal.schedules.dispatch.fire, {scheduleId,scheduleVersionId,occurrenceKey,admissionEpoch})`; retain scheduled-function ID. One next wake-up, not thousands of future prompts. No ambiguous missing-limit consent. Confirmation never resets/decrements `executionRevocationEpoch` or revives cancelled work.
2. **Fire:** internal mutation loads the schedule and callback tuple. Stale current revision/admission epoch, revoke, pause, expired consent or execution kill switch means no admission. Deduplicate by occurrence key; duplicate callback returns the existing receipt. Persist occurrence with exact reviewed consent and both epoch snapshots, advance nominal cursor and next wake-up atomically; when count/end/once is exhausted, retain current work but schedule no further wake-up and mark the schedule completed when its final occurrence settles. Reminder insertion/delivery can complete in this transaction. Agent occurrence stays `pending` until admission succeeds; it must still match the live admission fence when admitted.
3. **Overlap/misfire:** while another occurrence is pending/running/waiting, new slot is `skipped` with overlap reason (`skip_new`). If it is past `scheduledFor + maxStartLagMs`, mark misfire skipped and find the next future slot. Default does not catch up reminders or agent jobs. Long downtime is paged through bounded skipped-slot records/cursor advancement, with one recoverable reconciliation wake-up; no unbounded loop or burst of old model jobs. Do not schedule the same unreconciled past key repeatedly.
4. **Admit:** create owner-only output conversation and one shared `agentRuns` record transactionally with occurrence/run mapping and budget reservation. Its stable `clientRequestId` derives from occurrence key; identical retries return the original run. If preflight fails, mark occurrence blocked with reason, block the schedule and notify once. Do not create a failed fake provider attempt to represent no dispatch.

`scheduledFor` is intended time, not an exact-minute SLA. Persist enqueue/start/finish lag. Global `scheduleExecutionPaused` must be checked by callbacks, admission and continuations, not only cron registration. A safety cron pages missing wake-ups/expired leases/undelivered notifications and repairs intents without replaying completed or uncertain effects. Keep system scheduler's seven-day history separate from durable owner occurrence history.

### Revalidation is continuous

At admission **and before every model/tool dispatch, retry or continuation**, check:

- Owner/schedule exist and are not deleting/revoked; the occurrence's `executionRevocationEpoch` matches the live schedule. Run is not canceled and current lease owns publication. Admission additionally requires active schedule/current version/`admissionEpoch`; after admission, future-only pause/edit does **not** require that fence or current-version equality. Instead load the occurrence's immutable reviewed `scheduleVersionId` and exact `scheduleConsentId`, verify matching content hash, unexpired/unrevoked consent and current policy. Never substitute the newly edited version or renew consent implicitly.
- Current project/conversation/input ACLs and exact selected revisions remain valid. Read only reviewed inputs; do not append a mutable collaborative chat every week.
- Required pinned skills remain published/allowed, not revoked; exact hashes load through [08](08-skills.md). No substitution with latest or a same-name skill.
- Exact approved connection account/revision/scopes/action/resource policy remains active ([09](09-integrations.md)). Reconnect or account change blocks until review, not silent remapping.
- Current model/catalog/provider/region/payer is eligible and budget covers this attempt; no platform-key fallback in BYOK and no more permissive tool/model fallback.
- Remaining per-occurrence/owner day/month token/tool/search/wall/output/concurrency limits are present and reservable. Retries, auxiliary models and failed/canceled requests consume allowance and shared `usageEvents` ([14](14-cost-model.md)).

Background preference reads must use explicit trusted `ownerUserId` from durable records, respecting blank-slate policy; never call a public endpoint assuming the scheduler has ambient Clerk identity. Never retain a user JWT as automation authority. Construct an allowed tool catalog from reviewed **read/local-draft** canonical action/schema IDs, not the ordinary chat's broad builder or normalized name prefixes. Source/schema changes never expand consent automatically.

### Waits, stop and uncertain effects

Bounded workers persist a checkpoint and release resources on `waiting_for_input`/`waiting_for_approval`; current message status gets the compatible optional wait projection from [02](02-data-model.md), not a newly invented message enum. A legitimate human wait must not be stale-recovered as ordinary generating. Owner answer/review resumes the **same run** through the shared interaction CAS/outbox in [04](04-durable-generation.md)/[10](10-artifacts-and-interactions.md), after fresh dependency/budget checks. No live model request or paid VM waits for a human.

Initial scheduled tools cannot commit external effects or recursively mutate schedules/skills. If broader capabilities are later approved, they still need a fresh exact-effect interaction bound to account/destination/content/expiry. Schedule consent never preapproves an unknown future payload. A required human login is blocked/waiting; do not bypass it with another credential path or computer allocation.

Known-safe transient reads/preparation may retry the same logical run with bounded attempts/backoff/jitter/deadline; each physical model call gets `runAttempts`/usage identity. Preserve successful tool outcomes and resume from checkpoint, never repeat the whole tool-using action. An uncertain tool dispatch is reconciled, not retried; notification failure is never an inference retry.

**Pause future runs** with `stopCurrentRun:false` increments only `admissionEpoch`, cancels the wake-up and fences all not-yet-admitted occurrences; its receipt explicitly says admitted work continues under its pinned reviewed version/consent. **Edit** does the same for future admission, creates a review-required version and preserves an already admitted occurrence's old consent until normal completion/expiry or explicit stop/revocation. New review never changes that occurrence's task/limits/dependencies. **Stop this run** persists the targeted Run's cancel request/lease fence and aborts transport while preserving partials; `pauseSchedule(...stopCurrentRun:true)` additionally increments `executionRevocationEpoch` and cancels all active occurrences/pending continuation approvals. **Revoke schedule** increments both epochs, revokes consents/pending approvals, cancels callbacks and requests active-run stop. Revocation, consent expiry, owner/ACL/dependency/budget changes and the execution kill switch still deny further dispatch after a future-only pause/edit. A running request may already have completed an effect; cancellation cannot recall it. Lease recovery fences stale workers, and late callbacks cannot recreate erased resources. Repeated operational failures trip a centrally configured circuit breaker to blocked/paused with a specific owner action; threshold policy is Q3/Q16, not an invented approved number. Its receipt must name whether it also stopped current work; never silently equate admission pause with execution revocation.

## Output and notification delivery

Q17's proposed default is owner-only **per-occurrence output conversation**, linked from schedule history and inbox. It keeps background work out of a live interactive branch and prevents accidental collaborator disclosure. Save answer/artifact revisions, outcome and usage before delivery. A read/draft job can finish with a useful local draft and an explicit “Sending needs separate review,” not claim it sent anything.

`deliveryKey = hash(occurrenceId,eventType,channel,recipient)`; use transactionally deduplicated `notificationDeliveries`. In-app notification insertion plus delivery confirmation share one mutation. Terminal-success delivery is distinct from reminder/blocked/failed events. Extend existing notification DTOs with typed `scheduleId`, `scheduleOccurrenceId`, `runId` and output refs; route through allowlisted IDs, never model URLs. Notification read/dismiss does not cancel or resume work. Retry only delivery of the already-saved output, with bounded backoff; never rerun research, republish a skill or resend an external effect. Email/push/other channels require separate Q17 consent, cost and outbox design.

Retain occurrence/consent/run truth according to Q4, independently of inbox cleanup. Public shares omit private input/skill/connection/consent metadata. User deletion first revokes authority and fences delayed callbacks, then cleans outputs/children/processor records through the shared retention/erasure policy ([13](13-privacy-safety-compliance.md)); no provider cleanup handle disappears prematurely.

## Experience: set it once, see what happened

Under Quiet workbench (D-023/Q2), **Schedules** is a management destination, while chat holds one clear proposal/result. The task and next time are primary; versions, dependencies, limits and activity are secondary disclosure. Required missing information or consent stays visible through shared [10](10-artifacts-and-interactions.md) cards, never hidden in folded work or native dialogs.

| Moment | Key interaction / intended feeling |
|---|---|
| Ambiguous request | “Which timezone?” with authored options; answering does not arm a schedule. |
| Review | Exact task/kind/zone and next five offsets first; read/draft-only boundary, limits, consent expiry, skip/DST policies and dependencies visible. Primary action says Create schedule. |
| Armed | “Scheduled. Next run …” only after durable receipt; quiet View/Pause chip. |
| Edited | Before/after diff says future runs paused until review and explicitly identifies any admitted run continuing its previously reviewed revision; offer Stop separately. No hidden future firing of the old revision. |
| Browser closed | Work/delivery remains server-owned; opening history observes rather than reruns. |
| Needs attention | “Didn't run: reconnect this account” or “Skipped: previous run still waiting”; one relevant Review/Reconnect/Disable action. No generic retry-everything button. |
| Finished | Saved artifact/answer is primary, with run time/estimated or reported cost and skill provenance; notification once per logical event. |

Schedules list active/paused/needs-attention, pinned zone, next due and last outcome. Details show paged occurrences including skipped/blocked, consent/dependency revisions and Pause/Stop/Revoke distinctions. Narrow screens use full-screen review with Back/focus restoration. CLI/mobile use equivalent preview/confirm/stop/history projections without a web-only iframe ([17](17-cli.md), [18](18-mobile-and-desktop.md)).

## Small releases, migration and acceptance

1. **Draft/preview/review + reminders:** deterministic recurrence adapter, consent/occurrence/delivery transactions, owner management and in-app output. No model at firing and no Workflow/computer dependency. Q16/Q17 and S13 gate arming.
2. **Read/draft jobs:** shared admission, explicit background instructions, immutable dependency context and hard reservations after S3. Add bounded continuation/waits only after S8/Q19; ordinary reminder repair must not wait for a framework choice.
3. **Later capability:** no scheduled computer or unattended consequential writes in this plan. Enabling them requires an approved design beyond a feature flag, Q3/Q15/Q17 and their safety gates.

Legacy migration inventories deployed `scheduledPrompts` under explicit authorization, preserves original rule/model/active values and IDs, and maps each eligible row to an **unarmed draft** with `legacyScheduledPromptId`. Even `isActive:true` is not current consent. Invalid/ambiguous rows remain reviewable with diagnostics; never replay historical prompts. Correct the existing usage count that treats these rows as templates. Update the authoritative schema, modular [shares schema](../../packages/backend/convex/schema/shares.ts), [BYOD generator](../../scripts/sync-byod-schema.ts), [table inventory](../../packages/shared/src/byod/tables.ts), notification indexes and cascades together; do not hand-edit generated copies independently. S17 stages real schema/client compatibility before any contraction.

S13 fixtures use fake clocks/providers and actual validators/transactions: UTC/DST/non-DST/non-hour offsets/half-hour transitions/date-line zones; gaps/folds/leap day/month 29–31; once in past; end/count/probe limits; changed server/browser locale/zone; changed runtime TZ data; identical/stale/replayed callbacks; two confirm tabs; pause/edit/revoke before and after admission; browser absent; downtime across many slots; overlap while waiting; consent/skill/connection/input ACL/budget revoked after dispatch; missing owner instructions; retries/lease takeover/uncertain tool receipt; one saved output with notification retry only. Assert actual occurrence keys, denied provider calls and one delivery/run, not just “a cron was registered.”

Include an admitted two-step job: pause future-only between steps permits exactly the reviewed second step and zero later occurrence admissions; an edit likewise preserves that old reviewed second step, not new task text. Contrast Stop, pause-with-stop and Revoke between steps: zero further dispatches, inert pending approvals/resume intents and no late callback resurrection. Consent expiry/ACL revocation still denies the second step even after future-only pause. These are future release fixtures, not executed results.

Rollback disables future dispatch through a server kill switch, fences callbacks and retains saved outputs/consent/occurrence receipts. It does not reactivate legacy rows or restart completed/unknown effects. Deployed schema compatibility/erasure, client projections, fake-provider lifecycle and actual design key moments gate each affected release (S3/S8/S13/S15/S17; D-030/D-033). Live model/connection tests, paid automation and production promotion remain separately authorized.
