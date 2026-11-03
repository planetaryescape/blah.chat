# Chat read-aloud: unwanted list announcements

## Why does it say "list item"?

### Takeaway

BK's exact report: `the TTS when reading something with a list keeps saying list item, that's dumb, why would it do that?`

Suggested explanation to BK: **The app is adding those words itself. Its speech-preparation code inserts "List item" before every bullet, then sends that text to the voice. We should remove those announcements and use pauses instead, while keeping the actual content and meaningful numbers. I verified the text-generation expression, but have not listened to the audio.** The insertion is explicit at `packages/backend/convex/lib/speech/prepare.ts:339-345`; tests currently require it. [Insertion](../../packages/backend/convex/lib/speech/prepare.ts#L339) [Existing expectations](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L533)

### Cited Findings

#### Actual path, not a provider hypothesis

| Boundary | Evidence and consequence |
| --- | --- |
| Assistant message -> speaker | Desktop actions pass complete message content and ID into `TTSButton`; clicking calls `playFromText({text, messageId})`. This is application read-aloud, not a DOM screen-reader announcement. [MessageActions.tsx:379-389](../../apps/web/src/components/chat/MessageActions.tsx#L379) [TTSButton.tsx:31-45](../../apps/web/src/components/chat/TTSButton.tsx#L31) |
| Original Markdown -> preparation action | `TTSContext` obtains a JWT, calls `speechPreparation:prepare` with unchanged Markdown, and rejects stale results. The server authenticates the owner, checks TTS preference and canonical message access/content, then calls `prepareDeterministic`. [TTSContext.tsx:289-302](../../apps/web/src/contexts/TTSContext.tsx#L289) [speechPreparation.ts:159-184](../../packages/backend/convex/speechPreparation.ts#L159) |
| Parser -> literal unwanted words | Preparation uses Marked's GFM lexer and recursive token traversal. Every list item emits a separate `role: "detail"`, `kind: "list"` segment before its content. Unordered prefix: `List item. `; ordered prefix: `Item ${start + index}. `; nested prefix adds `Nested list level ${depth + 1}. `; tasks append `Checked. ` or `Unchecked. `. [prepare.ts:327-355](../../packages/backend/convex/lib/speech/prepare.ts#L327) [Lexer entry](../../packages/backend/convex/lib/speech/prepare.ts#L584) |
| Prompt is not responsible for lists | The action returns immediately when no fenced code blocks need assistance. Its operational prompt selects exact source lines for optional code outlines; it does not rewrite prose or generate list labels. [speechPreparation.ts:211-235](../../packages/backend/convex/speechPreparation.ts#L211) [Entire prompt](../../packages/backend/convex/lib/prompts/operational/speechPreparation.ts#L1) |
| Prepared segment -> HTTP | For each segment the web client posts `text: segment.text`, voice and synthesis speed `1` to `/tts`; browser playback applies speed once. There is no filter that removes structural-label segments. [TTSContext.tsx:322-351](../../apps/web/src/contexts/TTSContext.tsx#L322) |
| HTTP -> synthesis/cache | Authenticated GET/POST `/tts` calls `tts.generateSpeech`. That action checks preferences, selects server or reader-owned Deepgram credentials, checks owner-scoped audio cache/claims and records cost on a fresh synthesis. [http.ts:123-166](../../packages/backend/convex/http.ts#L123) [tts.ts:32-87](../../packages/backend/convex/tts.ts#L32) [tts.ts:116-169](../../packages/backend/convex/tts.ts#L116) |
| Synthesis -> Deepgram | `synthesize` sends exactly `JSON.stringify({text})` to `https://api.deepgram.com/v1/speak`, using the voice as `model`, requesting MP3. No prose-generating prompt exists at this boundary. Deepgram's primary guide describes the returned audio as saying the words supplied in `text`. [synthesis.ts:90-125](../../packages/backend/convex/lib/speech/synthesis.ts#L90) [Deepgram REST guide](https://developers.deepgram.com/docs/text-to-speech) |
| Audio -> player | Provider response bytes are fully buffered, returned through Convex as base64, converted to HTTP audio, then loaded as one Blob/HTMLAudio element per segment. The player loads sequentially, waits for actual `ended`, and inserts `pauseAfterMs` gaps. The UI's `isStreaming` does not mean direct provider-byte streaming in this path. [synthesis.ts:121-126](../../packages/backend/convex/lib/speech/synthesis.ts#L121) [tts.ts:174-179](../../packages/backend/convex/tts.ts#L174) [http.ts:160-166](../../packages/backend/convex/http.ts#L160) [TTSContext.tsx:365-369](../../apps/web/src/contexts/TTSContext.tsx#L365) [useTTSAudioPlayer.ts:181-248](../../apps/web/src/hooks/useTTSAudioPlayer.ts#L181) |
| Device speech | No device-speech fallback is supplied by the documented implementation; the inspected player uses HTMLAudio, not `speechSynthesis`. A source search for `speechSynthesis`, `expo-speech`, and `Speech.speak` under `apps` found no calls. Do not claim browser/device TTS parity or offline behavior. [Implementation limit](../../docs/features/tts.md#L131) [Player adapter](../../apps/web/src/hooks/useTTSAudioPlayer.ts#L153) |

- Exact fixtures encode the reported behavior: wrapped items expect `["List item. ", "List item. ", "Item 7. ", "Item 8. "]`; nested fixtures expect `Nested list level 2. List item. `; task fixture expects `List item. Checked. `. These tests verify the current implementation, not BK's preferred listening experience. [speechPreparation.test.ts:533-537](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L533) [Nested fixture:601-608](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L601) [Task fixture:624-644](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L624)
- The old `markdownToSpeechText` utility is not in the traced path: the only `apps` match is its definition. Its fallback strips punctuation, including minus signs; reintroducing it would bypass the existing structured, source-mapped preparation. [Legacy utility](../../apps/web/src/lib/utils/markdownToSpeech.ts#L10) [Current unchanged-source handoff](../../apps/web/src/contexts/TTSContext.tsx#L298)
- Meaningful list numbering is separate from the word "Item". CommonMark defines list start from the first marker and disregards subsequent marker numbers; current `Number(list.start) + index` follows that rendered numbering policy. Neither CommonMark nor its list grammar mandates saying "list item" aloud. CommonMark is a parsing standard, not a TTS rendering standard. [CommonMark 0.31.2, lists](https://spec.commonmark.org/0.31.2/#lists) [Current ordinal calculation](../../packages/backend/convex/lib/speech/prepare.ts#L342)

#### Local evidence actually collected

The first attempt imported the real pure `prepareDeterministic` function with fixture Markdown using `bun -e`. It failed **before preparation** with `Cannot find package 'marked' .../lib/speech/prepare.ts` on Bun 1.3.14. No dependency installation or provider request was attempted. This prevents claiming a full-parser or application reproduction in this checkout. [Import dependency](../../packages/backend/convex/lib/speech/prepare.ts#L1)

A second, dependency-free probe read the trusted local source file, extracted the existing prefix expression, and executed only that expression with synthetic list-token fields. This is a narrow, deterministic reproduction of **text injection**, not of parsing, networking or heard audio. Its command was run from the repository root:

```sh
bun -e 'const source = await Bun.file("packages/backend/convex/lib/speech/prepare.ts").text(); const line = source.split("\n").find(line => line.includes("list.ordered ? `Item")); if (!line) throw Error("Source expression moved"); const render = new Function("depth", "list", "index", "item", `return ${line.trim().replace(/,$/, "")};`); const prefix = render(0, {ordered:false}, 0, {}); if (prefix !== "") throw Error(`Bullet speech must not add structural words; actual prefix=${JSON.stringify(prefix)}`);'
```

Observed exit status `1`, the desired red signal:

```text
error: Bullet speech must not add structural words; actual prefix="List item. "
```

A separate probe of the same expression and a proposed replacement produced:

```text
case                current generated prefix                   candidate prefix
unordered           "List item. "                              ""
ordered start 7     "Item 7. "                                 "7. "
nested depth 2      "Nested list level 2. List item. "          ""
checked task        "List item. Checked. "                     "Checked. "
unchecked task      "List item. Unchecked. "                   "Unchecked. "
```

This output is reproducible from the literal expression at the cited seam. Only the isolated prefix candidate was evaluated; **the full proposed patch was not applied or run**. [Expression exercised](../../packages/backend/convex/lib/speech/prepare.ts#L342)

### Inferences

- **High confidence, observed isolated text behavior:** host-injected labels are a sufficient explanation for the exact repeated words. They are actual speech payload, not hidden accessibility metadata. The current code also spends an audio request/cache lookup on the standalone label before reading each item's content. [Label segment](../../packages/backend/convex/lib/speech/prepare.ts#L339) [Sequential per-segment fetch](../../apps/web/src/hooks/useTTSAudioPlayer.ts#L181)
- Alternatives, ranked after obtaining the local signal: (1) host label injection confirmed at the expression seam; (2) old audio-cache replay can preserve an already-generated label, but is downstream of the same origin; (3) preparation-model invention is not needed and has no list input in this path; (4) provider-added wording remains untested but is unnecessary to explain this symptom. [Cache text input](../../packages/backend/convex/tts.ts#L81) [Code-only assistance](../../packages/backend/convex/speechPreparation.ts#L211) [Provider payload](../../packages/backend/convex/lib/speech/synthesis.ts#L109)

### Gaps

- No failing message, deployed SHA, provider request trace, voice choice or recording was supplied. The finding describes the inspected working-tree code, not verified deployed behavior. The targeted tracked diff for the inspected preparation/player paths was empty at inspection; other unrelated workspace work exists and was left alone.
- **No audio was synthesized or listened to.** Real provider pronunciation, acoustic pauses, browser/device behavior, segment joins, final audio samples and any deployment differences remain unverified. There were no app source edits, commits, dependency changes or paid/provider API calls.

## What is the smallest faithful repair?

### Takeaway

Keep the existing deterministic parser/token-tree preparation. Change its list-item rendering policy at `prepare.ts:339-355`: omit synthetic bullet/nesting labels, retain meaningful ordered numbers and task state, and keep hierarchy as source-linked metadata rather than words. Do not add a full-message AI narration rewrite or change providers. [Existing list traversal](../../packages/backend/convex/lib/speech/prepare.ts#L327) [Existing segment metadata](../../packages/backend/convex/lib/speech/types.ts#L1)

### Cited Findings

#### Proposed implementation patch, NOT applied

This is an implementation candidate, not a validated application fix. It reuses the current Marked token tree, original UTF-16 mappings and existing player gaps. Additive metadata preserves nested item membership without requiring audible structural labels; nested traversal fills its own metadata first, and the outer item fills only segments not already assigned. Existing heading metadata establishes the same separation between semantics and spoken text. [Current recursive mapping](../../packages/backend/convex/lib/speech/prepare.ts#L335) [Heading metadata convention](../../packages/backend/convex/lib/speech/types.ts#L18) [Gap playback](../../apps/web/src/hooks/useTTSAudioPlayer.ts#L241)

```diff
--- a/packages/backend/convex/lib/speech/types.ts
+++ b/packages/backend/convex/lib/speech/types.ts
@@
   headingLevel?: number;
+  /** List membership is metadata, not a spoken structural announcement. */
+  listItemId?: string;
+  listDepth?: number;
--- a/packages/backend/convex/lib/speech/prepare.ts
+++ b/packages/backend/convex/lib/speech/prepare.ts
@@
-          add(
-            mapping,
-            "list",
-            `${depth ? `Nested list level ${depth + 1}. ` : ""}${list.ordered ? `Item ${Number(list.start) + index}. ` : "List item. "}${item.task ? (item.checked ? "Checked. " : "Unchecked. ") : ""}`,
-            "detail",
-            0,
-          );
+          const firstSegment = narration.segments.length;
+          const prefix = `${list.ordered ? `${Number(list.start) + index}. ` : ""}${item.task ? (item.checked ? "Checked. " : "Unchecked. ") : ""}`;
+          if (prefix)
+            add(mapping, "list", prefix, "detail", 0);
           walk(
@@
             references,
           );
+          for (const segment of narration.segments.slice(firstSegment)) {
+            if (segment.listItemId === undefined) {
+              segment.listItemId = mapping.blockId;
+              segment.listDepth = depth + 1;
+            }
+          }
```

The second hunk's `walk(...)` is specifically the list-item walk at current lines 346-355, not the later blockquote walk. Empty bullet prefixes must **not** be emitted as empty speech segments: current validation and synthesis reject empty text. Retain `block(...)` accounting even when a label disappears, and do not change the whitespace/source-offset inversion. [Validator](../../packages/backend/convex/lib/speech/prepare.ts#L177) [List offset inversion](../../packages/backend/convex/lib/speech/prepare.ts#L93) [Synthesis validator](../../packages/backend/convex/lib/speech/synthesis.ts#L54)

The absolute symptom-only minimum is the conditional-prefix change; the two metadata fields plus assignment are the small fidelity addition needed to retain hierarchy/item grouping after removing spoken labels. Keep current `250 ms` content boundaries initially; tune with listening, not guessed SSML. Ordered prefixes remain separate segments in this minimal candidate. Joining their text into the first content segment, to avoid a separate number-only request, requires testing punctuation/prosody and empty/multiblock/nested items; it is not necessary to remove "list item". [Default pause](../../packages/backend/convex/lib/speech/prepare.ts#L228) [Current list source segment](../../packages/backend/convex/lib/speech/prepare.ts#L538)

#### Before/after speech examples and fidelity boundaries

`[pause]` below denotes player metadata, **not text sent to TTS**. Before strings are static derivations from the cited implementation/tests unless specifically covered by the isolated prefix probe. After strings are proposed acceptance targets, not heard audio. The minimal patch changes list labels only; technical code/table narration and unsupported math must not be silently simplified as part of it. [Preparation branches](../../packages/backend/convex/lib/speech/prepare.ts#L327)

| Source Markdown | Current speech text / preparation | Candidate / required behavior |
| --- | --- | --- |
| `- Apples` then `- Pears` | `List item. ` / `Apples` / `List item. ` / `Pears` | `Apples [pause] Pears`; no generated "list item". Keep two distinct mapped items. [List branch](../../packages/backend/convex/lib/speech/prepare.ts#L339) |
| `7. Open port 3000.` then `8. Wait 2 seconds.` | `Item 7. ` / `Open port 3000.` / `Item 8. ` / `Wait 2 seconds.` | `7. Open port 3000. [pause] 8. Wait 2 seconds.` Preserve ordinal 7/8 and content numbers 3000/2; omit only generated "Item". [Ordered calculation](../../packages/backend/convex/lib/speech/prepare.ts#L342) |
| `- Parent` with nested `  - Child`, then `- Sibling` | `List item. Parent Nested list level 2. List item. Child List item. Sibling` | `Parent [pause] Child [pause] Sibling`; depth/item grouping in metadata, order unchanged. Semantic parent/child relations may still be less clear acoustically; test pauses and expose structured navigation rather than claiming equivalence from flattening. [Nested fixture](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L470) |
| `- [x] Install` then `- [ ] Verify` | `List item. Checked. Install List item. Unchecked. Verify` | `Checked. Install [pause] Unchecked. Verify`. Task state is substantive, unlike bullet markup. Do not read "open bracket x close bracket". [Task extraction](../../packages/backend/convex/lib/speech/prepare.ts#L130) [Task prefix](../../packages/backend/convex/lib/speech/prepare.ts#L342) |
| `## Deployment` then `Do not restart.` | `Deployment` / `Do not restart.`; heading level 2 and 500 ms pause | Unchanged. Speak heading once, no "heading level two" or hashes. Preserve "not". [Heading branch](../../packages/backend/convex/lib/speech/prepare.ts#L533) |
| Inline code: `Use ` + backtick + `user_id` + backtick + `.` | `Use user_id.` | Unchanged by list repair. Identifier remains exact in prepared text; its actual provider pronunciation is unverified. [Inline code](../../packages/backend/convex/lib/speech/prepare.ts#L270) |
| Fenced `js` block containing `return false;`, then `Final sentence.` | `Code, js. Technical detail.` / `Line 1, indentation 0 spaces and 0 tabs: return false;. Symbols in order: semicolon` / `End of code.` / `Final sentence.`; optional validated outline can be inserted before end-code | Keep deterministic detail and exact source code; do not read fence backticks. This patch intentionally does not remove technical operator/indentation detail, which is meaning rather than decorative markup. A quieter code mode would need explicit reader choice and a preserved detail path. [Code detail](../../packages/backend/convex/lib/speech/prepare.ts#L438) [Outline boundary](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L327) |
| GFM table `Name / Count`, row `A / 2` | `Table. Columns: 1: Name; 2: Count.` / `Row 1, A; column 1, Name: A.` / `Row 1, A; column 2, Count: 2.` | Unchanged in minimal patch; no pipe/dash markup. A later quieter deterministic adapter could say `Name; Count. A; Count: 2.` only after validating row/header relationships and full cell coverage. Never replace the table with a summary or discard blanks/units/negative values. [Table traversal](../../packages/backend/convex/lib/speech/prepare.ts#L419) [Blank/precision tests](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L441) |
| `(a+b)/c is not a+(b/c).` | Exact expression text plus mathematical-notation notice; `coverage: partial` | Unchanged in minimal patch. A future typed math renderer could produce `(a plus b), all divided by c, is not a plus (b divided by c)` with explicit grouping; that is **not implemented or acoustically verified**. Keep exact notation separately, and disclose unsupported rendering instead of flattening parentheses/operators. [Math warning](../../packages/backend/convex/lib/speech/prepare.ts#L553) [Grouping regression](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L381) |
| `[Read the guide](https://example.org/guide).` | `Read the guide.` | Unchanged: keep label once, not brackets/parentheses or incidental URL. If the URL is itself visible substantive text, retain it; unresolved reference syntax is currently retained, not guessed away. [Resolved link test](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L718) [Unresolved references](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L178) |
| `- Say list item literally.` | `List item. ` / `Say list item literally.` | `Say list item literally.` Keep the author's actual words! Remove generated labels at the AST/token seam, never global string replacement. [Separate synthetic/source segments](../../packages/backend/convex/lib/speech/prepare.ts#L339) |

#### Boundaries to preserve while implementing

- **Immutable source and mapping:** retain original Markdown, source hash, block/item IDs and original UTF-16 offsets. Existing CRLF/tab/emoji/nested/reference tests protect nontrivial mappings. Segment IDs currently incorporate output position; removing labels will change later IDs, so do not resume old segment indexes across a policy change. Do not claim word-level audio alignment. [Segment ID construction](../../packages/backend/convex/lib/speech/prepare.ts#L214) [Mapping regression fixtures](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L489) [Documented alignment limit](../../docs/features/tts.md#L117)
- **Cancel/stale results:** keep generation fencing, authenticated request cancellation and captured-token behavior; preserve player abort/Blob cleanup and timer cleanup. Source/message edits during playback need an explicit invalidation check if implementing live-follow: the current client fences new requests/account changes, and the server checks canonical text at preparation time, not continuously during playback. [TTSContext.tsx:97-114](../../apps/web/src/contexts/TTSContext.tsx#L97) [TTSContext.tsx:197-242](../../apps/web/src/contexts/TTSContext.tsx#L197) [Request generation check](../../apps/web/src/contexts/TTSContext.tsx#L253) [Canonical check](../../packages/backend/convex/speechPreparation.ts#L172) [Player cleanup](../../apps/web/src/hooks/useTTSAudioPlayer.ts#L44)
- **Cache invalidation:** current audio hash covers owner, exact prepared text, voice, speed, MP3, credential policy and `speech-audio-v1`. There is no preparation-result cache in the inspected action. Removing the label segment means it is no longer requested; changing `Item 7. ` to `7. ` changes the audio hash. Unchanged content-segment audio remains valid. No global cache deletion is needed for this narrow fix. If adapter pronunciation/pause policy changes for identical text, version its cache namespace; any future preparation cache must include owner, source hash, normalizer/policy and locale. [Hash fields](../../packages/backend/convex/lib/speech/synthesis.ts#L70) [Owner lookup](../../packages/backend/convex/tts.ts#L81) [Preparation return path](../../packages/backend/convex/speechPreparation.ts#L184)
- **Voice and locale:** voice is captured per playback session; preference changes affect the next session, and audio cache keys contain voice. Current shared settings enumerate `-en` voices, and preparation has no locale parameter. Do not silently add English structural words to other languages or claim locale-aware number pronunciation; any multilingual expansion needs explicit source locale, voice compatibility and cache policy. [Session preferences](../../apps/web/src/contexts/TTSContext.tsx#L244) [Voice options](../../packages/shared/src/tts.ts#L1) [Preparation signature](../../packages/backend/convex/lib/speech/prepare.ts#L189) [English quantities](../../packages/backend/convex/lib/speech/quantities.ts#L1)
- **Coverage and limits:** source 40,000 UTF-16 units, 500 blocks, 1,500 segments, output 120,000 and segment 1,800 are current app caps; Deepgram documents a 2,000-character REST input limit. Keep reject-not-truncate behavior and account for the final sentence. The current global complete/partial flag is not a per-block coverage ledger. Add a per-block disposition/coverage manifest only if extending structural preparation, not an unsupported claim that the minimal label change proves complete equivalence. [App limits](../../packages/backend/convex/lib/speech/prepare.ts#L5) [Validation](../../packages/backend/convex/lib/speech/prepare.ts#L165) [Deepgram input limit](https://developers.deepgram.com/docs/text-to-speech)

### Inferences

- The right architecture is already largely present: deterministic **AST/token-tree-based speech preparation**, separate speech text and delivery metadata, source-linked segments, bounded synthesis. Repair the rendering policy rather than replacing Marked, adding a service or asking a general model to rewrite every answer. Existing lossless splitting, source mapping and explicit gaps are worth preserving. [Preparation](../../packages/backend/convex/lib/speech/prepare.ts#L189) [Lossless splitter](../../packages/backend/convex/lib/speech/prepare.ts#L30)
- Constrained exceptions should be opt-in and span/structure-specific: ambiguous math or code explanations may need a tested typed adapter or bounded assistance, but never a free-form full-message rewrite. Preserve originals, quantities, negation, qualification and ending; validate exact source/hash/order and reject truncated/invalid output. The current code-outline mechanism already constrains assistance to exact source-line quotes. [Operational prompt](../../packages/backend/convex/lib/prompts/operational/speechPreparation.ts#L1) [Outline validation fixtures](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L749)

### Gaps

- The candidate metadata and prefix patch are uncompiled and untested against Marked in this checkout. Empty items, tasks without body, and nested-only items need explicit contract decisions before shipping; never replace them with empty audio requests.
- Current code and table technical narration is verbose. Making those quieter while preserving all technical meaning is separate from the requested label repair. Math grouping remains an explicit capability gap, not a reason to silently summarize.
- No telemetry or deployed logs were collected. If runtime confirmation is authorized later, capture the prepared segment/request ID, kind, source hash, policy/version and provider request ID without logging private message text or credentials; use synthetic fixtures for payload inspection.

## What tests and acceptance evidence should gate the repair?

### Takeaway

First replace the tests that currently mandate the unwanted labels with adversarial semantic assertions at `prepareDeterministic`. Then verify the real prepared-segment-to-POST handoff and playback lifecycle, and finally listen to actual selected-voice audio, including joins and the ending. Text-only tests cannot establish natural pronunciation or audible completion. [Current label fixtures](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L533) [Existing handoff test](../../apps/web/src/contexts/TTSContext.test.tsx#L195) [Player completion](../../apps/web/src/hooks/useTTSAudioPlayer.ts#L274)

### Cited Findings

Existing coverage can be extended rather than replaced: source-map tests include wrapped lists, CRLF, emoji, tabs, quotes, code and tables; split tests assert exact reassembly and no split surrogate pairs; web tests already check unchanged Markdown preparation, authenticated POST, mapped active segment, and stop-on-middle-failure. These are inspected fixtures, **not tests run in this investigation**. [List mapping tests](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L489) [Splitter tests](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L726) [Handoff and error tests](../../apps/web/src/contexts/TTSContext.test.tsx#L195)

Proposed regression/acceptance matrix (requirements, not completed verification):

| Layer | Required assertions |
| --- | --- |
| Unordered lists | `- Apples\n- Pears\n\nFinal sentence.` produces exactly source text in order, no generated label-only segments, no empty segment, final sentence once. Test `-`, `*`, `+`, tight/loose/wrapped lists. |
| Meaningful ordinals | Start at `7`, `12)`, reset in a nested ordered list; retain rendered ordinal and all body numbers (`3000`, `2`, `-0.5%`, `3.050`, `v1.2.3`). Distinguish Markdown's rendered ordinals from literal unusual numeric labels; never globally remove leading digits or rewrite numeric prose. |
| Nested grouping | Parent, child, grandchild and sibling remain in source order, with correct `listDepth`/`listItemId`; nested metadata is not overwritten by the parent. Include repeated identical item text, nested-only parent, heading/code/table inside an item, and empty items. No `Nested list level` announcements. |
| Tasks | Preserve checked/unchecked status once and words once. Test lowercase/uppercase x, ordered tasks, wrapped tasks and tasks with empty content; no literal marker speech or generic bullet labels. |
| Author uses label words | `- Say list item literally.` still contains the phrase once. Also preserve prose/code quoting `Item 7`, `heading level 2`, Markdown examples and instruction-like source text. No global phrase blacklist or prompt-injection execution. |
| Headings/links | ATX/setext headings once with rank metadata and pauses; emphasis stripped without lost punctuation; inline/reference/forward links preserve labels, standalone URLs remain substantive text, unresolved references disclosed/retained. |
| Technical structures | Exact code source, identifiers/operators/indentation and return-to-prose survive; every table cell retains row/header context, blanks remain blanks not zero, actual/forecast/units/footnotes survive. Grouped math is either faithfully rendered by a tested adapter or still explicitly partial. |
| Source offsets | CRLF/CR, emoji before markers, tabs, quote/list nesting, repeated phrases and inline references map to immutable source spans. Check valid bounds and source order; metadata may overlap by containment, so do not require non-overlap for all structured segments. |
| Text boundaries | No generated structural announcements reach `segment.text`; ordinary words/punctuation remain unchanged except typed pronunciation. Exact lossless segment joins, long final paragraph and distinctive last sentence; bounded inputs fail explicitly instead of truncating. |
| Real handoff | Feed actual deterministic fixture output into the context/player test, not only a mocked prebuilt narration. Assert all and only those segment texts reach authenticated POST in order, no source mutation, one synthesis speed application, selected voice retained. |
| Playback and cancellation | Audio `ended` gates segment completion; next request follows the previous segment/gap; final completion fires once only after last audio/gap. Stop, close, new message, account switch and unmount abort work and reject late results. Pause during audio/loading/gap, blocked autoplay, middle synthesis error and empty audio do not skip content or claim completion. |
| Cache/version | Same owner/text/voice/config hits; changed generated prefix cannot hit old-prefix audio; changing voice/credential policy changes key; foreign owner denied. Do not flush unrelated users' caches. Add normalizer/locale policy keys if introducing identical-text adapter changes or preparation caching. |
| Listening, separate gate | With authorized provider calls, compare old vs normalization-only candidate using the same model/voice/rate; record provider/voice/runtime/policy. Hear bullets, numbered steps, task status, nested joins, code/table return-to-prose, and the **last audible sentence/sample**, not just nonempty MP3. Verify spoken numbers, negation and natural pauses; do not infer this from transcript checks or timer completion. |

The matrix extends existing policy boundaries and structural fixtures rather than asserting a new standard requirement. Primary REST documentation supports the text-to-speech transport and input limit only; CommonMark supports parsed structure/numbering only. Neither establishes listening quality, WCAG conformance, device behavior or universal faithful math speech. [Deepgram](https://developers.deepgram.com/docs/text-to-speech) [CommonMark](https://spec.commonmark.org/0.31.2/#lists) [Existing structural tests](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L46)

When dependencies are restored through the project's normal authorized workflow, queue heavy tests through `agent-work run -- ...`, with four or fewer workers. Run the targeted backend preparation and web context tests before broader gates. This research intentionally did not install dependencies or run the full suite. [Repo local resource rules](../../AGENTS.md#local-build-resources)

### Inferences

- Acceptance should require **zero generated structural-label utterances**, not absence of the words anywhere: author-provided "list item" is valid content. Require every substantive fixture block accounted for once, no changed signs/precision/negation, retained hierarchy metadata and no skipped final segment. These are proposed product gates, not guarantees for unseen source material. [Separate synthetic/source roles](../../packages/backend/convex/lib/speech/prepare.ts#L339) [Existing ending invariant](../../packages/backend/convex/__tests__/speechPreparation.test.ts#L415)
- If the isolated expression repair is green but deployed audio still says it, inspect the actual prepared payload and deployed version before changing the provider. A stale client/session or different deployed preparation path must be distinguished from provider behavior. [Unchanged payload handoff](../../apps/web/src/contexts/TTSContext.tsx#L346) [Exact provider body](../../packages/backend/convex/lib/speech/synthesis.ts#L109)

### Gaps

- Actually run: one blocked full-function import; one isolated source-expression comparison across unordered/ordered/nested/task prefixes; one intentionally failing, red-capable no-generated-label assertion. Not run: parser fixtures, Vitest, typecheck/build, browser/player integration, provider synthesis, real cache access, device voice, source-following UI or listening.
- No actual audio segment, join or final sample was heard. Final sentence preservation is supported by inspected existing tests and proposed assertions, not newly executed end-to-end evidence.
- Delivery is this research note only. No application source patch has been applied; the implementation candidate above requires coordinator approval and normal verification.
