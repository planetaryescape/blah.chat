# 08: Skills

Let a user add reusable instructions, invoke a skill directly, or enable the agent to discover a relevant skill. Give the agent a tool to draft new skills without granting it authority to publish or expand its own permissions (BK requirements D-007/D-012). The private library, import limits, activation defaults and publication review below are **proposals** under D-027 and Q11–Q14, not approvals. Use the shared records in [02](02-data-model.md), execution boundary in [07](07-tools-and-computer.md), and cards in [10](10-artifacts-and-interactions.md).

Authority and unresolved gates: [21](21-decision-log.md), [22](22-open-questions.md).

## Current versus target

At source baseline `04866f80a6236716ebf8d8c5a79001727f85f4bf`, developer guidance exists under [`.agents/skills`](../../.agents/skills), but the audited [schema](../../packages/backend/convex/schema.ts) and [tool registry](../../packages/backend/convex/generation/tools.ts) have no product user skill catalog or activation tool. [Custom instructions and project prompts](../../packages/backend/convex/lib/prompts/systemBuilder.ts) are separate features; keep them. The target is a private owner library, not automatic import of the coding agent's home directory or edits to privileged system prompts.

We follow the [Agent Skills specification](https://agentskills.io/specification) for packaging and its [integration guide](https://agentskills.io/integrate-skills) for progressive disclosure. Neither supplies a tenant ACL, sandbox, secret filter or execution permission. Dated source evidence: [computer/skills](../../research_notes/blah-chat-modernization-review/computer-skills.md#3-how-should-user-added-skills-be-imported-selected-and-executed), [self-authored skills](../../research_notes/blah-chat-agent-experience/schedules-self-skills.md#2-how-can-the-agent-create-useful-skills-without-silently-rewriting-itself), reviewed on 2026-11-03. No imports or live executions were performed.

## Package format and immutable identity

```text
weekly-brief/
  SKILL.md                 # required YAML frontmatter + Markdown instructions
  references/checks.md     # optional, read on demand
  scripts/normalize.py     # optional, visible but not executable by publication alone
  assets/template.csv      # optional input asset
```

Required frontmatter is string `name` and `description`. Initial ASCII `name` policy is `^[a-z0-9]+(?:-[a-z0-9]+)*$`, length 1–64, matching the selected root directory; this deliberately narrows ambiguous Unicode wording in the specification. `description` is 1–1024 characters. String `compatibility`, when present, is at most 500; `metadata` maps strings to strings. Preserve optional string `license` and experimental space-delimited string `allowed-tools`, with bounded field sizes. Unsupported fields produce visible compatibility diagnostics, never an implicit permission grant or hidden YAML rewrite. The recommended main-file size of fewer than 500 lines/about 5,000 tokens is a writing target, not a standard hard limit.

Store exact file bytes. `packageHash = SHA256(domain="blah-skill-package-v1", canonical ordered manifest of {relativePath,contentHash,mime,bytes})`; define canonical JSON/UTF-8 encoding, sorted paths and content hashes in one implementation with fixed fixtures. Exclude timestamps/storage IDs/scan outcomes; include `SKILL.md` bytes and every admitted file. An edit, line-ending change or metadata repair creates different bytes/hash. Imported `metadata.version` is provenance only; the application assigns monotonically increasing immutable versions. No mutable remote `latest` fetch or automatic package updates.

### Normalized records

All are new proposed tables, not deployed claims. Reuse existing `users` ownership; no invented organization owner.

| Record | Fields and invariants |
|---|---|
| `skills` | `ownerUserId`, unique owner/slug, display name, `currentVersionId?`, timestamps. Selecting current never rewrites historical versions. |
| `skillVersions` | `skillId`, `ownerUserId`, `version`, `parentVersionId?`, `status`, `packageHash`, parsed metadata, immutable manifest/body refs, `origin: imported\|user_authored\|conversation_generated`, source archive hash/provenance/license, creator user/run/tool refs, author model/prompt version if applicable, `validationPolicyVersion`, validation-report ref, creation/publication timestamps. |
| `skillVersionFiles` | `skillVersionId`, canonical `path`, owned content ref/hash, MIME/bytes, category, executable indicator. Unique version/path via transactional insertion. No arbitrary filesystem pointers. |
| `skillBindings` | `ownerUserId`, `skillId`, exact `skillVersionId`, scope `user\|project\|conversation` with corresponding owned reference, `invocationMode: explicit_only\|automatic_and_explicit\|disabled`, restriction-policy ref, revision. One effective binding per skill/scope; no hidden new-version upgrade. |
| `runSkillActivations` | `runId`, `skillVersionId`, `packageHash`, source `user\|model`, reason, catalog/selection-policy hash, effective-policy hash, loaded file IDs/hashes and activation timestamps. One run/version activation; context-epoch loading tracked separately from identity. |
| `skillImportJobs` | Owner, stable request key/hash, source kind, owned quarantine refs, actual byte/file counters, validation diagnostics, processing state/expiry and cleanup state. Import-job state is not skill-version status. |
| `skillDraftSources` | Draft version to selected conversation/message/artifact revision, branch head, source hash, purpose and minimal authorized excerpt/ref. No automatic permanent transcript copy. |
| `skillReviews` | Owner, exact version/package hash, validation-report hash, proposed binding/mode, requested capabilities, expiring nonce, decision/actor/timestamps. This is a publication receipt, **not** an external-effect approval store. |
| `skillValidationReports` | Exact package hash, validator/scanner versions, path/size/YAML/MIME/secret findings, executable inventory and compatibility report hash. Applies only to those bytes. |

Index owner/slug; owner/version status; skill/version; version/path; run/version; owner/scope; import expiry. Mutations, not indexes alone, enforce uniqueness. Scope authorization, package reads, publication and activation each resolve current owner access. Initial private capture/control is owner-only (Q5/Q11); a collaborator's conversation access must not expose private packages or authorize their reuse. Shares/export DTOs omit bodies/resources by default ([13](13-privacy-safety-compliance.md)).

## Import, validate, review, publish

Proposed initial sources are editor, uploaded folder and ZIP (Q11). A folder upload submits a manifest and bytes; it never asks the hosted server to read a local path. A ZIP has one selected root and exactly one intended `SKILL.md`; ambiguous roots require explicit choice/rejection. URLs, Git fetch, marketplaces and remote updates are deferred, not silently followed when mentioned in content.

1. **Admit:** authenticate, reserve owner storage, create an import intent and upload only to owned quarantine. Deduplicate by owner/request key plus payload hash; an identical retry returns the same job, different payload rejects.
2. **Inspect without execution:** bound archive parsing/extraction in a limited worker. Never run package scripts, import hooks or document macros to index content. Enforce actual streamed expanded bytes, not only archive header sizes.
3. **Validate package and permissions separately:** produce diagnostics and a complete file/requirements preview. Nothing is discoverable/active yet.
4. **Review exact bytes:** owner reviews instructions, file inventory/scripts, provenance/license, private-data warnings and compatibility. Any edit invalidates the old review/report; create another immutable draft snapshot.
5. **Publish:** authenticated user-review mutation compares package/report hashes, nonce, expiry and current policy with compare-and-swap. Dispatcher denies review operations even if a model guesses their names. Initial binding is `explicit_only` (Q12); enabling automatic use is a separate owner choice. Publication is not execution permission.

Proposed validator limits for fake fixtures, pending Q11/Q14: 10 MiB compressed, 50 MiB expanded, 500 entries, depth 8 and 1 MiB per text instruction/reference file; generated text drafts additionally target 10 MiB/100 files. Enforce a versioned maximum expansion ratio, parsing CPU/wall time and aggregate owner quota; unset required limits block import. These are app policies, not Agent Skills or provider guarantees. Use one centralized policy object and show actual offending size/path.

Reject absolute/drive/UNC paths, traversal including backslash variants, NUL/control characters, ambiguous encoded paths, duplicate/case/Unicode-normalization collisions, symlinks/hardlinks, devices/special files, encrypted ZIPs and recursive archive expansion. Canonical relative manifest paths must remain within the selected virtual root. Inspect actual file signatures/UTF-8 and bound decoding before trusting extensions/MIME; quarantine unsupported binary formats and executable payloads. Apply equivalent checks to folder and editor imports, not only ZIPs.

Safe YAML parsing must reject duplicate keys, custom tags/constructors, aliases or bound them explicitly, and cap nesting/node/scalar sizes. Require the documented field types, with no implicit date/object coercion into string metadata. Render previews through the sanitizer policy in [11](11-rendering-and-narration.md); descriptions and filenames are untrusted too. Secret/malware scanning and a model critique are fallible defenses. They do not replace deterministic ACL and execution boundaries.

Canonical skill-version `status` is:

```text
draft -> validating -> review_required -> published
validating|review_required -> rejected
published -> superseded|disabled|revoked
disabled -> review_required  [owner requests review of the same immutable bytes]
superseded|disabled -> revoked
```

An edit/retry creates a **new** `draft` version, rather than mutating validated bytes. `superseded` means replaced as current, not unsafe: existing pinned runs may use it if policy still permits. `disabled` denies new activation. Re-enabling the same immutable version requires a fresh owner review and current-policy validation through `review_required → published`; changed bytes require a new draft. This remains a proposed policy, not implemented behavior. `revoked` denies activation/resource/script dispatch and blocks dependent schedules. Rollback repoints a binding to an already published, still-allowed immutable version; it never revives a revoked version or rewrites history. Import quarantine/expiration/deletion are job/retention facts, not extra version enum values.

## Tools and owner APIs

Proposed operations live under `packages/backend/convex/skills/{imports,validation,versions,drafts,activation}.ts`, with AI SDK factories under `packages/backend/convex/ai/tools/`. These paths are planned. All signatures inject the trusted `ExecutionContext` from [07](07-tools-and-computer.md); no tool accepts owner ID, bearer token, raw storage ID, host path or `publish:true`.

| Model-visible signature | Exact authority/result |
|---|---|
| `activateSkill({skillVersionId,reason})` | Reauthorize eligible pinned version; return `{status,activationId,skillVersionId,packageHash,instructions,resourceManifest,requirements,blockedCapabilities}`. Instructions are bounded subordinate guidance, not system authority. |
| `readSkillResource({skillVersionId,path})` | Require this run's activation, canonical manifest member and current access; return native `{path,contentHash,mime,text?,artifactRevisionId?,truncated}`. No implicit URL fetching. |
| `runSkillScript({skillVersionId,path,inputArtifactRevisionIds,args})` | Separate privileged capability; reviewed published script/hash only, clean offline code environment and budget. Return typed [07](07-tools-and-computer.md) receipt. Text activation never allocates a machine. |
| `proposeSkill({name,description,workflow,inputs,outputContract,completionChecks,sourceMessageIds,sourceArtifactRevisionIds})` | User-requested sources only; persist private draft, deterministically validate, return `{status,skillId,skillVersionId,packageHash,reviewId?,validationIssues,previewRef,requestedCapabilities}`. No automatic publication/binding. |
| `reviseSkillDraft({skillVersionId,expectedPackageHash,changes})` | Owned unpublished source only; produce a new draft snapshot/validation/review. Existing published version remains unchanged. |

The table describes native result `data`; its skill-version/job `status` does not replace shared `ToolResult.status` from [07](07-tools-and-computer.md). Saving a draft may succeed **as a draft** without publication. If a workflow parks for a decision, the shared tool/run enter their matching wait states; never use `review_required` as a new tool/run enum.

Use schema-bounded strings, file counts, source counts and JSON arguments; no freeform patch to an arbitrary filesystem. `changes` is a typed metadata/body/manifest edit, with per-file path and expected content hash, not shell instructions. Stable operation keys derive from authenticated client request or run/tool identity. Mutation retries return the original IDs/hash; changed payload under the same key is an error. Mutation responses preserve review/version/hash fields, never generic string truncation.

Owner-only public functions: `skills.list/getVersion/diffVersions`, `imports.begin/complete/status`, `versions.publishVersion/disable/revokeVersion`, `bindings.set`, and draft editor/import operations sharing the same validator. `publishVersion({skillVersionId,expectedPackageHash,validationReportHash,reviewNonce,clientRequestId})` is **not** a model tool. `bindings.set({skillId,skillVersionId,scope,invocationMode,expectedRevision,clientRequestId})` rejects inaccessible scopes/versions and changed-policy requirements. Publication review and binding changes are explicit UI/CLI actions, not inferred from model output.

Transport adapters, when needed, expose `GET/POST /api/v1/skills`, `GET /:id/versions/:versionId`, `POST /:id/versions/:versionId/{publish,disable,revoke}`, and `PUT /:id/bindings` through the same domain functions. Use shared Zod/Convex validation, private/no-store responses and the actual `formatEntity` family ([07](07-tools-and-computer.md)); do not build a second filesystem-based library. Lists are cursor-paged with policy-bounded page size and owner-scoped search.

## Explicit and automatic use

Both requested paths ship; the unresolved default is whether automatic mode is initially enabled, not whether it exists (D-007/Q12).

1. Resolve current scope bindings at admission. Proposed precedence is exact conversation, then project, then owner default for **the same skill ID**; a narrower disabled binding suppresses broader automatic use. Different skills with the same display name remain distinct. Q11 must confirm this proposal; ambiguity never selects a first match silently.
2. `/skill` picker pins an exact version in the shared composer command contract ([commands](../../packages/chat-ui-core/src/commands.ts), [web menu](../../apps/web/src/components/chat/ChatInputSlashMenu.tsx)). Persist that selection with the request. Direct user selection loads authorized text regardless of the model's relevance judgment. For a clear natural-language direct request, resolve against the full owned explicit catalog; ambiguity requires a picker/question. An `explicit_only` version can be activated through a model tool only when the authenticated user turn grants that exact explicit intent, never because the model labels its own selection “explicit.”
3. Automatic discovery includes only owner-enabled `automatic_and_explicit` bindings with allowed published or pinned superseded versions. Supply sorted IDs/names/descriptions and bounded compatibility metadata, not bodies. Model activation includes a short reason and is reauthorized against the live binding. Draft/disabled/revoked/inaccessible versions cannot enter discovery.
4. Persist `runSkillActivations` and load exact instructions/resource manifest. Repeated activation returns the same activation identity. Deduplicate instruction insertion only while those bytes are present in the current context epoch. Resource reads load on demand; no script/import side effects.
5. Treat instructions as user-provided workflow guidance subordinate to platform/current user intent. `allowed-tools` may **restrict** the current tool set; it cannot add a tool, credential, destination or approval. Conflicting workflow steps ask for a choice rather than silently synthesizing a more permissive procedure. Unsupported requirements return blocked capability reasons, never improvised install/network fallbacks.

Effective authority is the intersection in [07](07-tools-and-computer.md); activation is not consent to execute a script, send a message or spend beyond a reservation. Incognito has no durable imports/drafts/bindings initially; an eventual explicit “save outside incognito” transfer needs a separate policy, not a silent exception (Q4/Q13).

### Progressive loading, context and cache

Integrate with the exact server `ContextPlan` in [05](05-context-and-caching.md), not string concatenation in a UI. Initial experimental caps are a 2,000-token metadata catalog, at most three active skills and total bodies `min(10,000 tokens, 15% of usableInput)`; Q12 and representative fixtures must choose production limits. A required explicit selection that does not fit returns a narrowing/model choice, not silently dropped steps. Large-library retrieval can later shortlist metadata, but explicit lookup stays complete and discovery recall must be measured before hiding candidates.

Sort stable allowed tool definitions/catalog/pinned skill content deterministically; put fresh time/task/progress in the changing suffix. Cache identity includes owner/access scope, package/file hashes, catalog/policy/prompt/model/API credential version and context epoch, never slug alone. No cross-owner private cache. Compaction stores exact activation/version/resource hashes outside its freeform summary and reloads their bytes; it cannot rewrite skill steps, permissions or effect receipts. Model switch/fallback revalidates context/tool/vision/script compatibility without upgrading versions. Revocation invalidates cache use and executor authority even if a provider prefix remains warm (D-018/D-022; Q7).

## Agent-created skills: capture the procedure, not the secrets

The initial Q13 proposal is user-requested persistent drafts; otherwise show a dismissible **nonpersistent** “Save this approach as a skill?” suggestion. Do not harvest every conversation in the background. A reusable procedure has a trigger, inputs, steps, output and completion checks; this week's report, a private fact or current browser state is usually an artifact or memory, not a new skill.

Select source turns/revisions on the authorized active branch. Resolve current ACLs/hash/revision before authoring; never pull sibling branches, unrelated RAG hits or hidden instructions as source. Show the included sources and exclusions in review. Default extraction replaces people/email/account IDs, confidential examples, internal URLs and task-specific data with typed placeholders. Intentionally retained confidential procedural references need owner selection/private labeling; private storage is not unlimited retention permission.

Block credential-looking keys/passwords/cookies/OAuth state/secret-bearing URLs pending removal. Never copy connector dumps, screenshots, hidden prompts or tokens into package resources. Scanners can miss secrets; explicit source preview plus deterministic execution limits remain required. If collaborator provenance cannot satisfy the agreed capture policy, block it under Q5/Q11. Source deletion must clear copied draft excerpts/caches under Q4; explain when a separately published skill is an intentionally retained copy with its own delete control.

Agent tool flow is `selected source -> proposeSkill -> draft preview -> deterministic validation -> review_required -> owner review -> published -> explicit use or separately enabled automatic discovery`. A model cannot publish, grant capabilities, edit host `.agents`/`AGENTS.md`, install MCP servers/hooks, or rewrite system/connector configuration. Authoring prompts belong in `packages/backend/convex/lib/prompts/`; any auxiliary LLM call uses the central catalog, explicit budget and shared `usageEvents`, including failed/cancelled calls. Create/validate/publish themselves need no LLM.

Scripts are a later Q14 slice: display every file/hash/interpreter/dependency in review, stage only selected inputs in a separate clean offline E2B code environment, use structured arguments and approved prebuilt dependencies, and export through [07](07-tools-and-computer.md). No secrets, host mount, browser profile, runtime dependency installation or arbitrary script in a writable Desktop. Never claim a skill hash or workspace directory is a sandbox.

## Experience: useful guidance, quiet provenance

Quiet workbench (D-023/Q2) makes the answer primary. **Skills** is a library destination; the conversation gets a compact skill/version chip and useful reason, not a second transcript of instructions. Selection chips remain visible in sent intent. Reuse shared [10](10-artifacts-and-interactions.md) review/progress/question cards, with no native dialogs.

| Moment | Hierarchy and interaction |
|---|---|
| Add first skill | Create/upload is primary; a real `SKILL.md` example and privacy notice are secondary. Validation shows the offending path/field, not “Something went wrong.” |
| Review import/draft | Readable instructions and changed files first; source/license, scripts, required capabilities and warnings nearby. Publish disabled while blocking validation remains. |
| Use directly | Picker confirms exact version; an ordinary answer starts without a computer spinner. |
| Automatic selection | Quiet “Used Weekly brief v2” with reason and disclosure; auto-discovery control stays in library/settings, not an alarming confirmation every time. |
| New version | Meaningful file/instruction/requirements diff; old pinned runs are not silently upgraded. |
| Failure/revocation | Preserve the draft/output and identify the unsupported/revoked requirement; offer Edit/Choose version, not unsafe Retry everything. |

The library exposes drafts/published/disabled, version history/diff, explicit-only versus automatic mode, scopes and revoke controls. Review is full-screen on narrow devices with Back restoring source card/focus. Private contents never spill into a shared activation card. CLI/mobile use identical names/version receipts without requiring the web editor ([17](17-cli.md), [18](18-mobile-and-desktop.md)).

## Delivery, migration and proof

1. Add private version/import validation plus direct **text-only** use; require zero E2B calls in this slice. No workflow or computer subsystem is a prerequisite for reading text.
2. Add owner-enabled automatic discovery, scope resolution and context/cache provenance. Both invocation modes need positive/negative fixtures before their release.
3. Add selected-source `proposeSkill`/revision/review using the same import validator. No separate “agent memory skill” store or bypass.
4. Add scripts only after Q3/Q14 and S12; publication remains independent from execution.

S11 gates owner isolation, archive/YAML/path/secret attacks, immutable versions and no unreviewed publication. Include duplicate/case-normalization entries, forged MIME, decompression overruns, malicious descriptions, unsupported scripts/dependencies, explicit-only model bypass, near-match automatic decoys, conflicting skills, revoked v1/unreviewed v2, compaction reload, smaller/non-tool model switch, canceled authoring, sibling-source leakage and review double-submit/hash changes. Test exact validator/import/activation boundaries, not a mock that accepts every package. Optional evaluation cases are safe fixtures bound to package hash; paid model/script tests and external effects need separate authorization.

There is no product library to migrate from developer skills. Add tables/readers first, update shared command/client projections and owner erasure/share DTOs, then validate staged deployed schemas including generated BYOD paths (S17). Feature rollback disables new imports/activation, retains immutable receipts/versions required by active runs, and blocks affected schedules; it must not erase user packages or silently execute an older revoked version. S11/S15/S17 and design review against Q2 gate the relevant releases (D-030/D-033).
