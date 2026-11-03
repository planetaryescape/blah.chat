# 03: Design concept

Use this chapter to judge the experience before building its screens. **Quiet workbench is one proposal, not an approved redesign** (D-023, Q2). The current-app baseline is `04866f80a6236716ebf8d8c5a79001727f85f4bf`, reviewed on 2026-11-03. Existing typography, themes, responsive navigation, composer and accessibility settings are starting assets, not missing features. [Frontend evidence](../../research_notes/blah-chat-modernization-review/frontend.md), [research synthesis](../research/modernization-review.md).

Decisions are in [21](21-decision-log.md); Q2, Q5, Q22, Q23 and verification spikes S6/S8/S9/S15/S16 are in [22](22-open-questions.md). No visual approval, browser review or performance measurement is implied here.

## What this is to the person

blah.chat is a place to ask, think with different models and leave with useful work. A conversation holds the question, the answer and its branches. An artifact holds something worth opening, editing or keeping: a visual explanation, document, code, diagram, image or file. A question asks for missing information. An approval asks permission for one described action. Activity explains what actually happened along the way.

The person cares whether the answer is useful, whether their work is saved and whether anything needs their attention. They should not need to understand a tool log to find the result or discover that the agent stopped for a question. Multi-model comparison, branching and cost awareness remain recognizably blah.chat, without every answer looking like an operations dashboard (D-002, D-008, D-010, D-023).

## The concept

**Quiet workbench.** A clear reading and working area sits inside the app's existing deep-indigo atmosphere. Rose quartz marks the next deliberate action. Manrope carries the answer; JetBrains Mono carries code and exact identifiers. The answer or open artifact gets the space and contrast. Supporting activity sits nearby, quieter but never disposable. The signature is a small revision marker shared by an artifact card and its open workspace: it tells the person which saved work belongs to this answer. It encodes a real relationship rather than decorating the chat.

Keep the existing dark character and the warm Stardust light alternative. Reduce repeated glass, glow and competing containers around prose; do not replace the identity with Notto's theme. This is a proposed hierarchy repair, not evidence that blur is currently a measured bottleneck (D-011, D-023; Q2; S16).

## How the whole fits together

### The mental model

Use these nouns everywhere: Conversation, Answer, Artifact, Activity, Question, Approval, Skill, Connection, Schedule and Computer. A task's durable execution is a Run in technical views. An Attempt is a physical execution attempt, not another conversation. A revision is a saved artifact version. Ordinary copy says "Waiting for your answer", "Waiting for approval", "Saved" and "Stop task", rather than exposing runtime plumbing.

An answer can reference several artifacts, but opening a historical reference opens its exact revision. A question gathers information; answering it never grants an external action. A connection makes an account available; it does not approve writes. A schedule is a reviewed future instruction; it does not grant new powers. These distinctions must survive every hand-off ([02](02-data-model.md), [10](10-artifacts-and-interactions.md); D-024, D-025, D-026, D-029).

### The map

```text
Navigation / command palette
├── Conversations ── selected conversation + branch
│   ├── Answer + sources + pinned artifact cards
│   │   └── Artifact workspace: Preview / Source / Versions / Export
│   ├── Question or Approval: inline, outside Activity
│   ├── Activity: real work, inspectable after completion
│   └── Computer: separate restricted output pane, when authorized
├── Skills ── import → validate → review version → publish / enable
├── Connections ── connect / verify / select / disable
├── Schedules ── draft → review occurrences → arm / pause → results
├── Existing work ── Projects / Tasks / Notes / Knowledge / Bookmarks
├── Existing retrieval / setup ── Search / Memories / Templates / Shortcuts
└── Settings / Usage / information / authorized administration

Wide:   navigation | conversation + composer | selected output
Narrow: conversation → full-screen output → Back to origin card
```

The transcript and composer are home. Navigation becomes the existing mobile Sheet on narrow widths. An output opens beside chat only while both remain readable; otherwise it replaces the content area with a full-screen destination. Back restores the originating card's focus and message/block reading anchor, not merely a guessed pixel offset. If the row is virtualized, mount it before restoring focus. Closing an output is respected until the person reopens it; another streamed draft must not reopen it (D-023, D-031; S6/S15).

Computer stays visibly separate from Artifact. Viewing a screenshot does not grant keyboard/control access. Management pages handle libraries and policies; a chat card links to the exact skill, connection or schedule version it concerns. Neither a policy setting nor a management detour should erase the task draft or its branch.

The existing work and setup destinations remain reachable; the map groups their roles, not an approved sidebar reorganization. Projects keep their conversations/files/tasks/notes/knowledge context. Only Smart Assistant's meeting/transcript workspace is retired, not these shared tools (D-003; [16](16-smart-assistant-removal.md)).

### The journeys, end to end

| Person's goal | Journey and what carries over | Where it must not break |
|---|---|---|
| Get an answer worth keeping | Compose → saved user turn → durable answer → Copy or Read aloud. When spatial explanation helps, the same ordinary turn creates an artifact → pinned card → Preview/Source → edit/review conflict → Export. | Refresh keeps partials and task state. Copy uses raw content. Read-aloud keeps words and ending. Historical cards keep their revision. Mobile Back keeps focus and reading position. |
| Teach a reusable skill | Skills → import → visible validation → exact-version review → publish → choose explicit-only or enabled automatic use → conversation activation → result. A user-requested agent draft enters the same review path. | Validation does not imply publication. Returning to chat retains the draft and selected branch. The result names the actual activated version; scripts never inherit permission from text import. |
| Help a task continue | Ask → work → visible Question → single/multiple/text answer → durable receipt → resumed same Run → answer. Refresh or open another client at any point. | One accepted answer wins. The pending card never hides in Activity. Submission failure preserves typed input; expiry/stop cannot resume the task. No focus jump on card arrival. |
| Use a connected account deliberately | Select a Connection → authorized read → local draft/artifact → distinct Approval with account/destination/content → allow once or deny → executor receipt. | "Approved" never means "Sent". A changed target or content needs review again. Unknown outcome remains unknown; retry cannot silently repeat a possibly completed effect. |
| Arrange a future task | Chat proposal or Schedules → recurrence/timezone/next-occurrence preview → explicit consent → active schedule → reminder or bounded read/draft occurrence → in-app result conversation. | Draft is not active. Background execution uses the same words, permissions and budget checks. Notification retry does not rerun work. Results link to their exact occurrence and outputs. |

The detailed behavior belongs in [04](04-durable-generation.md), [08](08-skills.md), [09](09-integrations.md), [10](10-artifacts-and-interactions.md), [11](11-rendering-and-narration.md) and [12](12-schedules.md). These are five journeys through one app, not five independent visual systems. Computer and scripts are separately gated capabilities, not automatic steps in ordinary chat (D-028; Q3/Q14/Q15).

### Shared patterns

- Pick a model, connection, skill or revision with the existing searchable picker pattern: current value, clear selected state, keyboard navigation and a named return point. Labels come from the same catalog/domain records, so clients cannot disagree about the selection.
- Confirm consequential actions in authored cards or existing shadcn dialogs, never native browser dialogs. Questions and approvals use different titles and verbs because information is not permission.
- Show local drafts as "Unsaved" or "Sending" until a server receipt permits "Saved" or "Answered". A failed submission keeps the text with its specific recovery action. Do not toast success before acknowledgement.
- Show a committed change beside the changed object with its revision/receipt. Offer Undo only when a real compensating or reversible operation exists; stop is not undo.
- Put an error beside the failed object. A preview error preserves source/export; a failed tool preserves the answer and successful effects. Toasts supplement those durable notices, not replace them.
- Activity has one disclosure pattern keyed by conversation/message/run identity. Manual choices survive row remounts. Outputs and pending decisions are never children of that disclosure.

### Across surfaces

Web, mobile, desktop and CLI use the same nouns, state meanings and receipts (D-031). "Waiting for your answer" means a durable `waiting_for_input` Run everywhere; "Cancelled" never becomes "Complete" in another client. The CLI presents structured fields and exact IDs rather than requiring an iframe. Mobile offers full-screen output and a text/source fallback where a preview is unavailable. Readonly clients show the request and receipt without enabled answer/approval controls. [17](17-cli.md) and [18](18-mobile-and-desktop.md) own transport and compatibility details; Q22/S15 gate release parity.

### The system's own state

Keep a small task/status line close to the current answer: actual running phase, a durable human wait, terminal outcome or an explicit lack of recent updates. Elapsed duration may use persisted start/end timestamps, but is not a finish-time promise. A pending input uses a pause glyph, not a spinner.

Artifact headers show revision plus saved/unsaved/updating/conflict state. The composer distinguishes unsent draft from acknowledged message. Activity retains completed, partial, failed and uncertain outcomes after the Run ends. Cost detail remains available from recorded usage; an estimate or missing provider figure must be labelled. No model-authored plan or local timer proves execution health (D-016, D-017, D-025; S3/S8/S16).

## Principles

1. **The answer or artifact is the hero.** The person came for a result. Give it the reading width and lower the visual weight of process detail.
2. **A required decision is never hidden.** A task waiting for a person must be recognizable without expanding tools or switching tabs.
3. **Saved means acknowledged.** Confidence comes from receipts and revision identity, not optimistic wording.
4. **Activity tells the truth.** Describe executor evidence; never invent percent complete, a finish time or a failure because a timer elapsed.
5. **Reading position belongs to the reader.** Selection, keyboard reading and manual scroll override automatic following. Opening work has a predictable way back.
6. **Power is specific and visible.** Choosing an account, answering a question and approving an effect are different actions, because their consequences differ.
7. **Keep the familiar parts.** Preserve blah.chat's palette, type, branches and multi-model work. Borrow Notto's hierarchy and state lessons, not its application or brand.

## Key moments

| Moment | Intended experience | Interaction that carries it |
|---|---|---|
| First open / empty conversation | Ready to ask, not asked to configure an agent dashboard | Focusable composer, familiar model picker and a short useful invitation. No empty Activity rail or mandatory artifact mode. |
| Send | Clear distinction between draft and saved request | Immediate local acknowledgement, then durable ID reconciliation; rejected sends retain a retryable unsent draft. |
| Waiting on work | The agent has a legible job, without pretending to know when it ends | One event-backed sentence, optional elapsed duration, quiet Activity disclosure and Stop task. No fake skeleton report. |
| Waiting on the person | The next choice is obvious and bounded | Inline authored card with context, real controls and explicit submit; no automatic focus theft. |
| Artifact ready | A useful answer has become something to work with | Card and workspace share title/revision marker; last committed content stays visible during an update. |
| Saved revision | Confidence that the work survived | "Saved · v3" only after commit, with Versions available. No celebratory animation over reading text. |
| Conflict / failure | Work is still recoverable where persistence confirms it | Keep local edit and server version, show a diff/review path; isolate failed preview from saved source. |
| Denial / expiry / stop | The boundary was respected | Stable receipt with reason, no continued spinner and no suggestion that a sent effect was undone. |

## Visual language

Tokens below are a concrete comp contract, not changes already applied. Baseline values come from [globals.css](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/src/app/globals.css#L53-L239) and [font loading](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/src/app/layout.tsx#L18-L34). Retain both themes. Validate actual combinations before treating them as accessible; source comments are not contrast measurements (S6).

### Type and geometry

| Token / role | Proposed value | Reason |
|---|---|---|
| `font.body`, `font.heading` | Existing Manrope, system sans fallback | Continuity and readable answers; no new display font. Syne is loaded today but is not required by this proposal. |
| `font.code`, `font.identifier` | Existing JetBrains Mono, monospace fallback | Exact source, revision metadata and aligned numbers. Ordinary status sentences remain Manrope. |
| `type.caption` | 12px / 18px, weight 500 | Short optional metadata only; never the sole statement of a blocking question. |
| `type.control` | 14px / 20px, weight 500 or 600 | Desktop controls and card labels. |
| `type.body` | 16px / 26px, weight 400 | Prose and mobile inputs; respect existing user text scaling. |
| `type.card-title` | 18px / 26px, weight 600 | Artifact and question titles without oversized dashboard headings. |
| `type.workspace-title` | 24px / 30px, weight 600 | Management/workspace heading; not repeated on every message. |
| `type.code` | 14px / 22px, weight 400 | Readable source with raw-copy fidelity and contained overflow. |
| `space` | 4, 8, 12, 16, 24, 32, 48px | Card padding 16px narrow / 24px wide; clear groups rather than many borders. |
| `reading.measure` | Target 68ch; respect existing width preferences | Readable prose; tables/code may use the available inset width. |
| `navigation.width` | 248px in wide comps | Quiet navigation; collapse before it compromises reading. |
| `radius` | Existing 8px base; 12px output shell | Retain family resemblance rather than rounding every element into pills. |
| `target` | 44px minimum product target, 48px mobile primary controls | Comfortable touch and focus; not a claim that WCAG requires 44px everywhere. |

### Colour and material

| Role | Obsidian Void dark | Stardust light |
|---|---|---|
| Canvas | `oklch(20% 0.03 285)` | `oklch(94% 0.01 80)` |
| Navigation | `oklch(18% 0.035 285)` | `oklch(93% 0.01 80)` |
| Reading / raised material | `oklch(25% 0.04 285)` opaque proposal | `oklch(99% 0.005 80)` opaque proposal |
| Main text | `oklch(98% 0.01 285)` | `oklch(20% 0.02 80)` |
| Secondary text | `oklch(75% 0.02 285)` | `oklch(40% 0.04 80)` |
| Primary action | Rose `oklch(90% 0.03 25)` / ink `oklch(14% 0.02 285)` | Amber `oklch(60% 0.16 70)`; foreground chosen after contrast check |
| Focus, proposed opaque repair | `oklch(90% 0.03 25)` | `oklch(45% 0.12 70)` |
| Waiting, proposed text/icon | `oklch(80% 0.10 85)` | `oklch(40% 0.10 70)` |
| Confirmed success, proposed text/icon | `oklch(78% 0.10 150)` | `oklch(38% 0.10 150)` |
| Failure / danger | Existing `oklch(62% 0.22 25)` | Existing `oklch(60% 0.2 25)` |

Use colour with a word and glyph, never as the only state cue. Rose is an action/selection accent, not a success code. Waiting amber is not an error. Preserve high-contrast and forced-colors preferences. Consume complete colour tokens as `var(--ring)`, never `hsl(var(--ring))`; the latter is invalid with the existing OKLCH values.

Keep the existing mesh/grain in the shell, below reading content. Reading cards are opaque; no repeated backdrop blur or glowing outlines. Use a 1px separator only where it explains grouping. Reserve a soft `0 8px 24px oklch(5% 0.05 285 / 0.18)` shadow for floating menus, not every message. Icons come from the existing set, normally 16–20px, with visible text on consequential actions and accessible names on icon-only controls. Code, Monaco and diagrams must follow the same light/dark family instead of unrelated fixed editor themes.

## Motion

| Change | Duration and easing proposal | Reduced-motion version |
|---|---|---|
| Hover, focus-adjacent state, acknowledged save | 120ms `cubic-bezier(0.2, 0, 0, 1)` colour/opacity | Immediate state change; focus always immediate. |
| Open output pane or full-screen output | 180ms `cubic-bezier(0.2, 0, 0, 1)`, opacity plus at most 4px translation | Immediate replacement with the same focus/Back contract. |
| New committed revision / status replacement | 150ms opacity only, reserved label width | Immediate label replacement. |
| Disclosure in measured history | Immediate layout; optional 120ms icon rotation | Immediate; no animated row height in either mode. |
| Follow latest / restore anchor | Only the current scroll owner's bounded movement; no competing animations | Instant positioning, never forced smooth scroll. |

Motion explains a real change. Do not animate every streamed word, slide a question under the reader's pointer, loop a human-wait spinner or delay final text to finish an effect. Reduced motion bypasses reveal buffering. A completed stream flushes immediately under every preference ([11](11-rendering-and-narration.md); D-023; S6/S16).

## Hierarchy and restraint

| Main screen | Primary | Secondary / on demand | Deliberately absent |
|---|---|---|---|
| Conversation | Current answer/artifact and any pending Question/Approval | Composer; compact model/branch identity; sources and Activity disclosure; detailed usage/actions on focus/touch | Mandatory plan rail, empty logs, repeated glowing bubbles, raw JSON above the answer |
| Artifact workspace | Pinned revision's content | Preview/Source, revision/saved state, Versions, Export and Back/Close | Automatic latest-version substitution; execution controls for static HTML; duplicated full transcript |
| Human decision | Question or exact effect, necessary context, native inputs and explicit action | Supporting details/diff, expiry if real, Stop task | Consent buried in options; generic "Continue" for sends; raw tool schema |
| Skills / Connections / Schedules | Named object, current version/state and next deliberate action | Validation, scopes, occurrence preview, historical receipts | Automatically active drafts, decorative scorecards and activity feeds without a task |
| Computer | Restricted observed output and clearly granted controls | Current task, session state, Stop task and evidence | Implicit credentials/control, public screenshot links or treating a viewer as authorization |

Restraint never hides a failure, missing answer or uncertain effect. Lower the weight of routine metadata instead of shrinking important text or lowering it below usable contrast.

## Taste references

- The repository's [design philosophy](../../AGENTS.md#design-philosophy) names Rose Pine, Tokyo Night and Vesper as editor-theme inspiration. That is inherited guidance, not a claim that BK supplied a new admiration list. Take coherent indigo materials, readable code and restrained accent use. Do not import three palettes, terminal density or ornamental editor chrome.
- The existing Obsidian Void/Stardust themes and Manrope/JetBrains pairing are the closest reference. Preserve their identity while resolving inconsistent font/colour/editor tokens. [Current identity evidence](../../research_notes/blah-chat-modernization-review/frontend.md#existing-visual-identity-and-grounded-opportunities).
- BK explicitly pointed to Notto's newer agent. Its useful lessons are answer-first hierarchy, real elapsed work, remount-safe disclosure and authored decisions. Its pinned source does not prove durable answer acknowledgement; its private packages have no identified copying grant. Take the behavior, not Roboto, finance language, transport or theme (D-011; Q21). [Pinned reuse audit](../../research_notes/blah-chat-agent-experience/notto-reuse.md).
- AI Elements and assistant-ui provide implementation references for composed controls and typed interaction distinctions. They are not asserted personal taste references and do not justify replacing the existing runtime. [Rendering prior art](../../research_notes/blah-chat-modernization-review/rendering-prior-art.md#which-public-patterns-are-worth-reusing-without-replacing-the-ui).

## Screens

### Conversation and visual answer

```text
┌ Conversations ──────┬ Request retries ──────────────────┬ Request path · v2 ───────┐
│ New conversation    │ Model · selected branch          │ [Preview] [Source]      │
│                     │                                  │ Versions  Export  Close │
│ Request retries     │ The retry boundary is here.      │                         │
│ Project notes       │                                  │  request → check → save │
│                     │ ┌ HTML · Request path · v2 ────┐ │              ↘ retry    │
│ Skills              │ │ Static visual        Open │ │                         │
│ Connections         │ └────────────────────────────┘ │ Text explanation        │
│ Schedules           │ Sources 2   Activity · 3 steps ▸ │ available               │
│                     │                                  │                         │
│                     │ [Ask a follow-up…              ] │ Saved · v2              │
│                     │ Model / attachments       Send  │ From this answer        │
└─────────────────────┴──────────────────────────────────┴─────────────────────────┘
```

The eye lands on the explanation and visual. The shared title/revision marker makes their relationship clear without a decorative connecting animation. Activity is still available after completion. A normal short answer simply has no output pane; the layout must not reserve an empty dashboard column.

### Question, then separate approval

```text
┌ Your answer needed ────────────────────────────────────────┐
│ Which retry behavior should the visual show?               │
│ ○ Retry once              ○ Exponential backoff            │
│ Additional details [                                    ] │
│ [Stop task]                              [Use answer]      │
└───────────────────────────────────────────────────────────┘

┌ Approval required · Send email ────────────────────────────┐
│ Account: selected account    To: reviewed recipient        │
│ Subject + body preview · attachment + exact revision       │
│ Delivery cannot be undone here.          Review full draft │
│ [Don't send]                              [Send once]      │
└───────────────────────────────────────────────────────────┘
```

These are alternative task moments, not a default stack of cards. The question feels easy to answer. Approval feels specific enough to decide. Neither can disappear when Activity folds. A submitted answer becomes a durable receipt; acknowledgement failure leaves the form and its text available.

### Narrow screen and return

```text
Conversation                         Artifact, full screen
┌ Menu  Request retries ──────┐      ┌ Back  Request path · v2 ──┐
│ Explanation                 │ Open │ [Preview] [Source]       │
│ [Request path · v2    Open] ├─────→│ Versions       Export    │
│ Activity · 3 steps       ▸ │      │                          │
│                            │      │ Static visual / text     │
│ Your answer needed         │      │                          │
│ ○ Retry once               │←─────┤ Saved · v2               │
│ ○ Exponential backoff      │ Back └──────────────────────────┘
│ [Use answer]               │
│ [Ask a follow-up…    Send] │
└────────────────────────────┘
```

The output gets a whole readable screen instead of a tiny desktop pane. Back returns to the card and reading anchor even after rotation or lazy content resize. Question controls stack vertically and remain above safe-area/keyboard obstructions; actual device verification is required, not inferred from `100dvh`.

### Management and computer destinations

```text
Skills / Connections / Schedules             Computer
┌ Back   Selected object ────────────┐       ┌ Back   Computer · observed state ┐
│ Name · version/state              │       │ Current task          Stop task │
│ Main content / review / scopes    │       │                                 │
│ or next five occurrences + zone   │       │ Restricted observation          │
│                                  │       │                                 │
│ Validation / history          ▸  │       │ Controls only if authorized     │
│ [Cancel] [Publish / Connect / Arm]│       │ Last observed at …              │
└──────────────────────────────────┘       └─────────────────────────────────┘
```

Each management screen has one object's next action, not a new visual vocabulary. The final action label depends on the object; validation is not publication and a schedule draft is not active. Computer shows observed state honestly and preserves the distinction between looking and acting.

## The design gate

Before central UI implementation, show BK seeded desktop and 360px comps or a prototype for this one concept and resolve Q2. Include plain answer, code, visual ready/updating/failed, unsaved/conflicting edit, question single/multiple/text/error/expired, approval pending/denied/approved-not-started, stopped task and uncertain effect. Comp approval does not approve scripts or external actions (Q5/Q23).

For each user-facing rung:

1. Compare screenshots in both themes, narrow and wide widths, 200% text/zoom and long labels against this chapter. Confirm that answer/artifact wins and the required action is unmistakable. Check actual contrast, focus, forced colors and reduced motion, not only token declarations.
2. Use the key moments. Keyboard-only compose/send/stop, question submission, approval review, source opening, code controls, output Back and conflict recovery must work without focus loss. Check touch and actual assistive-technology announcement behavior; source inspection does not establish conformance.
3. Walk every affected journey across its hand-offs, including refresh, another client, virtual-row remount and an acknowledgement failure. A locally polished card fails if the task cannot continue or mobile cannot return to its origin.
4. Verify S6/S8/S9/S15 as applicable. Use S16's measured fixture baseline before making speed, memory or reveal-lag claims. Targets require approval after measurement; no invented latency result belongs in acceptance evidence.

A rung is not visually done merely because its buttons exist. If finding the answer requires inspecting Activity, or a missing human answer is hidden there, the design fails (D-023, D-025, D-030, D-033).
