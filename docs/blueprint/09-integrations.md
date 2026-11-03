# 09: Integrations

Repair account selection, connection lifecycle and execution authorization before comparing providers on BK's actual workflows. BK requested a fresh provider evaluation (D-009); **repair-first Composio with Nango as primary challenger is a proposal**, not a selected vendor (D-026; Q9/Q10; S10). Preserve per-chat opt-in and incognito exclusion. Use shared execution/approval contracts in [07](07-tools-and-computer.md)/[10](10-artifacts-and-interactions.md), not provider discovery as permission.

Authority and unresolved gates: [21](21-decision-log.md), [22](22-open-questions.md).

## Current implementation and verified gaps

Baseline `04866f80a6236716ebf8d8c5a79001727f85f4bf`, reviewed on 2026-11-03. This is static evidence; no account was connected, read, sent from or revoked.

| Current source | What it establishes |
|---|---|
| [Selection](../../packages/backend/convex/composio/selection.ts), [generation](../../packages/backend/convex/generation.ts) | Connections are owner-scoped and explicitly selected per chat. No selections means no external tools; inactive/foreign/incognito selections reject. Keep this. |
| [OAuth](../../packages/backend/convex/composio/oauth.ts), [connections](../../packages/backend/convex/composio/connections.ts) | Authenticated initiation/verification, cryptographic state and expiry exist. Reconnect nevertheless overwrites the active remote ID before verification, and failed remote deletion loses its cleanup handle. |
| [Tool executor](../../packages/backend/convex/composio/tools.ts) | Requests up to 100 toolkit tools, then invokes discovered executors. No exact selected-account argument or independent operation approval. Errors are guessed from strings; full results are unbounded. |
| [Published locked SDK](https://unpkg.com/@composio/core@0.6.3/dist/index.mjs) | `0.6.3` provider execution supplies user/toolkit rather than the selected connected-account ID; it skips the version guard. This establishes missing binding, not an observed wrong-account incident. |
| [Web callback](../../apps/web/src/app/api/composio/callback/route.ts), [hook](../../apps/web/src/hooks/useComposioOAuth.ts) | Existing origin/state checks are useful, but popup source/attempt binding, state consumption and callback allowlisting need repair. Query logging can include state/code. |
| [Mobile settings](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/mobile/app/%28drawer%29/settings/integrations.tsx) | Auth-session result is discarded; the audited source has no visible completion verification path. This is not a reproduced device failure. |
| [Named integration package](../../packages/integrations-composio/src/index.ts) | Empty export, not an existing provider-neutral execution abstraction. Operative code is in Convex. |

Full INT01–12 traces, existing tests and primary-source comparison are in [integration research](../../research_notes/blah-chat-agent-experience/integrations.md). [Synthesis](../research/modernization-review.md#integration-shortlist-with-migration-and-processor-trade-offs) resolves the older “all active integrations” interpretation in favor of current per-chat selection. Which defect BK encountered and which 2–3 apps/actions matter remain Q9, not guessed Gmail priorities.

## Provider comparison: present evidence, not catalog rankings

This matrix reuses research accessed on 2026-11-03; prices/terms must be rechecked before purchase. No success-rate or latency superiority was measured. OAuth custody, supported actions, exact account selection, production OAuth registration, result processing and deletion are distinct evaluation dimensions.

| Candidate | Source-backed fit and account/tool boundary | Cost/data/maintenance gate | Recommendation under Q9/Q10 |
|---|---|---|---|
| **Composio** | Current [sessions](https://docs.composio.dev/docs/configuring-sessions.md) can pin accounts/auth configs/tools; default catalog is broad and approval filters experimental. Native actions, search/execute and proxy/custom tools exist. [Custody](https://docs.composio.dev/docs/security/token-custody.md) stays in Cloud even with own OAuth app; no supported usable-token export. | [Pricing](https://composio.dev/pricing): Hobby 100k calls/month with 20k managed-app subset; Pro $29 plus usage, app-dependent managed overage. Signup-date/grandfathering and 2026-11-03 rate changes matter. Arguments/results logged by default; covered-new-call ZDR is not historical erasure. | Repair baseline first if actual target actions/terms fit. Current core `0.28.0`/vercel `0.13.0` require deliberate runtime/peer migration from locked `0.6.3`, not a drop-in bump. |
| **Nango** | [Agent sessions](https://nango.dev/docs/guides/agent-sessions.md) support catalog actions, code-owned functions, remote MCP and scoped tokens; exact pins/ambiguous-connection failure help. [Auth](https://nango.dev/docs/guides/auth/auth-guide.md) includes custody/refresh and supported credential access. Disable `nango_proxy`: it bypasses tool filters. | [Pricing](https://nango.dev/pricing): free 10 connections/10 compute hours/10 GB; $50 PAYG credits, then connection/compute/egress units. [Security](https://nango.dev/docs/guides/platform/security.md): Cloud logs 15 days, hard connection deletion after 31 days; no EU public cloud per current pricing. Catalog auto-updates need drift tests. | Primary challenger for a small controlled action set. It is no longer only OAuth plumbing; current features still need the same fixture suite. |
| **Pipedream Connect** | [MCP reference](https://pipedream.com/docs/connect/mcp/developers.md): project/environment/`external_user_id`, optional exact `accountId`, app-scoped tools, actions/proxy/custom components. [OAuth client matrix](https://pipedream.com/docs/connect/managed-auth/oauth-clients.md) separates managed production auth from custom-client credential retrieval. | [Pricing](https://pipedream.com/pricing): Startup $150 monthly or $99/month **annually billed**, 100 external users/10k credits; external-user/compute overage. [Workflows/String sunset](https://pipedream.com/docs/workflows.md) is 2027-03-31; Connect API/MCP/proxy continue. | Add only if broader action coverage justifies the fixed minimum. Do not build a new Workflows dependency or reject Connect for a different product's sunset. |
| **Arcade** | [Production auth](https://docs.arcade.dev/en/build/user-facing-agents/secure-auth-production) requires own OAuth apps/custom verifier for multi-user production; default verification restricts project membership. [Tool recommendation](https://docs.arcade.dev/en/operate/governance/mcp-gateways/tool-recommendation) is not execution authorization; REST execute is not constrained by preceding gateway search. | [Pricing](https://www.arcade.dev/pricing): Team $25 plus $0.01/call, billing details to confirm. [Cloud policy](https://docs.arcade.dev/en/operate/deploy/arcade-cloud): US-only, training-eligible payloads with opt-out, retention up to five years; actual default setting unverified. | Consider only if measured action/policy benefit pays for OAuth/verifier work and explicitly acceptable no-training/retention terms. |
| **Paragon ActionKit** | [API](https://docs.useparagon.com/actionkit/api-reference): backend-signed user JWT, `actionkit` permission and exact `X-Paragon-Credential`; embedded portal/custom connectors/MCP. [Tool calling](https://docs.useparagon.com/actionkit/actionkit-for-tool-calling.md) documents listing/filtering, not verified semantic progressive discovery. | [Pricing](https://www.useparagon.com/pricing) is connected-user/tenant based; numeric production minimum and detailed retention not verified. File/body caps and own OAuth requirements need app-specific review. | Deferred B2B/embedded-configuration candidate; obtain quote, not assumed indie affordability. |
| **Merge Agent Handler** | [Architecture](https://docs.merge.dev/merge-agent-handler/how-it-works)/[FAQ](https://docs.merge.dev/merge-agent-handler/resources/faq): Registered Users, scoped keys/tool packs/security gateway; organization key is broad. Distinct from Merge Unified API sync. Semantic discovery not established. | [Pricing](https://www.merge.dev/pricing/agent-handler): Pro $1,000/month/25k credits; failed/rule-blocked calls consume credits. FAQ documents US-East and separate credential/user/audit deletion. | Deferred enterprise-oriented option unless the product/requirements change. Security gateway cannot replace exact-effect approval. |

Official remote MCP or a narrow own connector can win **one** service; neither justifies maintaining every OAuth integration. Follow [MCP security guidance](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices) for audience-bound auth, no unrelated-token passthrough, exact redirects and discovery SSRF. Google restricted scopes may require [production verification/security assessment](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification); personal testing exceptions do not approve a public multi-user launch.

## Separate five permissions

`OAuth scopes ∩ exact account grant ∩ (interactive per-chat selection OR scheduled reviewed version/consent pins) ∩ allowed action/resource policy ∩ exact-effect approval when required`.

All five are enforced server-side at dispatch. Selecting an app cannot add a scope, switch accounts, authorize a send or expose every returned tool. For interactive work, selection is the current owner/chat selection; scheduled work instead requires the exact reviewed `scheduleVersionConnections` pins and unexpired schedule consent in [12](12-schedules.md), not inherited broad chat access or a hidden selection in its new output conversation. A remote schema/name saying “read” is not a semantic classification. Initially register reviewed read operations and local drafting only. Creating a provider-side draft is itself an external write. Sending/deleting/sharing/publishing/spending remain disabled until a separately authorized operation design/live test; no mailbox read grant implies send consent (D-025/D-026; Q3/Q9/Q10).

## Records, lifecycle and auth attempts

Proposed records supplement [02](02-data-model.md); migrate `composioConnections`/`conversationIntegrations` additively. Existing selection stays per user and chat, with old/new branded IDs represented explicitly during coexistence rather than cast as each other.

| Table | Required fields / indexes |
|---|---|
| `connections` | `ownerUserId`, broker/environment, integration/auth-config/scope-profile versions, exact remote user/account IDs, verified display identity, requested/granted scopes, `revision`, `status`, cleanup state, timestamps and optional legacy connection ID. Index owner/integration/status, broker/environment/account and legacy ID. No provider access/refresh tokens in model-visible records. |
| `connectionAuthAttempts` | `ownerUserId`, `connectionId`, broker/environment, expected integration/config/scopes, stable client request key/hash, expected connection revision, state hash, server callback ID, platform, expiry, attempt remote ID, verified identity/scopes, `status`, timestamps. Reserve pending-account capacity transactionally; a new account gets a pending connection identity before its auth attempt. |
| `connectionGrants` | `ownerUserId`, `conversationId`, exact `connectionId`/revision/account hash, action/schema IDs, resource/data restrictions, policy version, expiry/revocation and revision. For interactive dispatch, chat selection is a prerequisite, not a replacement grant. For scheduled dispatch, reviewed `scheduleVersionConnections` plus exact unexpired/unrevoked consent supply the account/action/resource grant and selection scope instead; no output-chat grant/selection or implicit copy of conversation grants is required or allowed. Live account/ACL/policy checks still apply. |
| `connectionRevocations` | Owner/connection/revision, every known remote account/session ID, broker/environment, request key, cleanup targets, retry count/next retry, last safe error, broker-deletion/upstream-revocation confirmation and timestamps. Retain opaque IDs through account deletion until cleanup settles. |

Connection `status`: `pending | active | reconnect_required | disabled | revoking | revoked | failed`. Auth-attempt `status`: `pending | verified | failed | cancelled | expired | superseded`. A pending reconnect is **not** a replacement active account.

```text
new:        pending -> active|failed
health:     active -> reconnect_required|disabled
cleanup:    pending|active|reconnect_required|disabled|failed -> revoking -> revoked
reconnect:  old connection unchanged while separate attempt is pending
attempt:    pending -> verified|failed|cancelled|expired|superseded
```

1. Begin auth in an authenticated mutation: validate reviewed integration/config/scope profile and exact server-owned callback for environment/platform, reserve cap including pending attempts, write state hash/expiry and request dedupe. Generate at least 32 cryptographically random state bytes and a server-policy TTL; do not log/persist the plaintext state outside the necessary protected flow. Action obtains the provider URL; failures release/expire the reservation. Never choose “first auth config” or create a managed config because a list request errored.
2. The web opens a same-origin waiting popup during the click gesture, then navigates to the returned auth URL, with redirect fallback. Bind listener to expected origin, popup `event.source`, attempt and connection. `postMessage` is a hint to reload durable status, never proof of connection success. Mobile consumes auth-session/deep-link results and invokes the same server verifier; restart/cancel have durable attempt states.
3. Verify server-to-server with expected broker environment, remote user, toolkit, config, account and granted scopes. Check authenticated owner, state constant-time comparison, expiry and expected revision. Consume/promote using one compare-and-swap; replay returns the receipt, cannot promote another attempt. Missing state is invalid for new attempts; legacy exceptions need explicit migration, not permanent fallback.
4. Reconnect failure/cancel preserves the actual previous account ID and its health. Verified promotion increments revision, replaces account atomically, supersedes other attempts, invalidates pending approvals/sessions/caches/grants and queues old remote identities for cleanup. Reference-check cleanup: if the broker reused the exact now-active remote account ID, do not revoke it as a superseded account. Changed account/scopes require explicit re-selection/review. A same-service display name is not account continuity.
5. Broker-native supported refresh handles token refresh; typed health outcomes distinguish transient refresh failure, permanent grant revocation, insufficient scope, rate limit, upstream outage and bad **application** broker key. Do not mark a user's account expired because the platform key got 401. [Nango refresh reference](https://nango.dev/docs/guides/auth/token-refreshing.md).

Disconnect immediately disables dispatch/grants, increments revision, fences sessions/pending calls and creates a revocation outbox **in the same transaction**. UI says “Disabled; provider cleanup pending” until confirmation. Retry bounded remote cleanup without deleting handles. Account deletion uses the same outbox, not only relational cascades. Broker credential deletion, upstream OAuth grant revocation, provider logs and chat-history retention are separate outcomes under Q4; do not report “fully revoked” without the corresponding evidence.

## Adapter and dispatch contract

Keep a small broker adapter in the existing backend seam first. It normalizes lifecycle/execution outcomes, not every service's business schema. Proposed signatures:

```ts
interface IntegrationBroker {
  beginAuth(input: ServerAuthIntent): Promise<{ remoteAttemptId: string; authUrl: string }>;
  verifyAuth(input: ServerAuthAttempt): Promise<VerifiedAccount>;
  discover(input: AuthorizedCatalogRequest): Promise<ToolCatalogPage>;
  execute(input: ExactAccountOperation, signal: AbortSignal): Promise<BrokerOutcome>;
  health(input: ExactAccountRef): Promise<ConnectionHealth>;
  revoke(input: RemoteCleanupTarget): Promise<CleanupReceipt>;
}

type ExactAccountOperation = {
  operationId: string;
  connectionId: Id<"connections">;
  connectionRevision: number;
  remoteAccountId: string; // resolved by server, never model-selectable
  environment: string;
  canonicalToolId: string;
  toolkitVersion: string;
  schemaHash: string;
  args: unknown; // validated against this exact reviewed tool schema
  inputHash: string;
  providerIdempotencyKey?: string;
  deadlineAt: number;
};
```

`ServerAuthIntent` contains the stored attempt's owner-to-remote-user mapping, explicit config/scopes and registered callback. `VerifiedAccount` returns exact account/user/toolkit/config, granted scopes and verified profile. `AuthorizedCatalogRequest` contains selected exact account revisions, action allowlist/policy, cursor/query and definition budget. `ToolCatalogPage` returns canonical ID, broker/toolkit/schema version/hash, effect class, required scopes, validated input/output schema and cursor. `BrokerOutcome` maps to the native `ToolResult` in [07](07-tools-and-computer.md), including safe receipt, effect certainty, result/artifact/cursor/truncation metadata and typed error/retry classification. `ConnectionHealth` and `CleanupReceipt` carry evidence and observed time, not raw credentials.

Proposed model-facing meta-tools:

```ts
findIntegrationTools({ query, connectionIds?, cursor? });
// returns bounded authorized canonical tool descriptors only
executeIntegrationTool({ catalogToolId, args });
// server resolves exact account/schema/run policy from pinned catalog entry
```

Alternatively expose fixed small native tools with schema-specific arguments; they call the same executor. The model cannot choose broker/remote user/account, arbitrary proxy URL, scopes or environment. Do not expose unrestricted proxy/workbench/general-execute meta-tools. Shared Zod/Convex validators reject unknown fields, invalid IDs, oversized/deep JSON and args that fail the pinned tool schema; server semantics validate destinations/resources/attachment ACLs. Exact reviewed schemas win over model-supplied descriptions.

At execution, resolve `ExecutionContext` and claim the existing `toolCalls` record. Check current run/attempt/lease/cancel, owner, connection **active revision/exact account**, scopes, action/schema policy and budget. Interactive dispatch requires current owner/chat selection and `connectionGrants` resource scope; scheduled dispatch instead requires the admitted occurrence's exact reviewed `scheduleVersionConnections` account/action/resource pins and live consent/revocation checks in [12](12-schedules.md), never a hidden selection/grant in its output chat. Build canonical input hash including account/revision/destination/content/attachment hashes; recheck all of them immediately before dispatch and after any wait. Use the shared `interactions(kind=approval)` grant for effects; no separate integration approval table. Consume matching grant and persist effect intent once with `effectOperationId` before remote request. Generic “yes,” OAuth consent, a model boolean or provider's experimental approval filter cannot authorize it.

Cancellation aborts the transport and denies new operations, but cannot undo a remote request. A timeout after possible send becomes `toolCalls.status=unknown`, `effectCertainty=uncertain`. Reconcile by endpoint-supported idempotency/remote object evidence; otherwise request owner inspection. No automatic replay/fallback through another account/broker. Normal returned error objects (`successful:false`, MCP `isError`) must be parsed as errors, not reported as success because no exception was thrown. Read retries need bounded attempts/backoff/deadline and fresh state checks; operation retries return receipts rather than generate another effect ID (D-015/D-017).

Public connection APIs, proposed: `beginAuth({integrationId,scopeProfileId,platform,clientRequestId,connectionId?,expectedRevision?})`, `verifyAttempt({attemptId,state,clientRequestId})`, `cancelAttempt({attemptId})`, `list/get`, `setSelection({conversationId,connectionIds,expectedSelectionRevision,clientRequestId})`, `disable/revoke({connectionId,expectedRevision,clientRequestId})`. Identity derives from auth. Callbacks use server allowlists, never arbitrary caller `redirectUrl`. REST equivalents under `/api/v1/connections` are thin authenticated adapters with `formatEntity`/list/error envelopes and private/no-store caching; review/stop remain shared APIs. No parallel provider-specific authorization system.

## Progressive tools, results and events

For the first chosen apps, use a stable reviewed action set. Later retrieve over the **authorized** catalog, not all provider tools; task search must not hide direct required actions or bypass dispatch checks. Experimental starting limits are 5–10 selected definitions and 8,000 model-visible result tokens per call, pending Q3/Q9 and S10. Enforce byte/page/record bounds before parsing and context fit before continuation; provider caps such as 5 MB are not a usable prompt budget. Return `truncated`, authorized cursor, fetched-at/source identity and artifact references; never silently drop authorization/receipt fields.

Token-free definition caches key broker/environment/toolkit/schema/policy version, without user closures. Live account bindings rebuild from current state. Optional read-result cache keys owner, exact account/revision/scopes/grant, tool/version, canonical args/cursor and freshness; invalidate on reconnect/revoke/write/policy change. Do not cache write results as a substitute for the durable operation ledger. Stable tool ordering and catalog hashes join [05](05-context-and-caching.md)'s prompt prefix.

Verify lifecycle webhooks according to **that provider/event's** signature and replay contract; do not apply Pipedream trigger HMAC guarantees to connection callbacks without evidence. Bound body/clock skew, deduplicate provider event ID and reconcile server-side after out-of-order events. A webhook cannot activate an unknown account or supersede a later local revoke. Emit safe `runEvents` for discovery/dispatch/reconciliation and shared `usageEvents` for metered calls. Pino/traces record IDs, versions, outcome, latency and sizes, never raw mail, auth URLs, state/code/token, recipients or payloads by default (D-034; [15](15-observability-and-evals.md)).

## Experience: chosen accounts, visible decisions

Quiet workbench (D-023/Q2) puts the answer/local draft first. **Connections** is the management destination; a compact per-chat selector shows chosen **account identity**, not only app logos. Settings distinguishes listed, connectable and tested-for-specific-actions. Broker/processor disclosure and scopes sit beside consent, not buried in logs. Reuse [10](10-artifacts-and-interactions.md)'s shared cards, with no native dialogs.

| Moment | Hierarchy / key interaction |
|---|---|
| Connect | Account/scopes/processor first; progress shows a durable pending attempt. Popup closure is cancellation, not success. |
| Reconnect | “Existing account still available” only when true; separate pending attempt. Failure preserves the old actual account. |
| Read/local draft | Result stays primary, with account/source provenance and quiet progress disclosure. Provider draft creation is visibly a different action. |
| Exact effect | Required approval card stays outside folded work, shows full destination/content/attachments/account and expiry. Editing invalidates approval. |
| Unknown effect | Preserve the draft and evidence, say “Couldn't confirm whether it was sent”; offer inspect/reconcile, not one-click blind resend. |
| Disconnect | Immediate local disabled receipt plus provider-cleanup state. Never imply already sent content was recalled. |

On mobile, auth return/restart restores the attempt and server status; narrow review is full-screen with Back restoring the original card. CLI uses the same account/revision/approval receipts and browser handoff, not embedded web-only controls ([17](17-cli.md), [18](18-mobile-and-desktop.md)).

## Benchmark, migration and rollback

Small repairs do not wait for a vendor bake-off or a giant run rewrite: remove callback secret logging, enforce callback/attempt binding, preserve reconnect account IDs and persist cleanup outbox with existing Composio first. Exact-account dispatch must be proven before enabling consequential operations; if the old SDK cannot bind it, disable those operations until the adapter upgrade passes. New owner/private-data schemas remain additive and staged (S17).

S10 uses the same ten sandbox/fake-transport fixtures for repaired Composio and Nango: connect/read; wrong user/account; concurrent/canceled reconnect; missing scope/action; refresh/revoke; multi-page/oversized/schema-drift result; prompt injection; changed/expired/replayed approval; stop/remote-success/lost-ack; cleanup outage and rollback. Include a second user and two accounts for the same app. No LLM judge can certify account isolation; assert provider request account, effect count and denied calls directly. Measure completion/missing-action rate, error specificity, p50/p95 latency, definition/result tokens, total cost and OAuth/maintenance effort only after hard safety gates pass. Set numerical quality/latency thresholds after BK's named baseline, not vendor claims. Q3/Q8/Q9/Q10 precede live OAuth/model/write tests; a disabled real-send button is a valid initial milestone.

Migration, if selected after the benchmark:

1. Inventory old remote IDs/orphan reconnect accounts, scopes/configs, provider terms and grandfathered bill using separately authorized access. Do not export secrets to notes.
2. Map legacy selections to exact owned connection records **without enabling new apps/actions**. Mark unverified identity/scopes as requiring review; do not invent them.
3. Add challenger connections as opt-in records. Route each operation to one broker/version; never shadow sends, provider drafts, deletes or writes. No outage failover to another account.
4. Assume explicit user reconnect. Composio's documented account reads are not token export; own OAuth client does not magically transfer credentials. Any exceptional supported transfer needs both providers/upstream compatibility and separate secure consent/process.
5. Canary one app for BK then a second user, invalidate sessions/approvals on revision changes, and require re-selection/review of new account/scope grants. Preserve old metadata/receipts, not executable obsolete authority.
6. Disable old accounts and process verified remote cleanup before contraction. Rollback changes **future** routing only; revoked old accounts need fresh consent. Never replay completed/unknown operations through the old broker. Keep legacy readers until staged owner/schema/client/cleanup gates pass (S3/S10/S15/S17; D-030/D-033).
