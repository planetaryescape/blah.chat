# Artifacts, questions, approvals and agent activity

Research and external-source access date: **2026-11-03**. Static checkout inspected at `04866f80a6236716ebf8d8c5a79001727f85f4bf`. No tracked modifications were present before this research. Only this note is written. No app edits, installs, builds, tests, browser sessions, production inspection, commits or paid calls. Proposed schemas, wireframes and fixtures are specifications, not implemented or verified behavior.

## 1. What exists in source, and which missing connections explain BK's experience?

### Takeaway

BK's requested artifact experience is missing. The repository has a code/prose document editor and tool-renderer components, but broken data contracts, mode gating and absent HTML previews prevent calling that a working general artifact product. Structured questions likewise have display code, not a durable question-and-answer workflow. [Artifact consumer](../../apps/web/src/components/chat/ArtifactList.tsx#L18-L59), [tool gating](../../packages/backend/convex/generation/tools.ts#L196-L217), [canvas](../../apps/web/src/components/canvas/CanvasPanel.tsx#L74-L111), [clarification tool](../../packages/backend/convex/ai/tools/askForClarification.ts#L23-L41).

### Cited findings

#### Scope and prior notes

- Read [frontend](../blah-chat-modernization-review/frontend.md), [generation](../blah-chat-modernization-review/generation.md), [rendering prior art](../blah-chat-modernization-review/rendering-prior-art.md) and [agent prior art](../blah-chat-modernization-review/agent-prior-art.md), then traced the relevant source. Their component inventories describe available code, not observed deployment or successful end-to-end artifact use. Their artifact-shape and tool-output findings are confirmed below. The current source remains the authority. [Actual consumer](../../apps/web/src/components/chat/ArtifactList.tsx#L26-L54), [actual wrapper](../../packages/backend/convex/generation/tools.ts#L336-L354).
- Preserve the existing server-owned generation rule. Generation persists partial text/tool records for subscriptions; the page must not become the owner of execution merely to adopt attractive cards. The message status union currently has only pending, generating, complete, stopped and error. [Project rule](../../AGENTS.md#L21-L26), [generation stream](../../packages/backend/convex/generation.ts#L794-L1033), [status schema](../../packages/backend/convex/schema.ts#L222-L238).

#### Actual artifact path

| Connection | Inspected source behavior | Missing capability or repair |
| --- | --- | --- |
| Definition and persistence | Production `schema.ts` defines `canvasDocuments` with user/conversation IDs, title, content, optional language, code/prose kind, numeric version, active/archived status and timestamps. `canvasHistory` stores content snapshots, version and created/user-edit/LLM-diff source. A separate schema module repeats this shape. [Production schema](../../packages/backend/convex/schema.ts#L1577-L1609), [module](../../packages/backend/convex/schema/canvas.ts). | No typed HTML/diagram/image manifest, generating/partial/error lifecycle, source-message association, attempt/tool provenance, capabilities or content hash. Do not add fields only to the unused-for-this-definition module and assume production schema changed. |
| Creation intent | `createDocument` tells the model to use Canvas for substantial writing/code and iterative content, but not explanations, quick answers or one-off content. It accepts full initial content and only code/prose. [Tool](../../packages/backend/convex/ai/tools/createDocument.ts#L18-L45). | This is narrower than BK's visual-answer requirement. A visual explanation may be useful even when there is nothing to edit. Length and editability must not be the sole triggers. |
| Availability | `enterDocumentMode` is available outside incognito, while create/read/update tools are supplied only if the conversation snapshot is already in document mode. Generation builds this tool record once before `streamText`; no `prepareStep` rebuilding appears in this path. Entering the mode changes persisted conversation state but does not add tools to that already-built record. [Builder](../../packages/backend/convex/generation/tools.ts#L175-L217), [mode mutation tool](../../packages/backend/convex/ai/tools/documentMode.ts#L25-L42), [build point](../../packages/backend/convex/generation.ts#L665-L685). | A normal turn cannot reliably enter mode and create an artifact using this fixed record in the same invocation. Expose safe artifact creation directly to eligible models, independently of an editor layout mode. Retain incognito policy. |
| Create commit | Tool calls `createInternal`, which inserts document plus initial history in a mutation and returns the ID. Tool output includes success, ID, title, kind, language and counts. [Create tool](../../packages/backend/convex/ai/tools/createDocument.ts#L47-L75), [internal mutation](../../packages/backend/convex/canvas/documents.ts#L216-L252). | Useful durable storage to adapt, but creation has no stable operation key, creating-message ID or incremental draft. A failure after commit can leave an existing document without its successful tool-result association. |
| Read/update target | Read/update find the first active document by user/conversation. Public auto-sync instead sorts active documents by `updatedAt` descending. Multiple active documents are explicitly allowed. Update tool has no document ID or expected version. [Internal lookup](../../packages/backend/convex/canvas/documents.ts#L199-L213), [public lookup](../../packages/backend/convex/canvas/documents.ts#L15-L35), [update tool](../../packages/backend/convex/ai/tools/updateDocument.ts#L57-L104). | A later turn can update a different document from the one visible. Require explicit artifact ID and base revision. No “active document” inference for writes. |
| Update concurrency | `applyDiff` validates against current stored content and increments version, but accepts no expected version. Public editor writes replace content and also increment version without compare-and-swap. Some diff operations can succeed while others fail. [Diff mutation](../../packages/backend/convex/canvas/documents.ts#L304-L365), [public update](../../packages/backend/convex/canvas/documents.ts#L111-L148). | Stored history is valuable, but it does not itself prevent lost updates. Base-version conflict detection and explicit partial-apply policy are missing. |
| Model-facing output versus native output | `buildToolsAsync` wraps every executable result in `<tool-data ...>` text. The renderer adapter stringifies the persisted result, then tool renderers JSON-parse it once. The result remains a string rather than the expected object. [Wrapper](../../packages/backend/convex/generation/tools.ts#L304-L306), [implementation](../../packages/backend/convex/generation/tools.ts#L336-L354), [UI adapter](../../apps/web/src/components/chat/ChatMessage.tsx#L239-L250). | Preserve native typed JSON in storage and UI; apply model-facing data formatting only at the provider conversion boundary. Otherwise both document and clarification fields disappear even after fixing the card extractor. |
| Artifact card extraction | `ArtifactList` reads raw cached rows but filters `tc.name`, parses string `result`, and reads `tc.arguments`/`tc.id`. Actual rows use `toolName`, native `args`/`result`, and `toolCallId`. [Consumer](../../apps/web/src/components/chat/ArtifactList.tsx#L18-L55), [schema](../../packages/backend/convex/schema.ts#L453-L469), [working adapter elsewhere](../../apps/web/src/components/chat/ChatMessage.tsx#L239-L250). | Definite static contract mismatch. Current rows fail its name filter. Fix this before claiming cards work. Eventually query explicit message-artifact references instead of reconstructing a product record from tool output. |
| Display and editing | Cards are mounted under assistant answer content. Canvas opens a lazy Monaco code/Markdown editor, debounces saves by 500ms and exposes version history/conflict UI. The inspected panel has no live HTML iframe or document preview mode. [Mount](../../apps/web/src/components/chat/ChatMessage.tsx#L453-L456), [panel](../../apps/web/src/components/canvas/CanvasPanel.tsx), [editor](../../apps/web/src/components/canvas/CanvasEditor.tsx#L44-L115). | An HTML code file is not an HTML artifact preview. Need a typed preview dispatcher plus separate source view. UI components and comments alone do not establish shipped behavior. |
| Mobile and discovery | Route only mounts Canvas when `documentId && !isMobile`. Auto-sync respects manually closing the panel until navigation. [Mobile exclusion](../../apps/web/src/app/%28main%29/chat/%5BconversationId%5D/page.tsx#L710-L720), [auto-sync](../../apps/web/src/hooks/useCanvasAutoSync.ts#L35-L70). | Provide a full-screen mobile destination. Keep the manual-close preference; do not reopen previews for every streamed update. |
| Export | Existing toolbar downloads a text/plain Blob with title-derived filename and language-derived extension, and copies document content. [Toolbar](../../apps/web/src/components/canvas/CanvasToolbar.tsx#L68-L87). | Raw download already exists in code; version-pinned, safe-filename exports and an explicit active-content warning are new requirements. Export must not imply that downloaded HTML/code is safe to execute. |
| Authorization | `get`, history/version reads, public updates and archive check document owner. Public create authenticates a user but does not check access to its supplied conversation ID before inserting. Trusted internal create accepts explicit user/conversation IDs without its own membership check. Tool-call reads separately use conversation access checks. [Document APIs](../../packages/backend/convex/canvas/documents.ts#L55-L147), [history](../../packages/backend/convex/canvas/history.ts), [internal create](../../packages/backend/convex/canvas/documents.ts#L216-L240), [tool read authorization](../../packages/backend/convex/messages/toolCalls.ts#L157-L171). | Public create can associate a new owned document with a supplied conversation ID without verifying membership. This is not proof of reading that conversation. Repair the missing check and define collaborator policy explicitly; current owner-only document reads do not match shared-conversation expectations. |
| Retention | Conversation cascade code includes canvas documents/history and has a corresponding fixture. [Cascade](../../packages/backend/convex/lib/utils/cascade.ts#L262-L324), [test](../../packages/backend/convex/__tests__/cascade.test.ts#L484-L523). | Extend existing cleanup for manifests, revisions, message references, blobs, waiting interactions and events. Do not call all cleanup absent. |

#### Actual interaction and activity path

- `askForClarification` accepts question, context and at most four string options, then immediately returns `{success:true, clarification:...}`. It has no action context, actor binding, answer schema, pending interaction ID, pause or resume operation. Its comment saying “pause” is not a durable execution guarantee. [Tool source](../../packages/backend/convex/ai/tools/askForClarification.ts#L13-L41).
- Its registered renderer displays amber copy and option `<span>` elements with “Reply below to answer...”. No buttons, controlled selection or submission exists there. `ToolCallDisplay` starts collapsed, including individual calls. `InlineToolCallContent` suppresses detailed tool renderers while streaming. Together these are the wrong hierarchy for a blocking question, even after the tool-output bug is fixed. [Renderer](../../apps/web/src/components/chat/toolRenderers/AskForClarificationRenderer.tsx#L12-L47), [registry](../../apps/web/src/components/chat/toolRenderers/index.ts#L76-L77), [collapsed state](../../apps/web/src/components/chat/ToolCallDisplay.tsx#L24-L45), [streaming exclusion](../../apps/web/src/components/chat/InlineToolCallContent.tsx#L178-L185).
- `resolveConflict`'s `ask_user` path also returns explanatory output and suggested strings. It does not create a generic pending human decision. The separate canvas conflict dialog is an editing feature, not evidence of server-enforced tool approval. [Conflict tool](../../packages/backend/convex/ai/tools/resolveConflict.ts#L48-L82), [dialog consumer](../../apps/web/src/components/canvas/CanvasPanel.tsx#L121-L133).
- Persisted tool records provide provider tool-call ID, args/result, timestamp, text position and an `isPartial` flag. They have no run/attempt ID, approval or per-execution state. The UI derives executing/complete/error, including a client-clock rule that turns a result-less call older than 30 seconds into error. [Schema](../../packages/backend/convex/schema.ts#L453-L469), [derived state](../../apps/web/src/components/chat/toolRenderers/types.ts#L21-L37).
- `StatusTimeline` merges calls by ID and hides 800ms after generation stops. It considers all tools complete when each has any result, then can append “Complete” whenever generation is no longer active, without a stopped/error reason prop. It uses a polite live log, but the transcript and other announcers also announce. These are source-level truthfulness/accessibility risks, not measured incident counts. [Timeline](../../apps/web/src/components/chat/StatusTimeline.tsx#L41-L134), [existing announcement findings](../blah-chat-modernization-review/frontend.md#L74).
- Tool upsert/finalize has no run-ownership or terminal-state check. Cleanup deletes every partial tool row; finalization is global per message. A completed side effect can therefore lose its evidence when later generation fails while rows are still partial. [Mutations](../../packages/backend/convex/messages/toolCalls.ts#L45-L125), [generation error cleanup](../../packages/backend/convex/generation.ts#L1575-L1596).

### Inferences

These are implementation recommendations grounded in the paths above.

1. Repair native result preservation and the typed artifact adapter first. The presence of `ArtifactCard`, `AskForClarificationRenderer` or a marketing mention of artifacts must not be used to rebut BK's missing-experience report.
2. Decouple “make a useful artifact” from “switch the conversation into document mode”. Keep the editor as one artifact view. Add a stable durable resource and message association rather than extending tool-result guessing indefinitely.
3. A question needs a run state transition and a server-authorized answer command. A richer-looking renderer cannot safely park the current in-memory tool loop or make browser callback promises survive refresh.
4. Progress must report executor evidence. A client timeout may display “No update for 30 seconds”, not declare a tool failed. A returned question is “Waiting for your answer”, not a successful completed tool.

### Gaps

- No production artifact usage, feature flag, screenshot, runtime reproduction or deployed schema was inspected. The findings establish missing/mismatched source connections, not that every account has exactly the same UI.
- No full collaboration/export/cache audit was performed. Choose whether collaborators may view, edit or answer on behalf of an initiating user before implementing those permissions. Owner-only is the safest initial write/approval policy.
- Native/mobile apps need their own adapter and preview policy. The web route's mobile exclusion is confirmed; parity elsewhere is not asserted.

## 2. Which artifact architecture and security model should be adopted?

### Takeaway

Adopt typed, versioned artifact resources and explicit creation intent, while keeping Convex authoritative. Ship useful static HTML/CSS visuals early, with scripts disabled and a tested no-external-request policy. General JavaScript previews need a separate security gate; an iframe sandbox plus `connect-src 'none'` is not a universal network firewall. [HTML standard](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox), [CSP specification](https://w3c.github.io/webappsec-csp/#meta-element), [connect-src scope](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src).

### Cited findings

#### Maintained implementation references and copying terms

Snapshots below are exact source revisions also identified in the existing prior-art notes, fetched again for this assignment. They demonstrate implementation patterns, not passing security or accessibility audits. Do not copy floating documentation examples as a compatibility guarantee for locally locked AI SDK 6.0.89. [Local SDK evidence](../blah-chat-modernization-review/generation.md#L60).

| Reference | Verified mechanism worth borrowing | Boundary and license if copying |
| --- | --- | --- |
| AI Elements, `ca8be600bfd01b3131f9bf6134b51602a71f4374` | `Artifact` is a composable header/content/actions shell, not a sandbox, storage engine or creation policy. `Tool` has pending/running/approval/denied/error/result badges. `Confirmation` separates request, accepted and rejected rendering. [Artifact source](https://github.com/vercel/ai-elements/blob/ca8be600bfd01b3131f9bf6134b51602a71f4374/packages/elements/src/artifact.tsx), [tool](https://github.com/vercel/ai-elements/blob/ca8be600bfd01b3131f9bf6134b51602a71f4374/packages/elements/src/tool.tsx), [confirmation](https://github.com/vercel/ai-elements/blob/ca8be600bfd01b3131f9bf6134b51602a71f4374/packages/elements/src/confirmation.tsx). | Reuse composition/state labels, not its transport or default look. Official confirmation page includes an example with `parameters`/`requireApproval`; do not treat that example as the installed SDK API. Apache-2.0. [Docs](https://elements.ai-sdk.dev/components/confirmation), [license](https://github.com/vercel/ai-elements/blob/ca8be600bfd01b3131f9bf6134b51602a71f4374/LICENSE). |
| Vercel Chatbot, `8603c8ea35ded822811d3201812e717b22edbbab` | Create tool allocates stable document ID, dispatches by kind, emits kind/ID/title/deltas/finish, and returns a compact document reference. Update names a document ID and checks owner. Handler saves a document after generation. [Create](https://github.com/vercel/chatbot/blob/8603c8ea35ded822811d3201812e717b22edbbab/lib/ai/tools/create-document.ts), [update](https://github.com/vercel/chatbot/blob/8603c8ea35ded822811d3201812e717b22edbbab/lib/ai/tools/update-document.ts), [handler](https://github.com/vercel/chatbot/blob/8603c8ea35ded822811d3201812e717b22edbbab/lib/artifacts/server.ts). | Borrow stable references and kind handlers, but persist drafts before broadcasting, rather than relying on its transient events and final save. Its prompt excludes explanations from artifacts, which conflicts with BK's visual-answer request and should not be copied. Apache-2.0. [Prompt](https://github.com/vercel/chatbot/blob/8603c8ea35ded822811d3201812e717b22edbbab/lib/ai/prompts.ts), [license](https://github.com/vercel/chatbot/blob/8603c8ea35ded822811d3201812e717b22edbbab/LICENSE). |
| assistant-ui, `a96e62f89da310602b716821dd91b9525f94cbb5` | Tool UI distinguishes render-only backend tools, human tools with `addResult`, runtime approval callbacks, readonly capability and standalone display outside collapsed tool groups. Generative UI uses a declared component vocabulary and typed props, rather than arbitrary code for every form. [Tool UI](https://github.com/assistant-ui/assistant-ui/blob/a96e62f89da310602b716821dd91b9525f94cbb5/apps/docs/content/docs/tools/tool-ui.mdx), [generative UI](https://github.com/assistant-ui/assistant-ui/blob/a96e62f89da310602b716821dd91b9525f94cbb5/apps/docs/content/docs/tools/generative-ui.mdx). | Use authored question/approval components first, potentially allowlisted declarative visuals later. Frontend `human()` promises and best-effort interaction recording are not this app's durable server protocol. MIT. [License](https://github.com/assistant-ui/assistant-ui/blob/a96e62f89da310602b716821dd91b9525f94cbb5/LICENSE). |
| assistant-ui Safe Content Frame | Per-render hashed domains under a public-suffix-backed domain, a separate shim, parent-origin checks and MessageChannel communication. Documentation explicitly says network access is not restricted, and warns against self-hosting without equivalent public-suffix properties. [Design and limits](https://github.com/assistant-ui/assistant-ui/blob/a96e62f89da310602b716821dd91b9525f94cbb5/apps/docs/content/docs-sites/safe-content-frame/how-it-works.mdx). | Useful isolation design, not a drop-in offline/secret-safe preview. Do not send private content to a third-party hosted shim without reviewing its delivery, retention and threat model. MIT repository license above, verify package-specific notices before copying. |
| Hugging Face Chat UI, `70f00f5ecc64e6048a77b093020a47c62170fbd8` | Preview builder deliberately omits `allow-same-origin`, popups, downloads and modals, uses per-preview message channels, caps error signatures/repeats and distinguishes relative links from absolute external URLs. [Builder](https://github.com/huggingface/chat-ui/blob/70f00f5ecc64e6048a77b093020a47c62170fbd8/src/lib/utils/previewSrcdoc.ts), [host](https://github.com/huggingface/chat-ui/blob/70f00f5ecc64e6048a77b093020a47c62170fbd8/src/lib/components/chat/ArtifactPanel.svelte). | Borrow bounded diagnostics/channel validation, not its `allow-forms`, device permissions, CDN React/Babel/Tailwind or broad executable preview policy. Those do not satisfy network-disabled requirements. Apache-2.0. [License](https://github.com/huggingface/chat-ui/blob/70f00f5ecc64e6048a77b093020a47c62170fbd8/LICENSE). |
| LibreChat, `f4154b649efa37e1345ccc517a4d8d1ed2178c82` | Resume controller checks original owner/tenant/agent/endpoint/generation identity, consumes a pending action with a single-winner claim, persists re-pause progress and accumulates artifacts across pause segments. It distinguishes successful finalization from partial step-limit outcomes. [Resume source](https://github.com/danny-avila/LibreChat/blob/f4154b649efa37e1345ccc517a4d8d1ed2178c82/api/server/controllers/agents/resume.js). | Borrow contracts and adversarial cases, not a Mongo/Redis controller or its complete application architecture. MIT. [License](https://github.com/danny-avila/LibreChat/blob/f4154b649efa37e1345ccc517a4d8d1ed2178c82/LICENSE). |

No external source code is copied into this proposal. If later copying, retain MIT copyright/permission notices or applicable Apache license/NOTICE material, mark modifications where required, and check file/package-specific exceptions.

#### Official isolation facts that constrain the design

- `srcdoc` parses arbitrary HTML and is an injection sink. It does not sanitize the supplied document. Unsandboxed srcdoc is same-origin with the parent; its relative URLs resolve against the embedding page's URL. [MDN srcdoc](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc), [MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).
- The HTML standard says `sandbox` without `allow-same-origin` forces a unique opaque origin. `allow-scripts` plus `allow-same-origin` on same-origin content permits removing the sandbox and reloading out of it. Potentially hostile files should be served from a separate dedicated domain to limit direct-navigation attacks. Sandbox changes do not retroactively change an already-loaded document. [WHATWG sandbox and examples](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox).
- A meta CSP is supported but does not cover preceding resources. It cannot supply `sandbox`, `frame-ancestors`, report-only policy or `report-uri`; changing its content later is ignored. Additional policies restrict rather than relax existing policies. Therefore a model-written `<meta>` or an experimental iframe `csp` attribute is not a reliable foundation. [Normative CSP meta restrictions](https://w3c.github.io/webappsec-csp/#meta-element), [multiple policies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy#multiple_content_security_policies), [iframe attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#csp).
- `default-src` is a fallback for fetch directives, not a universal navigation policy. `connect-src` governs fetch/XHR/WebSocket/EventSource/beacon/ping. HTML explicitly permits a sandboxed frame to navigate itself. Treat “no script fetch” as narrower than “no egress of any kind”; WebRTC and navigation require separate analysis and tests before claiming a JS frame is offline. [CSP directive taxonomy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy#directives), [connect-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src), [HTML hostile-content example](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox), [WebRTC privacy/security](https://www.w3.org/TR/webrtc/#privacy-and-security-considerations).
- A unique origin does not guarantee separate processes on every device or CPU/memory availability. Safe Content Frame documents platform-specific site-isolation limits and unrestricted network access. An iframe load event is also not proof a preview rendered successfully; browsers fire it even for load failure. [Isolation limitations](https://github.com/assistant-ui/assistant-ui/blob/a96e62f89da310602b716821dd91b9525f94cbb5/apps/docs/content/docs-sites/safe-content-frame/how-it-works.mdx), [MDN load behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#error_and_load_event_behavior).

### Inferences

#### Proposed creation policy and tools

The following is a proposed product contract, not a claim that upstream implements BK's exact requirement.

- The agent may choose an artifact when a spatial explanation, annotated diagram, comparison board, reusable document or small visual interface communicates better than long prose. Examples include a request-flow diagram, CSS-only visual explanation or interactive calculator once scripts are approved. An explicit artifact request always takes precedence, unless unsupported or unsafe.
- Stay in ordinary prose for a direct fact, short answer or snippet. Do not create an artifact solely because a character/line threshold is crossed. Do not ask permission merely to create a nonexecuting private artifact. Ask only for genuinely missing material information, costly work or capabilities requiring consent.
- An artifact is the answer, not a decorative extra. Chat supplies a short explanation and an artifact card; do not duplicate the whole artifact in the transcript. For unavailable previews provide source, textual summary and export without losing the answer.
- Add typed `createArtifact`, `updateArtifact`, `getArtifact` tools to the normal eligible tool set. Inputs name kind, title, content/asset references and a concise display-purpose field. That field is public task intent, not hidden chain-of-thought. Never accept owner/run/message identity from model arguments. Trusted factory context binds them.
- `updateArtifact` must name `artifactId`, `baseRevisionId` and a bounded replacement or patch. An immutable revision is committed only if the base still matches. Conflicts return current revision and an actionable choice, never force-replace user edits automatically.
- Treat generated metadata and fetched source content as untrusted. The server validates media/kind, sizes, referenced assets and authorization. Model-provided capability requests are requests, never grants. Creating HTML must not authorize script execution, publication, network access or tool calls.

#### Durable manifest and revision contract

Extend/migrate the existing document/history storage rather than silently creating two document owners. These are logical records, not mandatory table names. Follow existing normalized junction conventions.

```ts
Artifact = {
  schemaVersion: 1,
  artifactId, ownerUserId, conversationId,
  title,
  kind: 'document' | 'code' | 'html' | 'diagram' | 'image',
  currentRevisionId,
  status: 'creating' | 'ready' | 'partial' | 'failed' | 'cancelled' | 'archived',
  requestedCapabilities, effectivePolicyId,
  createdAt, updatedAt
}
ArtifactRevision = {
  revisionId, artifactId, parentRevisionId,
  ordinal, baseRevisionId, operationId,
  author: { type: 'user' | 'agent', userId, runId?, attemptId?, toolRunId? },
  sourceMessageId?,
  format, language?, mediaType,
  contentRef, contentHash, byteLength,
  assetManifest, // owned immutable assets, MIME, hash, size, alt text
  status: 'draft' | 'committed' | 'partial' | 'failed' | 'cancelled',
  createdAt, committedAt?
}
MessageArtifact = { messageId, artifactId, revisionId, relation, order }
ArtifactSource = { revisionId, sourceRecordId, locator?, attribution? }
```

- Use `MessageArtifact` to pin what each answer actually created or referenced. Opening historical v1 should not silently show v8. Offer an explicit “Latest version” action. Source association links to authorized, message-scoped citation/source records; do not infer factual provenance from generated HTML hyperlinks.
- `operationId` deduplicates retries across creation and updates. One operation produces at most one committed revision. Hashes verify content, not ownership. A transaction validates conversation access, admitted run/attempt and source message; then creates the resource/reference or checks the expected revision and commits the next revision.
- Persist bounded draft snapshots/deltas with sequence numbers before subscribers display them. A refresh reloads the current draft. Draft HTML is never incrementally executed. Keep the last committed preview visible while the next revision is being prepared, labelled “Updating”. On stop/error retain a partial/source version with the truthful state, not an empty “ready” card.
- Authorize each get/list/history/update/export/asset URL and each source lookup. Initial policy: initiating owner edits; conversation members may view only where explicitly authorized; public/shared snapshots cannot answer questions, grant permissions or expose private source/asset URLs. Recheck membership when issuing URLs, including revocation.
- Index owner/conversation, message references, artifact/revision ordinal, operation ID and retention expiry. Integrate account-scoped cache reset, API envelopes and SSE/REST projections; UI cards query the manifest rather than depend on SDK result serialization. Retention deletes references/history/blobs according to policy. Incognito must not accidentally gain permanent artifact writes through the new normal-mode tool registration.
- Old document rows can map code/prose to code/document with legacy provenance marked unknown. Backfill only recoverable tool/message associations. Never invent a source message for an old document or retroactively treat a legacy revision as security-reviewed.

#### Incremental format scope

| Phase scope | Render/edit/export behavior | Explicitly excluded |
| --- | --- | --- |
| Document | Sanitized Markdown preview, source/editor, plain-text/Markdown download, pinned revision. Reuse the renderer after cross-length parity repairs identified in prior notes. | MDX evaluation, arbitrary embedded HTML execution, automatic Word/PDF conversion. |
| Code | Existing source editor/highlighter, language/filename, raw copy/download. | Automatic run, package installs, backend execution merely because a code artifact exists. |
| Static HTML/CSS | Isolated visual preview, source, text alternative, static export. CSS charts, layout explainers and diagrams already meet much of BK's requirement without JS. | Scripts, forms, external fonts/assets, links with direct navigation, nested documents, iframes/objects, media and workers. |
| Diagram | First-class diagram source plus explicit strict rendering limits and accessible description. Mermaid source is data; sanitize/isolate resulting SVG. | Arbitrary diagram directives that relax security or automatic trusted SVG execution. |
| Image | Manifest references existing owned image-generation/upload assets; show MIME/size/dimensions, useful alt text and version/source association. | New image-generation spending pathway, uncontrolled remote-image fetch, active SVG treated as a harmless bitmap. |
| Later opt-in interactive HTML | Script capability separately granted, pinned revision, offline runtime policy, stop/reload/error controls and reviewed parent bridge. | Automatic React/Babel/CDN/npm support, app secrets/API access, form submission/publication/download permissions. |

PDF/Word/rasterized exports can follow later via a constrained conversion service. They are not prerequisites for a first useful artifact release.

#### HTML isolation requirements and srcdoc limits

1. **Default static preview.** Render in a frame with `sandbox=""`, a unique opaque origin, a descriptive `title`, `referrerPolicy="no-referrer"`, and explicit denial of camera/microphone/geolocation/clipboard/device permissions. Never use app-origin `dangerouslySetInnerHTML`, React evaluation, `eval`, `new Function`, or an unsandboxed Blob URL to preview generated content.
2. **Preferred production hosting.** Serve a trusted preview shell on a separate registrable domain, not merely a subdomain inheriting app cookies. No Clerk/Convex/session cookies, analytics identifiers or secrets there. Deliver policy in response headers and retain sandbox restrictions on direct navigation. If true per-render real origins are needed later, review public-suffix isolation or an equivalent cookie/storage design; random subdomains alone are not equivalent to separate sites. Keep `allow-same-origin` absent in the first implementation.
3. **Static CSP proposal.** Use an enforced response policy equivalent to the following, with `frame-ancestors` restricted to reviewed app origins and an HTTP `sandbox` directive as defense in depth. Do not apply this text blindly to the parent app, which needs its own resources.

```text
default-src 'none'; script-src 'none'; connect-src 'none';
style-src 'unsafe-inline'; img-src data:;
font-src 'none'; media-src 'none'; object-src 'none';
frame-src 'none'; child-src 'none'; worker-src 'none';
manifest-src 'none'; base-uri 'none'; form-action 'none';
frame-ancestors <reviewed app origins>; sandbox
```

   Inline CSS is deliberately allowed inside the isolated static document, not in app DOM. Only validated, size-bounded raster data images are allowed initially; reject data SVG. Strip external CSS URL functions/imports and all network-bearing markup anyway. Enforce asset byte/dimension limits. External network requests, including relative app paths and redirects, must be absent in interception tests.
4. **If srcdoc is used for the first static implementation.** The trusted application constructs a complete wrapper with the CSP meta before any generated markup. Parse/sanitize a fragment first; remove model-supplied meta/base/link/document wrappers, scripts, forms, navigation attributes, SVG links and refresh directives. A CSP meta is an additional restriction, not a substitute for iframe sandbox. It cannot set `frame-ancestors`, CSP sandbox or report-only policy. No resources may precede it. It inherits parent policies that cannot be loosened. Do not claim separate hosting or direct-navigation protection merely because the URL is `about:srcdoc`.
5. **Navigation is separate from subresource fetch.** Remove href/ping/target/formaction/meta refresh and other outbound navigation paths in the static format. Render links as inert text with optional host-owned “Open source” controls that validate absolute HTTP(S) URLs and require a real user action. No preview-created tabs, downloads, dialogs, top navigation or custom protocols. Do not rely on `default-src` or `connect-src` to block self-navigation.
6. **No privileged parent bridge.** Static preview needs no generated-code bridge. A future script preview can send only bounded ready/error/resize messages through a per-preview MessageChannel or validated `event.source`, channel ID, revision and payload schema. Clamp sizes/rates; ignore old revisions and forged sibling-frame messages. Opaque-origin messages have origin `null`, which is not sufficient authentication. No bridge action may execute tools, read chat, submit answers or grant approval. Never send conversation state, tokens, signed private download URLs, secrets or auth-bearing SDK clients into the frame.
7. **Scripts require explicit capability.** “Create an HTML artifact” does not mean “run JavaScript”. Show a trusted app control “Run this version” after explaining script/network policy. A new content hash invalidates the grant. Use a newly created frame when policy changes; changing sandbox flags on the loaded frame is not an upgrade protocol. Permit only reviewed local runtime/bundle resources, no `unsafe-eval` and no dependency resolution from model strings.
8. **Do not overpromise offline JS.** Strict CSP blocks many fetch channels but is not a universal egress boundary for arbitrary browser JS. Self-navigation and WebRTC are explicit research/test targets. Monkey-patching fetch or browser globals is not a security boundary. Keep arbitrary JS deferred until the team can demonstrate the required network-disabled contract across supported browsers, or choose an independently egress-restricted execution environment that returns inert output. If this cannot be met, ship static HTML and allowlisted declarative interactions rather than quietly weakening the promise.
9. **Availability and error handling.** Bound content bytes, DOM complexity, nested depth and image sizes; keep one active preview frame, unload it when closed and retain source fallback. Runtime errors are “Preview failed”, not “Artifact lost”. A parent heartbeat cannot guarantee recovery from an infinite loop on every device; do not claim iframe sandbox prevents CPU denial of service. A later JS release needs real device tests and a documented residual risk.
10. **Downloads are not trusted execution.** Export the exact pinned revision with safe filenames, MIME and attachment disposition; reject path separators/control characters and deceptive extensions. Provide “Download HTML source” separately from “Download static snapshot”. Never auto-open the file, grant execution because it was downloaded, or remove app isolation when opening a preview in another tab. Explain that raw HTML/SVG/code may execute when opened outside blah.chat. Safe static export should retain scripts-disabled policy and stripping, not be labelled “safe” based only on MIME. No automatic download initiated by generated content.

### Gaps

- No sandbox prototype or attack corpus ran. The example CSP is a starting contract, not a security certification. Header delivery, Trusted Types compatibility, Safari/Firefox behavior, direct navigation and all egress channels remain release gates.
- No secure offline arbitrary-JS library was verified for this stack. Safe Content Frame explicitly permits network; Hugging Face's preview intentionally enables capabilities outside this proposal. Neither should be advertised as meeting the strict network-disabled requirement without further work.
- Separate preview-domain ownership, hosting cost, retention, asset delivery and whether interactive HTML is needed for the first release require product/security decisions. Do not block static visuals on those later capabilities.

## 3. How should durable questions, approvals and progress look and ship?

### Takeaway

Build authored interaction cards over durable server records. Keep clarification, authorization and activity distinct: a question gathers information, approval grants one described capability/effect, and progress reports what actually happened. The active card must stay visible outside collapsed tool details and survive refresh without rerunning earlier effects. [Current collapsed tool behavior](../../apps/web/src/components/chat/ToolCallDisplay.tsx#L24-L45), [assistant-ui standalone/human patterns](https://github.com/assistant-ui/assistant-ui/blob/a96e62f89da310602b716821dd91b9525f94cbb5/apps/docs/content/docs/tools/tool-ui.mdx), [LibreChat resume contract](https://github.com/danny-avila/LibreChat/blob/f4154b649efa37e1345ccc517a4d8d1ed2178c82/api/server/controllers/agents/resume.js).

### Cited findings

- Convex Workflow journals step results and supports event waits without keeping the workflow handler running between steps. Its action retry policy is configurable; mutation exactly-once semantics do not imply an external API effect can never repeat. This is a suitable spike for parking a run, not proof that adding the component makes existing tools resumable. [Official implementation README](https://github.com/get-convex/workflow), [existing generation distinctions](../blah-chat-modernization-review/agent-prior-art.md#L69-L95).
- assistant-ui explicitly distinguishes a human tool with no executor from server-side approval gates. Its UI offers `addResult`, `resume` and `respondToApproval`, while persistence of lasting permission choices belongs to the host. Readonly threads cannot answer. Borrow these distinctions but enforce them server-side in blah.chat. [Tool UI documentation source](https://github.com/assistant-ui/assistant-ui/blob/a96e62f89da310602b716821dd91b9525f94cbb5/apps/docs/content/docs/tools/tool-ui.mdx).
- W3C status-message guidance calls for programmatically identifiable status changes without taking focus or unnecessary interruption, and warns that excessive live regions can become too chatty. A sequential log or status region can announce progress; forms and modal context changes have different focus semantics. [WCAG 4.1.3 understanding](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
- Langfuse has discrete event, agent, tool, generation, retriever and guardrail observation types. Those are tracing concepts, not the application's authoritative state machine. Link them to durable IDs rather than driving UI truth from asynchronous trace ingestion. [Official observation types](https://langfuse.com/docs/observability/features/observation-types.md).
- Existing visual tokens use deep indigo/violet backgrounds and rose-quartz primary, with loaded Manrope, Syne and JetBrains Mono. Existing timeline uses independent blue/green/red classes; its state depends on result presence and client elapsed time. [Theme](../../apps/web/src/app/globals.css#L148-L209), [fonts](../../apps/web/src/app/layout.tsx#L18-L34), [timeline](../../apps/web/src/components/chat/StatusTimeline.tsx#L95-L160), [state inference](../../apps/web/src/components/chat/toolRenderers/types.ts#L24-L37).

### Inferences

All contracts, timing limits and designs below are proposals. They must be reconciled with the coordinator's run/attempt design and the separate Notto research; no Notto reuse assumption is made here.

#### Structured ask-user schema

Define an authored `askUser` tool for clarification, not arbitrary generated form HTML. Persist the validated tool request before showing controls. Example contract:

```ts
AskUserInput = {
  schemaVersion: 1,
  title: string, context?: string,
  questions: Array<{
    id: string, prompt: string,
    kind: 'single' | 'multiple' | 'text',
    options?: Array<{ id: string, label: string, description?: string }>,
    required: boolean,
    allowOther?: boolean,
    minSelections?: number, maxSelections?: number,
    minLength?: number, maxLength?: number
  }>,
  allowCancel: boolean,
  requestedTimeoutSeconds?: number
}
Interaction = {
  interactionId, schemaVersion, kind: 'clarification' | 'approval',
  ownerUserId, authorizedResponderIds, conversationId, branchAnchorMessageId,
  messageId, runId, attemptId, toolRunId,
  request, requestHash, policyVersion,
  state: 'pending' | 'answered' | 'denied' | 'cancelled' | 'expired' | 'superseded',
  version, createdAt, expiresAt?, answeredAt?, answeredBy?,
  answer?, resumeOperationId?
}
SubmitAnswer = {
  interactionId, expectedVersion, clientRequestId,
  answers: Array<{ questionId, selectedOptionIds?: string[], text?: string }>
}
```

Validation policy:

- Suggested initial bounds: 1-4 questions; 2-8 options for choice questions; unique stable IDs; prompt/context/title and text length bounds; at most 2,000 answer characters per question. Treat these as adjustable UX limits, not model token limits.
- `single` accepts exactly one known option when required; optional empty is explicit. `multiple` rejects duplicates/unknown IDs and enforces min/max. `text` rejects options and enforces required/length limits. `allowOther` provides a clearly labelled custom-answer field and a defined exclusivity rule. Do not coerce malformed arrays or accept arbitrary object properties.
- Validate constraints when creating the request as well as answering it. Reject impossible schemas, duplicate question IDs, min greater than max, a multi-select maximum above option count and required text whose allowed length is zero. Use server validation even if the client disabled the button.
- The model may request a timeout but the server sets `expiresAt` under policy. Display a timezone-aware absolute deadline only when one exists. No invented urgency, client-only countdown authority or approval-on-timeout. Clarification can have no deadline; if expired, offer a newly authorized request rather than accepting a stale answer.
- Required means required to continue that run, not that the person must comply. Always retain global “Stop task”; per-question optional “Skip” must not be confused with cancelling the entire task. Cancellation returns a typed outcome, not empty text masquerading as an answer.
- Plain composer messages do not silently answer a pending card. Offer an explicit “Use this as my answer” association, or route a dedicated card text field. A new unrelated message can supersede/cancel the parked run according to visible policy.

#### Durable wait and exactly-once answer consumption

1. At a model/tool boundary, write the validated interaction and checkpoint sufficient typed provider history, completed tool outcomes, artifact references and pending tool identity. Mark the run `waiting_for_user` or `waiting_for_approval`; set a dedicated waiting projection on the message. Do not leave it “generating” with a spinner, mark it complete, hold a Node action open, or pass it through the existing ten-minute stale-generation recovery.
2. Stop the active model loop at this boundary. Parallel effects already running must be reconciled before promising that the task is paused. Preserve their outcomes independently. A synchronous `execute()` returning success or awaiting a browser Promise is not this protocol.
3. Implement an authenticated answer mutation. Resolve the actor from session, recheck current membership and explicit responder policy, original run/attempt/branch, request hash/version, expiry and pending state. Never trust client-supplied owner, tool args, branch, chosen runtime or model.
4. In one transaction, compare-and-swap pending to answered, store the exact validated answer/actor, and create one uniquely keyed resume intent or schedule the matching continuation. Deduplicate identical `clientRequestId` retries and return the recorded receipt. A different decision after consumption returns conflict and the actual state; two tabs cannot win twice.
5. Resume only from the saved boundary and inject one typed tool answer/result. Check run ownership again before starting. A journaled workflow can park on an event; an explicit persisted continuation state machine is also possible. Neither should rerun earlier completed tools. Carry accumulated artifacts and usage across every pause segment.
6. Expiry, denial, stop, membership revocation and supersession compete through the same atomic transition. Stop cancels pending interactions and invalidates resume intents. A delayed answer cannot revive a terminal run. Keep the history receipt visible, including who answered and when.
7. “Exactly once” here means one accepted answer and one logical continuation admission. It is not a promise that an interrupted remote write or provider request physically executes once. Use stable effect keys and provider idempotency/reconciliation; retain `unknown` outcomes instead of retrying a potentially successful effect blindly.

#### Approval is not clarification

- Server tool policy decides which effects need approval. The model cannot set “already approved”, lower risk, or substitute a generic question for permission. Bind the request to tool/schema/policy version, validated input hash, run/attempt, target account/resource, recipient/audience, capability and expiry.
- Render a trusted action summary and structured payload preview: “Send this email”, recipient, subject/body preview, account, attachments, cost/irreversibility and exactly what will happen. Show a diff for a write where meaningful. The summary comes from validated tool arguments, not just model-authored reassurance. Expose sensitive values carefully without hiding the material effect.
- Primary actions say “Send once”, “Allow this run” only where policy actually supports that scope, and “Don't send”. Initial release should prefer allow-once. No default checked approval, “Continue” ambiguity, consent hidden in options, global Enter shortcut, approval from downloaded HTML, or timeout-to-allow.
- After allow, show “Approved, not started” or “Running”, not “Sent”. Only the executor's durable success receipt can say “Sent”. Denial leaves no side effect and permits a plain-language alternative. Changing input, target, policy or artifact content hash requires a new approval.
- Permission persistence is a separate deliberate feature. Session/global grants must list capabilities and revocation paths; never add an “Always allow” shortcut merely because a UI reference supports it. Public/shared/readonly transcripts show the request and receipt without live controls.

#### Truthful progress event and projection model

```ts
RunEvent = {
  schemaVersion: 1, eventId, runId, attemptId, sequence,
  messageId, toolRunId?, parentToolRunId?, interactionId?, artifactRevisionId?,
  type, // plan.updated, tool.queued/started/progress/settled,
        // interaction.requested/resolved, artifact.draft/committed,
        // run.waiting/resumed/settled
  producer: 'orchestrator' | 'executor' | 'model',
  occurredAt, persistedAt,
  payload // bounded discriminated union, no secrets/raw reasoning
}
ToolRun = {
  toolRunId, runId, attemptId, providerToolCallId,
  toolName, toolSchemaVersion, inputHash, effectOperationId?,
  status: 'queued' | 'running' | 'waiting_for_user' | 'waiting_for_approval'
    | 'succeeded' | 'partially_succeeded' | 'failed' | 'cancelled' | 'unknown',
  startedAt?, finishedAt?, lastProgressAt?, resultRef?, error?,
  actualCount?: { completed, total, unit }
}
```

- Keep proposed plan items in a separate versioned plan projection, explicitly labelled “Plan”. Only server executor transitions mark tools running/succeeded. A model sentence “I'll search three sources” cannot become three completed searches. Never display hidden reasoning as activity.
- Generate `toolRunId` on the server and retain provider call ID separately; repeated provider IDs in different attempts must not collide. Preserve source/result/artifact links as provenance. Stable sequence IDs order parallel calls; timestamps alone are not a total order.
- Upserts accept current run/attempt and reject late events after terminal settlement. Append immutable meaningful transitions; coalesce rapid progress by tool ID into a latest snapshot. Suggested starting batch cadence 100-250ms with bounded payloads. Never drop terminal, question, approval or artifact-commit events. Maintain a resume cursor and return a canonical snapshot if history compaction overtakes it.
- Publish no fake percentage or model-estimated time. Show counts only when the executor knows a meaningful denominator, such as “3 of 8 files read”. “Plan item 2 of 4” is not “50% done”. Unknown duration stays an indeterminate state with last-update time.
- Failed, partially succeeded, stopped and outcome-unknown are distinct. If two writes succeeded and one failed, keep both success receipts and the failed target. Cancellation stops new work but cannot honestly undo a completed external effect. Show “Checking whether it completed” for lost acknowledgments.
- Activity is a compact disclosure below the active answer header, not a stack of logs competing with the answer. One summary line while running; collapsed durable history when finished; failed/waiting states remain visible. Artifact cards and blocking interaction cards belong in main content, never hidden inside activity. A plan may be absent for a one-step task.
- Use one polite `role=status` announcement owner for semantic transitions: started, waiting, resumed, partial, failed, cancelled and complete. Coalesce repetitive updates; do not read tokens, elapsed-time ticks or every log row. Keep the expanded activity log inspectable without making every row a second live region. Waiting should announce a question is available, not steal focus from the composer or reader.
- Trace durable IDs into Langfuse agent/tool/generation/event observations. Measure wait duration separately from compute duration, answer acceptance/conflict, time-to-first-artifact and preview failure. Keep usage per real provider attempt. Telemetry is best-effort and redacted; it must not block answer consumption, expose private form answers, or become the UI's source of truth. No Langfuse SDK upgrade is needed for this design note; a later instrumentation change must pin a version compatible with the chosen AI SDK.

#### Concrete design proposal and wireframe

Subject: a multi-model personal assistant doing useful work, occasionally requiring a choice. Audience: a person reading an answer while the agent works. Single job: understand the result and make the next required decision without deciphering tool logs.

Retain the current rose-quartz/deep-indigo identity. Proposed preview tokens, not replacements for approved app tokens: Void `#1E1E2E`, Raised indigo `#2A2A3A`, Rose quartz `#F4E0DC`, Reading white `#F8F6FC`, Waiting amber `#E9C17A`, Success sage `#A8C7A4`. Use existing destructive tokens for failure. Manrope for prose/controls, Syne sparingly for the artifact title, JetBrains Mono for revision and status metadata. Validate contrast on actual fills; these hex choices are a design starting point.

Signature: a shared **turn-to-document rail** connects a small artifact card to the open document's revision tab. It encodes a real source-message/revision relationship, not decoration. Keep the rest quiet. Questions use the same card geometry with an explicit “Your answer needed” label; approvals add a shield/action summary and distinctly named buttons. Do not distinguish them by color alone.

```text
Desktop
┌──────────────── conversation ────────────────┬──────── Artifact ──────────┐
│ Assistant · model                           │ Request path     v2       │
│ Here is the request path, with the retry     │ [Preview] [Source]        │
│ boundary highlighted.                       │ [Versions] [Download] [×] │
│ ┌─ HTML visual · Request path · v2 ───────┐  │                           │
│ │ Static preview · scripts off     [Open]├──┤ Diagram / visual answer   │
│ └────────────────────────────────────────┘  │                           │
│ [Activity: 2 succeeded · 1 waiting       ▾]  │ Text explanation available│
│                                            │                           │
│ ┌ Your answer needed ────────────────────┐  │ Saved · from this answer  │
│ │ Which retry behavior should it show?  │  └───────────────────────────┤
│ │ ○ Retry once     ○ Exponential backoff│                              │
│ │ □ Include the timeout branch          │                              │
│ │ Other details [                     ] │                              │
│ │ [Stop task]              [Use answers]│                              │
│ └───────────────────────────────────────┘                              │
│ Composer remains available. No automatic focus jump.                  │
└───────────────────────────────────────────────────────────────────────┘

Separate approval example, never merged into that question
┌ Approval required · Send email ───────────────────────────────────────┐
│ From: chosen account  To: verified recipient                           │
│ Subject and body preview · 1 attachment · Cannot unsend after delivery │
│ [Review full message]                    [Don't send] [Send once]      │
└───────────────────────────────────────────────────────────────────────┘

Mobile
Transcript → [Request path · v2 · Open]
Open → full-screen document with Back, Preview/Source, Versions, Download
Back → same transcript anchor and focused card
Question → full-width inline card, vertically stacked controls
Approval → same full-width card, visible effect summary and named actions
```

The example combines separate single/multiple/text questions only to demonstrate controls. Production composition should ask the fewest necessary questions, not turn every interruption into a survey.

Design gate before implementation:

1. Show BK seeded desktop and 360px mobile states for plain answer, artifact ready/updating/failed, single/multi/text question, invalid submission, expired request, approval pending/denied/approved-running, partial success, stop and unknown outcome. No live provider calls required.
2. Compare one quiet activity line with the existing timeline, not multiple wholesale chat redesigns. Confirm that the answer is primary, required action is unmistakable, sources/revisions are discoverable, and no unrequested preview steals the reading position.
3. Keyboard-only completion: radios/checkboxes/text, visible focus, labelled errors, no global Enter submission, dialog escape/return focus, copy/download and mobile Back. Test 200% zoom, reduced motion, forced colors, RTL/long translated labels and touch controls. Use fieldset/legend and native inputs; error text uses `aria-describedby`/`aria-invalid`. Never mount/unmount a focused pending card through transcript virtualization without an explicit focus recovery strategy.
4. VoiceOver/NVDA checks: one waiting/completion announcement, no repeated token/progress speech, named frame/close/download controls, readable text alternative to the visual and focus restored to the origin card. Automated accessibility checks supplement this gate rather than certify it.
5. Obtain approval of the interaction hierarchy, copy and artifact-opening behavior. The wireframe/tokens here are unapproved. Do not treat source review as visual QA or claim a screenshot was tested.

#### Phased delivery with concrete missing connections

| Phase | Scope and implementation locations | Exit gate |
| --- | --- | --- |
| 0. Repair and specify | `generation/tools.ts` preserves native results; `ArtifactList.tsx` consumes typed rows; explicit document ID/base revision in tools and `canvas/documents.ts`; create conversation-access check; separate null/loading/forbidden preview states. Capture deterministic fixtures. | Existing create/update reference renders from actual normalized rows; rejected/partial tool output is never success; two active documents target correctly. No claim that this phase delivers live HTML. |
| 1. Useful artifacts | Additive manifest/revisions/message-source references in production schema and applicable schema modules; create/update/get tools independent of mode; preserve incognito; draft persistence and compact answer cards; document/code/image adapters, static HTML sandbox; responsive workbench. | Visual explanation created in one normal turn, refresh survives, versions/ownership/export work, static preview security corpus passes, mobile can open it. Scripts stay disabled. |
| 2. Durable human decisions | Coordinator-owned run/attempt/checkpoint and continuation boundary; authenticated interaction commands and dedupe; explicit wait states/cache/API projections; authored question and distinct approval cards. Replace display-only clarification path behind a flag. | Refresh/reconnect/re-pause, two-tab answer race, denial/expiry/revocation/stop races, one logical continuation and preserved prior effects. Never hold an action for user input. |
| 3. Evidence-based activity | Executor-owned tool outcomes/events and plan projection; persistent activity disclosure, bounded/coalesced updates, accessible announcer; redacted trace correlation. Can develop alongside phase 2 after IDs/state contract stabilizes. | Parallel/retry/stale-event fixtures are truthful; no false complete/percent; failure and unknown effects remain visible; no duplicate announcements. |
| 4. Optional richer formats | Diagram artifact refinements, safe conversion exports, allowlisted declarative charts/forms; only then separately gated JS preview with version-scoped capability and demonstrated egress policy. | Security and design approval, supported-browser/device evidence. If no defensible offline JS boundary exists, keep it disabled instead of blocking static HTML. |

Use additive reads/dual projections during migration. Feature flags separately gate new artifact creation, HTML preview, structured interactions and script capability. Rollback disables new starts without abandoning pending interactions or deleting created revisions; keep a compatible responder/reader until old runs drain. Do not backfill an approval as granted or regenerate old artifacts merely to migrate.

#### Acceptance fixtures

All fixtures are proposed. Use seeded Convex records, fake providers/tools and browser network interception, not paid model calls. Assert durable state, rendered controls and effect counts rather than snapshots alone.

| Fixture | Required observable outcome |
| --- | --- |
| Real normalized tool shape | Insert schema-shaped successful create/update calls with native results. Correct title/type/revision card appears outside activity. Tagged string/failed/malformed results cannot fabricate a ready artifact. |
| Normal-turn visual intent | From normal mode, request an explanation best shown visually. Eligible tool record can create static HTML directly, without requiring another user turn to enter editor mode. Short factual answer creates no artifact. Fake-provider request asserts exact availability. |
| Creation interrupted after commit | Lose tool acknowledgment after manifest/revision commit, then retry the same operation. One artifact/revision/reference, no duplicate. Partial draft remains readable after refresh and stop. |
| Multiple artifacts and branches | Two documents in one conversation, two comparison siblings, later v3 edit. Update names intended ID/base version. Historical v1 card opens v1; no inactive-branch content/source leakage. |
| Concurrent edit | User edits while agent patch based on old version arrives. Server rejects conflict; user content/history remain; no automatic overwrite or silent partial success. |
| Authorization and retention | Outsider guesses artifact/revision/asset/interaction IDs; collaborator revoked; public snapshot; deleted conversation; incognito. No unauthorized read/write/export/answer; private URLs not leaked; cleanup removes intended records/blobs only. |
| HTML/script injection | Scripts, event handlers, SVG active content, nested srcdoc/iframe/object, base/meta refresh, DOM-clobber IDs, closing-head/document tricks. No parent DOM/storage/token access, no execution in static policy, no loosened wrapper CSP. Source remains available. |
| Static egress | Remote and relative img/srcset/CSS import/font/url, SVG href, video/object/frame, link ping/prefetch, forms, redirects and encoded protocols. Zero unexpected requests in real Chromium/Firefox/WebKit, including pre-CSP resources. No self-navigation or external opener. |
| Script capability negative | HTML creation, card open, download, plain “yes”, stale approval or changed revision must not run scripts. Grant only applies to the named immutable content hash. Parent bridge rejects tool/answer/approval attempts. |
| Future JS adversaries | Fetch/XHR/WebSocket/beacon/EventSource/WebRTC, location/meta refresh, worker/blob imports, popups/downloads, storage/cookie probes and forged sibling messages. No release claiming network disabled until all relevant channels have a justified enforcement mechanism and passing tests. |
| Oversized/broken preview | Giant nested DOM/CSS/image, invalid HTML and preview load failure. Bounded resource handling, explicit failure/partial status, close/source usable, answer not lost. iframe `load` alone does not mark preview successful. |
| Export trust | Export v1 while current is v3; malicious title/extension/MIME, SVG/HTML/code. Correct pinned bytes, safe filename, explicit active-content label, no auto-run/auto-open; static snapshot excludes active capability. |
| Question schema validation | Empty required response, unknown/duplicate IDs, missing/extra questions, single/multi mismatch, impossible min/max, whitespace-only required text, too-long text and “Other”. Client and server agree; invalid data consumes no interaction. |
| Durable wait | Refresh, close all tabs, navigate branches, offline answer and reconnect, pause a second time. Pending card/answer receipt/artifacts persist; old tool effects do not rerun; offline shows “Not sent yet” until server acknowledgment. |
| Two-tab answer race | Same request retried and conflicting answers sent simultaneously. One recorded actor/answer and one resume intent. Losing tab shows accepted state, never a second continuation. |
| Answer versus terminal race | Answer competes with stop/expiry/revocation/supersession. One allowed atomic transition; no stale answer revives work or mutates the new run. Server time, not local countdown, governs expiry. |
| Approval boundary | Clarification answer containing “yes” cannot authorize send/delete. Deny/expire produces zero effect. Tool input/recipient/hash change after approval requires new request. Allow receipt says approved, not succeeded. |
| External outcome unknown | Remote effect succeeds but acknowledgment is lost, then process restarts. Stable operation key dedupes where supported; otherwise state is unknown/reconciliation, not unconditional retry or fake failure. Preserve earlier success receipts. |
| Activity truth | Parallel tools settle out of order; model plan changes; result-less operation exceeds 30 seconds; late attempt writes; stop after partial success. Correct server states and IDs, no model-labelled completion, no generic “Complete” on stop/error, no fake percent. |
| High-frequency activity | 100 progress events/second across four tools, repeated errors, history cursor gap. Bounded coalescing/UI work; all terminal/wait/commit transitions survive; snapshot replay yields same state without duplicate speech. |
| Accessibility and hierarchy | Keyboard/touch, 200% zoom, reduced motion, RTL, long labels, screen reader, virtualized 499/500-row transition. Blocking cards are discoverable and operable, not collapsed tool details; focus/reading anchor preserved; waiting/resume/complete announced once. |

### Gaps

- BK has not approved this visual direction, capability policy, responder scope or artifact-opening behavior. The next deliverable should be a deterministic state prototype and threat-model review, not a library migration.
- Durable waits depend on a real checkpoint/resume boundary that current generation lacks. That work belongs with the coordinator's execution design; a card-only implementation must not be presented as durable human-in-the-loop support.
- No fixture above has run, no browser/accessibility conformance is claimed, and no measured latency/bundle/spend improvement is asserted. Source implementations and standards support the contracts; implementation still needs evidence.
