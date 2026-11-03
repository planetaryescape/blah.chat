# 06: Model routing

Make Auto choose a permitted, capable model before trying to make it clever. Preserve manual model choice and mid-chat switching. D-009 requests renewed research; one deterministic baseline and catalog are PROPOSED by D-019/D-035, not an approved learned-router purchase. Q8/Q18 and S5/S18 in [22](22-open-questions.md) govern model/payer/data terms and evaluation. Baseline: `04866f80a6236716ebf8d8c5a79001727f85f4bf`, reviewed on 2026-11-03; decisions are in [21](21-decision-log.md).

## What Auto actually does now

Only the Auto selection enters semantic routing; explicit models do not. The active path is classifier/bin selection, not the legacy random cost-tier selector described by older guidance. It embeds before hard rules, has no connected checked-in seed embedding artifact, loses `previousRouteLabel`, receives literal zero context demand and conflates any attachment with vision. Its embedding accounting passes `inputTokens` to a validator requiring `tokenCount`, so a successful embedding can fall into an unconstrained default. Direct Groq/Cerebras key presence bypasses classification and eligibility. Missing/exhausted-bin fallbacks can ignore exclusions/capabilities. These are source findings, not observed production route frequencies. ([Full trace](../../research_notes/blah-chat-modernization-review/routing-feature-disposition.md#current-routing-execution-not-the-older-skill-description), [G7](../../research_notes/blah-chat-modernization-review/generation.md#g7-semantic-auto-routing-fails-at-embedding-accounting-fallback-ignores-constraints))

Repairing these failures does not require another routing service. Preserve the existing pure `packages/auto-router` selection boundary and Convex I/O adapter; remove unsafe behavior at their shared contract, not by silently replacing a manual selection with hosted Auto.

## One executable catalog snapshot

Resolve one versioned snapshot from the central catalog and allowed database configuration for picker, admission, context planning, routing, provider construction and pricing. Current database picker rows, shared `MODEL_CONFIG` and router-local profiles disagree in authority. A custom active row does not prove an executable provider adapter exists. Retain the shared provider registry, creator/gateway/inference-host distinction, deprecation and historical resolution; do not hardcode model IDs in new UI or runners. (D-035; [catalog evidence](../../research_notes/blah-chat-modernization-review/generation.md#gaps-1), [current definitions](../../packages/ai/src/models.ts), [execution registry](../../packages/ai/src/registry.ts))

For each executable route, the snapshot must establish actual API model mapping, lifecycle/access tier, model/API/gateway/host capabilities, input/output limits, reasoning controls, tool/schema/media compatibility, allowed credentials/regions/retention and pricing reference. Unknown capability or limits cannot inherit a fabricated128K/free custom-model fallback. Picker-only descriptive metadata is not admission evidence. Preserve old versions for historical display and accounting; new catalog changes do not rewrite old receipts.

Pin `catalogVersion`/`policyVersion` on the Run and actual route/payer/pricing references on `runAttempts` from [02](02-data-model.md). Keep prompt/tool/context hashes from [05](05-context-and-caching.md) alongside the decision's bounded provenance. This is one selection contract, not a second model registry or event store.

## Eligibility precedes scoring

Construct request requirements from the admitted branch, latest turn plus relevant task context, typed attachments, selected tools/skills, requested output schema, real context estimate/output reserve, user/provider opt-outs, credentials/payer, privacy/region/retention rules, risk requirements, failed IDs and prior eligible route. Prefer local structural features or approved summaries over uploading the transcript to a classifier. Risk is an independent requirement: image + medical/research context must compose, not lose safety handling to the first matching task label.

The selection sequence is:

```text
manual/Auto intent + pinned catalog + current authorization
  -> hard eligible routes
  -> deterministic task/bin or approved selector
  -> candidate-specific ContextPlan + final eligibility
  -> resolved Attempt -> one provider dispatch
```

Every route and **every fallback** must pass the same predicate:

| Requirement | Reject when |
|---|---|
| User intent/access | Model/provider opted out, unavailable/deprecated for new use, internal-only, unapproved experimental tier or inaccessible subscription |
| Failed IDs | Current retry chain already excluded that model/route; stable IDs are not replaced with an alias to evade exclusion |
| Media | Actual image/PDF/audio/video input or output cannot be represented as promised; an attachment description is not equivalent to image understanding |
| Tools/schema | Required tools, strict structured output, parallel calls, required reasoning/signatures or native history format are unsupported |
| Context | Candidate-specific serialized request plus reserves cannot fit; unknown limits are not assumed adequate |
| Credentials/payer | Key missing/revoked, route cannot use admitted payer, or fallback would silently use platform credentials |
| Privacy/policy | Provider/host/region/retention or auxiliary processor violates current approved data policy |
| Envelope | Remaining token/tool/compute/wall-time/budget allowance cannot admit the next call |

This predicate covers direct-only deployment, Auto-disabled saved default, classifier error/timeout, missing bin, exhausted bin, manual admission, provider/host failover and automatic retry. With one eligible direct model, Auto selects it locally without classification. With none, persist a clear `no_eligible_model` error and permitted next actions; never return the first registry key or the excluded text default. No route is allowed to relax privacy/tool/media requirements just to find an answer. (D-019/D-035/S5)

Manual choice pins model intent. Explain unavailability/context incompatibility and offer eligible alternatives; do not silently perform semantic rerouting. Host failover within that model still requires the approved payer/data policy and records actual host. A switch builds a fresh target `ContextPlan`; it does not trust the old model's meter. Partial answers and confirmed tool effects survive failure under [04](04-durable-generation.md). Model fallback cannot repeat a consequential tool with an unknown outcome.

## Deterministic baseline first

1. Fix the typed embedding-accounting validator, but run local hard rules and eligibility **before** auxiliary network calls. Preserve direct-only no-auxiliary-network intent as explicit policy, not an environment-key shortcut.
2. Curate a small reviewed pool and deterministic bins from the executable snapshot. Stable tie-breaks make decisions reproducible. If similarity is retained, load a real versioned consumed embedding artifact; no examples or disabled fallback means no surprise LLM classifier call. Bill every authorized classifier/embedding step.
3. Pass prior model **and** prior route label end-to-end. Keep an eligible prior model/provider/host softly sticky until capability change or expected benefit justifies switching. Cache affinity is best-effort and separate from Dexie; a sent cache key does not prove warmth.
4. Rank using expected full task cost and measured responsiveness, not mean list input/output price or "Groq is fast" as a latency measurement. Account for input/output proportions, cache reads/writes, reasoning, summary/retry/classifier/tool overhead and cold-switch cost. Expensive is not synonymous with quality or safety.
5. Keep existing cost/speed controls until a replacement is approved. Proposed simpler economy/balanced/quality language must be backed by evals, not relabeled arbitrary weights. High-stakes handling is conservative reviewed policy/clarification, with online random exploration off.
6. Reuse this eligibility and estimate path for cheaper-model recommendations/preview. Enforce recommendation opt-out **before** background calls; keep explicit acceptance, distinct charge attribution and manual choice unchanged. Smart Assistant removal must relabel unrelated recommendation usage without deleting the capability ([16](16-smart-assistant-removal.md)).

Record the selected route, bounded reason, rejected requirement categories, policy/catalog/prompt/example versions, auxiliary overhead and fallback chain with existing Run/Attempt/event provenance. Task-label confidence is not probability of a correct answer. Logs omit private prompt/tool content by default; [15](15-observability-and-evals.md) governs optional traces. ([Implementation evidence](../../research_notes/blah-chat-modernization-review/routing-feature-disposition.md#incremental-router-implementation-within-current-boundaries))

## What scholarship supports, and what it does not

These are the papers/vendors actually reviewed, not interchangeable proof of savings:

| Evidence | Finding used here | Transfer limit / disposition |
|---|---|---|
| Ong et al., *RouteLLM*, submitted2024-06-26, inspected revision2025-02-23 | Learns pre-generation strong-versus-weak preference. Historical main pair GPT-4-1106-preview/Mixtral8x7B; augmented MT Bench MF uses13.40% strong calls at CPT50, score8.8 versus9.3. CPT50 means half the weak-to-strong quality gap, **not50% correctness**. | Arena-only transfer was weak on MMLU/GSM8K; relevant augmentation mattered. README up-to85% savings and paper v4's3.66x cost result at that point are different claims. Historical pairs/judges do not validate current multimodal/tool/private-history routing. SPIKE a calibrated current pair, not imported weights as production truth. [Paper v4](https://arxiv.org/html/2406.18665v4), [code](https://github.com/lm-sys/RouteLLM) |
| Hu et al., *RouterBench*,2024-03-18/revised03-28 | Over405k inference outcomes support comparable cost/performance policy evaluation without regenerating each response for each policy. | Historical static outcomes omit today's prices, cache behavior, reasoning settings, outages and app tools. Reuse methodology/public data, not historical quality rankings. [Paper](https://arxiv.org/abs/2403.12031), [repository](https://github.com/withmartian/routerbench) |
| Li et al., *LLMRouterBench*, ACL Findings2026-07 | Verified publisher abstract reports over400k instances,21 datasets,33 models, ten baselines and latency-aware analysis; many methods perform similarly, several recent/commercial methods do not reliably beat simple baselines, and curation matters. | Only publisher record/abstract was verified, not a reproduction or full per-method table. Supports baseline/candidate-recall diagnostics, not "simple always wins". [Publisher](https://aclanthology.org/2026.findings-acl.1881/), [repository](https://github.com/ynulihao/LLMRouterBench) |

The detailed author/source/metric ledger is [routing research](../../research_notes/blah-chat-modernization-review/routing-feature-disposition.md#primary-source-ledger-and-what-the-experiments-actually-establish). No reviewed paper establishes safe side-effecting tool routing for this app.

Compare a learned pairwise/value selector only after the repaired deterministic bins, cheapest-eligible and strongest-reviewed single-model baselines exist. RouteLLM chooses before generating; a quality cascade instead pays for cheap generation plus verification and possible escalation. Initial cascades belong only in non-streamed, side-effect-free tasks with useful deterministic validators. Do not show rejected streamed text or replay live effects to improve a quality score.

Hosted options are optional adapters, **not approved uploads**:

- Not Diamond's reviewed2026-05-21 training docs require representative inputs, candidate responses and evaluation scores;15 minimum samples is an API minimum, not statistical adequacy. Maximum10,000 samples/5MB and minutes-to-hour training do not establish app benefit. Review training/inference retention, subprocessors/region and explicitly approve the dataset before sending anything. [Training contract](https://docs.notdiamond.ai/docs/router-training-quickstart)
- Current OpenRouter Auto uses roughly30 task types and trailing seven-day **market spend share**, with cost bands/restrictions/fallback/stickiness. It is not established as the old Not Diamond implementation or blinded quality ranking. `cost_quality_tradeoff` is deprecated for `cost_tier`; plugin IDs differ between Auto variants. Require app prechecks and returned actual-model/provider checks; market popularity and cost bands are not a quality guarantee or hard dollar cap. [Auto docs](https://openrouter.ai/docs/guides/routing/routers/auto-router), [cache affinity](https://openrouter.ai/docs/guides/best-practices/prompt-caching)
- Unify's current site documents continual learning, not a verified supported routing API. Defer integration rather than infer support from older aggregators. [Current site](https://unify.ai)

Online bandits/exploration stay off. The legacy random selector is not a bandit: no learned reward/propensity contract was found. Any future exploration needs consent, reward quality, traffic, budget and safety exclusions; no such production experiment is selected. Legacy public exports are deferred for consumer/version review, not an extra authorized deletion.

## Evaluation before promotion

S5 begins with no-network fixtures and an initial reviewed5–12-case set, then a versioned representative corpus. Each case records conversation family/source consent/split, admitted branch context, latest request, typed media/tools/schema, reserves, manual/Auto intent, previous route, credential/payer/privacy restrictions, excluded IDs and allowed outcome set. Attach catalog/policy/prompt/model/provider/pricing/cache versions and a rubric/reference/validator. Use the actual Convex routing call chain and provider serialization with fake fetch, not tests that only assert a model is defined.

Split by conversation family and time; no near-duplicate train/test leakage. Comparison votes can supply consented win/tie/both-bad data only with the original candidate outputs/context/options and deletion policy. Model selection, copying and retrying are not clean preference labels. Open prose needs blinded reviewed pairwise labels; code/schema can use real deterministic tests; optional judges need calibration and disagreement/bias reporting. Private/incognito chats are not automatically an evaluation dataset. (D-033/D-034/Q18)

| Gate | Required evidence |
|---|---|
| Intent/eligibility | Zero supported-fixture violations across all fallback paths; no forbidden model/payer/media/schema/context/privacy dispatch; empty pool fails explicitly |
| Risk composition | Mixed medical/image/research/long-context and multilingual/negated/quoted cues preserve independent policy requirements; premium price is not the assertion |
| Stateful correctness | Same-label follow-up, topic change, branch switch, partial/stop/retry and exhausted exclusions retain actual ancestry and never replay uncertain effects |
| Quality | Slice-level rubric pass and win/tie/both-bad, conversation-cluster uncertainty; no critical regression hidden by an average |
| Whole-task cost | Cost per successful task including classifier/embedding/verifier/retry/tool/reasoning/cache-write/compaction costs; approved quality floor and margin |
| Latency/cache fairness | Router p50/p95, user TTFT/completion and error rate under paired cold/warm/expired cache conditions and realistic think-times; same route/settings/inputs where comparable |
| Candidate recall/drift | Separate missed useful models from bad scoring; fallback/exhaustion rates, catalog changes, time/model holdouts and policy-control monotonicity |

Specific regressions include direct-only/no-key setups, excluded default, missing/empty bins, classifier outage, no examples with fallback disabled, Auto disabled with saved Auto default, zero/huge context, PDF versus image/audio, tool-only requests, overlarge reserves, stale catalog, missing BYOK and prohibited auxiliary calls. Q18 supplies acceptable quality/latency trade-offs; no universal savings percentage is assumed.

Offline selection shadowing must not generate a second paid answer or run tools. Remote shadow classification is still a paid/privacy-sensitive call. Later canaries need explicit budget/data approval; Langfuse is an optional reporting/eval backend, not required for deterministic gates or permission to upload. [15](15-observability-and-evals.md) defines candidate evidence.

## Auto in the Quiet workbench

The person came for one answer. Keep the model/Auto control compact and consistent with manual selection; do not open a routing dashboard or animate candidate contests. The answer footer names the actual model. On demand, "Why this model?" explains the capability/task match, meaningful fallback and payer implication in plain language. Distinguish a selection reason from an uncalibrated quality percentage. (D-023/Q2; [03](03-design-concept.md))

If nothing is eligible, preserve the draft/partial answer and say which requirement blocks progress, with permitted model/key/input changes. A recommendation is a quiet optional suggestion, never a forced switch. Advanced route/cache and cost details live in disclosure/receipt, not persistent transcript noise.

## Rollout and rollback

Ship typed accounting and universal eligibility first; unify the executable snapshot next; repair deterministic inputs/stickiness before any learned/hosted experiment. Each is a small additive change in current packages, not a replacement generation stack. Shadow only selection on authorized fixtures, then promote a policy version after S5 and separately approved canaries.

Rollback changes the selector/catalog used for **new** Runs to the last verified deterministic policy, without relaxing hard eligibility. In-flight Attempts retain resolved route/payer/pricing and safe failure handling. Retain old catalog versions and receipts; changing a router never re-executes an effect or rewrites old costs. No model/router quality, latency or cost saving has been measured in this planning work.
