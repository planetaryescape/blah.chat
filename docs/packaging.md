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

Select the same workflow ref used to stage the artifact. Promotion accepts only an
exact HTTPS `*.vercel.app` deployment URL, reads Vercel deployment metadata, and
requires the configured project, a ready production target, and `gitSource.sha`
equal to the selected workflow commit (`GITHUB_SHA`). It then promotes only the
verified immutable deployment ID. The selected commit must also have successful
GitHub Actions checks named `Lint & Typecheck`, `Unit & Integration Tests`, and
`Build`; missing or failed checks block promotion. Missing provenance is rejected; use the separate
rollback workflow for an older verified production artifact. The read-only Vercel
deployment API is used because `vercel inspect --json` omits project/source fields.

## Publishing to npm

Publishing is tag-driven:

1. release-please creates a GitHub Release with tag `<component>-vX.Y.Z`.
2. GitHub Actions workflow publishes exactly one package for that tag.

Key constraints:

- npm rejects `workspace:*` ranges. Before publish we rewrite workspace dependency ranges using `scripts/prepare-npm-publish.ts` (ephemeral in CI checkout).
- Each package must include `README.md` and publish config. CI enforces this via `scripts/check-package-docs.ts`.
