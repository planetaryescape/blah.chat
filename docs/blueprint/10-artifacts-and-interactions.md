# 10: Artifacts and interactions

Make useful work and required decisions visible without turning chat into a tool dashboard. Artifacts are answers the person can open and keep. Questions gather missing information; approvals authorize an exact effect. Activity reports execution evidence. Apply [Quiet workbench](03-design-concept.md) to all four (D-008, D-010, D-023, D-024, D-025).

The current-app baseline is `04866f80a6236716ebf8d8c5a79001727f85f4bf`, reviewed on 2026-11-03. Everything below the baseline section is proposed. Decisions are in [21](21-decision-log.md); Q2/Q4/Q5/Q19/Q21/Q23 and S3/S8/S9/S15/S16 are in [22](22-open-questions.md). No schema migration, preview security test or durable human-wait implementation has run.

## Current path and repairs to preserve

| Existing code | Source-backed finding | Required change |
|---|---|---|
| `canvasDocuments`, `canvasHistory`, editor, version panel, export and cascade | There is already durable document storage. Public create does not check access to the supplied conversation. Read/update tools choose the first active document; UI selection chooses the newest. Neither editor nor tool requires an expected revision. | Migrate this owner and history; enforce parent access and explicit artifact/revision identity. Preserve existing content and recoverable history. |
| `ArtifactList` and normalized `toolCalls` | The cache returns normalized `toolName`/`args` rows while legacy readers project `name`/`arguments`; artifact cards now accept both shapes and native or legacy-serialized values. Native execution/storage results are retained, and unsuccessful document outcomes are excluded. | Keep the normalized consumer aligned with the durable `toolCalls` shape; do not add per-renderer tagged-string parsing. |
| Document-mode tools | The eligible tool set is built before generation. Entering document mode does not add create/read/update to that already-built set. | Make safe artifact creation available in normal eligible chat, independent of editor layout. |
| Clarification renderer and tool | The tool immediately returns success; options render as spans. There is no persisted answer, wait or resume. | Add one durable interaction protocol and real authored inputs; a nicer display alone is insufficient. |
| Timeline / tool-state helper | A missing result older than 30 seconds becomes a guessed failure. Activity disappears 800ms after generation stops and can say complete after stop/error. | Persist executor states and retain discoverable history with the actual outcome. |
| Canvas route | Desktop-only mounting, no general HTML preview. Existing manual-close preference is useful. | Full-screen narrow output with Back/focus restoration; add static preview without reopening on every update. |

Evidence: [full artifact and interaction trace](../../research_notes/blah-chat-agent-experience/artifacts-interactions.md#actual-artifact-path), [frontend contracts](../../research_notes/blah-chat-modernization-review/frontend.md), [native result defect](../research/modernization-review.md#p1-preserve-user-data-actual-payer-and-truthful-outcomes). These are source findings, not claims of observed production failures or an existing iframe vulnerability.

## One shared durable contract

[02](02-data-model.md) owns the canonical schema and indexes; [04](04-durable-generation.md) owns execution. Use the following names exactly. Do not create parallel `toolRuns` or `actionApprovals` stores. IDs reference their owning tables; times are epoch milliseconds. Model/owner/run identity comes from trusted context, never model arguments (D-015, D-017, D-021, D-025).

| Record / table | Canonical fields used here |
|---|---|
| Run / `agentRuns` | `ownerUserId`, `conversationId`, `messageId`, `branchHeadMessageId`, `clientRequestId`, `requestHash`, `source: interactive\|schedule`, `status`, `runnerVersion`, `policyVersion`, `catalogVersion`, `promptVersion`, `contextCheckpointId?`, `leaseEpoch`, `lastProgressAt`, `cancelRequestedAt?`, `createdAt`, `startedAt?`, `finishedAt?`; schedule Runs also `scheduleOccurrenceId` |
| Attempt / `runAttempts` | `runId`, `attemptIndex`, `leaseEpoch`, resolved model/API/gateway/host/payer/catalog/pricing references, provider request ID, `startedAt`, `finishedAt?`. Physical retries create another Attempt. |
| Tool call / existing `toolCalls`, extended additively | `runId`, `attemptId`, `providerToolCallId`, `sequence`, `toolName`, `toolSchemaVersion`, native `args`/`result`, `inputHash`, `effectOperationId?`, `status`, `effectCertainty`, `lastProgressAt`, timestamps. Persisted `_id` is the app identity; provider call IDs are not global keys. |
| Interaction / `interactions` | `kind: clarification\|approval`, `ownerUserId`, `conversationId`, `messageId`, `runId`, `attemptId`, `toolCallId?`, `branchHeadMessageId`, `request`, `requestHash`, `version`, `policyVersion`, `status`, `expiresAt?`, `answer?`, `answeredByUserId?`, `answeredAt?`, `resumeOperationId?` |
| Run event / `runEvents` | `runId`, `attemptId?`, `sequence`, `type`, `producer: orchestrator\|executor\|model`, bounded `payload`, `occurredAt`, `persistedAt`. Stable event IDs/cursors survive refresh. |
| Artifact / `artifacts` | Owner/conversation, `kind: document\|code\|html\|diagram\|image\|file`, `currentRevisionId`, `status`. Validated title, format and presentation metadata must not substitute for identity. |
| Revision / `artifactRevisions` | `artifactId`, `parentRevisionId?`, `ordinal`, `baseRevisionId?`, `operationId`, `operationOwnerUserId`, `requestHash`, `author: {kind:"human",userId} \| {kind:"agent",runId,attemptId,toolCallId}`, real `messageId?`, `contentRef`, `contentHash`, MIME/bytes, `status`; IDs branded by 02 |
| Message reference / `messageArtifacts` | Message/artifact/exact revision junction, ordered relation; it pins the historical answer, never just the current artifact. |
| Provenance / `artifactSources` | Revision/source junction with recoverable locator/attribution; source reads retain parent authorization. |

### State vocabulary and projections

```text
Run.status = pending | running | waiting_for_input | waiting_for_approval
           | succeeded | failed | cancelled

Tool call.status = pending | running | waiting_for_input | waiting_for_approval
                 | succeeded | partially_succeeded | failed | cancelled | unknown
Tool call.effectCertainty = none | confirmed | uncertain

Interaction.status = pending | answered | denied | cancelled | expired | superseded

Artifact.status = creating | ready | partial | failed | cancelled | archived
Revision.status = draft | committed | partial | failed | cancelled
```

Run terminals are monotonic. `cancelRequestedAt` requests cancellation; it is not an eighth Run state. Preparing, compacting, retrying and reconciling are event phases/reasons. Unknown external effects live on outcomes, not a new Run state. A clarification result is waiting, not successful execution.

Current `messages.status` remains `pending|generating|complete|stopped|error`. The Run-to-message projection is `pending → pending`, `running → generating`, `succeeded → complete`, `failed → error`, and `cancelled → stopped`. Add an explicit optional run/wait projection for the two wait states; do not claim they already exist in the current enum or leave old readers spinning/recovering a legitimate wait. [18](18-mobile-and-desktop.md) and S15 gate compatibility.

## Artifacts as ordinary answers

Expose typed `createArtifact`, `getArtifact` and `updateArtifact` operations to the normal eligible tool set. Eligibility still applies incognito, permissions, budgets and model capabilities. No upfront "artifact mode" or extra turn is required to create a private nonexecuting visual. The editor is a view, not the permission to create work (D-008, D-024; Q23).

Create an artifact when spatial explanation, comparison, a reusable document or a visual makes the answer better. A CSS-only request-path diagram is a valid answer even if the user will never edit it. Keep direct facts and short snippets in prose; do not use length alone as the trigger. Respect an explicit artifact request unless the format or permission is unavailable. Return a brief explanation plus the artifact, not a second full transcript copy.

| Operation | Input and binding | Result / failure |
|---|---|---|
| Create | Validated `kind`, title, bounded content or owned immutable asset references, display purpose; server binds owner, conversation, message, Run, Attempt, Tool call and stable `operationId`. | Native typed reference containing artifact ID, revision ID and truthful status. Unsupported type, invalid asset, forbidden parent or size limit fails before publication. |
| Get | Exact `artifactId` and `revisionId`; current revision only through an explicit latest request. | Authorized manifest/content/source projection, or distinct not-found/forbidden/unavailable outcome. Hash possession is not access. |
| Update | Explicit `artifactId`, `baseRevisionId`, bounded replacement or validated patch; same trusted context and operation identity. | New immutable revision only if the base remains current. Conflict returns current revision identity for review; no inferred "active document" target. |

Validate tools at the execution boundary, not just in model JSON schemas. All HTTP projections use the existing API envelopes; subscriptions/cache readers consume the same typed projection, not SDK-specific result guesses ([01](01-architecture.md), D-002, D-015).

### Atomic create/update and lost acknowledgements

1. Authorize the caller **before the shared revision CAS**. Agent tools prove conversation/source-message authority plus exact live Run/Attempt/lease, current cancellation and nonterminal fences. Human editor saves derive `userId`/`operationOwnerUserId` from authentication and check current artifact and parent edit rights, not a completed Run's lease. Store exactly one typed author variant; human revisions omit agent references. Both check `(artifactId,operationOwnerUserId,operationId)` transactionally against `requestHash` covering kind/content/base/target. Identical replay returns its stored receipt only after current read/edit authority checks; changed input conflicts. A stale agent cannot publish by replaying a human operation.
2. For agent create, commit artifact, initial revision, real message junction and durable operation/tool outcome together. For update by either caller, compare `baseRevisionId` to `currentRevisionId`, validate the whole patch against that base, then atomically insert the next revision, advance the pointer and write its receipt and any real authorized message association. A human save requires no invented message/Run/Attempt and does not rewrite historical message pins. Transactional checks enforce one winner even without a SQL-style unique constraint.
3. A lost acknowledgement after commit is a read/retry of the same operation, not permission to generate a fresh ID. One operation produces at most one committed revision and one logical message association. A retrying model call receives the original reference.
4. Persist bounded draft snapshots with ordered progress before showing them. If large content needs staged blob upload, commit only an authorized immutable reference; track unreferenced uploads for policy-governed cleanup. Never publish a pointer to incomplete bytes. Draft publication and final commit have idempotent phase/sequence checks under the same operation.
5. Keep the last committed preview while a new draft says "Updating". A stop/failure retains recoverable partial/source state and the original committed revision. Never call an incomplete draft ready or delete a confirmed effect merely because later generation failed.

User and agent edits use the same compare-and-swap rule. If both start at v2, only one can advance the current pointer; the other retains its proposed text and gets a conflict. Show current/proposed versions or diff and a deliberate retry/rebase action. Do not auto-merge overlapping patches, apply only the convenient hunks or silently overwrite the user's editor buffer. A display error retries display, not generation or mutation (D-017, D-024; S3/S9).

Historical messages pin their exact revision. "Latest version" is an explicit action, with Back returning to the pinned reference. Identical titles never merge artifacts. Source links belong to authorized revision/source records; generated hyperlinks are not factual provenance.

### Format handlers and experience

| Kind | First useful behavior | Boundary |
|---|---|---|
| `document` | Sanitized Markdown preview, source/editor, versions, raw Markdown/text export | Reuse [11](11-rendering-and-narration.md); no MDX evaluation. |
| `code` | Existing editor/highlighter, language/filename, raw copy/download | Creating source does not execute it or install packages. |
| `html` | Static isolated HTML/CSS visual, text alternative, Source and pinned export | No scripts, external assets, forms or navigation. |
| `diagram` | Source plus bounded strict diagram preview and accessible description | Reject policy-relaxing directives; preserve original source when displaying a repaired rendering. |
| `image` | Owned existing asset reference with MIME/dimensions/alt/source/version | No new unadmitted image-spend path or uncontrolled remote fetch. |
| `file` | Authorized file manifest, safe download, type/size/source, fallback text where available | Unknown formats remain download-only; do not execute them to obtain a preview. |

The workspace header keeps title, revision and save state visible. Preview/Source are predictable tabs; Versions and Export are secondary. Export uses the exact selected revision, sanitized filename, correct MIME and attachment disposition. Label "Download HTML source" separately from any stripped static snapshot. Explain that raw HTML/SVG/code may execute outside the app; never auto-open or auto-download generated files. Preview failure says "Preview unavailable" and leaves text/source/export, not "Artifact lost".

Wide screens may split chat and output. Narrow screens use full-screen output with a named Back control; restore card focus and message/block anchor after mounting the row. Do not reopen a manually closed workspace on each update. CLI/mobile retain the same names and receipts with source/export fallback, not an iframe requirement (D-023, D-031; Q2/Q22; S9/S15).

## Static HTML isolation

HTML creation authorizes a static visual only. Initial preview has no generated JavaScript, forms, network, navigation, nested frames, workers or parent tool bridge. This policy makes useful CSS visuals possible while arbitrary-JS isolation remains unresolved (D-024; Q23; S9).

1. Parse/sanitize a bounded fragment. Strip scripts, event attributes, model-written document wrappers/meta/base/link, refresh, form controls/submission targets, embedded documents/media, navigation attributes and active SVG. Strip CSS imports and network-bearing URL functions. Permit only reviewed static elements/styles and validated bounded raster data images; reject data SVG. Bound bytes, DOM/depth, styles and image dimensions before display.
2. Render inside a titled frame with `sandbox=""`, `referrerPolicy="no-referrer"`, no `allow-same-origin` and explicit denial of device/clipboard permissions. This gives each document a unique opaque origin. Never inject preview HTML into the app DOM or preview an unsandboxed app-origin Blob.
3. Serve the preview through a separate registrable domain with no app auth cookies, analytics or credentials. Prefer a per-preview isolated address and enforce sandbox/CSP in response headers, including on direct navigation. Random subdomains are not automatically public-suffix or cookie isolation. Review delivery so private content is not placed in public URLs, caches or a third-party hosted shim without consent ([13](13-privacy-safety-compliance.md)).
4. Enforce a policy equivalent to the following on the preview response, not the parent application. Resolve the parent-origin allowlist explicitly before release:

```text
default-src 'none'; script-src 'none'; connect-src 'none';
style-src 'unsafe-inline'; img-src data:;
font-src 'none'; media-src 'none'; object-src 'none';
frame-src 'none'; child-src 'none'; worker-src 'none';
manifest-src 'none'; base-uri 'none'; form-action 'none';
frame-ancestors <reviewed app origins>; sandbox
```

5. Remove outbound links, `ping`, targets, refresh and other navigation mechanisms even with CSP. A sandboxed frame can navigate itself; `connect-src` and `default-src` are not universal navigation/egress controls. Show links as inert text or a trusted host-owned "Open source" action after HTTP(S) validation and user activation.
6. A temporary static `srcdoc` prototype must use a trusted wrapper with CSP meta before all generated content. Meta cannot set CSP sandbox or `frame-ancestors`, and `srcdoc` is not separate hosting. It cannot satisfy direct-navigation hosting evidence by itself. If production isolation is not ready, keep HTML preview disabled and ship source/text/export instead.
7. The static frame needs no generated-code messaging. Any future trusted shim may accept only bounded revision/channel-bound ready/error/resize diagnostics, checked against `event.source`, exact frame and schema. An opaque `origin: null` is not authentication. Clamp sizes/rates, reject sibling/stale messages and never grant tools, answers, approvals, chat access or credentials through that bridge.

A frame load event does not prove a successful preview. Isolate display errors, cap one active preview and unload when closed. Do not promise that an opaque origin provides a separate process or prevents CPU denial of service on every device.

Scripts stay deferred. A later explicit "Run this version" capability must bind immutable revision/content hash and a reviewed runtime/network policy, then create a new frame. Neither HTML creation, generic "yes", file export nor a stale approval grants execution. Sandbox plus CSP, monkey-patched fetch or a hosted "safe frame" does **not** establish that arbitrary browser JS cannot exfiltrate. S9 requires navigation/WebRTC/other-channel analysis and supported-browser evidence before such a claim. If that boundary cannot be demonstrated, retain static HTML or allowlisted authored interactions.

Primary limits and prior art: [WHATWG sandbox](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox), [CSP meta restrictions](https://w3c.github.io/webappsec-csp/#meta-element), [researched isolation evidence](../../research_notes/blah-chat-agent-experience/artifacts-interactions.md#official-isolation-facts-that-constrain-the-design). These constrain a future implementation; no hostile-preview corpus has passed.

## Questions and approvals

Use authored components with typed props, never generated form HTML. Both kinds live in `interactions`; their request payloads and authority differ. Default authority is the initiating owner. Collaboration, readonly/public projections and retention require Q4/Q5, not inherited conversation membership alone (D-022, D-025).

### Clarification request and answer

Proposed authored request payload:

```ts
type ClarificationRequest = {
  schemaVersion: 1;
  title: string;
  context?: string;
  questions: Array<{
    id: string;
    prompt: string;
    kind: "single" | "multiple" | "text";
    options?: Array<{ id: string; label: string; description?: string }>;
    required: boolean;
    allowOther?: boolean;
    minSelections?: number;
    maxSelections?: number;
    minLength?: number;
    maxLength?: number;
  }>;
  allowCancel: boolean;
  requestedTimeoutSeconds?: number;
};

type SubmitAnswer = {
  interactionId: InteractionId;
  expectedVersion: number;
  clientRequestId: string;
  answers: Array<{
    questionId: string;
    selectedOptionIds?: string[];
    text?: string;
  }>;
};
```

Start with a validated policy cap of 1–4 questions, 2–8 choice options and 2,000 answer characters per question; these are proposed product bounds to confirm in the S9 comp, not measured limits. Ask the fewest material questions. IDs must be stable/unique. Reject unknown fields/choices, duplicate IDs, impossible min/max, mismatched options for text and empty required values on both create and answer. Define "Other" as mutually exclusive with choice IDs unless the request explicitly supports a separate supplemental text field; the server rejects ambiguous combinations.

Use fieldset/legend, native radio/checkbox/text controls, descriptive option text and an explicit "Use answer(s)" button. Multi-select never submits on a single click. Free text is a real labelled field, not a fake option. A recommended option may explain a reason but cannot be pre-consent. Validate inline with `aria-invalid`/`aria-describedby`; focus the first invalid field only after attempted submission. Escape follows component/dialog semantics, never silently answers. Global Enter shortcuts must not submit a decision or intercept IME composition.

Pending cards stay in the main answer area outside Activity, with "Your answer needed" and Stop task. Required means needed to continue, not an obligation to comply. Skip optional questions explicitly; cancel/stop are typed outcomes, never empty answers. A normal composer message cannot silently consume a pending card; offer an explicit "Use this as my answer" association. Preserve unsent card text on failed acknowledgement, lock during submission, and show "Answered" only after receipt. A retry with the same request ID retrieves that receipt.

The server sets `expiresAt` under policy; model timeout suggestions do not set authority. Show an absolute local deadline only if one exists. No invented countdown or urgency. Expired, cancelled and historical cards remain readable but inert. Arrival announces availability once without stealing composer/reader focus. Do not virtual-unmount an actively edited/focused card without preserving its draft and a deliberate focus strategy.

### Approval request

The trusted executor constructs an approval payload from validated arguments. It binds the exact effect/tool/schema/policy version, Run/Attempt/Tool call, selected account and its revision, destination/resource/recipient/audience, input hash, content or artifact revision/hash, attachments, permission scope and expiry. A canonical `requestHash` covers that payload. The model cannot label itself approved or lower the required authority.

Render the actual account, action, destination and material content/diff before the decision. Include known cost and irreversibility; label unknown cost rather than inventing it. Initial choices are allow once and deny, with verbs such as "Send once" / "Don't send". No default checked approval, global Enter, generic "Continue", "Always allow" or approval hidden in clarification choices.

An allow decision is stored as Interaction `answered`; a denial is `denied` with the recorded deny decision. Both return a receipt. "Approved, not started" is not effect success. Only a durable executor receipt can say "Sent". Changing account, content, destination, capability or policy invalidates the grant and requires a new request. No grant means no dispatch, even after timeout. Public/readonly views cannot answer or approve. Future persistent grants need a separate reviewed policy and revocation path ([07](07-tools-and-computer.md), [09](09-integrations.md), [13](13-privacy-safety-compliance.md)).

### Durable park/resume and one winning answer

1. At a bounded execution boundary, persist validated Interaction, pending Tool call identity, exact branch, typed provider history, completed effects, artifact references and sufficient continuation state. Atomically move the Run to `waiting_for_input` or `waiting_for_approval` and its Tool call to the matching wait. Stop the autonomous loop. Do not hold a Node action/browser Promise open or let ordinary stale-generation recovery expire the wait.
2. Account for parallel work already dispatched before promising a pause. Retain its receipts and uncertain outcomes independently. Creating a question does not undo another tool's completed effect.
3. An authenticated answer mutation derives the actor from session and rechecks current authority, run/attempt/branch, policy/request hash, expected version, expiry and `pending`. Validate the answer against the stored request, not a client-resupplied form/schema.
4. In one transaction, compare-and-swap `pending` to its accepted outcome, store answer/actor/time and create one `resumeOperationId` admission intent where continuation is allowed. Identical `clientRequestId`/payload retries return the receipt. A different answer or losing tab returns conflict plus actual state. Transaction ordering decides answer-versus-expiry/denial/stop races.
5. Resume only the saved boundary under a fresh valid lease. Inject one typed human result and retain the same Run, prior outputs and usage. Physical retry/replacement execution records a new Attempt under [04](04-durable-generation.md); every provider call retains its own usage attribution. Never replay earlier successful effects to reconstruct context. S8 chooses explicit persisted continuation or Convex Workflow after evidence; neither is selected here merely by attractive UI.
6. Denial, expiry, revocation, supersession and Stop task invalidate unconsumed continuation authority through the same fenced protocol. Stop cancels pending interactions and resume intents; delayed answers cannot revive a terminal Run. Clarification expiry never supplies a default answer. Approval denial/expiry never dispatches the proposed effect. Default to cancelling that parked Run with the specific reason, preserving its partials and receipts; a fresh user turn may request an alternative. Do not add denied/expired Run enum members. Any future automatic fallback needs an explicit reviewed policy and cannot reinterpret denial as consent.

Before an approved effect dispatches, the executor rechecks the exact payload/account/content hashes, current permissions, expiry, lease and cancellation fence. Consuming an answer alone does not bypass those checks. Its effect operation ID prevents grant replay from creating another logical effect; remote uncertainty still requires reconciliation.

The guarantee is one accepted answer and one logical continuation admission, not exactly-once physical remote effects. The effect ledger/idempotency/reconciliation rules remain necessary. A lost remote acknowledgement stays `unknown`/`uncertain` until evidence resolves it (D-017, D-021, D-025; Q19; S8).

## Truthful activity

Activity is one compact line plus durable disclosure beside the answer. Keep outcomes after completion; do not remove them on an 800ms timer. Old turns may start folded. Respect explicit disclosure choices across virtual-row remounts and never replay an old collapse-all event over a later manual opening. Artifacts and pending decisions remain outside the fold (D-011, D-023, D-025).

| Evidence | Honest display | Never infer |
|---|---|---|
| Admitted pending Tool call | "Queued" | It started because the model mentioned it. |
| Executor `running`, fresh progress | "Searching your files" / real phase | A rotating client sentence proves server health. |
| Meaningful executor count | "3 of 8 files read" | A plan fraction is percent complete or a time estimate. |
| Durable wait | "Waiting for your answer" / "Waiting for approval", pause glyph | Returned question equals successful tool execution. |
| Old `lastProgressAt` | "No update since …", with safe recovery details | The browser can declare failure after 30 seconds. |
| Confirmed result | Succeeded, partially succeeded or failed, with actual targets | Any nonempty result is success. |
| Cancel / uncertain result | "Cancelled" or "Checking whether it completed" | Stop means undo; no acknowledgement means no effect. |

Use ordered `runEvents` and app Tool call IDs, with `producer` distinguishing a model-authored plan from executor evidence. Plans are labelled proposals; they may be absent. Persist meaningful terminal/wait/approval/artifact-commit transitions. Coalesce bounded high-frequency progress into latest snapshots without dropping those transitions. A reconnect uses its cursor or an authorized canonical snapshot if the cursor is too old. Fence stale Attempt events; an old worker cannot settle a newer Run or reverse terminal state.

One semantic announcer owns started/waiting/resumed/partial/failed/cancelled/complete changes. Neither token updates, elapsed ticks nor every expanded log row are live speech. Keep timer text out of its live region. Telemetry links durable IDs with redacted metadata but cannot drive authorization, accounting or UI truth ([15](15-observability-and-evals.md), D-034).

## Migration and reuse

Migrate `canvasDocuments` code/prose to artifact code/document, and `canvasHistory` to immutable revisions. Preserve old IDs through an explicit mapping, content/version ordering, owner/conversation and reconstructable provenance. Mark legacy provenance unknown when it cannot be recovered. Do not invent message associations or treat imported HTML as reviewed. Move all writes to the single artifact owner before retiring legacy writers; compatibility reads/projected old document IDs may remain, but there must not be two independently authoritative current documents.

Extend cleanup, account-partitioned local caches, shares and API projections for revision/source/message junctions and interactions. Recheck access for every read/history/update/export/asset issuance, including revocation. Do not add durable incognito artifacts until erasure is proven. Retention and collaborator grants stay Q4/Q5; additive schema/deployed coexistence is [02](02-data-model.md)/[13](13-privacy-safety-compliance.md), not an implied migration approval.

Gate artifact creation, static HTML, durable interactions and any future scripts separately. Rollback disables new starts but retains compatible readers/responders for saved revisions and already parked Runs. Never migrate an unanswered request into granted consent.

Reuse existing editor/history/cascade, native result metadata and cards first. Public AI Elements offers composed shells, assistant-ui typed human/approval distinctions and LibreChat one-winner resume cases; their licenses and exact source pins are in the [prior-art note](../../research_notes/blah-chat-agent-experience/artifacts-interactions.md#maintained-implementation-references-and-copying-terms). Notto GitHub `41593a0caf0ac3d00e7744aaae3dbf7be0669de0` informs hierarchy/disclosure/turn-end behavior, not a persistence guarantee or copying grant. Q21 gates copying implementation/tests; [19](19-reuse-map.md) records the divergent GitLab pin. No Notto theme, SSE runtime or Redis/BullMQ transplant is required.

## Release evidence

These are narrow future fixtures, not reported passes. Use fake providers, seeded owner-isolated records, fake clocks and real browser network interception. S3/S8/S9 gate their respective boundaries; S15 checks other clients. Comp and keyboard/touch/assistive-technology review must also pass [03](03-design-concept.md).

| Fixture | Required observation |
|---|---|
| Native shape / normal turn | Real schema-shaped create/update results render exact cards outside Activity; malformed/error/string results cannot fabricate ready work. Normal chat can create a static visual in one turn; a short factual answer need not create one. |
| Lost create/update acknowledgement | Retry the same operation after commit. Exactly one artifact/committed revision/message reference and the original receipt; changed payload under the same key conflicts. |
| Two documents / user-agent race | Each write names the intended artifact/base. Two writers at one base have one winner; losing draft is preserved. Historical v1 opens v1 after current v3, including comparison branches. |
| Human save after completion | After the producing Run is terminal, an authenticated authorized human can save a new revision with human author and no agent references. Duplicate save returns the receipt; revoked edit rights reject. A late agent write still fails its terminal/lease fence; racing live agent/human writes at one base have one winner and preserved losing text. |
| Stop / partial / preview failure | Refresh retains committed work and labelled partials. A display retry does not rerun tools. No late event changes terminal state or silently overwrites source. |
| Static HTML adversarial corpus | Script/event/SVG/nested-frame/meta/base/CSS URL/import/form/navigation/wrapper payloads cannot execute, navigate, access parent state or issue unauthorized requests. Test Chromium/Firefox/WebKit, direct preview navigation and forged/stale frame messages. |
| Question controls and answer race | Single/multiple/free text, invalid schemas/answers, failed ack, duplicate click and two tabs produce one accepted answer/resume intent. Refresh retains pending state; expired/stopped/revoked/historical requests cannot resume. |
| Exact-effect approval | Generic yes, forged payload, changed content/account, expiry and denial cause zero dispatch. Allow shows approved-not-started; only executor evidence shows completion. Lost remote ack is uncertain, not auto-retried. |
| Activity and cross-client reading | Slow healthy tool never becomes failed by client age. Terminal history stays inspectable; manual disclosure survives remount; no fake percent/time. Mobile Back restores origin; readonly/CLI projections preserve words/IDs and cannot grant capabilities. |

Record actual errors, effect counts, state transitions and observed requests. S16 measures rendering/disclosure overhead before any performance claim. Neither a passing screenshot nor a frame's load event proves these contracts.
