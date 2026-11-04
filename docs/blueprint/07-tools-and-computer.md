# 07: Tools and computer

Preserve native tool results, then extend the existing E2B executor into a deliberately bounded remote computer. BK requested the capability (D-006); the executor, privacy and permission design below is **proposed**, not approved policy (D-015/D-017/D-028; Q3/Q4/Q5/Q15/Q19). [02](02-data-model.md) owns record names; [04](04-durable-generation.md) owns run admission and continuation; [10](10-artifacts-and-interactions.md) owns shared decision cards.

Authority and unresolved gates: [21](21-decision-log.md), [22](22-open-questions.md).

## Current implementation

Source baseline: `04866f80a6236716ebf8d8c5a79001727f85f4bf`, reviewed on 2026-11-03. These are source findings, not live sandbox results.

| Existing boundary | Preserve | Repair or extend |
|---|---|---|
| [Tool builder](../../packages/backend/convex/generation/tools.ts), [generation](../../packages/backend/convex/generation.ts) | AI SDK factories, normalized `toolCalls`, server-owned partial persistence, incognito filtering | The result boundary keeps execute results native for storage/UI, applies untrusted-data framing and context-pressure truncation only to textual AI SDK 6 `toModelOutput`, preserves custom typed errors/denials/provider metadata/multimodal parts, and continues tool-only turns from SDK response messages. Framing is a mitigation, not a prompt-injection guarantee. Cancellation is not propagated through all executors. |
| [Code factory](../../packages/backend/convex/ai/tools/codeExecution.ts), [Convex proxy](../../packages/backend/convex/tools/codeExecution.ts) | Python/JavaScript, internal bearer authentication, Next.js SDK host | Factory lacks trusted run/owner identity; timeout races do not stop remote processes. |
| [Existing route](../../apps/web/src/app/api/code-execution/route.ts) | 128 KiB request bound, 100,000-character code limit, 1–60-second execution input, fresh sandbox, `kill()` in `finally` | Sign-in is not conversation authorization. No persisted creation intent or compute reservation; plots use storage URLs without owned observation records. |
| [Internal authentication](../../packages/backend/convex/lib/internalAuth.ts), [route tests](../../apps/web/src/app/api/code-execution/route.test.ts) | Real bearer verification; forged boolean headers already reject | Add per-operation authorization rather than reporting the old boolean-header problem as current. |

There is no audited Desktop session/control path. E2B code execution already exists; replacing it wholesale would discard working analysis. Full evidence and dated primary sources: [computer/skills research](../../research_notes/blah-chat-modernization-review/computer-skills.md), [review synthesis](../research/modernization-review.md#e2b-and-skills-add-capability-not-authority).

## One tool execution contract

Extend `toolCalls` additively. Use exactly `runId`, `attemptId`, `providerToolCallId`, `sequence`, `toolName`, `toolSchemaVersion`, native `args`/`result`, `inputHash`, `effectOperationId?`, `status`, `effectCertainty`, `lastProgressAt` and timestamps from [02](02-data-model.md). The persisted `_id` is the application identity; provider call IDs are only unique within their provider context. Do not add another tool-run or approval store.

Proposed internal types, not existing exports:

```ts
type ExecutionContext = {
  runId: Id<"agentRuns">;
  attemptId: Id<"runAttempts">;
  toolCallId: Id<"toolCalls">;
  leaseEpoch: number;
  policyVersion: string;
  deadlineAt: number;
  signal: AbortSignal;
}; // owner, branch, payer and budget resolve from durable records

type ToolResult<T> = {
  schemaVersion: 1;
  toolCallId: Id<"toolCalls">;
  status: ToolCallStatus; // exact union in 02
  effectCertainty: "none" | "confirmed" | "uncertain";
  data?: T;
  artifactRevisionIds?: Id<"artifactRevisions">[];
  interactionId?: Id<"interactions">;
  cursor?: string;
  truncated: boolean;
  error?: { code: string; message: string; retryable: boolean };
};

executeTool(ctx: ExecutionContext, input: {
  toolName: string; toolSchemaVersion: string; args: unknown;
}): Promise<ToolResult<unknown>>;
toModelOutput(result: ToolResult<unknown>, route: ResolvedRoute): ModelToolOutput;
```

`ResolvedRoute` and `ModelToolOutput` denote the selected adapter contracts in [05](05-context-and-caching.md)/[06](06-model-routing.md), not unverified SDK exports. Keep executable schemas shared between AI SDK Zod inputs, HTTP validation and Convex runtime validators; apply semantic checks after structural parsing. Reject unknown properties, nonfinite numbers, oversized/deep JSON, unrecognized tool/schema IDs and model-supplied identity/credentials. Tool-specific validators define data bounds before allocation or a provider request.

`executeTool` must:

1. Load the run/attempt/call and verify their ownership chain, selected branch, current lease and permitted status. Resolve owner server-side. Check cancellation, policy, incognito, current ACLs and remaining reservation.
2. Canonicalize validated input and hash it with tool/schema, exact account or session, target and pinned policy. Repeated call/operation plus identical hash returns the stored result; changed hash returns `idempotency_conflict`. Enforce indexed lookup and insert in one mutation; Convex indexes are not unique constraints.
3. For an effect, persist `effectOperationId` and a dispatch-intent `runEvents` entry before calling the provider. An approval is a matching `interactions(kind=approval)` receipt, not `confirm: true` in model arguments. Bind run/call/branch, policy, account/revision, destination, content/input/attachment hashes and expiry. Consume the grant and record intent atomically. Only the owner can answer it under Q5.
4. Revalidate immediately before dispatch, including after any human wait. Emit progress from actual executor transitions. Persist a bounded native result, safe artifact references and outcome; settle usage even on stop or failure.
5. Convert that native result for model continuation separately. Existing execute values remain native for storage and UI; `toModelOutput` applies the model-only untrusted-data framing and honors a tool's existing custom conversion. Ordinary remote data stays untrusted; framing is not guaranteed prompt-injection prevention. Skill instructions have the subordinate typed path in [08](08-skills.md). Screenshot output becomes supported image content, never a base64 JSON string. Limit bytes/records before parsing and tokens before the next request; larger authorized payloads go to artifacts.

Store native objects for renderer/citation consumers. The model adapter may add untrusted-data framing, but must not mutate the persisted/UI shape. New HTTP endpoints use `formatEntity`, `formatEntityList` and `formatErrorEntity` from [the actual envelope module](../../apps/web/src/lib/utils/formatEntity.ts), with private/no-store responses. Preserve mandatory false/empty values with explicit DTO serialization; payload compaction must not erase denial/truncation semantics. Migrate the existing raw code-route response and its caller together, not as an accidental Desktop side effect.

### Outcomes, progress and retries

Canonical tool `status` is `pending | running | waiting_for_input | waiting_for_approval | succeeded | partially_succeeded | failed | cancelled | unknown`. `effectCertainty` is independent:

| Evidence | Outcome | Retry rule |
|---|---|---|
| Denied before dispatch | `failed`, certainty `none`, typed denial | Fix authority; no provider call. |
| Clarification or approval required | Corresponding waiting status, certainty `none` | Park the same run; do not hold an HTTP promise open. |
| Known successful operation | `succeeded`, certainty `confirmed` | Return receipt; do not repeat it on regeneration. |
| Some outputs saved, another operation failed | `partially_succeeded`, certainty based on executed effects | Keep saved results; retry only independently safe missing work. |
| Transport loss after possible dispatch | `unknown`, certainty `uncertain` | Reconcile first. Never automatically resend through another account/provider. |
| Stop before dispatch | `cancelled`, certainty `none` | No new actions. |
| Stop after possible effect | `unknown` or confirmed result, not fabricated rollback | Preserve evidence even when the shared run ends `cancelled`. |

Read-only calls can retry only under a reviewed semantic classification, bounded attempts/backoff/deadline and fresh authorization. A provider idempotency key permits retry only where its endpoint contract and retention window cover that operation. A model retry is a new `runAttempts` row; it does not erase successful tool receipts. Unknown effect is not a new `agentRuns.status` value (D-017).

Persist executor events in `runEvents` using monotonic per-run `sequence`; deduplicate a producer's repeated progress update before allocating a new sequence. `lastProgressAt` reflects actual evidence, not browser timers. Subscribers resume from event cursors. UI may say elapsed time and last known phase; it must not infer failure at 30 seconds or invent percentages. Result/terminal publication is attempt-fenced and monotonic; late telemetry cannot turn success into error. Stop persists `cancelRequestedAt`, invalidates pending decisions, fences dispatch and aborts independently of token arrival. Cleanup has its own deadline/signal so an already-aborted request cannot prevent cleanup.

## E2B runtime and gateway

Keep Convex as identity/policy/ledger owner and Next.js as the initial SDK host, because the current proxy solves an observed bundling problem. Introduce a small gateway interface rather than transplanting a new agent framework. Proposed modules: `packages/backend/convex/computer/{sessions,actions,reconcile}.ts`, `packages/backend/convex/ai/tools/computer.ts`, and `apps/web/src/app/api/internal/computer/[operation]/route.ts`. They do not exist yet. Existing stateless code analysis remains a separate path until its compatibility migration passes.

The coherent **candidate**, not installed versions, is `@e2b/code-interpreter@2.9.1`, `e2b@2.62.1`, `@e2b/desktop@2.5.0`; current lock is interpreter `2.3.3`/base `2.12.1` and Desktop is absent. S12 must prove the actual Bun-resolved tree, production bundling/chalk behavior, deployed runtime limit, SDK initialization and template/browser readiness before removing the proxy or upgrading. Pin immutable template **build** and actual SDK tree, not just a mutable template name. [Version evidence](../../research_notes/blah-chat-modernization-review/computer-skills.md#verified-package-versions-not-installation-instructions).

```ts
interface ComputerRuntime {
  ensureSession(ctx: ExecutionContext, computerSessionId: Id<"computerSessions">): Promise<SessionView>;
  inspectSession(ctx: ExecutionContext, computerSessionId: Id<"computerSessions">): Promise<SessionView>;
  stageInput(ctx: ExecutionContext, input: StageInput): Promise<InputManifest>;
  observe(ctx: ExecutionContext, input: ObserveInput): Promise<ObservationRef>;
  performAction(ctx: ExecutionContext, actionId: Id<"computerActions">): Promise<ActionReceipt>;
  runScript(ctx: ExecutionContext, input: PinnedScriptInput): Promise<ToolResult<ScriptOutput>>;
  exportArtifact(ctx: ExecutionContext, input: ExportManifest): Promise<ToolResult<FileOutput>>;
  pause(ctx: ExecutionContext, computerSessionId: Id<"computerSessions">): Promise<SessionView>;
  destroy(ctx: ExecutionContext, computerSessionId: Id<"computerSessions">): Promise<SessionView>;
}
```

These named DTOs are defined by the following record and input tables. Gateway requests have `{version:1, operationId, runId, attemptId, toolCallId, computerSessionId, leaseEpoch, inputHash, deadlineAt, ticket}`; operations carrying script/staging/export inputs include their bounded manifest hash. Authenticate the service with the existing bearer, **and** validate a short-lived signed ticket bound to those fields and permitted operation. The gateway calls a trusted internal claim/check immediately before SDK dispatch; a ticket alone cannot preserve revoked authority. Reject expired/replayed mismatched requests, unknown provider IDs and arbitrary callback URLs. Return recorded receipts for matching completed operation IDs. `inspect` must not call E2B `connect` if that would resume the machine.

### Records and ownership

All proposed fields below supplement [02](02-data-model.md); ID relationships must agree with the shared run.

| Table | Additional subsystem fields / invariants |
|---|---|
| `computerSessions` | `ownerUserId`, `conversationId`, initiating `runId`, `mode: code\|desktop`, `providerSandboxId?`, `templateBuildId`, `sdkVersions`, `createIntentId`, `createIdempotencyKey`, `createParametersHash`, `status`, `desiredState`, `observedState`, `networkPolicyVersion`, `retentionPolicyVersion`, `createdAt`, `lastUsedAt`, `expiresAt`, `lastReconciledAt?`. Index owner/conversation/status, provider ID and expiry. Transactionally allow only one selected live session per conversation/mode. |
| `computerLeases` | `computerSessionId`, `runId`, `attemptId`, `epoch`, `heartbeatAt`, `expiresAt`, `controller: agent\|human`. One valid writer per machine; increment epoch on handoff/cancel/recovery. Gateway rejects stale epoch. |
| `computerActions` | `computerSessionId`, `runId`, `attemptId`, `toolCallId`, `sequence`, stable `effectOperationId`, `inputHash`, validated payload/ref, `leaseEpoch`, input observation revision/hash, risk classification, `interactionId?`, `status`, `effectCertainty`, timestamps, output revision refs and safe provider receipt. Indexed session/sequence and operation ID with transactional dedupe. |
| `computerEvents` | `computerSessionId`, action/run refs, app sequence, provider `event.id?`, delivery ID, event type, sanitized payload and occurred/persisted timestamps. Provider event identity deduplicates retries; delivery ID is diagnostic. |
| `computeUsage` | `computerSessionId`, run/attempt refs, provider execution/event IDs, explicit vCPU/RAM, allocated running seconds, rate-card version, measurement and reconciliation timestamps. Deduplicate execution segments and publish corresponding `usageEvents` once. |

Application session references are `computerSessionId: Id<"computerSessions">`, never provider sandbox IDs. Budgets remain `budgetReservations`; output/observations remain `artifacts`/`artifactRevisions`; decisions remain `interactions`. Shared `agentRuns.status` remains `pending | running | waiting_for_input | waiting_for_approval | succeeded | failed | cancelled`.

Conversation access is necessary but not sufficient: proposed initial Desktop/skill control is initiating-owner-only (Q5). Do not expose private observations in a collaborative transcript. Branches/comparisons cannot share a writer; a fork gets no cookies, VM or viewer token. Copying selected immutable artifacts into a new clean environment requires current ACLs and a new reservation.

### Session and action state machines

```text
session:
unallocated -> allocating -> ready -> busy -> ready
ready|busy -> pausing -> paused -> resuming -> ready
any live state -> reconciling -> ready|paused|lost|terminating
any live state -> terminating -> terminated
allocating|resuming -> failed  [only a known failure, not a lost ack]

action:
proposed -> policy_checked -> awaiting_approval -> authorized
policy_checked -> authorized                 [permitted bounded action]
authorized -> dispatching -> observing -> succeeded
dispatching|observing -> uncertain -> reconciled|needs_user
proposed|policy_checked|awaiting_approval|authorized -> denied|cancelled|expired
```

`desiredState` records intent; `observedState` records provider evidence. An expired lease cannot assert the VM stopped. Lost creation/pause/kill acknowledgement enters `reconciling`. An action in `dispatching` is not replayable merely because a worker died. Its shared tool-call projection is `unknown`/`uncertain`; `reconciled` requires evidence of the effect or no effect, with that evidence preserved.

Allocate lazily after ownership, mode/network policy and hard reservation checks. Store a stable create intent/key first. E2B creation idempotency on SDK ≥2.60 is team-scoped, valid 24 hours, and can return `422 idempotency_outcome_unknown`; that means inspect, not generate another key. S12 must also prove Desktop initialization retries do not start duplicate displays. [Creation contract](https://docs.e2b.dev/sandbox/idempotency.md).

Use explicit provider timeout, `autoResume:false` and a reviewed timeout policy. A viewer GET must never resume or extend billing. Resume first rechecks owner/policy/budget, then restores the complete egress policy, verifies readiness and obtains a new observation. Pause failure may leave the VM running. Unknown/disk-only resume mode requires process/window readiness checks; do not assume memory survived. Paused machines can persist indefinitely at E2B, so an application expiry/reconciler must terminate them (Q4). [Persistence](https://docs.e2b.dev/sandbox/persistence.md).

On Stop, fence queued actions, abort requests, stop process groups/background children and revoke viewers. **Pause is not cancellation:** suspended malicious work can resume. If stopping cannot be established, terminate the environment; keep uncertain external effects visible. On conversation/user deletion, durable cleanup retains the opaque provider IDs until termination is confirmed. A sweeper reconciles expired intents/leases/deadlines, retries bounded cleanup and settles actual running time; never silently hide an orphan or failed cleanup. Initial policy forbids snapshots/forks/volumes, because killing the source does not erase copies.

## Computer and script inputs

The model sees application IDs and bounded structured actions, never a raw sandbox ID, API key, arbitrary shell, host path or port.

| Input | Required validation and result |
|---|---|
| `StageInput {computerSessionId,inputArtifactRevisionIds[]}` | Resolve owner-authorized selected revisions only; current hash/MIME/size/total limits; generated safe names under a fresh work root. Return manifest IDs/hashes. No all-history/all-files staging. |
| `ObserveInput {computerSessionId,expectedLeaseEpoch}` | Bound image dimensions/bytes/frequency and selected window; return `{artifactRevisionId,contentHash,width,height,coordinateTransform,observedAt}`. Raw bytes are restricted artifacts. |
| `proposeComputerAction {computerSessionId,observationRevisionId,action}` | Discriminated action union: `click{x,y,button}`, `double_click{x,y}`, `move{x,y}`, `drag{from,to}`, `key{keys[]}`, `type{text}`, `scroll{direction:up\|down,amount}`, `wait{milliseconds}`, `navigate{url}`. Validate finite in-frame coordinates, observation age/hash, bounded text/scroll/wait and key allowlist. Unsupported adapters reject, never silently succeed. |
| `PinnedScriptInput {computerSessionId,skillVersionId,path,inputArtifactRevisionIds[],args}` | Exact published manifest member/hash, pinned interpreter/template/dependencies, structured bounded arguments. Run only in a separate clean **offline code** environment; no code execution on a live writable Desktop. |
| `ExportManifest {computerSessionId,files:[{relativePath,displayName}]}` | Bounded output root members only. No links/devices/escapes; verify bytes and MIME independently, hash and quarantine/scan. Return owned artifact revision IDs, not E2B download URLs. |

`proposeComputerAction` persists an action; an internal executor claims `performAction(actionId)`. The model cannot invoke authorization or viewer/control handoff functions. The policy engine evaluates the semantic effect of keys/typing/Enter/uploads as well as clicks. `navigate` uses a constrained URL launcher; Desktop `open`, `launch` and `press` string interpolation are not a safe shell boundary. Build audited argument/quoting wrappers and reject unsupported values, with S12 injection fixtures. [Versioned Desktop API](https://docs.e2b.dev/sdk-reference/desktop-js-sdk/v2.5.0/sandbox.md), [reviewed source](https://github.com/e2b-dev/E2B/blob/main/packages/desktop-js/src/sandbox.ts).

### Proposed policy boundaries, not permission grants

Effective capability is `platform ∩ current owner entitlement/budget ∩ reviewed run policy ∩ current data/account ACL ∩ skill restrictions ∩ actual model/runner capability`.

| Work | Initial proposal / reason |
|---|---|
| Text skills and references | No machine. Reading instructions has no compute requirement. |
| Approved scripts/selected-file computation | Offline clean code VM, no secrets/host mounts/cookies/install hooks/runtime installs. Prebuilt reviewed dependencies only (Q14). A directory is not isolation between hostile scripts and other files in the same VM. |
| Public browsing | Only under explicitly reviewed task/destination/data policy and budget (Q15). No arbitrary authenticated sites. Narrow egress does not prove every allowed-host request is a read; deny unsupported write-capable flows or mediate them through dedicated APIs. |
| Upload/send/post/delete/change settings | Initial Desktop does not commit these. Hand off or use a separately authorized exact-effect integration tool. A general browse grant cannot approve data upload. |
| Login/credential injection/purchases/payments | Unavailable initially. No copied host profile, cookies, API tokens, login collection in chat or secret-injection feature by default. A later design requires its own approval. |
| Incognito/collaborative computer | Block until erasure/ACL policy is approved and proven (Q4/Q5/Q15). Existing stateless code availability does not authorize durable Desktop. |

Explicitly set `network.allowPublicTraffic:false`; older E2B projects may have public ingress. Code interpreter ports can expose code/files. Offline scripts use `allowInternetAccess:false`; public browsing needs a deny-all allowlist and a reviewed full policy, including DNS, redirects, protocols and shared-CDN risks. `updateNetwork` replaces omitted fields; always send the complete policy. Host/SNI rules on 80/443 do not filter QUIC, and an allowed host can receive exfiltration. Secret transforms are a vendor feature, not consent. [Ingress](https://docs.e2b.dev/network/restrict-public-access.md), [egress](https://docs.e2b.dev/network/internet-access.md).

### Files, observations and private viewing

Exporter isolation must survive malicious filesystem changes: use no-follow, descriptor-bound transfer or a dedicated validated exporter, not `realpath` followed by an unchecked read. Enforce count/per-file/aggregate bytes, safe MIME and generated names; active HTML/SVG downloads are attachments or restricted previews under [10](10-artifacts-and-interactions.md), never executable app-origin files. Upload intents reconcile storage success/database loss; never leave unowned public blobs.

Observations use restricted `artifacts` with short retention policy/deletion deadline (exact TTL unresolved Q4), not current public plot URLs. Saving a screenshot is an explicit promotion to a deliverable. Downloads recheck current ACLs; public shares exclude observations, viewer keys, private skill bodies and input files by default. Vision-provider transfer follows Q8 and includes only necessary images. No raw frames, cookies, form contents or bearer URLs in logs, traces or analytics.

Ship authenticated screenshot polling first if protected streaming is unproven. E2B `stream.start({requireAuth:true})` and URL `viewOnly=true` do **not** establish a server-enforced read-only ACL. A future live viewer needs owner-authenticated HTTP **and WebSocket** proxy/tickets, private ingress, no-store/referrer restrictions, token rotation/revocation and server enforcement that rejects control messages. Never embed/log the raw password URL. Manual takeover is a separate control lease that fences the agent and obtains a fresh observation on return, not a writable iframe accidentally shipped as a viewer. [SDK evidence](https://github.com/e2b-dev/E2B/blob/main/packages/desktop-js/src/sandbox.ts).

## Compute limits and settlement

No numeric limit means **allocation blocked**, not unlimited (Q3). Before allocate/resume, reserve maximum running/wall seconds, vCPU/RAM, action/model/tool steps, input/output bytes and owner concurrent/day/month allowance in `budgetReservations`. Heartbeats cannot extend beyond its absolute deadline. Human waiting releases active compute safely; it cannot leave a paid machine spinning indefinitely. Awareness-only [current budget tracking](../../packages/backend/convex/lib/budgetTracker.ts) remains useful but is not a hard ceiling.

Record actual `getInfo()` resources, template build and allocated runtime. Official default-RAM pages conflict; do not price an assumed universal default. Versioned rates and all-in accounting live in [14](14-cost-model.md). Verified signature/replay checks and provider payload `event.id` dedupe lifecycle events; out-of-order events cannot regress state or double-settle. Reconcile missing events and invoices separately. Hard resource ceilings limit exposure; unknown remote charges prevent a perfect dollar guarantee.

## Experience: a quiet computer beside the answer

Under Quiet workbench (D-023/Q2), the result stays primary. Inline chat shows one saved-output or decision card using [10](10-artifacts-and-interactions.md); detailed clicks live in the **Computer** pane. Show actual session state, latest permitted observation, current task and Stop. Destinations, pinned skill/template and budget are secondary disclosure. Raw coordinates/payloads are hidden until requested.

| Moment | Interaction / intended feeling |
|---|---|
| Text-only skill | Ordinary answer plus quiet skill/version provenance; no computer-start spinner. |
| First allocation | “Starting a clean computer” only after admission; show real readiness, not a predicted finish time. |
| Human decision | Required exact-effect card stays outside collapsed activity. Human wait uses paused copy, not an endless spinner. |
| Stop or lost acknowledgement | “Stopped; action outcome unknown” with inspect/reconcile guidance; never “undone.” |
| Success | Artifact card opens a pinned saved revision. Closing the viewer does not stop or keep alive a task. |
| Narrow screen | Full-screen Computer with Back restoring the originating card/focus/reading anchor; Stop and decision remain reachable. |

Pause, Stop task and Delete computer explain their different effects in shadcn controls. Never use native dialogs or make a viewer URL a chat artifact. CLI/mobile receive state/receipt/stop projections without requiring an iframe ([17](17-cli.md), [18](18-mobile-and-desktop.md)).

## Incremental delivery and gates

1. **Native-result repair:** migrate wrapper/storage/continuation/renderer together, preserve code and citation contracts, use fake providers (S3). This does not require Desktop, a workflow package or a skill library.
2. **Existing executor hardening:** add trusted owner admission, cancellation and usage to the stateless code path; preserve Python/JS/plot compatibility. S12 resolves bundling before an SDK move.
3. **Offline script slice:** immutable reviewed inputs, clean environment, bounded exporter and hard reservation, fake gateway first. No streaming viewer required.
4. **Desktop slice:** S12 separately authorized dummy-data allocation, pinned browser/template, leases/observations/cleanup and policy. Live network starts wait for Q3/Q15; human waits need S8/Q19, not an indefinitely open request.

Required fixtures: native calculator/search/error results through actual consumers; wrong owner/run/branch; duplicate input and hash conflict; stale epochs/comparison writers; create-success/lost-ack and expired create key; stop during silent request/background child; click-success/lost-ack; pause failure/disk-only resume; forged viewer HTTP/WebSocket control; symlink-swap export; malicious launch/key/URL input; DNS/egress/secret absence; denied incognito; duplicate/out-of-order usage events; deletion during delayed callback. Test plans are not passed tests. S3/S8/S12/S17 plus affected-client S15 gate their respective releases. Keep migrations additive and old receipts readable until staged deployed-schema compatibility and cleanup reconciliation pass; rollback disables future allocation, not evidence or uncertain effects (D-030/D-033).
