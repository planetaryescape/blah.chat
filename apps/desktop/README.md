# @blah-chat/desktop

Tauri v2 desktop shell for blah.chat.

## Goals

- macOS-first desktop wrapper with Clerk bearer auth parity.
- Main app window (`/app`) + companion quick window (`/desktop/quick`).
- Native hooks: global shortcut, deep links, notifications.

## Install Released App (macOS)

1. Open [Desktop Releases](https://github.com/planetaryescape/blah.chat/releases?q=desktop-v&expanded=true).
2. Open latest `desktop-v*` release.
3. Download `.dmg` from **Assets**.
4. Open `.dmg`, drag `blah.chat.app` to `Applications`.
5. First launch: right-click app -> `Open` (Gatekeeper prompt), then sign in.

Notes:

- Desktop builds are currently macOS-only.
- Published builds use `desktop-vX.Y.Z` tags; automatic desktop releases are currently suspended.

## Commands

```bash
bun --filter=@blah-chat/desktop run dev
bun --filter=@blah-chat/desktop run build
bun --filter=@blah-chat/desktop run build:bundle
agent-work run -- bun --filter=@blah-chat/desktop run test:run
source "$HOME/.cargo/env" && cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

## Runtime URLs

- `DESKTOP_WEB_URL` (optional): override remote base URL.
  - default: `https://blah.chat`

## Deep Links

Registered scheme: `blahchat://`

Examples:

- `blahchat://chat/<conversationId>`
- `blahchat://search`
- `blahchat://settings`

## Native Desktop Features (v1)

- Global shortcut: `Option+Space` toggles companion window.
- App menu actions: `New Chat`, `Open Companion`, `Search`, `Quit`.
- Tray actions: `New Chat`, `Open Companion`, `Search`, `Quit`.

## Release Pipeline

**Suspended:** the previously documented `release-desktop.yml` and
`release-desktop-finalize.yml` workflows are absent. Desktop is deliberately not a
Release Please component until artifact building, signing, notarization and
finalization are restored together. Do not create empty draft releases. Existing
`desktop-v*` releases and updater tag compatibility are unchanged; updater remains
disabled by default. The package, Cargo and Tauri versions are all `0.1.0`, which
must be the baseline if the component is re-enabled. Bundles reuse the committed
mobile app icon rather than referencing a missing Raycast asset. The committed
`src-tauri/icons/icon.icns` and `icon.ico` are generated from that PNG using
`bun run tauri icon ../mobile/assets/icon.png`; macOS bundling needs the ICNS file.

The following describes the former pipeline and required credentials, not a
currently available publishing command.

Workflow: `.github/workflows/release-desktop.yml`

- Triggered automatically from `release-please` desktop tags (`desktop-vX.Y.Z`) when a draft release is created.
- Desktop tags are independent of root app tags (`vX.Y.Z`).
- New desktop tags are cut from desktop releasable commits (`feat`, `fix`, `!`) under `apps/desktop`.
- `docs:` / `chore:` desktop-only commits do not create a new `desktop-v*` release.
- Builds signed macOS bundle + uploads artifacts to a **draft** GitHub release.
- Submits notarization **async** (no waiting) and records the submission id in the release notes.
- Publish is done later via `.github/workflows/release-desktop-finalize.yml` once notarization is `Accepted` (staples DMG, re-uploads, publishes).
- Manual fallback: workflow dispatch with explicit `desktop-vX.Y.Z`.

Required GitHub secrets:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY` (must be `Developer ID Application: ...`)
- `APPLE_ID`
- `APPLE_PASSWORD` (Apple app-specific password, not account password)
- `APPLE_TEAM_ID`
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `DESKTOP_UPDATER_CONFIG_JSON` (optional, one-switch updater enable)

Updater note:

- Default repo config keeps updater disabled.
- To enable without repo edits, set `DESKTOP_UPDATER_CONFIG_JSON` secret (full updater JSON object).

Detailed setup + automation runbook:

- `docs/guides/desktop-release-automation.md`

Manual rerun CLI:

```bash
gh workflow run "Release Desktop" --repo planetaryescape/blah.chat -f tag=desktop-vX.Y.Z
gh run list --repo planetaryescape/blah.chat --workflow "Release Desktop" --limit 5
```

Finalize + publish (after notarization is accepted):

```bash
gh workflow run "Finalize Desktop Notarization" --repo planetaryescape/blah.chat -f tag=desktop-vX.Y.Z
gh run list --repo planetaryescape/blah.chat --workflow "Finalize Desktop Notarization" --limit 5
```
