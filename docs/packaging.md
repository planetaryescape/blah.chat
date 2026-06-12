# Packaging + Publishing

This repo is a monorepo. Reusable capabilities live in publishable npm packages under `packages/*`, so new apps can be composed by selecting only the packages they need.

## Goals

- Composable capabilities: `@blah-chat/*` packages can be mixed/matched across apps.
- Clean boundaries: core capability packages must not import Next.js, React, or database clients.
- Independent releases: each package version is tracked and published independently.

## Package Types

- `*-core`: pure types + algorithms + domain logic. No framework imports.
- `*-tools` / `*-ingest`: implementations/adapters (still framework-agnostic).
- `*-web`: browser-only modules (Web Workers, DOM helpers). No React/Next unless explicitly a UI package (we avoid UI packages).
- `persistence-*`: persistence adapters. `persistence-postgres` may depend on Drizzle/Postgres, but capability cores must not.

## Independent Versioning (release-please)

We use release-please with a manifest. Each publishable package is listed in:

- `.release-please-config.json`
- `.release-please-manifest.json`

When changes only affect `packages/rag-core/**`, release-please creates only a `rag-core-vX.Y.Z` tag/release. No other packages are bumped or published.

## Publishing to npm

Publishing is tag-driven:

1. release-please creates a GitHub Release with tag `<component>-vX.Y.Z`.
2. GitHub Actions workflow publishes exactly one package for that tag.

Key constraints:

- npm rejects `workspace:*` ranges. Before publish we rewrite workspace dependency ranges using `scripts/prepare-npm-publish.ts` (ephemeral in CI checkout).
- Each package must include `README.md` and publish config. CI enforces this via `scripts/check-package-docs.ts`.

