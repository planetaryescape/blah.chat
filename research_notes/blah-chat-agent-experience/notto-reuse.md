# Notto agent experience: reuse audit

## Which revision and design reasoning can we trust?

### Takeaway

Use **`41593a0caf0ac3d00e7744aaae3dbf7be0669de0`**, the verified GitHub default-branch tip, for the recent agent experience. Do not describe it as `origin/main`: that is the older GitLab revision **`7791c38f070f8ea996ef53615a39ffa6ebe2037c`**. The best material is the interaction/state model, not a theme transplant. [GitHub revision][K] · [GitLab revision][O]

### Cited Findings

#### Provenance and scope

Observed in `/Users/bhekanik/code/notto/product-stack`; commands below are the reproducible provenance record, not evidence of a deployed version:

```text
git fetch origin                         # succeeded; only source-repo mutation
git ls-remote --symref origin HEAD        # refs/heads/main -> 7791c38f070f8ea996ef53615a39ffa6ebe2037c
git rev-parse origin/main                 # 7791c38f070f8ea996ef53615a39ffa6ebe2037c
git rev-parse HEAD                        # 41593a0caf0ac3d00e7744aaae3dbf7be0669de0
git rev-list --left-right --count HEAD...origin/main
                                         # 749 0: HEAD ahead 749, behind 0
git ls-remote --symref github HEAD        # refs/heads/main -> 41593a0caf0ac3d00e7744aaae3dbf7be0669de0
git rev-parse github/main                 # 41593a0caf0ac3d00e7744aaae3dbf7be0669de0
git diff --cached --stat                  # empty
git status --porcelain=v1 --untracked-files=all
                                         # nine tracked dirty paths; no reported untracked files
```

`origin` fetches `git@gitlab.com:notto-tech/credit-scoring/product-stack.git`; `github` fetches `git@github.com:planetaryescape/notto-product-stack.git`. GitLab tip commit is dated 2026-08-06; GitHub/HEAD is dated 2026-10-15. GitHub was inspected with `ls-remote`, **not fetched**. All Notto file ranges/counts below were read from `git show <full-SHA>:<path>`, never silently from the dirty working tree. [GitLab commit][O] · [GitHub commit][K]

The fetched GitLab baseline already contains the reusable seed: `ThinkingSkeleton` at lines **751–762**, `TOOL_LABELS`/`TIMELINE_EXCLUDED_TOOLS` at **817–855**, and Harvey-style `StepsTimeline` at **2250–2280**, all in `packages/ai-agent-microfrontend/src/components/chat/chat-message-parts.tsx` (**2,863 total lines at O**). Its skeleton still has fake placeholder bars and its timeline seeds open state from individual running steps; the newer K implementation fixes important limitations rather than merely moving files. The baseline `plan-progress.tsx` has **345 total lines**, with `PlanProgressRail` starting at **141** and `PlanProgressStrip` at **296**. Do not use these O line numbers with K's reorganized paths. [O message renderer][origin-renderer] · [O progress rail][origin-rail]

The working-tree-only differences were:

| Local status | Path | Treatment |
| --- | --- | --- |
| Modified | `docs/agent/overview.md` | 308 local lines versus 296 at K. Adds “Answer a decision card,” single/multiple choice and custom-answer guidance, separates decisions from optional approvals, documents waiting instead of Continue, removes duplicated interruption prose. **Documentation enhancement only; no remote provenance assigned to these additions.** [Local file](file:///Users/bhekanik/code/notto/product-stack/docs/agent/overview.md) · [K version][overview] |
| Modified | `docs/implementation/workflow-builder-hardening-review/build-log.md`; `docs/implementation/workflow-builder-ux-overhaul/build-log.md`; `docs/implementation/workflow-editor-production-grade/build-log.md` | Existing local build-log edits; not used as proof of current implementation. |
| Modified | `skills-lock.json` | Local skill metadata, not a product-agent skill system. |
| Deleted | `.agents/skills/improve/SKILL.md`; its `references/audit-playbook.md`, `closing-the-loop.md`, `plan-template.md` | Pre-existing local deletions; untouched. |

The dirty list above is a `git status` observation; reproduce it with the recorded command rather than treating a remote URL as proof of local state. There were no reported untracked source enhancements. No source files, index entries, branches, dependencies, services, or user changes were altered.

No root or `packages/**/AGENTS.md` was found. Source-specific guides exist under `analytics/` and `demo/`; `demo/AGENTS.md` was read. Its relevant boundary is that demo owns access/context and mounts the shared agent, rather than implementing another agent. The audit stayed in shared packages/docs and did not modify either host. The newer architectural documentation confirms the same separation. [Architecture, lines 6–40, 304 total][architecture]

#### High-signal research and BK's reasoning

- The implemented **Harvey-inspired progress-sidebar plan** explicitly preserves the investigative feed, shows a rail only when there is actual content, and uses a compact mobile alternative. The original plan says `planTodos.length > 0`; current code intentionally extends eligibility to understanding, outline, outputs, and actions. Treat the plan as historical intent, not an exact current predicate. [Plan, lines 3–5, 25–60, 81 total][sidebar-plan] · [Current rail, lines 320–370, 580 total][rail]
- BK's authored commit `ebd34cd1c581aa9b7b7b3dd399bab6b457cb6022` explains that dots alone look hung after a minute, the counter answers the reader's real question, and text should never promise a finish time or name the plumbing. Commit `0d6bf25239c240dd237baf63085f9a0ef68fc24f` tightens this: describe the **work**, not an apology for waiting; “almost/nearly/closer” are disguised time promises. These are authored implementation rationales, not user-study findings. [Original rationale][bk-working] · [Copy correction][bk-copy]
- BK's `c18ab2e09409264349985c80b91035d76b3783b2` explains why folding must not hide the answer, replay an old Collapse-all command, discard methodology on report-only turns, or close something the reader opened. `cc851db4c3ba286e5bac07eb2867e1f32728011a` requires server-measured duration, with an honest fallback instead of guessed history. [Fold rationale][bk-fold] · [Duration rationale][bk-duration] · [Current implementation, lines 73–166, 226–260, 382 total][fold]
- BK's `a7726feb44736e536d20ed33a7f591f1a4e20fbb` says the understanding must remain visible during a long run, belong to the **current** question, and be present on mobile too. The wait note disappears when the wait is over. Later `59c89365cd944062ce1430af67900b5b971b441d` replaces a character-count overflow guess with layout measurement and resets clocks for Continue/Regenerate. [Pinned-understanding rationale][bk-understanding] · [Correction rationale][bk-clock] · [Current card, lines 30–108, 580 total][rail]
- The design-system audit calls for shared packages and local shadcn primitives, but explicitly says its scanner cannot prove usability/accessibility and records a red gate. Do not cite its existence as proof that all UI checks passed. [Audit, lines 49–70, 161–189, 189 total][design-audit]
- The canonical overview explains answer-first/methodology-after ordering, elapsed waiting, readable recovery, and separate approval checkpoints. The package README explains remount-safe disclosure state, step-group liveness, queue semantics, and replay failures. These linked documents were read alongside implementation rather than used alone. [Overview, lines 44–205, 296 total][overview] · [UI README, lines 255–368, 419 total][ui-readme]

### Inferences

- The transferable intent is **legible agency**: show what is happening, what was handed over, whether the person must act, and whether recovery preserves paid work. It is not “more spinners.”
- Keep blah.chat's own typography, palette and motion language. Borrow hierarchy, disclosure, state labels, and responsive behavior, not Notto's finance vocabulary, Roboto dependency, or accent tokens.

### Gaps

- No original Harvey study/report, interview transcript, or broader research notebook was found in the tracked source inventory. The plan names “Harvey UI lessons” without linking a primary research artifact. Do not invent findings or quote BK as a research participant.
- No deployment SHA or current production behavior was checked. No browser, authentication, installs, tests, builds, or model calls were used.

## What should blah.chat reuse, and where?

### Takeaway

Prioritize explicit tool/run states, readable progress with retained details, and interruption/decision cards. Adapt these onto blah.chat's existing Convex-persisted messages and normalized tool records; do not replace durable generation with Notto's HTTP/SSE client architecture. [Target generation, lines 794–918, 2,021 total][target-generation] · [Notto lifecycle, lines 57–149, 468 total][lifecycle]

### Cited Findings

**Reading the map:** all source links in this table are pinned to **K = `41593a0caf0ac3d00e7744aaae3dbf7be0669de0`**. Paths are the links' full repository paths; ranges and **full-file line counts** are explicit. “Copy candidate” means a small technical seam, **not license clearance**. Target paths refer to the observed working tree at HEAD `04866f80a6236716ebf8d8c5a79001727f85f4bf`, not a claim that unrelated user changes are committed.

| Target piece | Source symbol / exact path evidence | Decision and adaptation |
| --- | --- | --- |
| `apps/web/src/components/chat/toolRenderers/types.ts` and `toolCallUtils.ts` | `classifyStepFailure`, `verdictIsRejection`, `isUncheckedVerdict`, `problemLabel`: [`message/blocks/step-status.ts`, lines 4–99; **99 total**][step-status]. `ToolCallBlock`: [`message/blocks/tool-call-block.tsx`, lines 52–94, 109–211; **224 total**][tool-card] | **Adapt, highest priority.** Distinguish running; succeeded; retried/recovered; terminal failure; not independently checked; waiting for you. A verifier rejection is the safety check doing its job, not necessarily a broken run. Keep machine codes stable while translating human labels. Do not transplant finance-specific mappings wholesale. |
| `StatusTimeline.tsx`, `ToolCallDisplay.tsx`, `InlineToolCallContent.tsx` | `StepsTimeline`, `summariseSqlActivity`: [`message/blocks/steps-timeline.tsx`, lines 8–41, 46–169; **171 total**][timeline]. `TOOL_LABELS`, `TIMELINE_EXCLUDED_TOOLS`: [`message/blocks/tool-parts.ts`, lines 4–47; **194 total**][tool-parts] | **Adapt.** A vertical dot/connector timeline shows real steps and one meaningful current label. “Working…” remains true between tools; “Finished in N steps” summarizes history. Retain compact discoverability badges (searches/files/code rather than SQL everywhere), and put raw arguments/results behind Details. Questions, downloadable reports, and usable artifacts must not disappear into an activity accordion. |
| `MessageLoadingState.tsx` and message status header | `WorkingNote`, `ThinkingSkeleton`, `useTurnElapsedMs`: [`message/blocks/working-indicators.tsx`, lines 8–80; **80 total**][working]. `workingMessageFor`: [`message/working-messages.ts`, lines 1–13, 57–84; **84 total**][working-copy] | **Adapt.** Pair a short truthful sentence with elapsed time; reduced-motion-safe dots are decorative. One live region announces changing words, **not a timer tick every second**. Stable per-run identity survives remounts. Preserve existing real “choosing model”/fallback states rather than replacing everything with “Thinking.” Prefer event-derived descriptions; use neutral fallback copy when the real phase is unknown. |
| Historical detail disclosure / virtualized message row | `useDisclosureState`, `useExpandSignal`, `noteTurnStreamed`, `turnDurationLabel`, `TurnWorkingFold`: [`message/turn-working-fold.tsx`, lines 73–166, 186–260, 326–380; **382 total**][fold]. `assistantMessageBlocks`: [`message/blocks/assistant-blocks.tsx`, lines 243–365, 402–424; **576 total**][blocks] | **Adapt.** Old turns begin folded; the turn just watched stays open until reload; manual disclosure wins. Key by conversation/message/tool-call/run identity, not list position. Use a plain height-stable disclosure in a measured virtual row instead of animated accordion height. Keep answer + artifacts separate from work, and record duration server-side. |
| Optional progress panel near chat / compact mobile progress | `UnderstandingCard`, `PlanProgressRail`, `PlanProgressStrip`, `STATUS_LABEL`: [`rail/plan-progress.tsx`, lines 30–133, 220–319, 320–580; **580 total**][rail]. `usePlanProgress`: [`shell/use-plan-progress.ts`, lines 7–37; **37 total**][plan-hook] | **Adapt, only for actual plans.** Pin current task interpretation; show it before a plan exists; clamp and expand based on real layout; clear it on a new task. Desktop rail and compact mobile strip share state. Glyphs, wording, weight and strikethrough supplement color. A checklist fraction is **not a time estimate**. Avoid adding a mandatory planning ritual to every ordinary chat. |
| Future clarification/decision renderer, not `ResolveConflictRenderer`'s mere outcome text | `AskUserOutput`: [`message/blocks/tool-outputs/ask-user.tsx`, lines 9–169; **169 total**][ask]. `ask_user` schema/execute: [`tools/definitions/presentation.ts`, lines 203–235; **241 total**][presentation]. `endedOnTurnEndingTool`: [`agent/turn-end-gate.ts`, lines 18–74; **96 total**][turn-end] | **Adapt.** 2–4 clear choices, context, at most one recommended option, multi-select only when choices combine, and a free-text answer without a fake “Other.” Labels are “Decision needed,” “Answered,” and historical “Asked.” Latest stopped turn only; lock immediately on submit; old answers remain readable. Crucially, successful `ask_user` **ends the loop in runtime code** rather than relying on “wait” in a prompt. |
| Future approval cards for tools with side effects / sensitive actions | `APPROVAL_GATES`, `ApprovalChecks`, `toolNeedsApproval`: [`agent/approval.ts`, lines 20–125, 127–180; **180 total**][approval]. `applyApprovalGates`: [`tools/index.ts`, lines 16–43; **93 total**][tool-index]. `ApprovalGate`: [`message/approval-gate.tsx`, lines 8–140; **141 total**][approval-ui]. Proposal rendering: [`message/blocks/tool-call-block.tsx`, lines 184–211; **224 total**][tool-card] | **Adapt contract; reference-only policy.** Shared registry supplies labels/options; backend enforces before execution. Render the proposed **input**, since no output exists yet. “Not quite” requests a correction that returns as structured feedback; it is not silent dismissal. Waiting shows a pause glyph, never a running spinner. Notto's all-on/off understanding+plan supervision is **not** sufficient authorization policy for blah.chat's third-party write tools. |
| Interrupted/failed message affordance and recovery card | `leafIsContinuable`, `awaitsApproval`, `dropDanglingToolParts`: [`transcript/continue-helpers.ts`, lines 3–28, 54–101; **101 total**][continue]. `ChatErrorNotice`, `readableErrorText`: [`shell/chat-error-notice.tsx`, lines 24–69, 93–156; **158 total**][error-ui]. `useBoundedResume`: [`transcript/use-bounded-resume.ts`, lines 3–133; **133 total**][resume] | **Adapt UX; reference-only SSE mechanics.** Preserve partial content and offer Continue when safe, Retry when no useful work exists, and a calm allowance-specific state when retry cannot help. Waiting for approval is not interruption. Bound reconnect attempts and distinguish disconnecting a reader from stopping server work. Notto's three-Continue cap/five reconnect attempts are policy examples, not target requirements. |
| Per-message render recovery in virtualized transcript | `TurnErrorBoundary`: [`message/turn-error-boundary.tsx`, lines 5–98; **98 total**][boundary] | **Copy candidate after permission/dependency adaptation.** Isolate a bad chart/tool frame; retain the rest of chat; “Try again” and reload act on display, not generation. Reset on a meaningful content revision, not unrelated rerenders. State “still saved” only when target persistence actually confirms that. Record error class and bounded component stack, not private tool payloads. |
| `ArtifactList.tsx` / canvas output discovery | `OutputsPanel`, `OutputEntry`, `groupByOutput`, `OutputRow`: [`rail/outputs-panel.tsx`, lines 13–48, 62–81, 195–275; **275 total**][outputs]. `HtmlArtifactOutput`: [`message/blocks/tool-outputs/html-artifact.tsx`, lines 3–24; **24 total**][html] | **Adapt.** Outputs should be actionable, with consistent Copy/Export/references, not an inventory duplicating scrollback. Keep artifacts visible outside progress disclosure. Source versioning groups by kind+title; target should use its existing document/version identities, not this heuristic. HTML is sandboxed (`allow-scripts allow-popups`, no `allow-same-origin`, no-referrer); treat this as a review starting point, not automatic security clearance. |
| Optional queued follow-ups / mid-run steering | [`UI README`, lines 279–312; **419 total**][ui-readme]; [`lifecycle`, lines 177–258; **468 total**][lifecycle] | **Adapt behavior, later.** Clearly distinguish “next turn” from “send into current run.” Queued messages that feel already sent survive tab close; steer delivery belongs to a run, not merely a conversation, and happens at safe step boundaries. Target needs durable Convex delivery/deduplication and an explicit choice about cross-device queues; don't copy localStorage as authoritative state. |
| Possible recurring-task experience | `ScheduleOutput`: [`message/blocks/tool-outputs/schedule.tsx`, lines 1–17; **17 total**][schedule-ui]. `createScheduleTools`: [`tools/definitions/schedules.ts`, lines 18–101, 104–125; **201 total**][schedule-tools]. `ScheduleQueueData`: [`workflows/scheduler/queue.ts`, lines 1–38, 42–85; **219 total**][schedule-queue] | **Reference-only backend; adapt result summary if needed.** Show name, status, recurrence and timezone. The source creates user-requested recurring BI jobs from verified SQL provenance, persists them, then schedules BullMQ work. Do not add Redis/BullMQ, SQL run-specs, or a workflow canvas just to improve a chat loader. |

The long source paths abbreviated in table labels are rooted at `packages/ai-agent-microfrontend/src/components/chat/` for `message/`, `rail/`, `shell/`, `transcript/`; at `packages/ai-agent/src/` for `agent/`, `tools/`, `workflows/`. The pinned URLs supply the unabridged paths.

#### Target differences that make the adaptation concrete

- Target `getCallState` currently infers an error when a call has no result and its timestamp is over **30 seconds**; otherwise it has only executing/complete/error. A slow successful tool can therefore look broken without an authoritative failure. This is a code-path observation, not a measured production incident. Replace that inference only as part of a real persisted lifecycle, not merely a different timeout. [Target `types.ts`, lines 11–38, **38 total**][target-states]
- Target `StatusTimeline` hides **800 ms** after generation stops. `ToolCallDisplay` folds multiple tools into a generic count by default, including while work is live. Notto gives a better foundation for live openness, recoverable warnings, and historical details that remain findable. [Target timeline, lines 56–65, 95–121, **198 total**][target-timeline] · [Target display, lines 24–45, 60–105, **175 total**][target-display]
- Target already persists tool call/result events using `upsertToolCall`, preserves text position, and streams through a Convex action. `isPartial` distinguishes finalization, **not** an adequate interaction lifecycle: a record can have a result while `isPartial: true`. Preserve this architecture and extend its semantics where needed. [Generation, lines 860–918, **2,021 total**][target-generation] · [Tool mutations, lines 45–105, **199 total**][target-tool-store]
- Target artifacts already intentionally live outside collapsible tools and carry `documentId`/`newVersion`; reuse that rather than importing a parallel artifact store. [Target `ArtifactList`, lines 14–59, **76 total**][target-artifacts]
- Integrations already have a target-specific selection/auth surface: active Composio connections, conversation-selected IDs, serialized toggles, and incognito exclusion. No matching generic OAuth connector manager was found in Notto's agent packages. Keep the existing connector flow; apply clear waiting/failure/result rendering to its tool calls instead. [Target `IntegrationSelector`, lines 17–55, **118 total**][target-integrations] · [Notto ownership boundary, lines 23–42, **296 total**][overview]

### Inferences

- Recommended target state vocabulary: **Queued → Preparing → Running → Succeeded**, with explicit **Waiting for your answer**, **Waiting for approval**, **Retrying**, **Interrupted**, **Failed**, **Cancelled**, and **Not independently checked** where applicable. This is a proposed domain model, not an enum already implemented by either repo.
- Persist the run/tool-call identity, real transition timestamps, reason/summary, retry relationship and terminal outcome; render labels from those facts. Keep presentation-only disclosure state separate. Never encode “waiting for a human” as “still generating.”
- Surface meaningful descriptions such as “Searching your files” or “Checking the result,” backed by real phase/tool events. A client-side rotating sentence proves only that the **client timer** is running; it must never be presented as evidence that a server run is healthy.
- Port small independent helpers/tests first, then component behavior. Do not embed `@notto/ai-agent-microfrontend` in blah.chat as a shortcut: its HTTP endpoints, runtime provider, host tracking, design-system wrappers and response contracts are a different application boundary.

### Gaps

- **Product-agent skills:** no `skill` matches were found in K's `packages/ai-agent/src`, `packages/ai-agent-microfrontend/src`, or `docs/agent`. Repo `.agents/skills` and `skills-lock.json` are coding-agent setup, not evidence of customer-facing skill loading, selection, or scheduling.
- **Generic integrations:** no connector module or generic integration-management flow was found in those scoped agent paths. Notto's database/tenant configuration and host embedding are not a Composio-equivalent integration system.
- Approval/decision implementation is not uniformly reflected in older docs/helpers. K's `endedOnTurnEndingTool` handles `ask_user`, but `continue-helpers.ts` explicitly recognizes approvals rather than a general decision predicate; `assistant-blocks.tsx`'s finished/action guards also explicitly check approvals. Do not assume all decision-tail actions, checklist completion, queues, and exports are correct simply because the question card itself is good. Add target tests for these states. [Runtime, lines 27–74][turn-end] · [Continue helpers, lines 25–47, 72–86][continue] · [Renderer, lines 52–65, 427–444][blocks]

## What constraints and tests should travel with the patterns?

### Takeaway

Borrow invariants and adversarial tests, while retaining Convex as the target's durable authority. These are private company packages with no discovered repository license grant: this audit supports internal design reuse, **not** unrestricted code copying or publication. [Server manifest, lines 1–4, 131–149, **159 total**][server-package] · [UI manifest, lines 1–4, 28–67, **91 total**][ui-package]

### Cited Findings

#### Package, ownership, and persistence boundaries

- Both packages are `private: true`. The tracked K tree contained no `LICENSE`, `COPYING`, or `NOTICE` file under those conventional names, and neither package manifest declares a license. That is absence of an identified grant, not proof of any particular ownership arrangement. **Confirm authorization before copying implementation or tests into a public/distributable project.** Prefer design-level adaptation until then; do not export Notto prompts, financial definitions, tenant data, credential logic, branding, or private research by default. [Manifests][server-package] [UI manifest][ui-package] · [Repository tree][K]
- The UI pins `ai` **6.0.249** and `@ai-sdk/react` **3.0.251**, imports `@notto/ai-agent` and `@notto/ui` by `file:` dependency, and expects React 19, React Query, Base UI/shadcn wrappers, Vite/host runtime wiring. The server uses Postgres, resumable-stream, Redis/ioredis and BullMQ. UI parts are not standalone drop-ins. The lifecycle docs specifically record a resume behavior change at AI SDK 6.0.250; re-test against target versions rather than copying that pin or obsolete workaround. [UI manifest, lines 28–67, **91 total**][ui-package] · [Server manifest, lines 131–149, **159 total**][server-package] · [Lifecycle, lines 427–442, **468 total**][lifecycle]
- Notto stores stream-run rows, prevents multiple active runs per conversation, and makes the first terminal write win. Partial transcript saves serialize and flush before the authoritative final save. These are transferable **invariants**, but its Postgres row-lock/SSE/Valkey implementation is reference-only for Convex. [`Streaming lifecycle`, lines 13–82, **468 total**][lifecycle]
- `createThrottledMessageWriter` chains saves and waits for every in-flight save in `finalFlush`, preventing a slow old partial from overwriting final content. This is a useful **copy candidate** only for a target seam that actually needs it; do not replace Convex's existing durable action/subscription flow with it. [`persistence/incremental-persist.ts`, lines 1–58, **58 total**][writer]
- The source repairs dangling tools at model-input, persistence and request-entry seams because a stopped client's next request can reintroduce a call that the server already repaired. It preserves legitimate pending approvals at store boundaries. Target should translate the invariant—every stopped/error tool ends truthfully and future model messages remain valid—rather than applying the UI-message mutation blindly to normalized Convex rows. [Lifecycle, lines 84–157, **468 total**][lifecycle]
- Source distinguishes heartbeat (“process still here”) from output silence (“model producing”) and gives in-tool model calls a deadline shorter than the stream stall limit. Its local client counter is not a heartbeat. Convex needs equivalent authoritative run health/recovery, not Notto's hardcoded minute values or the target's existing 30-second presentation guess. [Lifecycle, lines 260–343, **468 total**][lifecycle] · [`watchStreamForSilence`, `streaming/watchdog.ts`, lines 1–66, **66 total**][watchdog]
- Approval gates run **before** execution, but parallel non-gated tools in the same step can still execute. Source moves the decision card last to avoid a misleading reading order; this is not a guarantee that no work whatsoever can occur. Avoid absolute “nothing runs” promises, and implement action-specific authorization in target backend code. [Renderer, lines 402–412, **576 total**][blocks] · [Approval registry, lines 7–17, 73–85, **180 total**][approval]

#### Test evidence read, not executed

The following K files exist and their test contracts were inspected. They are useful **acceptance-test templates**, not a claim that this audit ran them or that current CI passes.

| Pinned test path | Range / full-file count | Contract to adapt |
| --- | --- | --- |
| [`message/__tests__/tool-status-semantics.test.ts`][test-status] | **19–84 / 84 lines** | Recovery is cautionary; terminal failures differ; verifier rejection isn't a crashed tool; collapsed headers summarize query/check work. |
| [`message/__tests__/working-indicator.test.tsx`][test-working] | **24–174 / 174 lines** | Counter ticks, text rotates, remounts don't restart the clock, only message text is announced, retry starts a fresh clock, conversations cannot share placeholder clocks. |
| [`message/__tests__/working-messages.test.ts`][test-copy] | **17–79 / 79 lines** | No finish-time promises/jargon; deterministic sequence and per-turn starting point. Adapt the principle, not source claims like “Every number … gets checked” unless target guarantees it. |
| [`message/__tests__/ask-user-render.test.tsx`][test-ask] | **50–113 / 113 lines** | Single choice locks; recommended badge; custom text; multi-select requires explicit submit; historical and still-streaming cards cannot answer. |
| [`message/__tests__/approval-preview.test.tsx`][test-approval] | **70–129 / 129 lines** | Every decision-bearing plan field is visible before approval, no empty output card above it, no false “approved” label. |
| [`rail/__tests__/plan-progress.test.tsx`][test-rail] | **31–291 / 291 lines** | Empty rail/strip absent; state in accessible labels; current step and polite progress; understanding-only rail; real overflow measurement; current wait note; mobile parity. |
| [`rail/__tests__/plan-todo-readiness.test.ts`][test-plan] | **23–223 / 223 lines** | Don't mark never-started or blocked work done; interruption/error veto close-out; checklist belongs to its own turn. |
| [`shell/__tests__/dead-run-resume.test.tsx`][test-dead] | **103–162 / 162 lines** | Reattachment is bounded, settles rather than render-looping, and leaves recovery available. |
| [`shell/__tests__/stream-replay-burst.test.tsx`][test-replay] | **204–257 / 257 lines** | A resumed burst does not trigger per-chunk render collapse. Source reports a real production incident; its numerical improvement is documented evidence, not reproduced here. |
| [`agent/__tests__/needs-approval-behaviour.test.ts`][test-gate] | **63–113 / 113 lines** | SDK actually blocks tool execution when gated, including late assignment and predicates. |
| [`agent/__tests__/turn-end-gate.test.ts`][test-end] | **27–90 / 90 lines** | Stop on a real successful question/follow-up result, not an invalid/refused call; use current-turn state. |
| [`streaming/__tests__/stream-stall.test.ts`][test-stall] | **63–493 / 493 lines** | Silent provider, slow healthy stream, slow tools, first-chunk timeout hole, shorter in-tool deadlines, and configuration ordering. |

Frontend test paths above are rooted at `packages/ai-agent-microfrontend/src/components/chat/`; backend ones at `packages/ai-agent/src/`. Full paths and exact revision are in each link.

### Inferences

Recommended target acceptance cases before any implementation is called complete:

1. Refresh/navigate away during a slow tool; durable progress and partial answer reappear without executing it twice. A tool over 30 seconds is not declared failed by the browser alone.
2. A retried tool can leave an amber/readable audit entry while the run succeeds; terminal failure has a distinct message and actionable recovery. Do not merely color all non-PASS results red.
3. A question/approval stops autonomous continuation, stays outside folded progress, and accepts exactly one authorized answer for the same run/branch. Verify replay, stale tabs, network failure, double-click, and free-text/multi-select paths server-side.
4. Disconnecting the subscriber does not cancel generation; an explicit Stop does. Interrupted tools settle truthfully, completed outputs survive, and Continue does not repeat already-paid side effects.
5. Virtualization/reparenting preserves a reader's expanded details; old global expand/collapse events cannot override later choices. Keyboard focus, reduced motion, live-region announcements, and mobile action visibility remain usable.
6. Answer and output exports carry the same references whichever button is used. Artifact revisions use true document identity, not matching titles. Never claim “saved” after an unacknowledged write.

### Gaps

- Notto's checklist close-out marks an in-progress item done after a delivered answer; that is a **presentation inference**, not evidence the step ran. For a general assistant prefer explicit recorded completion, or label the inferred reconciliation honestly. [Rail, lines 135–158][rail]
- `AskUserOutput`'s immediate lock and selected IDs are React state and its submit callback returns `void`; this renderer alone is not proof of durable answer acknowledgement, retry-on-failure, or persistence of selected highlights after reload. Preserve the good presentation but design the target response record/idempotency separately. [Question card, lines 38–70][ask]
- No license counsel, runtime authorization audit, accessibility session, screenshot/visual review, or test execution was performed. The report deliberately distinguishes source intent, static implementation evidence, and proposed adaptations.

[K]: https://github.com/planetaryescape/notto-product-stack/tree/41593a0caf0ac3d00e7744aaae3dbf7be0669de0
[O]: https://gitlab.com/notto-tech/credit-scoring/product-stack/-/commit/7791c38f070f8ea996ef53615a39ffa6ebe2037c
[origin-renderer]: https://gitlab.com/notto-tech/credit-scoring/product-stack/-/blob/7791c38f070f8ea996ef53615a39ffa6ebe2037c/packages/ai-agent-microfrontend/src/components/chat/chat-message-parts.tsx
[origin-rail]: https://gitlab.com/notto-tech/credit-scoring/product-stack/-/blob/7791c38f070f8ea996ef53615a39ffa6ebe2037c/packages/ai-agent-microfrontend/src/components/chat/plan-progress.tsx
[overview]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/docs/agent/overview.md
[architecture]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/docs/agent/architecture.md
[sidebar-plan]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/docs/implementation/ai-agent-progress-sidebar-plan.md
[design-audit]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/docs/implementation/shadcn-ai-agent-design-system-audit.md
[ui-readme]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/README.md
[lifecycle]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/docs/agent/streaming-lifecycle.md
[bk-working]: https://github.com/planetaryescape/notto-product-stack/commit/ebd34cd1c581aa9b7b7b3dd399bab6b457cb6022
[bk-copy]: https://github.com/planetaryescape/notto-product-stack/commit/0d6bf25239c240dd237baf63085f9a0ef68fc24f
[bk-fold]: https://github.com/planetaryescape/notto-product-stack/commit/c18ab2e09409264349985c80b91035d76b3783b2
[bk-duration]: https://github.com/planetaryescape/notto-product-stack/commit/cc851db4c3ba286e5bac07eb2867e1f32728011a
[bk-understanding]: https://github.com/planetaryescape/notto-product-stack/commit/a7726feb44736e536d20ed33a7f591f1a4e20fbb
[bk-clock]: https://github.com/planetaryescape/notto-product-stack/commit/59c89365cd944062ce1430af67900b5b971b441d
[step-status]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/blocks/step-status.ts
[tool-card]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/blocks/tool-call-block.tsx
[timeline]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/blocks/steps-timeline.tsx
[tool-parts]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/blocks/tool-parts.ts
[working]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/blocks/working-indicators.tsx
[working-copy]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/working-messages.ts
[fold]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/turn-working-fold.tsx
[blocks]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/blocks/assistant-blocks.tsx
[rail]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/rail/plan-progress.tsx
[plan-hook]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/shell/use-plan-progress.ts
[ask]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/blocks/tool-outputs/ask-user.tsx
[presentation]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent/src/tools/definitions/presentation.ts
[turn-end]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent/src/agent/turn-end-gate.ts
[approval]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent/src/agent/approval.ts
[tool-index]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent/src/tools/index.ts
[approval-ui]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/approval-gate.tsx
[continue]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/transcript/continue-helpers.ts
[error-ui]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/shell/chat-error-notice.tsx
[resume]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/transcript/use-bounded-resume.ts
[boundary]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/turn-error-boundary.tsx
[outputs]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/rail/outputs-panel.tsx
[html]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/blocks/tool-outputs/html-artifact.tsx
[schedule-ui]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/blocks/tool-outputs/schedule.tsx
[schedule-tools]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent/src/tools/definitions/schedules.ts
[schedule-queue]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent/src/workflows/scheduler/queue.ts
[server-package]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent/package.json
[ui-package]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/package.json
[writer]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent/src/persistence/incremental-persist.ts
[watchdog]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent/src/streaming/watchdog.ts
[test-status]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/__tests__/tool-status-semantics.test.ts
[test-working]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/__tests__/working-indicator.test.tsx
[test-copy]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/__tests__/working-messages.test.ts
[test-ask]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/__tests__/ask-user-render.test.tsx
[test-approval]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/message/__tests__/approval-preview.test.tsx
[test-rail]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/rail/__tests__/plan-progress.test.tsx
[test-plan]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/rail/__tests__/plan-todo-readiness.test.ts
[test-dead]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/shell/__tests__/dead-run-resume.test.tsx
[test-replay]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent-microfrontend/src/components/chat/shell/__tests__/stream-replay-burst.test.tsx
[test-gate]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent/src/agent/__tests__/needs-approval-behaviour.test.ts
[test-end]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent/src/agent/__tests__/turn-end-gate.test.ts
[test-stall]: https://github.com/planetaryescape/notto-product-stack/blob/41593a0caf0ac3d00e7744aaae3dbf7be0669de0/packages/ai-agent/src/streaming/__tests__/stream-stall.test.ts
[target-generation]: ../../packages/backend/convex/generation.ts#L794
[target-states]: ../../apps/web/src/components/chat/toolRenderers/types.ts#L11
[target-timeline]: ../../apps/web/src/components/chat/StatusTimeline.tsx#L56
[target-display]: ../../apps/web/src/components/chat/ToolCallDisplay.tsx#L24
[target-tool-store]: ../../packages/backend/convex/messages/toolCalls.ts#L45
[target-artifacts]: ../../apps/web/src/components/chat/ArtifactList.tsx#L14
[target-integrations]: ../../apps/web/src/components/chat/IntegrationSelector.tsx#L17
