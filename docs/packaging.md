# Packaging + Publishing

This repo is a monorepo. Reusable capabilities live in publishable npm packages under `packages/*`, so new apps can be composed by selecting only the packages they need.

## Goals

- Composable capabilities: `@blah-chat/*` packages can be mixed/matched across apps.
- Clean boundaries: core capability packages must not import Next.js, React, or Convex.
- Independent releases: each package version is tracked and published independently.

## Package Types

- `*-core`: pure types + algorithms + domain logic. No framework imports.
- `*-tools` / `*-ingest`: implementations/adapters (still framework-agnostic).
- `*-web`: browser-only modules (Web Workers, DOM helpers). No React/Next unless explicitly a UI package (we avoid UI packages).
- `persistence-*`: persistence adapters. `persistence-convex` may depend on Convex, but capability cores must not.

## Independent Versioning (release-please)

We use release-please with a manifest. Each publishable package is listed in:

- `.release-please-config.json`
- `.release-please-manifest.json`

When changes only affect `packages/rag-core/**`, release-please creates only a `rag-core-vX.Y.Z` tag/release. No other packages are bumped or published.

Desktop automatic releases are suspended until artifact building and finalization
workflows are restored together. It is not currently a Release Please component;
existing `desktop-v*` releases remain available. The desktop package, Cargo and
Tauri versions remain `0.1.0`, not the former manifest baseline of `0.34.0`.

## Production web promotion

`release.yml` deploys compatible backend functions and stages the web artifact
without moving production domains. Health readiness alone never promotes it.
Verify sign-in, send, refresh and persisted responses on the exact staged URL,
then manually dispatch **Production Deploy** with `promote_deployment` set to that
URL and `acknowledge_user_journeys` enabled. That promotion does not rebuild or
redeploy backend functions. Promotion and rollback both use the
`production-deploy` concurrency group without cancellation.

Dispatch promotion only from protected default branch `main`. A separate preflight
job (no production environment or Vercel secrets) rejects other dispatch refs,
checks out `refs/heads/main`, and records its exact commit. The promotion job checks
out that immutable commit and uses it as `PROMOTION_SOURCE_SHA`, not the dispatch's
potentially older `GITHUB_SHA`. If main advanced since staging, a mismatched
artifact is rejected; use rollback for older artifacts rather than changing refs.

Promotion accepts only an
exact HTTPS `*.vercel.app` deployment URL, reads Vercel deployment metadata, and
requires the configured project, a ready production target, and `gitSource.sha`
equal to the checked-out main commit (`PROMOTION_SOURCE_SHA`). It then promotes only the
verified immutable deployment ID. The selected commit must also have successful
GitHub Actions checks named `Lint & Typecheck`, `Unit & Integration Tests`, and
`Build`; all pages are read before admission, including later failed reruns.
Pagination is limited to 100 pages of 100 checks; overflow, failed requests and
malformed pages fail closed without accepting partial results.
Missing provenance is rejected; use the separate
rollback workflow for an older verified production artifact. The read-only Vercel
deployment API is used because `vercel inspect --json` omits project/source fields.

### External production-environment blocker

The coordinator's read-only observation on 2026-11-02 found environment
`Production` with `protection_rules: []` and `deployment_branch_policy: null`.
This is **not configured** for safe branch-restricted production secret access.
Preflight now requires a server-side deployment branch policy permitting only
protected branches, or an explicit allowlist containing exactly branch `main`
(not tags or wildcard patterns). An unavailable policy API also blocks promotion.
The read-only checks use `GITHUB_TOKEN`; no environment settings are changed.

Vercel secrets are step-scoped and passed to promotion only after preflight
succeeds. These workflow guards alone do **not** prevent a malicious branch
workflow from removing its own checks while the environment remains unrestricted.
An authorized operator must configure and verify the server-side environment
policy before live promotion. This work neither changes that policy nor proves
human sign-in/generation journeys; the manual acknowledgement is still required.

## Publishing to npm

Publishing is tag-driven:

1. release-please creates a GitHub Release with tag `<component>-vX.Y.Z`.
2. GitHub Actions workflow publishes exactly one package for that tag.

Key constraints:

- npm rejects `workspace:*` ranges. Before publish we rewrite workspace dependency ranges using `scripts/prepare-npm-publish.ts` (ephemeral in CI checkout).
- Each package must include `README.md` and publish config. CI enforces this via `scripts/check-package-docs.ts`.
