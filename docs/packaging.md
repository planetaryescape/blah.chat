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

`release.yml` is manually dispatched from protected default branch `main` for both
staging and promotion. Publishing a release tag no longer triggers staging from
that tag. A blank `promote_deployment` requests staging; the same secret-free
source/environment/CI preflight gates both paths. It deploys compatible backend functions and stages the web artifact
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
equal to the checked-out main commit (`PROMOTION_SOURCE_SHA`). CLI-created deployments
may omit `gitSource`; only in that case, all three metadata fields must match:
`meta.gitCommitSha === PROMOTION_SOURCE_SHA`,
`meta.sourceCommit === PROMOTION_SOURCE_SHA`, and `meta.gitDirty === "0"`.
A present but wrong or malformed `gitSource` is always rejected, even when metadata
matches. This is an attestation from the trusted staging path, **not a cryptographic
signature**, and no caller-entered source SHA is accepted.

Immediately before Vercel upload, staging verifies `HEAD` equals the trusted SHA,
both the tracked working tree and index are clean, and there are no untracked
nonignored files. Only after this check succeeds, the trusted staging command
explicitly passes `sourceCommit` and `gitCommitSha` equal to
`PROMOTION_SOURCE_SHA`, plus the string-valued `gitDirty=0` marker, as CLI metadata.
GitHub-runner deployments can emit `githubCommitSha` instead of `gitCommitSha`
and omit `gitDirty`, so automatic Vercel Git metadata is not sufficient.
Generated binding changes from Convex codegen also fail this gate; commit the
current bindings rather than ignoring those changes. These metadata fields attest
to the preceding clean-source check; they do not replace it.

If staging rejects untracked source files, its error lists filenames only (up to
20 paths, each limited to 512 characters, with control characters escaped). It
does not read file contents. Identify the producing step and review the output;
do not bypass the guard, delete unknown files, or add broad ignore patterns.

The backend deploy script generates exports in `packages/{ai,shared,auto-router,cognitive-memory}/dist/`.
These four build directories are ignored by the repository, not just a local
global Git configuration. A regression test disables global ignores and checks
that generated exports are accepted while an untracked source file is rejected.

Promotion then uses only the
verified immutable deployment ID. The selected commit must also have successful
GitHub Actions checks named `Lint & Typecheck`, `Unit & Integration Tests`, and
`Build`; all pages are read before admission, including later failed reruns.
Pagination is limited to 100 pages of 100 checks; overflow, failed requests and
malformed pages fail closed without accepting partial results.
Missing provenance is rejected; use the separate
rollback workflow for an older verified production artifact. The read-only Vercel
deployment API is used because `vercel inspect --json` omits project/source fields.

The coordinator observed the existing production artifact
`dpl_7459Sr6pJERwJDC86fNkwZfP9BTm` without `gitSource`, with both metadata SHAs
pointing to the old deployed source and `gitDirty: "1"`. It is deliberately
ineligible for this promotion path; no dirty-artifact exception was added and no
live deployment was changed.

### External production-environment blocker

**Resolved setting, 2026-11-03:** BK authorized restricting `Production` to
protected branches. A subsequent GitHub environment API read confirmed
`protected_branches: true`, `custom_branch_policies: false` and a `branch_policy`
protection rule; `main` was independently confirmed protected. No secrets,
billing or reviewer settings changed. This resolves the configuration observation
below, not the candidate CI or authenticated staged-journey gates. Those still
must pass for each deployment.

**Historical observation, superseded by the resolution above:** the coordinator's read-only observation on 2026-11-02 found environment
`Production` with `protection_rules: []` and `deployment_branch_policy: null`.
That configuration was not safe for branch-restricted production secret access.
Preflight supports **only** the server-side protected-branches policy:
`deployment_branch_policy.protected_branches === true` and
`deployment_branch_policy.custom_branch_policies === false`. An unavailable
environment API also blocks promotion. The read-only checks use `GITHUB_TOKEN`;
no environment settings are changed.

The former exact-main custom-policy mode is retired. Listing custom deployment
branch policies requires Administration read access unavailable to this workflow's
`GITHUB_TOKEN` permissions. The workflow does not request that endpoint, add a PAT
or GitHub App credential, or expand permissions. A custom-policy environment,
even one intended to allow only main, is rejected with a protected-branches
configuration requirement. Protected default branch `main` remains independently
required by the dispatch and source checks.

Vercel secrets are step-scoped and passed to promotion only after preflight
succeeds. These workflow guards alone do **not** prevent a malicious branch
workflow from removing its own checks if the environment is unrestricted.
An authorized operator configured the server-side environment policy as recorded
above; verify it again before each live promotion. This setting does not prove
human sign-in/generation journeys; the manual acknowledgement is still required.

## Publishing to npm

Publishing is tag-driven:

1. release-please creates a GitHub Release with tag `<component>-vX.Y.Z`.
2. GitHub Actions workflow publishes exactly one package for that tag.

Key constraints:

- npm rejects `workspace:*` ranges. Before publish we rewrite workspace dependency ranges using `scripts/prepare-npm-publish.ts` (ephemeral in CI checkout).
- Each package must include `README.md` and publish config. CI enforces this via `scripts/check-package-docs.ts`.
