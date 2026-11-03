# 14: Cost model

Account for every physical paid step, including work that never becomes a completed answer. Keep the spend receipt understandable and the payer truthful. D-016/D-035 propose the ledger/catalog contract; D-020 proposes SDK6 maintenance before elective SDK7 migration. Q3/Q8/Q18 and S3/S18 in [22](22-open-questions.md) remain open. Reviewed baseline: `04866f80a6236716ebf8d8c5a79001727f85f4bf`, 2026-11-03; [21](21-decision-log.md) distinguishes requirements from proposals.

## Current accounting is not a safe budget ceiling

The lock resolves `ai@6.0.89`, not the manifest minimum 6.0.3. Main chat permits 15 steps but reads last-step `result.usage`; stopped text returns before settlement; failed Attempts have telemetry estimates rather than attributable usage. Conversation tokens are also incremented twice. Daily `usageRecords` aggregation by user/date/model retains the first conversation/feature/BYOK dimensions, so daily totals may remain valid while attribution is wrong. TTS stores characters in an output-token field. Ordinary chat uses environment-backed provider singletons despite the BYOK settings promise. ([G2/G3](../../research_notes/blah-chat-modernization-review/generation.md#g2-multi-step-and-cancelled-text-usage-is-under-recorded), [payer/dimensional findings](../../research_notes/blah-chat-modernization-review/data-security.md#are-payer-selection-accounting-api-contracts-and-operations-dependable), [usage mutation](../../packages/backend/convex/usage/mutations.ts), [current normalization/pricing](../../packages/ai/src/utils.ts))

Do not repair this by adding more totals in completion callbacks. Give one idempotent writer ownership of physical usage and derive displays/aggregates. Context occupancy remains a replace-only next-request estimate in [05](05-context-and-caching.md), never an accumulated spend counter.

## Immutable events, then projections

Use `usageEvents` and [02's canonical usage attribution](02-data-model.md#canonical-usage-attribution): required tagged `attribution` is either `{kind:"run",runId,attemptId}` or `{kind:"operation",operationId,operationAttemptId}`, with branded owning-table IDs. Include `stepIndex`, `iterationKind`, exact pre-dispatch physical `dispatchRequestHash`, stable `usageKey`, unique `evidenceKey`, `correctsUsageEventId?`, `reservationId?`, owner/real optional conversation/feature, actual payer/model/route/pricing version, nonoverlapping token/cache/compute breakdown, `measurement: reported | estimated | unknown`, cost and timestamps. Existing `usageRecords` becomes a derived compatibility projection. One settlement writer owns both variants, not another billing store. (D-016)

The unit is a **physical provider request/step or billable internal iteration**, not one assistant message. A Run may contain several Attempts; a normal SDK tool loop contains several model steps. Continuation, compaction, embedding/classification, recommendations, deadline parsing, memory/summary helpers, image, speech, retries and cancelled work all have attributable entries. Logical request deduplication must not suppress genuine new provider charges.

- Persist execution identity before dispatch. Derive `usageKey` from tagged Run/Attempt or operation/operation-Attempt plus step/iteration identity, not provider request ID alone; providers may omit or reuse IDs across scoped contexts. Preserve returned request identity as evidence. Standalone authenticated selection summarization uses `admittedOperations`/`operationAttempts`, with owner/request/hash dedupe, exact dispatch request hash and actual payer/credential-version/catalog/pricing lineage as specified in 02. No conversation/message is required or fabricated; in-Run auxiliary work retains Run attribution.
- In one transaction, check `evidenceKey`, insert immutable evidence under the physical `usageKey` group and update its projection/reservation settlement once. Duplicate identical delivery is a no-op; conflicting data is visible reconciliation work, not another additive charge. Receipt replay reuses physical identity; a genuine paid retry allocates a new physical Attempt.
- Avoid unobservable SDK/HTTP retries: disable them when they cannot be independently recorded, or instrument each dispatch and physical retry as another Attempt with retained lineage. Gateway-internal billing still needs returned usage/cost evidence; do not fabricate hidden request counts.
- Missing usage is not zero. Preserve completed reported steps, record bounded estimates or `unknown` for interrupted dispatch, and show incomplete coverage. Later evidence appends an explicitly attributable reconciliation/correction through the same ledger; projections resolve that evidence without charging estimate plus actual twice. Never mutate historical facts or present an estimate as provider-reported usage.
- Keep financial settlement independent of Run terminal publication. A cancelled/failed/succeeded answer remains terminal when a late usage receipt arrives. An exporter failure cannot omit ledger settlement; an accounting delivery failure retries ingestion, not the provider call.

For correction arithmetic, group evidence by the original tagged physical Attempt/step/iteration `usageKey`. A newly accepted receipt appends a uniquely keyed correction with `correctsUsageEventId` and provenance to that original evidence; `evidenceKey` hashes usage key, source, stable receipt/revision identity and evidence hash. Recognize only `new authoritative amount - already recognized amount`, and update the matching reservation/projection in the same transaction. For example, an estimated $0.010 followed by reported $0.008 produces a -$0.002 correction, not another $0.008 charge. Retain both evidence records; do not invent negative physical token usage to express the financial adjustment. Repeated receipt delivery adds no correction; a later estimate cannot override reported evidence. Conflicting reported receipts require reconciliation rather than last-arrival-wins. Unknown cost stays visibly unresolved until an amount can be justified.

Store only allowlisted usage/pricing evidence and structural provenance, not secrets/full provider bodies. Deletion/retention policy Q4 and [13](13-privacy-safety-compliance.md) must reconcile financial retention with private content erasure; a durable ledger is not permission to retain transcripts forever.

## Exact SDK6 semantics and the SDK7 migration boundary

| Surface | Locked6.0.89 contract | Required handling / future7 boundary |
|---|---|---|
| `StreamTextResult.usage` | Last model step only | Never use it as the whole 15-step task total. SDK7 changes `usage` to all-step aggregate. |
| `totalUsage` / per-step usage | `totalUsage` sums the SDK call's steps; per-step callbacks/results retain individual usage | Prefer per-step immutable events and use aggregate only as a reconciliation checksum. A separately invoked continuation is outside the first call's aggregate. Never ingest aggregate **plus** its steps. |
| Input/output details | SDK6 usage exposes `inputTokens`, `outputTokens`, `totalTokens`, `inputTokenDetails.noCacheTokens/cacheReadTokens/cacheWriteTokens` and `outputTokenDetails.textTokens/reasoningTokens`; values can be undefined. Top-level `reasoningTokens`/`cachedInputTokens` are deprecated aliases. | SDK7 retains the nested details and removes those top-level aliases. Migrate readers to the nested fields; retain cache writes rather than today's read-only helper. Aggregation does not remove the need for per-request tiers and interruption evidence. |
| Loop hooks/stream | `onStepFinish`, `fullStream`, `stepCountIs`; async `prepareStep` | SDK7 uses `onStepEnd`, `stream`, `isStepCount` (some aliases deprecated). `prepareStep` overrides carry forward in v7; rebuild/recheck actual next input rather than assume v6 behavior. |
| History/options | SDK6 typed call `input`, result `toolName`/typed `output`; response history/metadata must be serialized correctly | SDK7 changes media parts, instruction/system-history handling and response-message accumulation. Test history and provider options together with usage, not a usage-only rename. |
| Telemetry | SDK6 `experimental_telemetry` | SDK7 explicitly registered integrations; telemetry totals are still not billing truth. Do not register duplicate integrations and infer extra provider calls. |

The contract is grounded in [exact SDK6 result source](https://github.com/vercel/ai/blob/ai%406.0.89/packages/ai/src/generate-text/stream-text-result.ts), [exact SDK6 usage types](https://github.com/vercel/ai/blob/ai%406.0.89/packages/ai/src/types/usage.ts), [exact SDK7 usage types](https://github.com/vercel/ai/blob/ai%407.0.162/packages/ai/src/types/usage.ts), [SDK7 migration](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0#multi-step-result-shape) and [reviewed migration scope](../../research_notes/blah-chat-modernization-review/agent-prior-art.md#verified-sdk-and-integration-versions). Do not transplant future-provider cache fields into the locked adapter with `any`.

The first dependency recommendation is a compatible AI6/provider maintenance cohort, not compulsory v7: reviewed targets include AI 6.0.322, OpenAI 3.0.136, Anthropic 3.0.138, Google 3.0.141 and Gateway 3.0.228. Recheck exact versions/graph at implementation. AI 7.0.162/providers v4 is a separate Node/ESM/history/usage migration; Tavily 0.5.0 still declared only AI5/6 peers in this research. No forced peer override or framework change is needed to fix all-step charging now. ([Dependency matrix and gates](../../research_notes/blah-chat-modernization-review/dependencies.md#runtime-and-integration-gates))

## Price nonoverlapping units

Persist the applied rate-card version, currency, effective timestamp and actual model/API/gateway/host/payer. Retain old versions; do not recalculate an old receipt using today's picker price. Input-size tiers apply to each provider request's qualifying input, including cache categories where the provider specifies, not the sum of a 15-step loop. Unknown price/model is unknown cost, never automatic zero; local inference may have zero provider-token charge but still has compute cost.

```text
request cost = ordinary input * ordinary rate
             + cache reads * read rate
             + sum(cache writes by TTL * applicable write rate)
             + output/reasoning billable partitions * their rates
             + provider tool/image/audio/other request units
task cost    = all physical requests + connector/search/compute/storage/infra
```

Token prices use the rate card's unit (often per million); convert before multiplication. Use deterministic decimal/integer-money arithmetic and round at a documented display/invoice boundary, not once per tiny streaming chunk. Report currency explicitly; do not silently sum currencies. If conversion is offered, preserve the original amount and conversion rate/date as an estimate.

The normalizer must preserve these differences (S18):

| Contract | Nonoverlapping calculation |
|---|---|
| SDK normalized input includes cache categories | Ordinary input is total minus reads minus writes, after validating the adapter's mapping. `totalTokens` is not an extra category. Missing category details are unknown, not proof of no cache use. |
| Raw Anthropic Messages | `input_tokens` excludes cache creation/read. Add those once for total input. Preserve 5m/1h creation detail and actual model-specific rates; do not add raw cache categories again to already-normalized SDK totals. |
| Newer OpenAI Responses cache writes | Preserve `cache_write_tokens` and TTL-specific components; charge components **or** aggregate at the correct rate, never both. Earlier-family no-write-premium pricing cannot be generalized to newer families. |
| Reasoning | If provider output already includes reasoning at the same output rate, charge output once. If the contract has different text/reasoning rates, partition `outputTokenDetails` accordingly; never add a reasoning surcharge to an already inclusive output total without evidence. |
| Native compaction | Additional billed sampling iterations need inclusion once. Raw Anthropic top-level usage excludes compaction iterations, but locked Anthropic3.0.45 converter already sums `iterations`. Do not add raw iterations to that normalized sum again. Billable iteration input is not effective next-context occupancy. |
| Gemini explicit caches | Cached-input and token-time storage are distinct units; retain resource lifetime/count/deletion evidence. GenerateContent `cachedContentTokenCount` and Interactions `total_cached_tokens` are distinct API fields, not two charges for the same hit. |
| Speech/image/provider tools | Retain actual characters, seconds/minutes, image units, resolution and tool-call units under the breakdown rather than relabeling all of them as tokens. Provider-executed search/computer tools may add charges beyond model tokens. |

Provider TTL/minimum/write/read details are deliberately scoped in [05](05-context-and-caching.md#provider-contracts-are-not-universal). Primary contracts: [OpenAI caching](https://platform.openai.com/docs/guides/prompt-caching), [Anthropic cache pricing/usage](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [Anthropic compaction usage](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand#count-compaction-usage), [locked Anthropic converter](https://github.com/vercel/ai/blob/%40ai-sdk%2Fanthropic%403.0.45/packages/anthropic/src/convert-anthropic-messages-usage.ts), [Google pricing](https://ai.google.dev/gemini-api/docs/pricing). A generic `cached` price cannot represent every API/TTL contract.

## Actual payer, request-scoped credentials

Resolve credentials before routing/classification and provider construction. Use request-scoped clients or immutable credential-scoped instances; never mutate module-level singleton keys for concurrent users. Store references/version and payer, not the secret, on the Attempt. UI BYOK enablement and gateway `user` attribution tags do not prove which account was charged. The selected gateway/provider response and credential path must support that claim. (D-016/D-035/Q8)

BYOK failure is explicit: reconnect/change model or separately consent to another payer; no silent platform-key fallback. This applies to embedding/classification, compaction, deadline parsing, recommendations, image/voice and evaluators as well as final prose. If a necessary auxiliary provider cannot use the allowed credential/payer, choose an approved local alternative or decline it. A BYOK model does not make platform-funded search/connector/E2B infrastructure free; show these separately and require policy approval. Two simultaneous fake users with different keys must not cross clients, cache scope, headers or usage attribution.

Manual and Auto fallback both obey [06](06-model-routing.md)'s provider/model/privacy/payer eligibility. A cheaper route cannot silently add a new processor or change region/retention. Unknown account-level discounts/tax/gateway markups mean catalog-based cost remains an estimate until reconciled with actual billing evidence, not an invented exact invoice.

## Reservations and hard resource bounds

`budgetReservations` uses canonical `ownerUserId`, tagged `subject: {kind:"run",runId} | {kind:"operation",operationId}`, owner-scoped `reservationKey`, versioned policy/currency, maximum token/tool/compute/wall envelope and reserved/settled/released amounts. Admission atomically dedupes the reservation key and considers settled usage plus outstanding reservations across concurrent Runs **and** standalone operations. Each usage event links `reservationId` whenever policy requires reservation; its subject/owner/currency/policy must match attribution. Otherwise retain the policy reason for absence. A monthly sum of completed rows cannot bound in-flight spend. Missing Q3 numeric limits must not mean unlimited autonomous work.

1. Reserve a conservative permitted envelope before dispatch. Apply input/output/reasoning, physical-attempt, tool/connector call, sandbox lifetime/resource, concurrent-run and wall-time bounds in the actual executor, not only the prompt.
2. Settle each recorded physical step once; reserve any next step/attempt before dispatch. Stop/denial/failure releases only unused allowance, not known incurred cost. Unknown remote usage retains a conservative unresolved amount until bounded reconciliation/policy resolution; a timeout is not a refund.
3. At durable human wait, release unneeded active compute allocation/reservations according to policy; retain recorded liabilities and re-admit fresh allowance on resume. Never leave a sandbox running because the agent is waiting for a person.
4. A stronger policy can stop **new** work at a cap, but cannot promise a perfect dollar ceiling for unknown/late remote billing, uncancellable in-flight effects or variable FX/fees. Explain that boundary and keep conservative headroom. Stop propagates signals and terminal/lease fences through [04](04-durable-generation.md).

Schedules have occurrence-specific envelopes and aggregate user limits; notification retry never reruns a task. Skill text loading does not allocate E2B. Computer/scripts are separately admitted and no live allocation is authorized until Q3/Q15/S12 gates pass. [07](07-tools-and-computer.md)/[12](12-schedules.md) specify executors.

## Include compute, connectors and processors

All-in cost must identify both the billing unit and the data processor. Vendor facts below are a 2026-11-03 snapshot from [computer research](../../research_notes/blah-chat-modernization-review/computer-skills.md#verified-pricing-and-a-source-conflict), [integration research](../../research_notes/blah-chat-agent-experience/integrations.md#verified-prices-and-limits) and [runtime costs](../../research_notes/blah-chat-modernization-review/agent-prior-art.md#verified-infrastructure-costs), not selected contracts or BK's bill.

| Cost family | Estimation / reconciliation rule |
|---|---|
| E2B | Published compute is `$0.000014/vCPU-second + $0.0000045/GiB-second`; charge allocated running resources, not CPU utilization. An explicit assumed 2 vCPU / 4 GiB for 600 seconds gives $0.0276 compute only. Official default RAM sources conflict; record actual `getInfo().cpuCount/memoryMB`, template and lifecycle. Paused/killed compute is not billed under cited docs, but pause is not deletion. Include model vision calls, exports/retained artifacts and hosting. [Pricing](https://e2b.dev/pricing.md), [formula](https://docs.e2b.dev/faq/calculate-sandbox-price.md) |
| Connector broker | Include call/credit/connection/compute/egress/fixed plan and upstream API charges. Reviewed snapshots: Composio Pro $29 + usage with signup-dependent terms; Nango PAYG $50 credits then usage; Pipedream Startup $150 monthly or $99/month billed annually; Arcade Team $25 + $0.01/call; Merge Agent Handler Pro $1,000/month. These are comparison facts, not provider approval or full pricing formulas. Failed/blocked calls may still bill. [09](09-integrations.md) owns exact contract review. |
| Workflow/Convex | Convex actions, writes, bandwidth, retained journals and cleanup are not free because components are open source. Alternative Vercel Workflow snapshot: $0.02/1,000 events, $0.50/GB written and $0.50/GB-month retained; a normal step has three events before retries. Functions/Queues add charges. No engine selected and no cost advantage measured. [Workflow pricing](https://vercel.com/docs/workflows/pricing) |
| Search/retrieval/storage | Include embedding, reranking/search API units, downloads/egress, extraction, file/artifact storage and explicit-cache token-time storage. Shared fixed overhead is reported separately or allocated by a disclosed method, never disguised as provider-reported per-turn spend. |
| Observability/evaluation | Trace units/retention and any judge generation cost are additional. Langfuse snapshot: Hobby 50k units; Core $29/month with 100k units, initial overage $8/100k. It is optional; no content upload or Cloud account is approved. Sampled traces are not the ledger. [Pricing](https://langfuse.com/pricing.md) |

Model, router, connector, sandbox and observability vendors can process different private data. A quoted low rate does not authorize that disclosure; Q7/Q8/Q9/Q10/Q15 and [13](13-privacy-safety-compliance.md) govern processor/region/retention decisions. Published trial credit is not recurring free capacity.

## Quiet spend receipts

Under proposed Quiet workbench (D-023/Q2; [03](03-design-concept.md)), one answer or artifact remains primary. Keep the ordinary answer footer small; open a receipt on demand showing actual model/route and payer, reported versus estimated/unknown cost, main answer plus preparation/tools/retries/compute, and any unsettled amount. Do not hide a real retry charge because the answer failed, or show a dashboard of counters while someone reads.

Before unusually costly work, show the bounded envelope and exact consent if required. At a budget block, preserve draft/partials and offer an eligible cheaper scope/model or budget change; no fake "free" fallback. A cancelled answer can truthfully say "Stopped; incurred usage still settling". Context meter and monthly spend remain visually and semantically separate.

## Minimal rollout and proof

First repair all-step/stop/continuation accounting and typed embedding arguments in the existing action, with one settlement owner. Add immutable events/keys and complete-dimension projections; introduce reservations and request-scoped payer resolution before expanding autonomous spend. Keep old `usageRecords` readable; reconcile totals and retain ambiguous historical attribution rather than inventing lost conversation/payer dimensions. Smart Assistant retirement preserves historical spend under [16](16-smart-assistant-removal.md). SDK upgrades, explicit caches, connectors and compute each ship separately behind their own gates.

S3/S18 acceptance must include the real action/validator and pinned SDK serializer with fake provider responses:

- Three differently priced steps, mixed cache/reasoning, a tool-only continuation, classifier/embedding, deadline parser and physical retry, including standalone operation attribution. Assert one physical usage group per stable `usageKey`, at most one accepted evidence row per `evidenceKey` and one reconciled recognized amount per group. Estimated/reported/correction evidence may share `usageKey`; duplicate delivery adds no row or financial delta. Sum the reconciled **per-request** tiered costs, not the evidence rows as independent charges.
- Duplicate/reordered settlement, lost acknowledgment, failure after paid completion, stopped/silent provider, late usage after terminal state and unknown-to-reported reconciliation. No event/estimate/aggregate double count.
- Anthropic raw versus normalized iterations and mixed TTL writes; earlier/newer OpenAI cache-write fixtures; Gemini cached input plus storage. Unknown fields stay unknown; reasoning already in output is not charged twice.
- Concurrent users/keys/payers/features/conversations, platform fallback denial and simultaneous reservations near cap. Assert real request headers, attribution and zero unauthorized calls, not just a mocked credential resolver.
- Successful fake image/speech/helper paths through schema-valid persistence; TTS character units remain characters. Anonymous/over-budget auxiliary entrypoints make zero provider calls.
- Standalone authenticated selection summarization: success, physical retry, stop/silent-provider late receipt, lost acknowledgment, duplicate settlement and estimated-to-reported correction all use operation attribution and matching reservation. Assert exact dispatch hash/payer, separate retry charges, one recognized amount per physical unit, released unused allowance and zero new conversation/message/Run rows. A reused request key with changed input conflicts before dispatch.
- Replay legacy/new readers and reconciliation totals across additive migration/rollback. Restoring an old projection cannot rerun provider work or remove the new ledger.

Rollback changes future admission/producer versions while retaining usage evidence, reservations and compatible projections; it never replays calls to repair a missing receipt. Compare proposed optimizations on matched quality/task success, cold/warm/expired caches, real think-times and total provider+infrastructure cost through [15](15-observability-and-evals.md). Production volume, realized USD, cache savings and performance baseline are unknown. No percentage saving or dollar ceiling has been demonstrated.
