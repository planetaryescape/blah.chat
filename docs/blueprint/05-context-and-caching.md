# 05: Context and caching

Build and count the next request the chosen model will actually receive, then prepare older context without moving the person out of their conversation. BK requested automatic compaction near 80% and cache optimization (D-005); the mechanism below remains PROPOSED (D-018/D-035, Q6/Q7/Q8, S4/S18 in [21](21-decision-log.md)/[22](22-open-questions.md)). Source baseline: `04866f80a6236716ebf8d8c5a79001727f85f4bf`, reviewed on 2026-11-03.

## Repair the denominator before the threshold

Current generation resolves active DAG ancestry but retains only 30 complete ancestors. Current compaction instead reads up to 1,000 all-branch messages and summarizes the first 16,000 characters of text, omitting tool/media data. It creates another conversation, loses important lineage/settings and labels the recap with the target rather than authoring model. The opt-in browser effect triggers at 75%, using a gauge contaminated by duplicated lifetime usage. Neither changing 75 to 80 nor increasing 30 makes this safe. ([Exact audit](../../research_notes/blah-chat-modernization-review/context-caching.md#what-exists-and-can-its-context-measurements-safely-trigger-automatic-compaction))

Separate three facts:

- **Context occupancy:** the effective input for one next request, replaced when the plan changes.
- **Billable usage:** physical model steps/iterations across the whole task, including summaries and retries; append-only financial evidence in [14](14-cost-model.md).
- **Local application cache:** Dexie synchronization, serialized prompt-building fields and per-action download/search maps. These do not report provider KV-cache hits.

Cached input still occupies context. Lifetime input/output totals, even perfectly charged totals, must never be the context denominator or numerator.

## One server-owned request planner

`ContextPlan` is the ephemeral contract from [02](02-data-model.md), not a new durable store. It carries `conversationId`, `branchHeadMessageId`, `transcriptRevision`, `contextEpoch`, resolved route/catalog/prompt/tool hashes, exact `messages`/`tools`, `inputTokens`, `countMethod`, `outputReserve`, `safetyReserve`, `toolGrowthReserve`, `usableInput`, `usableInputRatio` and covered/retained IDs. Use it for send, regeneration, comparisons, merges, model switches, CLI, scheduled jobs, compaction calls, continuations and every subsequent tool-loop provider request. (D-018)

The planner must construct the **full serialized next request**, including trusted system/custom/project instructions once, selected memory, immutable skill activation/version text, checkpoint, pending user turn, target-specific media/file conversion, retained typed tool/reasoning parts, selected tool schemas, structured-output schema and provider format overhead. Exact refers to the selected representation; it does not assert an exact tokenizer result. The adapter must dispatch that plan without rebuilding a different history afterward.

Count actual shapes, without introducing a universal tokenization framework. Reuse typed provider serializers and the existing token-service seams. A local tokenizer or bounded estimate is enough for ordinary short text; do not add a remote count call to every turn. Where a native count endpoint is used, supply matching system/tools/media, apply deadline/payer/privacy policy, and cache counts by content plus model/tokenizer/schema/media transformation versions. JSON/base64 character length and a fixed image constant are not exact multimodal counts. When image/PDF/audio accounting is unknown, use an explicit conservative upper margin or decline that input; never interpret unsupported counting as zero.

For a model with combined context capacity `C`, separate input cap `Imax` if documented, chosen output/reasoning allocation `O` and estimator/format reserve `S`:

```text
usableInput = max(0, min(Imax, C - O) - S)
usableInputRatio = inputTokens / usableInput
proactive compaction: ratio >= approximately 0.80
early tool guard: inputTokens + toolGrowthReserve > usableInput
hard dispatch guard: inputTokens <= usableInput, with usableInput > 0
```

If only an independent input cap applies, use that API's limit rather than subtract output twice. Set `maxOutputTokens`/provider-specific reasoning limits consistently with the reserved allocation. `toolGrowthReserve` forecasts the next growth and is compared once, not subtracted and added again. Unknown executable limits are ineligible, not a fabricated 128K fallback. Illustration only: `C=128K`, `O=8K`, `S=4K` gives 116K usable input and a 92.8K near-80% trigger. These are not chosen production limits.

Resolve coarse route eligibility using genuine context demand, then serialize/count the final candidate. Replan if model/API/host, schema, skills or capabilities change. Before every later request, locked SDK6's async `prepareStep` can inspect/replace the actual next messages; an explicit bounded loop is another option. Truncating a `fullStream` result event after execution does not bound the SDK's next input. ([Locked prepare-step contract](https://github.com/vercel/ai/blob/ai%406.0.89/packages/ai/src/generate-text/prepare-step.ts), [counter and tool-budget gaps](../../research_notes/blah-chat-modernization-review/context-caching.md#what-exists-and-can-its-context-measurements-safely-trigger-automatic-compaction))

## Immutable checkpoint plus recent tail

`contextCheckpoints` are replaceable context representations with immutable coverage/provenance, not assistant answers or replacements for transcript rows. They retain owner/conversation/branch, coverage/source hashes, prior checkpoint, summary ref/hash/schema/model, retained-tail boundary and cost/provenance as defined in [02](02-data-model.md). Publish a new checkpoint; never rewrite an old one. Originals, file references and effect receipts remain governed by [13](13-privacy-safety-compliance.md)'s retention/deletion rules. (D-018/D-022)

1. Select only authorized ancestors of the admitted `branchHeadMessageId`, in deterministic DAG order with merge deduplication. Reuse a shared-prefix checkpoint only if its covered hashes and access still match. Explicitly merged alternatives remain alternatives/conflicts, not invented consensus.
2. Partition the path once into covered older prefix and unsummarized/recent tail. Replace the blind last-30 cutoff with token budgeting; there must be no gap, double inclusion or silent dropping of an old constraint before compaction begins.
3. Keep an atomic tool group intact: assistant calls, parallel results/errors, required reasoning/signatures, outstanding interaction and current-turn continuation. Never retain a result without its call or repeat an effect to reconstruct context. Unresolved questions/approvals remain outside the summarized prefix. Store full tool results durably, while the next model receives bounded extracts/pages plus authorized retrieval references.
4. Keep latest corrections and recent user intent verbatim. The summary records goals, hard constraints, accepted decisions, superseded facts/corrections, unresolved questions, completed actions with certainty, pending work and source references. Preserve original authority: summary/tool/web text is untrusted data, not a new system instruction; do not include hidden chain-of-thought.
5. Preserve files/citations by stable authorized IDs/content hashes and page/section references, not signed URLs or raw base64 copied into prose. A reference requires a functioning authorized retrieval path; otherwise inline the necessary excerpt or disclose the unavailable detail. Activated skill packages are reloaded at their pinned versions through [08](08-skills.md), not reconstructed from a summary.
6. Bound the summarizer's own input/output. Chunk oversized coverage at semantic/complete-tool boundaries and combine with an auditable coverage manifest; neither first-N nor last-N characters is a fidelity policy. Record summary-of-summary lineage and allow rebuilding from originals.
7. Validate schema, nonempty summary, coverage, reference access, target fit and material reduction before publication. Source-linked fixtures must retain old requirements and latest corrections. A paid checker is optional, separately charged and imperfect; it is not proof of perfect preservation.

Model switching uses a target-specific plan over originals plus portable checkpoint. Do not send an opaque OpenAI compaction item to Gemini, strip a required signature to make history typecheck, or assume one signed provider artifact works for another model. Preserve native parts for a later compatible return; rebuild portable history or refuse the unsupported switch explicitly. Comparison siblings can share an immutable checkpoint but have separate target budgets and usage. The smallest sibling must not silently shrink everyone else's context.

## Trigger, concurrency and recovery

The admitted Run owns preparation through [04](04-durable-generation.md)'s lease/epoch. Preparing and compacting are `runEvents` phases, not extra Run states or a second operations store. Derive deduplication from the admitted source snapshot, covered prefix, prior checkpoint and summary/prompt budget identity. Duplicate tabs observe one preparation result; a client ref is not the lock.

Compute a new checkpoint against a sealed prefix, then compare-and-swap publication and branch context selection using `transcriptRevision`, `contextEpoch`, source hashes and current `leaseEpoch`. Append-only suffix growth may survive if the covered prefix still matches; branch edits, revocation, source deletion, cancellation or a replaced lease invalidate publication. One lock acquisition order covers generation and context work. A stale summary may settle usage, but cannot change the pointer or launch an answer.

Use hysteresis: trigger near 80%, then target a materially lower occupancy and require newly coverable history before another summary. A 55–65% low-water band is an experiment candidate, not an approved default (Q6). Bound automatic compaction attempts/call count per Run and back off after failures/no reduction; cooldown never bypasses the hard-fit guard.

Before a potentially large tool, reserve predicted growth and require paging/extraction bounds. After all parallel results arrive, replan using their **actual model-facing** sizes before another provider call. If there is no settled older prefix, reduce/page the new tool data; do not summarize half a current tool exchange. One huge user message, mandatory media or non-removable instructions may not fit even after summarization: preserve the pending turn and offer file/page selection, retrieval, an eligible larger model or explicit new chat. Do not silently summarize away the sole new request.

On transient failure, retry only the bounded summary/count operation under the same validated snapshot and remaining budget. Continue with the prior plan only if it still fits. Otherwise show "Couldn't prepare context" with retry/change-model/reduce-scope actions. Stop reaches summary/count calls where supported, and publication/answer dispatch recheck cancellation independently. No failure deletes source messages or replays completed effects.

Undo changes context selection or creates an uncompacted branch; it does not erase later turns. If originals exceed the current model's limit, explain why another model/range is needed. Retain the previous checkpoint only under the approved retention policy, not indefinitely to promise undo. Compaction does not extend incognito retention.

## Cache layout within current authority

Use deterministic stable material before changing material, while preserving instruction precedence and the actual provider-rendered order:

```text
versioned base policy + stable authorized instructions
stable selected tool schemas / skill manifest and pinned activations
immutable checkpoint + append-only retained history
per-turn time, retrieval and bounded budget context + new request
```

Some providers render tools before system text; fingerprint that real sequence. Move fresh ISO datetime out of the early base prefix into an allowed trusted changing suffix, or use a time tool. Original timestamps stay immutable. Order tool schemas, selected connections, memory ties and skill manifests deterministically; never sort semantic history. Version/hash prompts, tool schema bytes, memory snapshots and skill packages. A permission/instruction/tool change intentionally invalidates the prefix or starts a new `contextEpoch`; a hit is never worth stale permissions. Do not expose every tool or skill just to stabilize a large prefix. ([Current prefix instability](../../research_notes/blah-chat-modernization-review/context-caching.md#proposal-d-stable-prefix-and-cache-policy))

Cache identity is scoped to authenticated user/data authority, credential reference/version, provider project/workspace/organization, region, model/version, API, gateway/host, prompt/tool/skill hashes and context epoch. Use opaque scoped identifiers rather than raw user IDs/emails/text in provider keys/logs. A cache key is not an ACL; shared provider credentials do not establish app-user isolation. No private cross-user document cache or cross-tenant result memoization is proposed. Where the provider offers no per-user key, assess stronger project/workspace isolation or a scoped discriminator without claiming that discriminator is a contractual security boundary.

Routing affinity is a soft preference for an eligible model/provider/host that may retain a warm prefix; Dexie is unrelated. A stable hash/key does not prove a hit. Actual usage and resolved route are the evidence. Revocation, payer/privacy requirements and required capabilities always override affinity. (D-019/D-022/D-035)

## Provider contracts are not universal

This table condenses the 2026-11-03 primary-source review. Recheck selected model/API/host and locked adapter forwarding in S18 before enabling controls; current direct-provider docs do not prove Gateway support. Extended TTL, explicit objects and stored provider history remain Q7/Q8 decisions. ([Detailed contracts and exact SDK links](../../research_notes/blah-chat-modernization-review/context-caching.md#what-do-current-provider-apis-and-the-pinned-ai-sdk-actually-support))

| API/family | Match, minimum and lifetime | Usage and implementation boundary |
|---|---|---|
| OpenAI earlier families | Identical rendered prefix; implicit caching only. Minimum is model/settings-dependent, not universally 1,024 tokens/128-token stride. Supported `prompt_cache_retention` is `in_memory` or `24h`; in-memory commonly 5–10 minutes idle, up to an hour; model/ZDR-dependent defaults. Earlier families have no separate write charge. | `input_tokens_details.cached_tokens` reports reads within total input. Locked OpenAI3.0.29 supports `promptCacheKey`/`promptCacheRetention`, not newer `promptCacheOptions`/`contextManagement`/`compaction`. Key is not a guaranteed hit or user ACL. [Guide](https://platform.openai.com/docs/guides/prompt-caching) |
| OpenAI GPT-5.6+ as documented | Minimum 1,024 visible tokens; implicit or explicit breakpoints, up to four writes. Responses `prompt_cache_options.ttl` is `30m` or `12h`; minimum lifetimes, not deletion deadlines. Explicit-only without markers does not cache. | Writes cost 1.25x/2.5x base input respectively; reads usually 0.1x with documented 0.05x exceptions. Preserve `cache_write_tokens` and `ttl_30m_tokens`/`ttl_12h_tokens`; subtract reads/writes from total ordinary input and never bill TTL components plus their aggregate again. New adapter/native support and rate card required. [Guide](https://platform.openai.com/docs/guides/prompt-caching) |
| Anthropic Messages | Exact cumulative tools→system→messages prefix. Up to four breakpoints; automatic consumes one; 20-position lookback for an existing write. Minimums vary: e.g. Opus4.6/Haiku4.5 4,096, Sonnet4.6 1,024, newer named families differ. Default ephemeral5m, optional1h; long TTL precedes short. Cold parallel requests need not share a hit. | 5m writes1.25x, 1h2x; reads generally0.1x with newer-family exceptions. Raw input excludes reads/writes: add creation/read categories once for total input; preserve TTL creation detail. Locked Anthropic3.0.45 supports cache control and threshold compaction; converter already aggregates compaction iterations. Workspace isolation is not per-app-user isolation. Bedrock/other hosts need separate checks. [Guide](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) |
| Gemini GenerateContent / Interactions | Implicit caching on2.5+: documented2.5 Flash/Pro minimum2,048; listed newer families4,096. No verified universal implicit TTL. Interactions is implicit-only; current docs exclude explicit objects from4 Argon onward. Supported older GenerateContent models can use model-bound `cachedContents` with explicit expiry and deletion. | GenerateContent uses `usageMetadata.cachedContentTokenCount`; Interactions uses `usage.total_cached_tokens`. Locked Google3.0.29 has `cachedContent`, not proven Interactions factory support. Explicit storage is token-time billed; contents/tools/system are immutable, only expiry updates. Set TTL explicitly; no universal explicit minimum/default is established. [Guide](https://ai.google.dev/gemini-api/docs/caching), [API](https://ai.google.dev/api/caching) |

Provider-native compaction remains an optional adapter experiment. OpenAI automatic Responses compaction emits an opaque item; standalone `/responses/compact` input must itself fit, and its **whole returned window** must be preserved. Anthropic threshold beta `compact-2026-01-12` and signed on-demand beta `compact-2026-09-04` have different replay/usage contracts and cannot simply be combined. Locked Anthropic supports threshold options, not the newer on-demand option; application replay is still absent. Gemini stored Interactions history is not a verified general text-compaction API, and its paid-tier default 55-day storage is a separate retention decision. Do not enable native state just to claim caching. ([OpenAI compaction](https://platform.openai.com/docs/guides/compaction), [Anthropic compaction](https://platform.claude.com/docs/en/build-with-claude/compaction), [Gemini Interactions](https://ai.google.dev/gemini-api/docs/interactions-overview))

## Quiet preparation, then the answer

In proposed Quiet workbench ([03](03-design-concept.md), D-023/Q2), the small context meter says active context / usable input, marks estimates with `~`, and discloses output reserve/target model on demand. Auto shows pending selection or conservative planning, not the last model's capacity as current truth.

Preparation is a quiet inline "Preparing context..." row. Keep the draft, conversation URL, scroll and reading anchor. Success adds a restrained "Earlier messages summarized for context" marker with View summary, covered range, View originals and available Undo. It must not appear as the assistant's factual answer or launch a modal/toast on every turn. A hard-fit failure preserves the user's request and offers the specific safe action. Q6 decides default-on behavior, exact threshold/tail and acceptable delay; opting out of proactive summarization never disables hard fit.

## Staged delivery and acceptance

First separate lifetime accounting from replace-only occupancy; add exact serialization and hard-fit preflight in the current action. Then add immutable branch checkpoints and publication fences. Enable server proactive compaction only after S4/Q6; stabilize prefixes before testing explicit caches/long TTL/native state under S18/Q7. Rollback disables new proactive publication/cache options for new work while retaining readable checkpoints/originals and hard-fit safety. Never restore a silent last-N policy as fallback.

Required offline cases exercise real pinned serializer/fake-fetch boundaries: near-threshold and hard-limit edges, output/reasoning reserve, large schemas, unknown media estimates, huge new message, inactive giant branch, merge deduplication, old constraint plus latest correction, message-30 boundary, atomic parallel tools, switch-out/back, duplicate tabs, stale/cancelled summary and revoked/deleted source. Assert immutable originals, one publication, no dangling tool pairs, no inactive-branch leakage and a fitting **actual next payload**. Cache fixtures verify wire options, deterministic ordering, invalidation, scoped identity and nonoverlapping read/write/iteration normalization, not just mocked option objects. (D-033/S4/S18)

Later authorized synthetic experiments compare cold/warm/expired caches and matched1/5/15/60-minute think-times, direct versus Gateway, branch forks and tool/skill changes. Measure constraint/correction recall, successful task quality, overflow/estimate error, p50/p95 preparation/TTFT, write amplification and total task cost including summaries/cache rebuild/storage. Compare threshold/tail candidates rather than declaring80% optimal. Current volume, cache-hit rate and monetary baseline are unknown; every proposed saving remains unmeasured.
