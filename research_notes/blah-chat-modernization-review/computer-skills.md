# Conversation computers and user-owned skills

Research verified on **2026-11-03** against local source, official E2B documentation, the E2B SDK repository, npm registry release metadata, and the Agent Skills specification. This is research and a proposed implementation contract, not an implementation or a claim that the proposed tables already exist. No sandbox was started, credentials requested, dependencies installed, tests run, or paid service called.

BK's approved capability requirements, supplied in the assignment:

> "instead of just code execution we can now use e2b to actually give this agent a computer to perform tasks on."
>
> "I also want to implement skills so that a user can add skills and the agents can use those skills when asked directly by the user or when they find a task that could use them"

These approve computer-task support and user-added, explicitly or automatically activated skills. They do **not** settle public sharing, marketplace imports, authenticated browsing, retention periods, spending limits, or autonomous consequential actions. Recommendations below are labeled proposals or assumptions.

## 1. What can be reused, and what does E2B actually provide?

### Takeaway

Keep the working E2B code interpreter and add a separate, lazily allocated Desktop execution mode. E2B supplies Linux machines and input/output APIs; blah.chat must still supply model adapters, durable ownership, permissions, approvals, and the execution loop. Evidence: [existing route](../../apps/web/src/app/api/code-execution/route.ts#L78), [Desktop guide](https://docs.e2b.dev/use-cases/computer-use.md).

### Cited findings

#### Current repository map

| Existing code | Verified behavior | Reuse or change |
| --- | --- | --- |
| [`packages/backend/convex/ai/tools/codeExecution.ts:6-40`](../../packages/backend/convex/ai/tools/codeExecution.ts#L6) | AI SDK factory exposes Python/JavaScript, stdout/stderr, plots; calls an internal action. It accepts `ctx`, not user/conversation/run identity. | Keep the factory pattern and current simple-tool contract. Add a separate computer factory with authenticated execution context. |
| [`packages/backend/convex/tools/codeExecution.ts:8-44`](../../packages/backend/convex/tools/codeExecution.ts#L8) | Convex proxies to Next.js to avoid a documented ESM/CommonJS/chalk bundling problem; request has internal bearer authorization and a 75-second fetch timeout. | Reuse the server boundary first. A direct Convex SDK migration needs a bundling spike, not an assumption that today's proxy is unnecessary. |
| [`apps/web/src/app/api/code-execution/route.ts:11-85,156-168`](../../apps/web/src/app/api/code-execution/route.ts#L11) | Validates bounded JSON, 100,000-character code, Python/JavaScript, timeout 1-60 seconds, and internal authorization or Clerk sign-in. Creates a fresh sandbox per request and kills it in `finally`; has no persisted sandbox identity. | Preserve stateless mode. Do not make this endpoint silently persistent or treat signed-in access as conversation authorization. |
| [`packages/backend/convex/lib/internalAuth.ts:3-42`](../../packages/backend/convex/lib/internalAuth.ts#L3), [`route.test.ts:43-90`](../../apps/web/src/app/api/code-execution/route.test.ts#L43) | Actual bearer secret validation exists. Tests cover forged boolean headers, malformed input, accepted authentication, and cleanup. | Extend this boundary, do not report the historical boolean-header issue as still unguarded. Internal authentication is not per-user authorization. |
| [`apps/web/src/app/api/code-execution/route.ts:98-145`](../../apps/web/src/app/api/code-execution/route.ts#L98), [`packages/backend/convex/http.ts:69-120`](../../packages/backend/convex/http.ts#L69) | PNG plots are copied into Convex storage and returned as `{url, storageId}`. The storage handler checks internal auth, content type and bounded bytes, but does not create an owner/conversation artifact record. | Reuse transfer/storage mechanics, not this ownership model for private desktop screenshots. |
| [`packages/backend/convex/generation/tools.ts:90-118,160-176`](../../packages/backend/convex/generation/tools.ts#L90) | `codeExecution` is an always-available capability tool, including incognito; read/write tools have separate incognito rules. | A computer with files, cookies, network and external side effects does not fit the current "stateless, no persistent writes" category. Give it an explicit capability policy. |
| [`packages/backend/convex/generation/tools.ts:268-354`](../../packages/backend/convex/generation/tools.ts#L268) | Active Composio connections add tools outside incognito. All executed tool results are serialized into `<tool-data>` strings described as data, not instructions. | Reuse normalization and integration assembly; deliberately distinguish skill instructions and multimodal screenshots from ordinary untrusted text results. |
| [`packages/backend/convex/generation.ts:648-684,803-845,860-938`](../../packages/backend/convex/generation.ts#L648) | Generation is server-side; supports tools on capable models, aborts the model stream after checking durable message status, persists tool calls/results, and accounts for estimated result tokens. | Keep chat subscriptions and tool-call persistence. This code does not propagate cancellation into the current `codeExecution` factory/action/route. Persisted tool calls alone are not a replay-safe external-action ledger. |
| [`packages/backend/convex/lib/budgetTracker.ts:1-10,46-99,120-144`](../../packages/backend/convex/lib/budgetTracker.ts#L1) | Budget tracking is described as awareness, with per-generation counts and timeout constants; `withTimeout` races promises. `codeExecution` itself does not receive that state. | Reuse estimates for context awareness. Add transactional hard compute reservations and real process cancellation; a promise timeout does not stop remote work. |
| [`packages/backend/convex/schema.ts:222-243,416-469`](../../packages/backend/convex/schema.ts#L222) | Durable messages have pending/generating/complete/stopped/error; attachments and tool calls are normalized and user/conversation scoped. | Add run/action/artifact records linked to these IDs rather than embedding screenshot bytes and mutable VM state in message content. |
| [`packages/backend/convex/schema.ts:195-206`](../../packages/backend/convex/schema.ts#L195), [`conversations/branching.ts:11-35`](../../packages/backend/convex/conversations/branching.ts#L11) | Conversation access includes owner or collaborative participant. | Reuse access checks for chat, but do not infer that every participant may see private desktops, authorize actions, or activate the owner's private skills. |
| [`apps/web/src/components/chat/toolRenderers/CodeExecutionRenderer.tsx:7-120`](../../apps/web/src/components/chat/toolRenderers/CodeExecutionRenderer.tsx#L7) | Existing result renderer shows code, output, plot URLs, failure and duration. | Preserve it for code execution and add a computer activity renderer/pane rather than squeezing every action into code output. |
| [`apps/web/src/components/chat/ArtifactList.tsx:14-55`](../../apps/web/src/components/chat/ArtifactList.tsx#L14) | Existing artifact cards only recognize canvas document creation/update results. | Extend presentation with a typed file-artifact path. Arbitrary sandbox downloads are not already supported by these cards. |
| [`packages/chat-ui-core/src/commands.ts:1-44`](../../packages/chat-ui-core/src/commands.ts#L1), [`ChatInputSlashMenu.tsx:22-34`](../../apps/web/src/components/chat/ChatInputSlashMenu.tsx#L22) | Shared composer commands are model, think, template, compare; web menu icons have a closed command-ID mapping. | Add `/skill` through shared command types and web/mobile adapters, not a web-only text substitution. |
| [`.agents/skills/ai-tool-creation/SKILL.md:1-3`](../../.agents/skills/ai-tool-creation/SKILL.md#L1), [`generation/tools.ts:78-248`](../../packages/backend/convex/generation/tools.ts#L78), [`schema.ts`](../../packages/backend/convex/schema.ts) | Developer guidance skills exist in `.agents/skills/`. The audited production tool registry/schema do not expose a tenant skill catalog, skill activation tool, or computer-session tables. Custom instructions and project prompts are already assembled separately in [`lib/prompts/systemBuilder.ts:39-95,147-159`](../../packages/backend/convex/lib/prompts/systemBuilder.ts#L39). | Developer-agent skills are useful format examples, not a product user skill library. Do not auto-import local developer skills or confuse procedural memories with executable skills. |

Documentation warning: [`docs/features/tool-calling.md:114`](../../docs/features/tool-calling.md#L114) still calls code execution "Planned" despite the implementation above. Prefer source over that status table. The project skill says AI SDK v5, while [`generation/tools.ts:103-105`](../../packages/backend/convex/generation/tools.ts#L103) explicitly discusses v6 policy. Re-check actual APIs before implementation.

#### Verified package versions, not installation instructions

| Package | Repository lockfile | Current published release verified 2026-11-03 |
| --- | --- | --- |
| `@e2b/code-interpreter` | `2.3.3` | `2.9.1`, published 2026-11-02, dependency `e2b ^2.62.1` |
| `e2b` | `2.12.1` transitively | `2.62.1`, published 2026-11-02 |
| `@e2b/desktop` | Not found in audited manifests/lockfile | `2.5.0`, published 2026-10-13, dependency `e2b ^2.56.0` |

Sources: [`bun.lock:1148,2822`](../../bun.lock#L1148), [`packages/backend/package.json:33`](../../packages/backend/package.json#L33), npm registry metadata for [`e2b`](https://registry.npmjs.org/e2b), [`@e2b/code-interpreter`](https://registry.npmjs.org/@e2b%2Fcode-interpreter), [`@e2b/desktop`](https://registry.npmjs.org/@e2b%2Fdesktop), and official [versioned SDK index](https://docs.e2b.dev/llms.txt). SDK sources moved into [`e2b-dev/E2B/packages/desktop-js`](https://github.com/e2b-dev/E2B/tree/main/packages/desktop-js); the [desktop repository](https://github.com/e2b-dev/desktop) now retains templates/examples.

Proposal: test an exact, coherent baseline of `e2b@2.62.1`, `@e2b/code-interpreter@2.9.1`, `@e2b/desktop@2.5.0` when implementation is authorized, resolve the actual transitive tree with Bun, and pin the template build. Do not assume a caret range guarantees a single SDK copy. Existing [`apps/web/package.json:195-203`](../../apps/web/package.json#L195) also overrides chalk, so upgrade/bundling compatibility needs verification. No package was changed here.

#### Three layers that should remain separate

1. **Ordinary sandbox.** `e2b` gives an isolated Linux execution environment with commands/files/lifecycle/network APIs. The specialized code interpreter adds `runCode`, code contexts and rich outputs. It is not inherently a graphical desktop. Sources: [sandbox lifecycle](https://docs.e2b.dev/sandbox.md), [code interpreter SDK](https://docs.e2b.dev/sdk-reference/code-interpreter-js-sdk/v2.9.1/sandbox.md).
2. **Desktop environment.** `@e2b/desktop` defaults to the `desktop` template and extends the base sandbox with screenshots, mouse/keyboard/window APIs and VNC streaming. Official documentation describes Ubuntu 22.04, XFCE, LibreOffice, editors, file manager, xdotool/scrot and noVNC. This is a remote Linux machine, not control of the user's Mac/Windows computer. Sources: [Desktop template](https://docs.e2b.dev/template/examples/desktop.md), [Desktop SDK](https://docs.e2b.dev/sdk-reference/desktop-js-sdk/v2.5.0/sandbox.md), [source](https://github.com/e2b-dev/E2B/blob/main/packages/desktop-js/src/sandbox.ts).
3. **Model/tool adapter.** A model interprets screenshots and emits actions; application code maps them to E2B calls and returns fresh observations. E2B is not the reasoning model or the approval system. The official OpenAI example supplies a `ComputerDriver`, explicitly rejects unsupported held-key mouse actions and horizontal scrolling, and says the helper does not create/close the environment. Source: [E2B OpenAI computer-use integration](https://docs.e2b.dev/agents/openai-computer-use.md). Keep provider-specific action/result formats behind adapters, not in persisted app state.

The [computer-use guide](https://docs.e2b.dev/use-cases/computer-use.md) demonstrates browser tasks, but an application/browser must actually exist in the selected template. The published template example's package list does not establish that every named browser is preinstalled. Pin and smoke-test the chosen browser build. Playwright browser automation, screenshot-based desktop interaction, and shell/PyAutoGUI execution are different control strategies, all requiring policy checks. The official [OpenAI integration](https://docs.e2b.dev/agents/openai-computer-use.md) describes both structured action and code-execution approaches; no model ID or provider access is guaranteed by E2B.

#### Lifecycle, persistence and remote access facts

- `Sandbox.connect(id)` resumes a paused machine and only extends its remaining lifetime; use `setTimeout` for an exact shorter expiry. The latter counts from the time of the call. Pause normally preserves filesystem and memory/processes. Kill is terminal. Source: [persistence](https://docs.e2b.dev/sandbox/persistence.md).
- Default timeout behavior is kill; explicit `lifecycle.onTimeout: 'pause'` changes it. Set `autoResume: false` for application-mediated resumes. Paused machines are retained indefinitely, with no provider auto-kill-after-N-days option. Service clients disconnect across pause and must reconnect. Source: [persistence](https://docs.e2b.dev/sandbox/persistence.md).
- Current documentation reports approximate pause cost of four seconds per GiB RAM and roughly one-second resume, not an application SLA. A refused pause can leave the VM running; rolling-out auto-pause fallback can preserve disk only and lose memory. Treat missing `pause_mode`/`resume_mode` as unknown. Sources: [persistence limitations](https://docs.e2b.dev/sandbox/persistence.md), [lifecycle webhook payload](https://docs.e2b.dev/sandbox/lifecycle-events-webhooks.md).
- Hobby permits one hour continuous runtime and 20 concurrent machines; Pro permits 24 hours continuous runtime and 100 included concurrent machines. Pause/resume resets the continuous-runtime window. CPU-only, not a GPU service. Sources: [billing](https://docs.e2b.dev/billing.md), [pricing](https://e2b.dev/pricing.md).
- Desktop APIs include `screenshot`, `leftClick`, `doubleClick`, `moveMouse`, `drag`, `press`, `write`, vertical `scroll(direction, amount)`, `launch`, `open`, commands and files. Screenshot returns bytes/blob/stream, not automatically a stored artifact. The older desktop README's numeric scroll example differs from the current SDK reference. Use the [versioned reference](https://docs.e2b.dev/sdk-reference/desktop-js-sdk/v2.5.0/sandbox.md), not that outdated signature.
- VNC can stream the desktop or one existing application window, with only one active stream at a time; closing that application closes its stream. Source: [official desktop README](https://github.com/e2b-dev/desktop#streaming-specific-application).
- `stream.start({requireAuth:true})` generates an auth key. The SDK `getUrl` puts it in a `password` query parameter. `viewOnly` just adds `view_only=true` to the client URL; it is **not a server-enforced read-only permission**. Source: [VNCServer implementation](https://github.com/e2b-dev/E2B/blob/main/packages/desktop-js/src/sandbox.ts). A copied viewer URL is a sensitive bearer capability; never log it or put it in shared message content.
- Files can be transferred using `files.write/read`; inherited `uploadUrl/downloadUrl` also exist. These mechanisms do not authorize transfer of a blah.chat user's files. Sources: [file transfer guide](https://docs.e2b.dev/quickstart/upload-download-files.md), [Desktop SDK](https://docs.e2b.dev/sdk-reference/desktop-js-sdk/v2.5.0/sandbox.md).
- Persisted snapshots outlive their source machine; forks create additional machines from state. Therefore killing one VM is not proof that all copies were deleted. Source: [Desktop SDK snapshot/fork methods](https://docs.e2b.dev/sdk-reference/desktop-js-sdk/v2.5.0/sandbox.md). Proposal: no snapshots/forks/volumes in the initial release; export selected artifacts instead.

#### Network facts and limits

- Outbound internet is enabled by default. `allowInternetAccess:false` or deny-all plus an explicit allow list restricts it; allow rules win over deny rules. Domain filtering requires deny-all, works by HTTP Host on 80/TLS SNI on 443, and does not support QUIC/HTTP3 domain filtering. Source: [internet access](https://docs.e2b.dev/network/internet-access.md).
- Domain allowlisting is not complete exfiltration prevention. E2B warns about shared CDN/object-store endpoints. Domain rules also implicitly permit traffic to a DNS server, default `8.8.8.8`, unless configured otherwise; that allowance is all traffic to that address. `dnsServers:[]` removes it but requires a deliberate name-resolution strategy. `updateNetwork` replaces the entire policy, including omitted fields. Source: [network reference](https://docs.e2b.dev/network/internet-access.md).
- Public inbound traffic is separate from egress and envd SDK access. Explicit `network.allowPublicTraffic:false` requires the traffic token on exposed services. New projects default private only since October 30, 2026; older projects can remain public. Do not rely on the account default. Code interpreter port 49999 accepts code and exposes files if public. Source: [restricting public access](https://docs.e2b.dev/network/restrict-public-access.md).
- E2B documents blocking outbound private/link-local ranges outside the guest; this does not remove the need for server-side SSRF defenses in URL imports, redirects and artifact fetching. Source: [public access/network security](https://docs.e2b.dev/network/restrict-public-access.md). E2B's [secret-injection feature](https://docs.e2b.dev/network/internet-access.md#per-host-request-transforms) is a provider capability, **not authorization to use it**. Proposed initial policy uses no credential injection.

#### Verified pricing and a source conflict

Published rates are **$0.000014 per vCPU-second** and **$0.0000045 per GiB-second**; disk is included. Hobby has a $0 monthly plan fee and one-time $100 credit, not free unlimited execution. Pro is $150/month **plus usage**. Sources: [pricing](https://e2b.dev/pricing.md), [billing](https://docs.e2b.dev/billing.md).

For an **explicit assumed allocation**, compute estimate in USD is:

```text
running_seconds * (vcpu_count * 0.000014 + ram_gib * 0.0000045)
2 vCPU + 4 GiB for 10 minutes = $0.0276; one hour = $0.1656
8 vCPU + 8 GiB for 10 minutes = $0.0888; one hour = $0.5328
```

These are arithmetic estimates from the published rates, not observed Desktop costs or an all-in task price. Add model vision/input/output calls, storage, application hosting and any browser/proxy service. Billing uses allocated resources while running, not CPU utilization; paused/killed machines are not billed. Source: [cost formula](https://docs.e2b.dev/faq/calculate-sandbox-price.md).

**Official sources conflict on the default RAM.** [Pricing](https://e2b.dev/pricing.md) says default 2 vCPU/4 GiB, whereas [billing](https://docs.e2b.dev/billing.md) and the [calculation FAQ](https://docs.e2b.dev/faq/calculate-sandbox-price.md) say 2 vCPU/512 MiB. Do not publish a universal default-sandbox cost. Record `getInfo().cpuCount/memoryMB`, template build and runtime per execution and calculate using a versioned rate card. No independently verified Desktop-specific surcharge was found in these sources; do not invent either a surcharge or a guarantee of no other charges.

### Inferences

- **Recommended reuse first:** keep Next.js as the E2B SDK host initially, Convex as the durable identity/policy/event owner, and AI SDK factories as adapters. Introduce a `ComputerRuntime` interface so a later runner change does not rewrite chat/storage/permissions.
- **Proposed interface:** `ensureSession`, `inspectSession`, `observe`, `performAction`, `runScript`, `stageInput`, `exportArtifact`, `pause`, `destroy`. Each gets an application session ID plus a server-issued run context. Raw provider sandbox IDs and arbitrary storage IDs are not model-selectable authority.
- **Assumption:** deliver text-only skills first, then isolated script execution, then Desktop tasks. The user requested both capabilities, not compulsory desktop allocation on every prompt. Keep regular chat and existing stateless analysis inexpensive.

### Gaps

- No live SDK/template/browser/bundling smoke test was authorized. Desktop pause/resume with retained windows and protected VNC ingress remains a required spike, not a verified blah.chat capability.
- No evidence here establishes which computer-use models BK's configured providers can access, their success rate, or their vision-token cost. Do not hardcode a model from an E2B sample.
- Actual account plan/region, deployment time limits, chosen Desktop resource allocation, compliance terms and retention requirements remain unverified. Resolve before production use of private files.

## 2. How should a conversation-owned computer work safely and durably?

### Takeaway

The durable object should be an authorized application computer session, not an SDK instance kept in process memory. Build a single-writer action ledger around it, with hard reservations, revocable viewing and explicit approval boundaries; assume that a network timeout after a click may mean the click already happened. This design extends existing durable [messages/tool calls](../../packages/backend/convex/generation.ts#L860), not their current external-effect guarantees.

### Cited findings

- Existing tool calls store arguments/results and timestamps but have no approval state, attempt identity, effect certainty, lease epoch, or sandbox owner. Source: [`schema.ts:453-469`](../../packages/backend/convex/schema.ts#L453).
- Existing stream stop checks run while consuming chunks; the code execution path shown above does not pass the model AbortSignal into remote execution. Sources: [`generation.ts:803-845`](../../packages/backend/convex/generation.ts#L803), [`codeExecution` factory](../../packages/backend/convex/ai/tools/codeExecution.ts#L26), [proxy action](../../packages/backend/convex/tools/codeExecution.ts#L30).
- Existing generation locks deliberately allow the same comparison group to increment a pending count and expire after 60 seconds based on `lockedAt`. They are not fenced desktop-writer leases. Source: [`lib/generationLock.ts:17-18,45-72`](../../packages/backend/convex/lib/generationLock.ts#L17).
- E2B offers idempotent **creation** on SDK 2.60.0+, with team-scoped keys valid 24 hours. Same key/different parameters fails; an uncertain outcome can return `422 idempotency_outcome_unknown` and requires reconciliation. This does not make desktop actions idempotent. Source: [idempotent creation](https://docs.e2b.dev/sandbox/idempotency.md).
- Lifecycle events contain a provider execution ID and paused/killed execution runtime/resources. Webhooks can retry. The webhook reference says delivery-attempt IDs change on retry and deduplication should use payload `event.id`; the cost FAQ instead suggests delivery ID. Prefer the more precise event reference and deduplicate on event identity, also storing delivery IDs for diagnostics. Sources: [webhooks](https://docs.e2b.dev/sandbox/lifecycle-events-webhooks.md), [cost FAQ](https://docs.e2b.dev/faq/calculate-sandbox-price.md).
- Existing upload helper signs a user ID/expiry/nonce URL and enforces a 50 MiB body cap. Existing attachment retrieval checks conversation access. These are useful building blocks, not artifact-export approvals or a comprehensive private screenshot system. Sources: [`ownedUploads.ts:18-58`](../../packages/backend/convex/lib/ownedUploads.ts#L18), [`messages/attachments.ts:176-188`](../../packages/backend/convex/messages/attachments.ts#L176).

### Inferences

Everything in the remainder of this subsection is **proposed design**, including table names, state names and defaults. None is claimed to exist in the current schema.

#### Ownership and authorization contract

- Initial tenant boundary is the existing `users` identity. Store `ownerUserId`, `conversationId`, initiating user and run on every computer session. There is no assumed organization/tenant table. A future organizational owner needs an explicit migration and ACL model.
- Resolve user identity server-side, check ownership/access, then resolve session/provider ID internally. Never let a tool call choose `userId`, provider API key, authorization headers, arbitrary host/port, or another user's sandbox ID.
- Conversation membership is necessary but not sufficient for desktop control. **Assumption for initial release:** computer sessions, viewer streams and private skills are owner-only; collaborative chats cannot enable them until ACL/sharing behavior is approved. Block rather than leak resources through the shared assistant transcript.
- One active desktop writer per conversation and machine. Existing generation locking is not a computer action lock: comparison/multiple models and branch regeneration must not concurrently manipulate one desktop. A lease permits a single run, heartbeat, expiry and monotonically increasing fencing epoch; the gateway checks the epoch immediately before each action and rejects stale workers.
- A branch/fork gets no live VM, credentials, cookies or stream token. It may explicitly copy approved immutable artifacts into a fresh environment. Regenerate means a new run, not silently replaying effects against the old desktop.

#### Proposed normalized records

| Proposed table | Minimum fields and invariants |
| --- | --- |
| `computerSessions` | `ownerUserId`, `conversationId`, `mode: code|desktop`, `provider`, `providerSandboxId?`, immutable `templateBuildId`, `sdkVersions`, `createIntentId`, `createIdempotencyKey`, `createParametersHash`, `state`, `desiredState`, `observedState`, `networkPolicyVersion`, `retentionPolicyVersion`, `createdAt`, `lastUsedAt`, `expiresAt`, `lastReconciledAt`. Index owner+conversation+state, provider+ID, expiry. One live session per selected conversation/mode enforced transactionally, not by a non-unique index alone. |
| `computerLeases` | Session ID, holder run ID, epoch, heartbeat/expiry, controller kind agent/human. At most one valid writer. A stale lease is a reconciliation trigger, not proof that remote commands stopped. |
| `agentRuns` | User/conversation/message IDs, run state, parent run if needed, model/config version, tool-policy hash, skill-catalog hash, budget reservation ID, cancellation generation, start/end timestamps, runner checkpoint reference. This is a proposed durable run record, not a claim about current `generation.ts`. |
| `computerActions` | Run/session IDs, sequence, stable logical operation ID, attempt ID, action type and validated payload reference/hash, lease epoch, input observation ID, risk classification, approval ID, started/completed timestamps, outcome, effect certainty `none|confirmed|uncertain`, result/artifact refs. Unique logical operation mapping enforced by mutation. No screenshot bytes, secrets or full cookie-containing URLs in rows. |
| `actionApprovals` | Owner/approver ID, run/action IDs, exact normalized action hash, destination, data categories or artifact IDs, observed-page hash, policy version, expiry, decision, consumed timestamp. Single-use CAS transition. A chat reply saying "yes" is not sufficient authority without resolving this record. |
| `runArtifacts` | Owner/conversation/run/action IDs, storage ID, sanitized name, content hash, MIME, byte size, purpose `input|output|observation`, sensitivity/scan state, ACL, retention class/deletion deadline, export status. Screenshot observations use short retention and separate visibility from user-saved deliverables. |
| `computeReservations` / `computeUsage` | Owner/run/session, resource envelope, reserved/used/released amount, currency/rate-card version, maximum wall/running seconds and steps, provider execution/event ID. Deduplicate settlement per provider execution; do not double-charge on repeated events. Track model costs separately then present task total. |
| `computerEvents` | Session/run/action, monotonic app sequence, provider event ID when present, event type, sanitized detail, timestamps. Drives reconnection and the activity pane; no stream secrets. |

Use normalized junction records for M:N relationships. Keep large data in file storage with hash/ownership records. Mutations enforce authorization on every transition; internal bearer authentication only identifies the calling service, so the gateway must additionally validate a narrowly scoped, short-lived run authorization against durable policy.

New public HTTP operations should use the project's `formatEntity`/`formatEntityList`/`formatErrorEntity` envelopes. The existing code execution route currently returns raw JSON, as shown in [`route.ts:156-165`](../../apps/web/src/app/api/code-execution/route.ts#L156); migrate that legacy contract separately with its consumer/tests rather than accidentally breaking it while adding Desktop APIs.

#### Proposed session state machine

```text
unallocated -> allocating -> ready -> busy -> ready
ready|busy -> pausing -> paused -> resuming -> ready
any live state -> reconciling -> ready|paused|lost|terminating
any live state -> terminating -> terminated
allocating|resuming -> failed       [only when the remote outcome is known]
```

- `unallocated` is the normal state for text chat/skills. No paid machine starts on skill activation alone.
- Allocation transaction authenticates, checks policy, reserves budget, writes a create intent and stable provider idempotency key. An action performs the provider call, then a mutation stores provider identity and observed resources. Crash between those operations enters reconciliation using the same intent/key and provider metadata. **Never mint a new create key just because the HTTP response was lost.** After E2B's 24-hour key window, inspect/reconcile rather than blind retry.
- Enter `busy` only with a valid lease and authorized action. On resume, verify owner/policy/budget first, reconnect provider state, reapply the complete approved egress policy, recover the desktop observation, then accept actions. A mere viewer page request must not resume a paused VM or extend billing.
- `paused` means no running work, not deleted data. Session inactivity triggers pause; a separate application expiry triggers kill and artifact/screenshot deletion. Pin neither infinite provider retention nor a particular TTL as product policy without BK's decision.
- Use provider auto-pause with `autoResume:false` as a backstop, not the only cleanup mechanism. Bound retries when pause fails and reconcile actual running time. Do not mark `paused` or release all cost reservations until the provider confirms it.
- A sweeper queries expired sessions/leases and reconciles known provider IDs plus intent metadata. It recovers orphan allocations, retries termination and reports failed cleanup. Delete conversation/user: revoke viewers, cancel runs, stop work, kill machines, delete snapshots if any and storage according to policy, then complete relational cleanup. Provider timeout alone does not delete paused data.
- Persist desired and observed state separately so an expired application lease does not misreport a still-running VM as stopped. Store unknown pause/resume mode explicitly; filesystem-only fallback requires fresh desktop/process readiness checks.

#### Proposed run and action state machines

```text
run:
queued -> running <-> waiting_for_approval
running -> waiting_for_user|paused
running|waiting_*|paused -> cancelling -> cancelled
running -> completed|failed|needs_reconciliation

action:
proposed -> policy_checked -> awaiting_approval -> authorized
policy_checked -> authorized                 [permitted low-risk action]
authorized -> dispatching -> observing -> succeeded
dispatching|observing -> uncertain -> reconciled|needs_user
proposed|policy_checked|awaiting_approval -> denied|cancelled|expired
```

Persist `dispatching` **before** remote execution. Bind action to a fresh observation and lease epoch. On restart, completed actions return their recorded result; never resend a `dispatching` external write automatically. Reconcile observable state first. A request timeout, process crash or model abort cannot prove "no effect". If the outcome of form submission/send/delete is unknown, stop and ask the user to inspect, with a clear uncertain-effects warning. Exactly-once GUI side effects are not achievable by adding an app idempotency key.

If a remote API supports its own idempotency key, use it through an approved dedicated tool. GUI coordinate clicks do not. Bounded read-only observation retries are acceptable; even repeated typing can duplicate data. Model-step retries/replanning must respect the logical operation ledger rather than inventing new IDs for the same planned effect.

Cancellation first persists a durable cancel request, invalidates approvals, fences the writer and refuses new actions. Then abort model/SDK requests, stop process groups/background commands and revoke/restrict network traffic. **Pause is not process cancellation:** a paused malicious script resumes later. Kill the environment if stopping work cannot be confirmed. Preserve an uncertain outcome if an effect may already have reached a remote service. Cleanup must not use the same already-aborted signal as the cancelled operation.

Implement approval waits as persisted checkpoints, not a tool promise held open in the existing Next.js request or Convex generation action. A bounded worker claims the next ready run, checks cancellation/policy, executes a limited action/model batch, persists the checkpoint and releases its lease. Approval mutations authenticate and atomically consume the matching decision, then enqueue continuation of that same run. Persist enough model/tool history and immutable skill references to reconstruct the next request. Use transactional scheduling/outbox intents so a crash cannot record approval without a recoverable continuation. The durable-run engine may be Convex scheduling or a separately chosen workflow runtime; E2B persistence does not provide orchestration durability. Keep current text-message statuses separate from waiting/paused run states and define recovery so message-stuck cleanup does not terminate a legitimate human approval wait.

#### Safety policy and approvals

Effective capabilities are an intersection:

```text
platform ceiling
  ∩ account entitlement and hard budget
  ∩ user-approved conversation/run policy
  ∩ current authentication/data-access scope
  ∩ skill's requested restriction, if any
```

A skill cannot add tools, broaden a destination, read another tenant's files, bypass incognito, mint an approval, or alter cost ceilings. Separate discover/read capability, local-file execution capability, network access and external-write capability.

| Operation | Proposed initial behavior |
| --- | --- |
| Read a skill/reference, draft prose | No machine, no computer approval. Still authorize access to the skill. |
| Local computation on user-selected files | Create clean restricted code sandbox only after capability and budget checks. No outbound internet by default. |
| Open a public site or download a file | Must match approved network/data policy. Treat page instructions/downloads as untrusted; check redirect/destination and file type/size. |
| Upload user data to a website, email/send/post, modify records, delete remote data, change account settings | Stop before dispatch. Require explicit, one-use confirmation of destination, data, intended effect and fresh context. Permission to browse is not permission to upload or submit. |
| Purchase, payment, subscription, financial transfer | **No automatic execution.** Initial release refuses the commit action and hands off to the user; general "use the computer" or a skill instruction never authorizes it. |
| Password, API key, token, cookie injection | **No automatic credential injection**, no copying host browser profiles and no credential requests in chat. Initial release excludes authenticated browsing. A later user-operated login handoff requires a separately approved privacy/session design. |
| Unsupported/ambiguous action, expired approval or stale page state | Fail closed, observe again or ask. Never silently skip an adapter operation and tell the model it succeeded. |

Approvals must be enforced in the gateway, not just prompted to the model. Check semantic effect, not just button labels: pressing Enter, a keyboard shortcut, file upload and a script's HTTP request can commit the same action as a click. Page text and skill contents can contain prompt injection. Serialize them as untrusted/user-provided material below system policy; do not rely on delimiters as a security boundary.

Validate adapter inputs independently of the model schema: finite in-bounds coordinates, capped waits/scroll counts/text lengths, key/application allowlists and canonical URLs/paths. Current [Desktop SDK source](https://github.com/e2b-dev/E2B/blob/main/packages/desktop-js/src/sandbox.ts) constructs shell commands for operations including `open`, `launch` and `press`; `open` interpolates its argument into `xdg-open`. Do not treat these string-taking methods as a security boundary for arbitrary model/page-provided values. Use audited quoting/argument construction or constrained wrappers, reject shell metacharacters where appropriate, and test that a nominal navigation action cannot escape into arbitrary shell execution. This observation is about the reviewed source, not a claim of a separately verified vendor advisory.

Unrestricted shell or Playwright/PyAutoGUI code with live browser cookies can bypass per-click approval. Therefore **do not expose arbitrary scripts in an authenticated/externally writable desktop**. For the initial release, use clean offline script machines and an unauthenticated desktop with narrow egress. Consequential writes should use explicitly mediated tools, or remain user-only. URL allowlists cannot reliably distinguish read from write on an allowed host; where that distinction cannot be enforced, do not claim autonomous browsing is read-only.

#### File and screenshot handling

1. Input staging resolves selected owned attachment IDs to bytes server-side after ACL checks. Copy only those files into a run work directory, under generated safe names, with hashes and size limits. Do not copy all conversation history, an entire knowledge bank, hidden files, environment variables or integration tokens.
2. Output export starts from a declared output manifest within the run output directory. Resolve canonical paths; reject symlink/hardlink/device escapes and files outside it, enforce bytes/count limits, scan/quarantine where available, validate MIME independently from extension, and hash bytes. A malicious script controls its filesystem, so the exporter needs a safe no-follow transfer mechanism or a dedicated validated export boundary, not `realpath` followed by an unchecked later read.
3. Store the validated bytes and an owned artifact record atomically or via a recoverable upload intent. The model gets artifact IDs/metadata, not arbitrary signed upload endpoints. An authenticated download endpoint checks current access; deliver active content as an attachment or in a restricted preview origin, not executable same-origin HTML/SVG. Never expose raw E2B filesystem links as permanent chat deliverables.
4. Screenshots are observations with an explicit retention/deletion deadline, not ordinary public plot URLs. Minimize frames and crop/downscale only with preserved coordinate transforms. Keep raw image data, browser text, cookies, input fields and viewer keys out of Pino/PostHog/traces by default. Send only necessary images to the selected vision provider and disclose that processing.
5. A "save this screenshot" user action promotes a selected observation into an owned deliverable with its own retention. Conversation public shares/exports must omit raw observations, private skill bodies, hidden files and live computer access by default. Deletion must cover storage, cache, telemetry/media copies and provider snapshots as applicable. Redaction is helpful but cannot guarantee screenshots contain no sensitive data.

The current universal `<tool-data>` wrapper stringifies results. Add a deliberate typed observation result path so screenshot bytes become provider-supported image content rather than a JSON/base64 text blob. Preserve small structured UI events and bounded text summaries; do not run screenshot content through generic 500-character truncation. Keep durable approval/action state outside model context.

#### Costs, leases and telemetry

- Reserve a maximum allowed compute envelope before allocating/resuming. Enforce per-user concurrent machine count, total run wall time, running seconds, desktop actions, model steps, output bytes, daily/monthly spend and retained storage. These are **hard checks**, unlike current awareness-only token estimates. Quota exhaustion pauses/stops further work and explains the remaining state.
- Heartbeats can extend only within the reservation and absolute deadline. Waiting for approval or a disconnected viewer does not warrant an unlimited running VM. Pause when safe; confirmation after resume re-observes the page and invalidates stale action approvals.
- Settle allocated CPU/RAM and runtime from signed provider lifecycle events plus periodic reconciliation. Verify the raw-body signature using the current E2B verification contract, enforce bounded request sizes, deduplicate payload event IDs and handle out-of-order events. Also reconcile against billing usage; webhook delivery is not an infallible ledger. Keep estimated versus reconciled cost distinct.
- Proposed trace hierarchy: run -> skill activation/resource read -> sandbox allocation/resume -> model decision -> policy/approval wait -> action -> observation/export -> cleanup. Include IDs/hashes, tool-policy and immutable skill versions, template build, latency, retries, effect certainty, estimated/reconciled compute and model tokens/cost. Exclude raw screenshots/secrets and private skill content by default.
- Langfuse is an optional observability sink here, not the durable authorization source. Its JS/TS span processor supports masking inputs/outputs/metadata before export; pure OpenTelemetry also supports application/collector-side redaction. Source: [Langfuse masking documentation](https://langfuse.com/docs/observability/features/masking.md). No Langfuse SDK installation/version decision is required for this research; choose and verify exact current packages in the observability implementation task.

#### Computer activity UX grounded in chat

Proposed web UI: a collapsible **Computer** pane beside chat, reusing the established canvas side-panel concept and existing tool-call/artifact presentation patterns. Show session state, latest permitted observation, current task, action timeline, enabled skills, permitted destinations, budget/running-time meter and **Stop**, **Pause**, **Delete computer** controls. Display "computer not started" for text-only work. On narrow screens use a full-height sheet, with equivalent stop/approval access on mobile/CLI rather than assuming an iframe everywhere.

Inline chat gets compact milestones: "Loaded skill X v3", "Computer started", "Waiting for your approval", "Saved report.csv", "Stopped; submission outcome unknown". Preserve rich detail in the pane, not dozens of mouse clicks in the main conversation. Existing clarification UI is conversational only, displaying choices as spans in [`AskForClarificationRenderer.tsx:30-46`](../../apps/web/src/components/chat/toolRenderers/AskForClarificationRenderer.tsx#L30); it is not a durable approval component. Build a real authenticated decision UI with exact effect/data/destination, Approve once/Reject, expiry, and denied/stale states.

Start with authenticated screenshot polling if protected VNC is not ready. A production live viewer needs an application-authenticated proxy/ticket for both HTTP and WebSocket traffic, explicit private E2B ingress, per-session authorization, no-store responses, restricted referrers, token rotation/revocation and a tested server-side view-only policy. `viewOnly` alone cannot prevent a viewer from enabling control. Manual takeover is a separate explicit control lease that fences the agent, stops queued actions, and obtains a fresh observation before return. Do not ship it as an accidental writable iframe.

### Gaps

- **Decisions for BK:** per-run/daily dollar ceilings, machine concurrency, idle-pause interval, retained-computer TTL, screenshot TTL, artifact TTL and whether incognito can use any external computer. Conservative proposal: no durable incognito VM or screenshot retention, and no computer tools there until the deletion path is proven.
- Whether users can log in, who sees collaborative desktops, whether files can be uploaded to third parties, and what constitutes approval for each consequential domain remain product/security decisions. They are not implied by the capability request.
- Gateway fencing cannot undo an in-flight external request. Safe browser automation on allowed hosts still needs adversarial testing and may need host/method/path-aware mediation; there is no demonstrated universal semantic write blocker.
- Desktop create retries need special validation. Current [Desktop `create` source](https://github.com/e2b-dev/E2B/blob/main/packages/desktop-js/src/sandbox.ts) calls base creation and then `_start` to start the display. Confirm retrying an idempotently created Desktop does not start duplicate X sessions, or use a tested base-create/attach/readiness strategy. Do not assume base SDK creation idempotency solves initialization idempotency.

## 3. How should user-added skills be imported, selected and executed?

### Takeaway

Use the portable Agent Skills folder format, with a tenant-owned versioned library and progressive disclosure. Skill loading should work without E2B; only approved scripts or computer tasks allocate machines. A skill supplies instructions/resources, never permission or credentials. Sources: [Agent Skills specification](https://agentskills.io/specification), [integration guide](https://agentskills.io/integrate-skills).

### Cited findings

- The open format requires a directory with `SKILL.md`, YAML frontmatter and a Markdown body. Required metadata is `name` and `description`; optional fields include license, compatibility, string-valued metadata and experimental `allowed-tools`. Scripts, references and assets are optional conventions, not separate mandatory formats. Source: [specification](https://agentskills.io/specification).
- Required name constraints include 1-64 characters, lowercase letters/numbers/hyphens, no leading/trailing/consecutive hyphens and matching parent directory. Description is 1-1024 characters, compatibility at most 500. The specification's prose includes an ambiguous "unicode lowercase alphanumeric" phrase alongside ASCII examples/character ranges; use a documented ASCII slug policy initially and surface normalization warnings rather than silently changing imported identity. Source: [field constraints](https://agentskills.io/specification#name-field).
- Progressive disclosure loads name/description first, full instructions when activated, then resources only as needed. Recommended main-file bounds are under 500 lines and roughly under 5,000 tokens; these are recommendations, not hard format limits. Source: [progressive disclosure](https://agentskills.io/specification#progressive-disclosure).
- Hosted agents need upload/API/registry provisioning rather than access to a user's local filesystem. A dedicated activation tool is a supported integration, as is user-explicit slash/mention invocation intercepted by the application. The guide also discusses disabled-skill filtering, activation deduplication and protecting active skill content from compaction. Source: [integration guide](https://agentskills.io/integrate-skills).
- `.agents/skills/` is a cross-client convention, not a required location in the format. Tool names, interpreter availability and environment requirements are not automatically portable across clients. Experimental `allowed-tools` behavior varies. Sources: [integration guide discovery](https://agentskills.io/integrate-skills#step-1-discover-skills), [specification](https://agentskills.io/specification).
- The integration guide recommends lenient loading for some malformed/oversized names and even YAML repair, while the format specification defines strict constraints. For a multi-tenant import boundary, safe strict validation with visible diagnostics is a deliberate product/security choice, not a claim that the standard requires every importer to be strict. Sources: [parsing guidance](https://agentskills.io/integrate-skills#step-2-parse-skill-md-files), [specification](https://agentskills.io/specification).
- Existing prompt assembly inserts project and conversation/user instructions; these are not versioned skill packages. Existing system prompt fields include cached prompt/hash metadata. Sources: [`systemBuilder.ts:147-159,262-281`](../../packages/backend/convex/lib/prompts/systemBuilder.ts#L147), [`schema/conversations.ts:67-73`](../../packages/backend/convex/schema/conversations.ts#L67). Proposed skills must integrate with prompt caching/context budgeting rather than concatenate every skill into every prompt.

### Inferences

All tables, tools, workflows and UX below are **proposals**, not existing product behavior.

#### Tenant-owned immutable library

| Proposed table | Minimum contract |
| --- | --- |
| `skills` | `ownerUserId`, stable ID and unique owner+slug, display name, latest published version ID, library status, timestamps. Rename/display name does not alter pinned run identity. |
| `skillVersions` | Skill/owner IDs, monotonically assigned version, content-addressed package hash, parsed metadata, body storage reference/hash, source type and provenance, compatibility diagnostics, license, validation state/report, executable-file inventory, `createdBy`, immutable publish timestamp. Imported metadata `version` is display provenance, not the authoritative app version. |
| `skillVersionFiles` | Version ID, canonical relative path, storage ID/hash, MIME/bytes, category, executable indicator, scan result. Manifest ordered deterministically; no arbitrary external filesystem path. |
| `skillBindings` | Skill/version, owner, scope user/project/conversation, invocation mode `explicit_only|automatic_and_explicit|disabled`, policy-restriction ID. Normalized scope junctions as appropriate; resolve collisions deterministically and show conflicts. |
| `runSkillActivations` | Run ID, version ID/package hash, source `user|model`, reason, selection-policy/catalog hash, effective capability-policy hash, loaded-resource IDs/hashes and activation time. Unique run+version for context deduplication. |
| `skillImportJobs` | Owner, upload/source intent, quarantine storage, bounded byte/count counters, validation diagnostics, state, source commit/hash if relevant, expiry/cleanup status. Job IDs are never executable authority. |

Published versions are immutable. Edit/replace/import update creates a new version; existing runs remain pinned. Store provenance down to source archive digest and repository commit if imports are later allowed. Disabling/deleting a skill stops new activations; revoking a version fences affected running tasks under a documented policy. Keep the minimal provenance audit after package deletion if retention permits, without preserving private bodies forever. No public sharing or cross-tenant deduplication is assumed.

#### Proposed import/create/upload state machine

```text
draft|uploaded -> quarantined -> validating -> review_required
validating -> rejected
review_required -> published -> disabled|superseded|revoked
quarantined|rejected|draft -> expired -> deleted
```

Initial supported UX can be **Create skill** with an editor and **Upload skill folder/ZIP**. URL/GitHub/marketplace import is a later explicit decision. Never fetch a URL mentioned inside a skill during import/activation as if it were permission to access the network.

Validation contract:

1. Authenticate before accepting bytes, create an owned upload/import intent and enforce storage quota. Extraction occurs in a bounded isolated worker, never by invoking bundled scripts on the Next.js/Convex host.
2. Inspect archives before extraction and enforce compressed bytes, actual decompressed bytes, per-file bytes, file count, directory depth, compression ratio, wall/CPU time and aggregate tenant storage. **Suggested test defaults only:** 10 MiB compressed, 50 MiB expanded, 500 entries, depth 8, 1 MiB for text instruction/reference files. These are application assumptions, not E2B/spec limits; choose final values after representative packages.
3. Reject absolute paths, `..`, mixed slash/backslash traversal, Windows drive/UNC paths, NUL/control characters, encoded/path-normalization ambiguities, duplicate/case/Unicode-normalization collisions, symlinks/hardlinks, special/device files, encrypted archives and nested archive expansion. Resolve everything relative to one selected root containing exactly the intended `SKILL.md`. Reject writes outside that root; do not trust archive metadata to describe actual size/type.
4. Parse YAML with safe scalar/object types, bounded aliases/depth, duplicate-key detection and no custom tags/executable constructors. Validate required fields and lengths; render Markdown with sanitized links/HTML. Treat frontmatter descriptions as untrusted too, since they enter discovery context. Preserve original bytes/provenance and show repairs as edits that create a new version; never silently "fix" imported instructions into a different hash.
5. Enumerate scripts, resources, external links and requested tools/network/system dependencies. Warn about vendor-only frontmatter or absolute local paths. Review previews show code and compatibility warnings. Malware/secret scanning is defense in depth, not proof of safety. Executables are never run just to inspect, index or publish the skill.
6. Publish only after explicit user confirmation of the package/version. Import permission is distinct from execution permission. A package cannot install tools, dependencies, hooks, MCP servers, agents, browser profiles or credentials by naming them in metadata. `allowed-tools` is parsed as a requested restriction/advisory mapping, never a grant.
7. Re-uploading identical content can reuse a version hash within the owner boundary, with explicit duplicate UX. Imported updates display file/instruction/permission-requirement diffs and need confirmation. No mutable "latest" URL fetch at run time, no automatic remote update.

If remote imports are approved later, use read-only fetch of a pinned commit/archive with request/body/decompression/redirect limits, public-destination validation at every hop, no forwarded credentials, no private/link-local access, no submodule or install hooks, license/provenance retention and explicit review. Do not import a repository by executing its package manager or setup script.

#### Explicit invocation and automatic activation

Proposed tools: `activateSkill({skillVersionId})`, `readSkillResource({skillVersionId,path})`, and separately privileged `runSkillScript({skillVersionId,path,inputArtifactIds,args})`. The model never supplies storage IDs or a host path. Resource reads resolve only manifest members and enforce owner/run access; no implicit live URL dereference. Text instructions and local references do not require a machine.

1. At run start, authorize scope and resolve enabled skills to **pinned immutable versions**. Build a deterministic sorted catalog of IDs, names, descriptions and bounded compatibility summaries. Escape catalog values; do not let XML/Markdown closing tags in a description escape its data field. Hash the catalog and effective policy for provenance/cache keys.
2. For explicit selection, add a `/skill` picker/chip to the shared composer command system. Persist selected version IDs with the user message/run request, resolve ownership server-side, then load those instructions regardless of whether the model would have chosen them. Also honor clear natural-language requests via model activation. Ambiguous duplicate names require a picker or clarification, not accidental selection of another user's/shared skill.
3. For automatic selection, present the eligible catalog and register `activateSkill`. The model chooses a matching skill and provides a brief reason. Activation authorizes again, records provenance, returns bounded full instructions and a resource manifest. It does not allocate E2B or grant a requested capability. A skill marked explicit-only is absent from automatic discovery but remains user-selectable.
4. Default to a small catalog at modest library size. A larger library can use tenant-scoped metadata retrieval followed by a bounded catalog, but log the candidate set and keep explicit lookup complete. Retrieval-first selection is an optimization that differs from showing every skill at startup; test recall before hiding useful skills.
5. Track `discovered -> selected -> loaded -> resource_loaded -> executing -> completed|blocked`. No scripts run during discovery or loading. Multiple relevant skills can load, but cap activation/context cost and resolve conflicting instructions by system policy then user's explicit task. Ask on an unresolved workflow conflict rather than silently merging incompatible instructions.
6. Keep stable base policy/catalog before volatile task content for cache reuse. Do not inject timestamps, every full skill body or mutable latest-version metadata into that prefix. Cache by owner/access scope, immutable package hash, model/tokenizer, policy and catalog version, never by slug alone. No cross-tenant cache hits that disclose skill names/bodies.
7. On compaction, preserve the activation/version/resource manifest and reload the exact pinned instruction bodies when needed. Do not replace operational skill steps with an unreliable free-form summary. Bound active skills rather than exempting an unbounded instruction pile from all context limits. Activation deduplication is valid only while that exact content remains in context.
8. On model switching, retain skill version and task state, re-render tool/image contracts for the new model and re-check capabilities. A non-tool model can receive explicitly selected text-only instructions; it cannot be told it has computer abilities it lacks. Unsupported script/dependency/computer requirements return a clear blocked result.

The existing blanket `tool-data` wrapper says all tool content is not instructions. Give skill activation a reviewed special representation: identify it as **user-provided workflow guidance subordinate to system policy**, with version/base path/resource manifest. Do not inject it as a privileged system message or simply instruct the model to obey all directives from an uploaded file. Resource/file/browser outputs remain untrusted data even when referenced by a skill.

#### Secure skill script execution in E2B

- Default to a separate clean code sandbox owned by the conversation/run, not the long-lived Desktop that could contain browser cookies or unrelated private files. Isolation is the VM boundary, not a workspace directory or a skill hash. If the same user account can read all files in a VM, path instructions alone cannot keep an untrusted script away from them.
- Stage the exact validated published package and only selected input artifacts. Use a pinned interpreter/template and application-owned command builder. Arguments are structured and bounded; never concatenate free-form model input into a shell command. Verify published hashes before staging and before execution. Restrict output to the validated exporter described above.
- Initial script policy is offline, no inherited secrets, no host filesystem mounts, no integrations, no browser profile and no runtime package installs. Prebuild approved dependencies in a trusted template. Missing requirements produce a compatibility warning/blocked run, not an automatic `curl|sh`, package install or privileged fallback.
- Run under a nonprivileged account where possible and restrict CPU/memory/time/process/output budgets. Do not call a directory "read-only security" unless the template actually prevents the executing process from altering it or elevating privileges. E2B isolates the application host, but it does not make arbitrary user scripts safe inside a machine containing secrets.
- If network-enabled scripts are later allowed, use a separate capability review and destination/data policy. Any arbitrary code on an allowed host can write/exfiltrate through that host, so do not promise per-click approval protects script traffic. Use a mediated service for constrained external actions or deny that combination.
- Record version/file hashes, interpreter/template version, approved arguments or a redacted/hash representation, input/output hashes, exit code, resource use and cancellation outcome. A failure after a potentially external effect uses `uncertain`, not retry-until-green. Script execution never runs on the user's computer or app server.

#### Skill library UX

Add a **Skills** settings/library page alongside existing settings, with create/upload, validation diagnostics, package file preview, source/license, immutable version history/diff, compatibility, scripts/network requirements, enabled/explicit-only/automatic switches and scope binding. Distinguish "installed instructions" from "allowed to execute code". Show unsupported imports without pretending portability means every dependency works.

Composer selection chips pin versions and remain visible in the sent message. Inline activation cards say which skill/version was used and why; the computer pane links script/action events to that activation. A text-only skill should produce ordinary chat output without a "starting computer" spinner. Disabling automatic discovery should not remove explicit invocation. Provide an activity/provenance view without exposing a private skill's full body in shared/public transcripts.

#### Implementation sequence and acceptance criteria

No step below was executed. These are bounded implementation tickets/spikes, not authorization to run paid tests.

| Order | Work and repository integration | Acceptance criteria |
| --- | --- | --- |
| 1 | Skill data/import boundary and text-only activation. Add Convex schema/functions, shared composer command, library UI; integrate [`systemBuilder.ts`](../../packages/backend/convex/lib/prompts/systemBuilder.ts) and [`generation/tools.ts`](../../packages/backend/convex/generation/tools.ts). | User A cannot list/read/activate user B's versions/resources. Traversal, symlink, ZIP bomb, duplicate paths, YAML aliases and oversized metadata reject safely. Create/upload needs no script execution. Explicit invocation loads the selected version; an eligible automatic task activates correctly; unrelated tasks do not. Text-only flow makes **zero E2B calls**. |
| 2 | Sandbox gateway/version/bundling spike, preserving existing code route. Use the exact verified versions above, pinned template build and mocked provider in routine tests. | Existing Python/JS/plot responses remain compatible; forged internal headers still reject; negative/oversized inputs reject. Verify production runtime bundling rather than assuming chalk overrides transfer. No new machine on an unauthorized request. |
| 3 | Durable allocation/lease/budget/action ledger with a fake provider first. Connect to messages/tool-call IDs without making message text the control channel. | Crash after create/before DB commit reconciles to one machine; retry after 24-hour key expiry never blindly creates. Two workers/comparison models cannot write concurrently; stale epoch is refused. Hard quota reservation races cannot overspend the configured envelope. |
| 4 | Authorized low-cost Desktop lifecycle spike with dummy data and explicit spend cap, only after BK approves paid starts. | Pinned browser/app starts; screenshot format/coordinates, zero-coordinate clicks, drag/key mappings and current scroll signature work. Pause/resume retains expected files/windows or visibly recovers from disk-only mode. Private ingress denies unauthenticated HTTP/WebSocket access; noVNC auth/view-only/control revocation tested. SDK creation retries do not double-start the desktop. |
| 5 | Offline script runner and artifact exporter. Extend attachment/artifact rendering without reusing unauthenticated plot URLs for private observations. | Script gets only selected inputs; cannot reach internet/secrets/host; cannot install dependencies. Cancellation stops background children; symlink swap/export escape and malicious HTML/SVG output cannot leak or execute in the app origin. Outputs survive kill and authorized refresh/download. |
| 6 | Computer activity and durable approvals. Add a typed multimodal observation path instead of stringify-all results. | Refresh/reconnect shows the same run/session/approval, never starts another. Approving twice or on a changed page cannot execute twice. Closing a tab does not cancel or keep alive implicitly. Stop fences future actions, and uncertain submissions are shown honestly. Purchases and credential injection remain unavailable. |
| 7 | Cleanup/cost/privacy hardening and evaluation. Extend deletion/cache/share/export paths, telemetry redaction, scheduled reconciliation and adversarial fixtures. | Deleted conversation/user leaves no resumable VM/viewer or retained observation beyond policy. Provider pause failure triggers bounded fallback, cleanup retries and cost reconciliation. Duplicate/out-of-order webhooks cannot double-settle. Public shares omit private skills/screenshots/tokens. Incognito obeys its explicit policy. |

Evaluation fixtures should include explicit skill requests, automatic matches, irrelevant decoys, conflicting descriptions, malicious metadata/body instructions, unsupported dependencies, model switching, cancelled scripts, stale approvals, worker loss before/after remote dispatch, browser prompt injection and simulated exfiltration. Measure task success, correct activation/false positives, unauthorized-action rate, uncertain-effect recovery, compute/model cost per completed task and cleanup reliability. Use dummy data and a fake external-write target; no real purchases, credential use, sends or production records. Langfuse or another trace sink can collect redacted run/skill/template/policy provenance; evaluation must not require retaining raw private desktops.

### Gaps

- **Needs BK's decision:** import formats and remote sources; whether users may share/publish skills; whether collaborators inherit access; licensing expectations; scope precedence; automatic invocation defaults; update/revocation behavior; available interpreters/dependency sets and budgets. Capability approval does not answer those questions.
- **Proposed initial defaults, not approved decisions:** private per-user library, editor/folder/ZIP upload only, explicit user confirmation before publish, optional automatic discovery toggle, offline scripts, no credential injection, no automatic purchases, no authenticated browsing, no snapshot sharing and no durable incognito computers.
- Agent Skills is portable packaging, not a safety certification, dependency installer, model capability guarantee or execution permission standard. Imported instructions that demand delegation, tools, network or secrets may be incompatible. Return diagnostics and alternatives rather than silently granting their requirements.
- Source research is complete enough to implement the boundaries and fake-provider tests. Production Desktop interoperability, model adapters, private streaming, exact resource/retention settings and representative-task success still require the scoped authorized spikes above.
