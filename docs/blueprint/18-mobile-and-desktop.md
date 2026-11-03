# 18: Mobile and desktop

Preserve both existing apps while the backend gains new run, interaction and output contracts. This is D-031's compatibility proposal, with coordinated maintenance under D-020 and scoped S15/S17 evidence. Q22 sets supported client versions and rollout order. No native build, device journey, store submission or desktop release ran in this review.

Quiet workbench, Q2, applies on both: the answer/output remains primary, a blocking decision stays visible and activity is subordinate. A smaller screen changes the layout, not whether the person can find saved work or tell a pause from a failure. Read [03](03-design-concept.md) before approving central screens.

## Actual release and runtime baseline

Reviewed source is `04866f80a6236716ebf8d8c5a79001727f85f4bf`. A checked-in application/build profile is not proof a corresponding store build or signed desktop artifact is currently deployed.

| Client | Implemented baseline | Release limitation |
|---|---|---|
| `apps/mobile` | Expo Router entry, native Android/iOS projects, Expo locked 54.0.33, Router 6.0.23, React/DOM declared 19.1.0 and RN 0.81.5; Clerk provider, persisted Query cache and `ConvexProviderWithClerk` | `build` is `expo export`, not a native compile/store validation. Two tracked Bun test files are not device coverage |
| Mobile transport | `lib/transport/mode.ts` supports only `convex`; HTTP-only configuration returns an explicit unsupported-transport error. `app/_layout.tsx` creates a Convex client from runtime config | Do not follow stale docs that call mobile REST-only or infer HTTP parity from shared SDK dependencies |
| Mobile EAS | `eas.json` has development simulator/device, preview and production profiles; base pins Node20.18.0/Bun1.3.5, production increments versions | Profiles are configuration, not observed successful releases. Runtime/toolchain alignment requires the same cohort review as CI |
| `apps/desktop` | Tauri2.9.1/Rust2021 remote-web shell, main/companion windows, shortcuts/tray/notifications/deep links/settings/offline page; package/Cargo/Tauri version0.1.0 | Automatic releases are suspended and desktop is not a Release Please component; existing `desktop-v*` downloads remain. macOS build script skips on other hosts, which is not cross-platform validation |
| Desktop updater | `tauri.conf.json` has updater inactive and a placeholder public key; Rust check/install commands exist | Source presence does not establish a working signed update channel. Keep suspension until building and finalization are restored together |

Evidence: [workspace baseline](../../research_notes/blah-chat-modernization-review/baseline.md#deterministic-inventory), [mobile manifest](../../apps/mobile/package.json), [mobile root](../../apps/mobile/app/_layout.tsx), [transport](../../apps/mobile/lib/transport/mode.ts), [EAS](../../apps/mobile/eas.json), [desktop manifest](../../apps/desktop/package.json), [Tauri config](../../apps/desktop/src-tauri/tauri.conf.json), [release suspension](../packaging.md#independent-versioning-release-please).

## Coordinated native upgrade matrix

The [dependency review](../../research_notes/blah-chat-modernization-review/dependencies.md#runtime-and-integration-gates) records registry/source observations on 2026-11-03. Targets below are proposals, not installed versions. Recheck exact published metadata at implementation; do not use moving Expo branch maps as an install specification.

| Cohort | Proposed sequence | Compatibility evidence required |
|---|---|---|
| SDK54 maintenance | Expo54.0.33 → 54.0.38; Router6.0.23 → 6.0.24; retain RN0.81.5 and the SDK-prescribed React cohort initially | Expo doctor/version checks, Metro resolution, native diff, rebuilt development clients and iOS/Android native builds. Root web React override does not prove mobile executes web React; lock includes nested19.1.0 |
| Reanimated/Worklets | Reconcile declarations~4.2.1/0.7.4 against SDK54 map~4.1.1/0.5.1 before selecting versions | Exact published SDK/module compatibility, gestures/keyboard/bottom sheets/list performance and native startup. No independent latest bumps |
| React/renderers | Web paired19.2.9 proposal is separate from mobile19.1 lineage; evaluate permitted mobile maintenance/security changes with Expo | One React runtime per renderer; inspect Metro and Tentap WebView boundaries. Nested DOM18.3.1 is a lock fact, not proof two Reacts run in one renderer |
| Clerk Core3 | Later migrate `@clerk/clerk-expo`2.20.2 → `@clerk/expo`4.14.5 with web/Convex auth integration and root internal overrides | Exact latest peers require Expo>=54<59. Test JWT/token refresh, login/logout, offline getToken errors, secure token cache, callback/session restoration. Do not mix old/new internal Clerk packages |
| Recording | Migrate actual `expo-av` consumer `lib/hooks/useChatSTT.ts` and config plugin to Expo Audio | Permission denial, record/stop/upload/transcribe, interruption/background, audio mode cleanup and insert-versus-send intent. Deprecation is not permission to delete working voice |
| Later SDK majors | Optional one at a time54 → 55.0.32 → 56.0.24 → 57.0.31 → 58.0.22 | Published version-matched module maps and compatible binary/runtime version each step. No JS-only update across an incompatible native module/SDK change |
| Bun/Node/Query | Align validated Bun across local/CI/EAS; evaluate common Node24 where supported; Query/persistence/devtools5.105.3 as a cohort | Frozen macOS/Linux installs, native modules/Metro, persisted schema/version/auth partition tests. EAS Node20 pin is current config, not the proposed common runtime |
| Tauri/Rust/plugins | Keep Tauri2 shell; scope any plugin/toolchain update separately | Native build, IPC capability/navigation allowlist, macOS webview auth/mic/downloads, signed artifact/updater/rollback. Do not declare cargo/plugin graph audited by Bun |

Do not collapse this into a workspace-wide latest install. React Native, Expo modules, Reanimated, Worklets, Clerk and compiled binaries have different release constraints from web. No compiler swap or forced peer override is justified by this plan. (D-020; S1/S15)

## Shared read projection and old-client safety

The canonical new Run statuses are `pending|running|waiting_for_input|waiting_for_approval|succeeded|failed|cancelled`. Current message status remains `pending|generating|complete|stopped|error`. Add the optional run/wait projection defined in [02](02-data-model.md); do not extend the old message enum silently or create client-local execution truth. Render pending/running/succeeded/failed/cancelled compatibly, but waiting is a durable pause, never endless generation or client-age recovery.

Ship additive backend readers first, then compatible clients. Record minimum client/native runtime and backend/schema versions in each artifact. Keep old messages/tool results/canvas content readable while migrating to artifacts, native tool objects and usage projections. Do not enable waits or effect approvals for an old client that would show completion, auto-retry or erase them. Q22 must select a reader capability/version barrier and clear update path before feature enablement. This can block the affected capability without blocking an independent endpoint-auth fix. (D-015/D-024/D-025/D-031)

After refresh, process death, network loss or app backgrounding, clients re-read server state; they never create a second run merely because their stream ended. Stable `clientRequestId`/hash admission survives retry/lost ack. Local drafts remain unsent until server receipt. Preserve owner/deployment cache partitioning, wipe authorized deleted/incognito data across unmounted views and fence delayed writes on account switch, [13](13-privacy-safety-compliance.md). Request-wide hosted/BYOD WebSocket and HTTP behavior needs S17 before any privacy claim.

## Mobile journeys

### Answer, output and a question

Keep ordinary chat as home. An artifact card opens a full-screen output view, with title, exact revision, content/source/export and Back restoring the card's focus/reading anchor. Source and downloadable file fallback must work when static preview is unsupported. No essential output is desktop-only or hidden in an activity accordion. Use the same artifact IDs/revisions and ACLs as web, not a mobile document store. Do not equate a blank WebView with ready output. Static HTML/CSS starts with the isolation/no-network policy in [10](10-artifacts-and-interactions.md); embedded WebView must prove that policy separately rather than inherit a browser certification.

A question uses actual tappable choices, authored context, optional custom text and explicit multi-select submission. It remains visible above collapsed activity. Show submitting until the server acknowledges one answer; retain retryable input on failure. Two devices/tabs cannot both resume the run. Historical/expired/superseded questions stay readable but inactive. Approval is separately named with exact effect/account/destination/input, never a generic Continue or yes message. If the client cannot render the full review, show an authenticated web review handoff with the same interaction ID and state; do not fake local approval. (D-023/D-025; S8/S9/S15)

Stop task must reach the common backend cancellation path and preserve partial output/effect receipts. Switching apps/closing a view stops observation only. Progress names actual work and elapsed time; waits use a pause, not a spinner. Check keyboard covering the composer, text selection, screen-reader focus, reduced motion, dynamic type and touch controls on real devices, not only a 360px browser.

### OAuth completion

The existing [mobile integration settings](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/mobile/app/%28drawer%29/settings/integrations.tsx#L75-L98) calls `openAuthSessionAsync` with `blahchat://composio/callback` but discards its result; the audited path does not visibly verify/promote the initiated account. Fix this before claiming mobile connection parity. Bind exact registered callback, initiating owner, server `connectionAuthAttempts` record/state/version and selected remote account. Handle success/cancel/restart/expiry/replay and verify server-side before showing active. Do not replace the active account until verification succeeds; reconnect failure must leave its prior account intact. Never log callback query/fragment values. (D-026; S10/S15)

Connections remain per-user/per-conversation opt-in. An OAuth success is not permission to send mail or grant future scheduled writes. Revocation disables immediately and retains cleanup evidence, as [09](09-integrations.md) specifies. No production OAuth/write trial is authorized by these instructions.

### Voice and computer scope

Keep existing STT recording/upload/transcription and its explicit composer intent while migrating AV. Smart Assistant retirement must not remove `transcription.transcribeAudio`, upload ownership/auth, voice permissions or task-independent audio playback. Read-aloud uses the repaired source-mapped preparation from [11](11-rendering-and-narration.md); do not announce synthetic list labels in a mobile-only adapter. Listening, provider spend and background-audio behavior need separate authorized checks, S7/S15.

A mobile Computer view is a later gated restricted projection of `computerSessions`, private observations, authorized controls and shared run/interaction state. It does not grant local phone control, camera/contacts access or automatic E2B allocation. If viewer/control is unsupported, present the saved observation/output and an explicit handoff; do not show a fake controllable desktop. Q3/Q4/Q5/Q15 and S12/S15 gate live viewer, network, retention and control. Credentials remain server-mediated and are never copied to a mobile bundle, screenshot or sandbox. (D-028)

## Desktop is a web shell, not the agent's host computer

The main window loads `https://blah.chat/app`; companion defaults to `/desktop/quick`. `windows.rs` can resolve `DESKTOP_WEB_URL`, while reachability currently tests hardcoded `blah.chat:443`. Validate these as one explicit environment/location policy before custom-origin releases; a TCP check is not authenticated service readiness. Configured navigation and runtime URL location are not interchangeable. ([Windows](../../apps/desktop/src-tauri/src/windows.rs#L14-L58), [Tauri config](../../apps/desktop/src-tauri/tauri.conf.json))

Preserve web Clerk sign-in/session behavior inside WKWebView and test external-browser callbacks/deep links, logout, expired tokens and offline recovery. The `blahchat` route parser and IPC capabilities must allow only the intended origin/window/routes; raw deep-link payloads currently reach logs in `main.rs`, so apply metadata-only redaction before expanding callbacks. Test alternate origins and forged deep links against both route validation and capability policy. Main-window close hides rather than quits; neither action cancels a backend run. Companion and main must agree on run/wait/output state after remount. ([Main](../../apps/desktop/src-tauri/src/main.rs#L243-L298), [capabilities](../../apps/desktop/src-tauri/capabilities/desktop-shell.json))

No inspected config declares an agent sidecar or general shell/filesystem permission. Do not add a local execution sidecar, host automation bridge, shell capability, browser-profile mount or credential export to implement E2B computer tasks. Keep Tauri IPC limited to explicit shell operations such as settings, notifications, shortcuts and update controls. Treat artifact/remote content as untrusted and unable to invoke privileged host commands, including from the companion window. Q15 does not authorize exposing Keychain, environment keys, filesystem, cookies or logged-in browser sessions. E2B gets the clean bounded remote environment in [07](07-tools-and-computer.md), never this desktop's credentials. (D-028/D-031)

Quiet workbench's main answer/output layout can reuse the web experience, but companion width must not hide the blocking question or truncate approval destinations. Use a full review window when needed, preserving interaction identity/focus. Native notifications contain minimal safe titles and reopen authenticated state; notification delivery is not action success or schedule execution authority.

## Independent evidence, budgets and rollout

S15/S17 require a matrix of old supported clients versus additive/current backend, retained records, old/new native binaries and compatible OTA runtime. Required checks must run, not skip because an OS build is unavailable. Record non-macOS desktop skips as unsupported evidence, never a passing native build. [15](15-observability-and-evals.md) owns failure propagation and candidate-artifact gates.

| Evidence | Mobile | Desktop |
|---|---|---|
| Deterministic contract | Built client against fake streaming/connector providers; stop/wait/answer/artifact/history/cache/account-switch fixtures | Web candidate plus shell route/IPC/window/update/promotion tests; remote content cannot invoke host capabilities |
| Native build | iOS and Android matching Expo/runtime/native modules and rebuilt dev clients | macOS native artifact, signing/notarization and updater verification when channel restoration is authorized |
| Real device/window journeys | Login/session restore/offline, background/kill/reopen during generation/wait, keyboard/touch/dynamic type/assistive tech, OAuth callback success/cancel/replay, mic/transcription/playback, exact-revision export | Main/companion sign-in/close/reopen/shortcut, callback/location/offline, downloads/mic, native focus/reduced motion, forged navigation/IPC, previous artifact rollback |
| Spend boundaries | Separate Q3-approved speech/OAuth/computer/provider test budgets; text-only projections allocate no computer | Separate signing/build/update authorization and any live provider/computer budget; restoring shell releases grants no inference or host-access permission |

Use authorized staged accounts and synthetic content first. No live OAuth, paid speech/model call, computer allocation or store submission is implied by a native build. Native performance/battery/memory and accessibility claims need measured real-device evidence; no target number is established here. S16 defines performance measurement, not certification.

Record artifact SHA/source commit, backend range, native runtime, manifest/lock/toolchain, update channel and rollback candidate. Roll out backend-compatible changes before client capability enablement. Keep readers for in-flight old runs and make failed/blocked updates understandable. OTA rollback cannot undo incompatible native modules, backend schema contraction, external writes or accounting facts. Desktop automatic releases remain suspended until artifact build/finalization/signing/updater/rollback gates pass together and BK separately authorizes resumption. (D-020/D-030/D-031; Q22)
