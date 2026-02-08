# Desktop Release Automation (Tauri + GitHub Actions)

This repo now supports automated desktop releases with no manual tag cutting.

## What is automated now

1. `release-please` tracks `apps/desktop` and creates `desktop-vX.Y.Z` releases.
2. `.github/workflows/release-desktop.yml` auto-builds/signs/notarizes on published `desktop-v*`.
3. Artifacts are uploaded to that GitHub release:
   - `.dmg`
   - `.app.tar.gz`
   - `.app.tar.gz.sig`
   - `latest*.json` (updater manifests)
4. CI enforces desktop version sync across:
   - `apps/desktop/package.json`
   - `apps/desktop/src-tauri/tauri.conf.json`
   - `apps/desktop/src-tauri/Cargo.toml`

Local build note:

1. `apps/desktop` default `build` runs with `--no-bundle` for fast CI/pre-push stability.
2. Release workflow uses `build:bundle` for signed/notarized DMG + updater artifacts.

## One-time setup

### 1) Apple signing cert secret

1. Create a **Developer ID Application** certificate in Apple Developer.
2. Export your **Developer ID Application** cert as `.p12` from Keychain Access.
2. Base64 it:

```bash
base64 -i DeveloperID.p12 | pbcopy
```

3. Add GitHub secret:
   - `APPLE_CERTIFICATE` = base64 output
   - `APPLE_CERTIFICATE_PASSWORD` = p12 export password
   - `APPLE_SIGNING_IDENTITY` = full cert identity string (must start with `Developer ID Application:`)

Notes:

- `Apple Development` certificates will fail notarization (not valid for distribution).

Find identity string:

```bash
security find-identity -v -p codesigning
```

### 2) Apple notarization secrets

Add GitHub secrets:

1. `APPLE_ID` = Apple ID email
2. `APPLE_PASSWORD` = app-specific password (Apple account security page)
3. `APPLE_TEAM_ID` = Apple Developer team id

### 3) Tauri updater signing key secrets

Generate private/public updater key pair (run once, keep private key safe):

```bash
bun --filter=@blah-chat/desktop run tauri signer generate
```

Add GitHub secrets:

1. `TAURI_SIGNING_PRIVATE_KEY` = generated private key content
2. `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = private key password

Keep generated public key for updater config (later step).

## Enable full no-human release flow

### 1) Ensure release-please runs on main

Already configured:

1. `.github/workflows/release-please.yml`
2. `.release-please-config.json` includes `apps/desktop` component `desktop`
3. `.release-please-manifest.json` includes `apps/desktop`

### 2) Merge flow

1. Merge desktop changes to `main` using conventional commits (`feat:`, `fix:`).
2. `release-please` opens/updates release PR.
3. `.github/workflows/release-please-auto-merge.yml` auto-merges release PR after CI passes.
4. GitHub release `desktop-vX.Y.Z` is published automatically.
5. `release-desktop.yml` runs and uploads signed/notarized artifacts.

Desktop cadence notes:

1. Desktop releases are independent from root `vX.Y.Z` app releases.
2. Desktop `docs:`/`chore:` changes alone do not create `desktop-v*` releases.
3. Expect new `desktop-v*` only for releasable desktop commits (`feat`, `fix`, breaking).

No manual `git tag` or `gh release create` needed.

If your repo rules block bot merges, grant `GITHUB_TOKEN` PR merge permission or disable that workflow and merge release PR manually.

## Updater activation (after hosting manifests)

Updater is scaffolded but disabled by default in:

1. `apps/desktop/src-tauri/tauri.conf.json`

When ready:

1. Host `latest*.json` + `.app.tar.gz` + `.sig` on stable HTTPS endpoint.
2. Add one GitHub secret: `DESKTOP_UPDATER_CONFIG_JSON`
3. Set it to full updater JSON object, example:

```json
{
  "active": true,
  "pubkey": "YOUR_PUBLIC_UPDATER_KEY",
  "endpoints": ["https://releases.example.com/desktop/latest.json"]
}
```

4. Merge to `main` (no repo file edits needed for updater toggle).
5. Next desktop release injects this updater config during build automatically.

Disable updater again:

1. Remove `DESKTOP_UPDATER_CONFIG_JSON` secret (or set `"active": false`).

## Manual fallback

If you need to re-run a specific tag release:

1. Open Actions -> `Release Desktop` -> `Run workflow`
2. Provide `tag` as `desktop-vX.Y.Z`

CLI equivalent:

```bash
gh workflow run "Release Desktop" --repo planetaryescape/blah.chat -f tag=desktop-vX.Y.Z
gh run list --repo planetaryescape/blah.chat --workflow "Release Desktop" --limit 5
```

## Debug checklist

1. Missing secret error: check `Validate desktop release secrets` step output.
2. Notarization auth failure (`401 Invalid credentials`): verify `APPLE_ID`, `APPLE_PASSWORD` (must be app-specific password), and `APPLE_TEAM_ID`.
3. Signing identity mismatch: cert subject in `APPLE_CERTIFICATE` must match `APPLE_SIGNING_IDENTITY`.
4. No artifacts uploaded: check `apps/desktop/src-tauri/target/release/bundle`.
5. Wrong version in bundle: workflow syncs version from tag before build; verify tag format is exact `desktop-vX.Y.Z`.
6. CI version drift failure: run `bun run desktop:version-check`, align desktop versions in the 3 files listed above.
