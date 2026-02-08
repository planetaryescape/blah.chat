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
- New builds are published as `desktop-vX.Y.Z` releases.

## Commands

```bash
bun --filter=@blah-chat/desktop run dev
bun --filter=@blah-chat/desktop run build
bun --filter=@blah-chat/desktop run build:bundle
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

Workflow: `.github/workflows/release-desktop.yml`

- Triggered automatically from `release-please` desktop tags (`desktop-vX.Y.Z`) when a release is published.
- Builds signed + notarized macOS bundle.
- Uploads DMG + updater artifacts (`latest*.json`, `.app.tar.gz`, signatures) to the GitHub release.
- Manual fallback: workflow dispatch with explicit `desktop-vX.Y.Z`.

Required GitHub secrets:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `DESKTOP_UPDATER_CONFIG_JSON` (optional, one-switch updater enable)

Updater note:

- Default repo config keeps updater disabled.
- To enable without repo edits, set `DESKTOP_UPDATER_CONFIG_JSON` secret (full updater JSON object).

Detailed setup + automation runbook:

- `docs/guides/desktop-release-automation.md`
