# 11: Rendering and narration

Repair the current renderer and read-aloud path without replacing durable chat. The person should read, select, copy and hear the same answer, whether it is still arriving, completed, long, virtualized or opened as a document. Rendering must not start generation, change transcript text or make an answer's controls depend on its length (D-002, D-004, D-020, D-023, D-033).

The source baseline is `04866f80a6236716ebf8d8c5a79001727f85f4bf`, reviewed on 2026-11-03. Proposed repairs are not implemented. Decisions are in [21](21-decision-log.md); Q2/Q3/Q4/Q7/Q8/Q22 and S1/S6/S7/S15/S16 are in [22](22-open-questions.md). Source evidence comes from [frontend](../../research_notes/blah-chat-modernization-review/frontend.md), [rendering prior art](../../research_notes/blah-chat-modernization-review/rendering-prior-art.md), [narration](../../research_notes/blah-chat-modernization-review/narration.md) and the [reconciled research](../research/modernization-review.md).

## What exists and what is broken

The app already has Next 16/React 19, Streamdown, fine-grained Shiki, lazy Mermaid/Monaco, worker rendering, DOMPurify, Virtuoso, selection/scroll hooks, reduced-motion/high-contrast settings and an IME-aware composer. Keep these assets. This is not first adoption of streaming Markdown, syntax highlighting or virtualization.

| Current path | Verified source issue | Experience to restore |
|---|---|---|
| Streamdown 2.2.0 with custom rehype plugins | Supplied raw+harden replaces upstream raw+sanitize+harden. `harden` is not the missing HTML allowlist. | Generated Markdown cannot bypass the intended sanitize policy. This is a source gap, not a demonstrated executable exploit. |
| Short/streaming math | No `plugins.math` is supplied, although locked Streamdown attaches math only through that plugin. Loading mhchem alone does not attach the parser. | Equations have an explicit tested parser/render policy in every path. |
| Completed segments with `content.length >= 5000` | This means UTF-16 code units, not 5KB. Worker HTML replaces React blocks and loses code controls, Mermaid hydration and Bible popovers; grammar/chemistry policies also differ. | Length and worker availability no longer remove features. |
| Code controls and source references | Wrap state does not affect layout; controls are hover-only; clipboard rejection is uncaught. Citation fragments lack targets and global IDs would collide. | Actual wrapping, raw-copy fidelity, keyboard/touch controls and real per-message source navigation. |
| History and streaming | Virtuoso starts at 500 grouped rows; listeners can remain on the replaced scroller. Follow, keyboard focus, selection and announcers have competing ownership. | Stable reading/selection/focus, including threshold transitions and completion of the same message ID. |
| Speech preparation | The list adapter inserts literal spoken labels and tests require them. | Remove app-generated list labels while preserving author words, numbers, task state and ending. |

The plugin replacement/math findings are checked against [exact Streamdown 2.2.0 source](https://github.com/vercel/streamdown/blob/streamdown%402.2.0/packages/streamdown/index.tsx), not inferred from moving documentation. The [current renderer](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/src/components/chat/MarkdownContent.tsx#L22-L36) and its [call site](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/src/components/chat/MarkdownContent.tsx#L400-L434) establish the local configuration. No browser/assistive-technology session or complete parser test was run in this planning work.

## One semantic rendering contract

Persisted message content/partials remain authoritative. Derive a typed view with stable message/block identities and actual stream status; rendering caches are disposable. Stable component maps, diagram configuration and keys prevent unrelated stream updates from remounting settled controls. A display error boundary preserves the rest of the answer and offers Source/Retry display, never silently retries generation.

```text
Authorized persisted message / artifact revision + typed sources
  → shared parsing policy + text-node transforms
  → sanitized, typed blocks with stable source identity
  → existing accessible React prose/code/math/diagram/link components
         ↑
  existing shared worker: bounded parsing/tokenization data where parity holds
```

Do not permanently freeze every newline as a completed block. Late reference definitions/footnotes and nonappend edits can change earlier meaning. Tool segmentation is not proof that Markdown syntax is closed. Invalidate affected parsed/highlighted blocks when source, language, policy or references change. Preserve the original raw source for copy/export and error fallback.

### Sanitizer and URL policy

Restore an explicit reviewed parse/sanitize/harden chain instead of relying on defaults that a custom plugin array replaces. Construct one schema/protocol/image policy for both current paths. Disable raw HTML unless a reviewed subset is needed; if retained, parse it, allowlist elements/attributes, then harden links. KaTeX/diagram/highlighter output are separate trusted-code/untrusted-input boundaries and need reviewed generated-markup allowances or final sanitization, not an unrestricted bypass.

- Strip scripts, event handlers, forms/frames/objects, unsafe style and DOM-clobbering identifiers from chat Markdown. Namespace any retained generated IDs. No MDX, expression evaluation or arbitrary component loading from response text.
- Validate links independently of the Markdown sanitizer, including source cards, favicons and custom components. External source links use allowed HTTP(S), safe opener behavior and explicit user activation. Allow `bible:` only in the authored Bible-link position under a narrow schema and handler; do not globally declare arbitrary `href` values safe.
- Remote images and favicons can leak data before a person clicks. Restrict automatic requests to reviewed attachment/trusted origins; offer an explicit load action otherwise. Apply the same rule to raw `<img>`, Markdown, worker output and metadata previews. A proxy needs its own SSRF/redirect/private-address controls ([13](13-privacy-safety-compliance.md)).
- Keep code as escaped text or reviewed token output. If HTML is constructed, escape interpolated text/attributes before final sanitization. Existing DOMPurify is useful but its URI exceptions must match the React policy, not quietly widen it.
- Keep artifact static HTML in [10](10-artifacts-and-interactions.md)'s isolated frame. A chat Markdown allowlist is not its execution sandbox, and an arbitrary code fence never becomes an executable artifact automatically.

S6 must exercise real parser/sanitizer output and browser requests at partial prefixes and completion. A mocked "sanitized" string cannot establish this boundary. [Streamdown security guide](https://streamdown.ai/docs/security), [sink-by-sink source evidence](../../research_notes/blah-chat-modernization-review/rendering-prior-art.md#security-relevant-rendering-sinks).

### Explicit math and diagrams

Wire the chosen release's math plugin explicitly. Preserve the intentional policy: `$$…$$`, `\(…\)` and `\[…\]` are supported through tested parsing/normalization; single-dollar currency such as `$5` remains text. Transform parsed text regions, never code or existing math/link nodes. Incomplete math must not blank the rest of a streamed answer.

Share the same KaTeX/mhchem implementation and bounded options across short/long/worker paths. Use `trust: false` or an explicitly reviewed narrow command/protocol predicate, never the current worker's blanket `trust: true`. Bound expansion/dimensions, preserve MathML/accessible semantics and expose recoverable raw TeX on error. Copy is a separate real button; math itself is not overwritten with `role=button`. Bind enhancement to rendered-block lifecycle and clean observers/processed-node references after replacement.

Keep lazy Mermaid and source preview while streaming. Explicitly skip diagram render work until appropriate settled source, use strict security and bound graph size/depth/render work. Directives cannot relax policy. Latest-source/theme identity wins over stale async results. Preserve original source if syntax repair produces a modified preview; label that distinction. SVG export remains active-capable outside the app and needs its own review, not the assumption that safe display implies safe export. [KaTeX options](https://katex.org/docs/options), [Mermaid policy evidence](../../research_notes/blah-chat-modernization-review/rendering-prior-art.md#security-relevant-rendering-sinks).

### Worker parity and caches

First prevent the `>= 5000` fast path from consuming rich content whose behavior it cannot reproduce. Prefer worker output as typed blocks/tokens rendered by the same React components. A temporary static-only fast path is acceptable only with parity-proven content and the same sanitizer policy. Worker unavailability/timeouts must preserve content and controls, not select another product.

Use one shared worker initially, bounded queues and latest-job-wins per source identity. Coalesce obsolete transient requests; reject late output after source/theme/policy/revision changes and cancel on teardown. Do not spawn a worker per message. Keep plain current content visible while background work runs; stale highlighted HTML cannot replace newer source.

Bound caches by content size as well as entry count. Include source identity/full equality verification, parser/policy/highlighter versions and relevant theme/language settings. The current unverified 32-bit hash is not proof of content identity. Keep owner/account partitioning and clear private derived data according to [13](13-privacy-safety-compliance.md). Never reuse another revision merely because titles or hash hints match.

Prove parity at 4,999/5,000/5,001 UTF-16 units for streaming, complete, edited and worker-failed cases. Code copy/wrap, math/chemistry, Mermaid, Bible links, real citations, keyboard semantics and selection must agree. Test segment boundaries around tools as well as whole-message lengths (S6).

## Reading, source navigation and controls

### Code blocks

Retain current Shiki singleton/fine-grained imports, plain-text fallback and lazy expensive work. Recognize a fenced block from parser structure, not the presence of a language class. Unlabelled/tilde/long fences, `c++`, `c#`, unknown languages and partial language names must remain blocks with safe plain text while needed.

Lift wrap state to the shell and apply the actual whitespace/overflow policy, preserving indentation. Controls appear on keyboard focus and touch as well as hover, with clear names and comfortable targets. Copy uses the exact current raw code under a documented newline policy, not highlighted DOM text or stale tokens. Report clipboard failure accessibly and keep manual selection available. Download, if added, uses a safe filename and raw source, without introducing a heavyweight editor into ordinary fences.

Idle callback schedules synchronous work; it is not off-thread or incremental highlighting. Compare existing custom highlighting with worker-only tokenization or the newer Streamdown code plugin in S16. Do not install both by default. Completed-line grammar-state reuse must still invalidate on edits/language changes; do not invent an append-only substring tokenizer.

### Citations and sources

Pass the renderer a typed source map plus `messageId`. Create a citation only for an actual authorized source reference. Transform text nodes while skipping code/math/existing links; numeric brackets alone are not provenance. Missing references stay text or an explicit unresolved marker, never a fabricated source.

Use a stable namespaced target such as `message-<messageId>-source-<sourceId>` and matching source-card ID. On activation, expand the source region, mount the virtualized target if necessary, then reveal/focus its real source link. Set `aria-expanded`/`aria-controls` on the disclosure. Two answers can both cite `[1]` without collision; a collapsed/unmounted section is not a dangling fragment. Retain safe source URL/title/snippet projection rather than fetching private metadata through an unguarded alternative API (D-014, D-022; S2/S6).

### Scroll, selection and keyboard

One scroll owner operates in each ordinary/Virtuoso mode. Retain existing Virtuoso and its 500-group threshold until measurements justify a change; do not reinstall virtualization. Group count includes date/comparison groups, not only raw messages.

Use an explicit follow/reading/selection policy. Follow new output only while the person is following. Wheel/touch/scrollbar or keyboard reading movement and native selection suspend automatic following. Only an explicit Jump to latest resumes it. Images/math/diagrams growing below a reader preserve their message/block anchor and local offset; bottom-following readers remain at the bottom. Bind listeners to the actual current scrolling element, including the 499→500-group replacement. Put ordinary pagination sentinels inside that scroller; use Virtuoso's start signal in virtual mode.

Keep short identifier and cross-message native selections intact. Dismissing the custom selection menu is not `removeAllRanges()`. Use the actual scroll root to dismiss menus and preserve keyboard selection during streaming. Return from outputs, source navigation, prepended history and conversation switching with identity-based anchors, not pixels alone.

Transcript shortcuts focus the actual message/action owner after its row mounts. Scope them to the transcript and exclude inputs, contenteditable, composite widgets, dialogs and ordinary controls that own arrows. Do not capture arrow keys globally over a radio group or menu. Preserve existing composition start/end and Enter guards. On CJK keyboards, Enter commits composition without sending. Actual iOS/Android viewport, pinch-zoom, hardware keyboard and safe-area behavior needs device evidence; a keyboard hook or `100dvh` is not proof (S6/S15).

### Streaming, announcements and focus

Display buffering must never change source text, split graphemes or hold a no-space CJK/URL tail indefinitely. Bound reveal lag through measured scheduling and flush all remaining text immediately on completion, stop or final persisted snapshot. Reduced motion bypasses animated reveal and smooth follow. Background-tab resume and burst replay must not replay every obsolete UI chunk.

One semantic announcer tracks status transitions by stable message/run identity, including generating→complete with the same ID. Announce waiting, resumed, cancelled, failed and complete once. Do not reread paginated history, every token or elapsed-time tick through competing live regions. Keep normal reading DOM non-chatty and expanded logs inspectable. A new answer/question never steals focus from the composer or selected text; errors after explicit submit may focus their relevant field. Virtual unmounts and modal close need a named focus-recovery path. [03](03-design-concept.md) owns visual/focus treatment; [10](10-artifacts-and-interactions.md) owns decision state.

## Read-aloud: remove the words the app adds

The old adapter inserted `List item. `, `Item N. ` and `Nested list level N. ` before list bodies. The current deterministic adapter emits unordered bodies without a prefix, preserves ordered ordinals as `7. ` / `8. `, and retains `Checked. ` / `Unchecked. ` once as task state. It never removes matching words authored in the body. Each spoken item carries typed `listItemId` and `listDepth`; nested traversal replaces membership for the child rather than inheriting the parent's identity. Empty ordinary items create no empty segment, while an empty task still has its state segment. Block counting and existing pause behavior remain.

### Exact current path

```text
MessageActions → TTSButton → TTSContext.playFromText(text, messageId)
  → authenticated speechPreparation:prepare with unchanged Markdown
  → canonical message/access/preference check
  → Marked GFM lexer → prepareDeterministic token-tree traversal
  → optional constrained code-outline assistance, not list rewriting
  → source-mapped prepared segments
  → authenticated POST /tts per segment, synthesis speed 1
  → tts.generateSpeech → owner-scoped cache/claim → synthesis.ts
  → Deepgram /v1/speak with JSON {text}
  → buffered MP3 / HTTP response → Blob / HTMLAudio per segment
  → actual ended event → pauseAfterMs → next segment
```

The player applies speed once. This is sequential segment playback, not direct provider-byte streaming despite UI naming. No device-speech fallback was found; do not claim offline/browser voice parity. [Path evidence](../../research_notes/blah-chat-modernization-review/narration.md#actual-path-not-a-provider-hypothesis), [Deepgram REST contract](https://developers.deepgram.com/docs/text-to-speech).

The historical isolated source-expression probe reproduced `"List item. "`; the complete parser was not available in that earlier probe. For this change, a real `prepareDeterministic` test ran against the base parser and failed on actual generated prefixes (`List item. `, `Item 7. ` and `Nested list level 2. `). The changed parser and handoff tests now pass. Raw base-red and green command logs are in the orchestrator's `evidence/next-rung-3/` packet. The handoff test uses actual prepared list segments and mocked only auth/network/audio boundaries. **No provider synthesis was requested and no audio was heard.** Parser and POST-body evidence does not certify pronunciation, deployed behavior or listening quality (S7).

### Small deterministic list change

Change the existing AST/token-tree list adapter, not the provider or a full-message model prompt. Remove only generated structural list labels. Retain original Markdown and source offsets; global phrase deletion would corrupt valid author text.

| Source / structure | Prepared-text rule | Metadata / fidelity |
|---|---|---|
| `- Apples` / `- Pears` | `Apples` then `Pears`, with existing pause metadata | Distinct source-linked items; no empty synthetic prefix segment. |
| Ordered list starting at 7 | `7. ` + `…`, then `8. ` + `…`; no generated `Item` | Preserve rendered ordinal policy and all substantive body numbers. |
| Nested lists | Parent/child/sibling content in source order, no spoken nesting labels | Typed `listItemId` / `listDepth`; child membership is not overwritten by parent traversal. Code blocks and optional code explanations retain their containing list membership. |
| Checked / unchecked tasks | Preserve `Checked. ` / `Unchecked. ` once | Task state carries meaning; the bullet marker does not. Empty task bodies still retain that state. |
| Author writes "Say list item literally." | Speak those words unchanged | Distinguish synthetic segments from source spans. No phrase blacklist. |
| Heading, code, table, math, final paragraph | Unchanged by this list repair | Retain heading rank, technical detail paths, existing unsupported-structure notices and the final sentence. |

Keep block accounting even if a synthetic label disappears. Never emit empty speech segments, since validation/synthesis rejects them. Nested-only/empty items need explicit fixture treatment; no invented content. Keep existing content pauses initially, including the current 250ms default, and tune only after listening. Ordinal-only segment consolidation is optional later work with its own join tests, not required to remove the labels.

Do not revive the legacy punctuation-stripping `markdownToSpeechText` fallback. Ordinary prose bypasses model rewriting. Existing optional code-outline assistance is constrained to validated source lines; retain its boundary. This repair does not silently simplify table headers/cells, technical operators, negation, precision or grouped math. Where math/figures cannot be narrated faithfully, disclose partial coverage and preserve source, not a summary masquerading as full narration.

### Source mapping, policy and caches

Preserve immutable Markdown/hash and original UTF-16 offsets through CRLF, tabs, emoji, repeated text and nested items. Structural rank/depth/pause belongs in metadata rather than spoken tags. The current preparation result is version `2`; every segment ID uses the `speech-v2:` namespace, preventing a prior positional mapping from being mistaken for this policy. The web client continues to accept legacy version `1` results from a still-deployed or BYOD backend and consumes only their existing segment fields. Older clients ignore the additional metadata and version field. Rollback to an old backend therefore restores its old speech text for old clients; a new client can consume either result without a forced schema migration. No numeric-index resume store was found in the current player path.

There is no preparation-result cache in the inspected action. Current audio identity covers owner, exact prepared text, voice, speed, MP3, credential policy and `speech-audio-v1`. Removed label segments are no longer requested; changed `Item 7. `→`7. ` naturally yields a different text hash. Unchanged content audio can remain valid. Do not flush unrelated audio or users' caches merely to change a list prefix.

If an adapter changes interpretation for identical text, version its audio namespace/configuration. Any future preparation cache must include authenticated owner, source revision/hash, normalizer/preparation policy, locale and relevant model/config versions; audio adds prepared-text/segment identity, provider/model/voice/config and adapter version. A source edit or policy mismatch invalidates mapped playback. Voice changes apply to a clearly captured playback session, not half of an old rendition. Locale support is not established by English structural rules or existing `-en` voices (D-022; Q4/Q7/Q8).

Keep current caps and reject-not-truncate behavior: 40,000 source UTF-16 units, 500 blocks, 1,500 segments, 120,000 prepared output units and 1,800 per segment. Confirm counting against the chosen endpoint's documented limit when implementing; a model context window is not an audio limit. Required coverage includes the distinctive last sentence, not just a nonempty MP3.

### Playback and source following

Retain authenticated canonical access checks, owner-scoped cache claims, per-fresh-synthesis cost tracking, generation-token fencing, abort/Blob/timer cleanup and actual audio `ended` completion. Account/message/source changes cancel old work and reject late callbacks. Failure in the middle preserves a recoverable position and must not skip ahead or report complete.

Playback position follows `{sourceRevision, segmentId, localProgress}` mapped to source spans/anchors, not regenerated prose or an old segment number. Do not claim word-level alignment where only segments/approximate timing exist. If following is offered, use the actual scroll container and unobscured viewport; manual wheel/touch/keyboard reading suspends it until explicit Resume following. Respect reduced motion and preserve focus. Advancing audio never steals the reader's position after they opt out.

## Package candidates, not a new rendering stack

These versions were source/registry-backed candidates on 2026-11-03, not installed targets or compatibility results. Recheck exact package metadata/release notes and nested lock edges before implementation (D-020; S1/S6). Full evidence is in the [dependency matrix](../../research_notes/blah-chat-modernization-review/dependencies.md#core-compatibilityversion-matrix) and [rendering upstream review](../../research_notes/blah-chat-modernization-review/rendering-prior-art.md#current-upstream-options-as-of-the-cutoff).

| Candidate | Why consider it | Gate / what it does not solve |
|---|---|---|
| Streamdown 2.2.0→2.7.1 | [Release](https://github.com/vercel/streamdown/releases/tag/streamdown%402.7.1) includes cross-block references, CJK segmentation and static/ARIA fixes. | Repair sanitizer/math integration and fixtures first. New core does not automatically replace custom CodeBlock behavior. |
| Existing Shiki 3.22.0→3.23.0 | Narrow maintenance cohort preserves current fine-grained integration. | No measured app speedup. Shiki 4.6 / `@streamdown/code` 2.0.0 is a separate grammar/runtime/incremental-control spike. [Plugin release](https://github.com/vercel/streamdown/releases/tag/%40streamdown/code%402.0.0). |
| Mermaid 11.12.3→11.17.2 | Same-major maintenance/security candidate. | Strict config, directive limits, SVG handling and stale async results still need repair. Mermaid 12 is elective. |
| KaTeX 0.16.28→tested 0.18.11 cohort | Candidate above the researched advisory fix lineage. | `rehype-katex` 7.0.1 retains a nested `^0.16` dependency. Fix the actual resolved graph, chemistry and sanitizer policy; do not force a global override or declare 0.16.47 fixed. |
| Existing react-markdown 10.1, DOMPurify, Virtuoso 4.18.1 | Retain and verify actual consumers; react-markdown was already current in research. | No second virtualizer, sanitizer removal or wholesale UI runtime adoption. Worker and React policies must still agree. |

AI Elements demonstrates stable plugin configuration and raw-code controls; Hugging Face Chat UI demonstrates bounded worker scheduling/stale-response rejection; Streamdown demonstrates conditional completed-line grammar reuse. These are mechanism references with pinned source/licensing in the [prior-art note](../../research_notes/blah-chat-modernization-review/rendering-prior-art.md#reusable-implementation-patterns-and-copying-terms), not measured app performance claims or reasons to replace Convex ownership. Notto hierarchy/disclosure reuse remains subject to Q21 and [19](19-reuse-map.md).

## Narrow regression fixtures

Run these after authorized dependency restoration, using existing Vitest/Playwright infrastructure and fake providers. These are acceptance requirements, not tests executed by this chapter (D-033).

| Fixture | Exact boundary to assert |
|---|---|
| Sanitizer/math/worker parity, S6 | Real parser output at 4,999/5,000/5,001 units, streaming delimiter prefixes, completion/edit/worker timeout. Scripts/unsafe URLs/images cause no unauthorized requests. `$$`, normalized delimiters, `$5`, chemistry and math fallback agree; code/diagram/Bible controls survive. |
| Code and references, S6 | Unlabelled/tilde/long fences and `c++`; current raw copy including tabs/final newline; clipboard denial; actual wrap layout; stale highlight ignored. Two messages citing `[1]`, absent source, collapsed target and late reference definition resolve only to real namespaced sources. |
| Reading and focus, S6/S15 | 499→500 groups, prepend, comparison rows, delayed images/math, selected identifier/cross-turn text, keyboard reading, output Back, reduced motion and mobile IME. Record selected text and message/block anchor before/after, not only scroll pixels. |
| Stream completion and announcements, S6 | No-space CJK/emoji/URL tail, burst/background-tab replay, nonappend edit and same-ID completion. Exact persisted text reaches display immediately at terminal flush; one semantic announcement, no focus theft or timer/token chatter. |
| Deterministic speech, S7 | Bullets, ordered start 7, wrapped/nested/empty/task items, author's literal "list item", negative/precise numbers, code/table return-to-prose, CRLF/tab/emoji mappings and distinctive final sentence. Zero generated list labels or empty segments; every substantive block remains accounted for. Replace old label-mandating tests. |
| Actual speech handoff/lifecycle, S7 | Real deterministic output enters authenticated POST in order. Selected voice, speed once, exact prepared text, owner cache isolation, policy/version invalidation, middle failure, pause/loading/gap/stop/account/source switch and rejected late callbacks. Final completion follows actual last audio ending, not a timer alone. |
| Listening, separately authorized S7 | Same selected voice/rate for before/after. Hear bullets, ordinals, checked state, nested joins, technical return-to-prose and last audible sentence/sample. Record voice/provider/runtime/policy and unresolved coverage. Text assertions cannot pass this listening gate. |

## Measured benchmark spike

S16 compares the pinned baseline with two separate candidates: stable components/shared semantics first, then incremental or worker-based highlighting. Do not combine optimizations before attributing their effects. Use identical synthetic content and captured chunk schedules; no paid generation is needed for this renderer comparison.

Include prose/code/math/table/diagram mixes at 5k/50k/250k characters, 50/250/499/500/1,000 grouped rows, ten very large answers and two/four comparison streams. Replay 10/40/100 chunks per second, bursts, pauses, edits and background-tab completion. Measure cold and warm runs separately with recorded fixture/build/browser/device, viewport, throttling and repetitions. A throttled desktop is not a substitute for a real mobile keyboard/device check.

Report median/p95 input-to-paint, persisted-to-revealed lag, parser/tokenizer/sanitizer/DOM time, React commits/remounts, long tasks, worker queue/stale work, DOM/heap, lazy/initial JS, subscription bytes/cache writes and reading-anchor displacement. Measure final flush and selection retention as correctness, not only average timing. Approve numerical targets after that baseline; research's proposed budgets are negotiation points, not achieved latency claims.

If a candidate is faster but removes controls, loses source fidelity, scrolls selected text away or skips the spoken ending, reject it. The completion gate is a readable, usable answer under [03](03-design-concept.md), not a benchmark screenshot.
