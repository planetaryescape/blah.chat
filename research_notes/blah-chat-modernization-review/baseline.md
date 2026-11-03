# Repository baseline, build/test/CI and documentation

## 1. What code and operational baseline does this review describe?

### Takeaway

**Review baseline: `main` at `04866f80a6236716ebf8d8c5a79001727f85f4bf`, identical to freshly fetched `origin/main`; zero tracked edits at audit start.** Existing untracked experiments are not part of the reviewed product. Findings below apply to upstream as well as the checkout unless explicitly labeled local-environment-only.

### Cited Findings

#### Git baseline and provenance

Captured on the assignment date, 2026-11-03, using read-only Git inspection plus `git fetch origin` (no pull/rebase/checkout):

| Measurement | Result |
|---|---|
| Git root | `/Users/bhekanik/code/planetaryescape/blah.chat` |
| Branch | `main` |
| HEAD | `04866f80a6236716ebf8d8c5a79001727f85f4bf` |
| Default branch | `main`, confirmed by `git ls-remote --symref origin HEAD` |
| Refreshed default SHA | `04866f80a6236716ebf8d8c5a79001727f85f4bf` |
| Ahead / behind | `0 / 0`, from `git rev-list --left-right --count HEAD...origin/HEAD` |
| Tracked staged / unstaged changes | `0 / 0` |
| Untracked files | `4,100`: `.build/` 2, `experiments/` 4,098; no filenames enumerated |
| Fetch result | Exit 0; updated only the observed non-default remote branch `origin/fix/lint-typecheck-main`, `14de5b2b..44fe2388` |
| Tracked-list fingerprint | SHA-256 of raw `git ls-files -z`: `71b794c26480c2ec971b162f43469f980a1c1b5f7c30f4c915b2c45aa985786d` |

Source: exact command outputs from this audit; immutable [reviewed commit](https://github.com/planetaryescape/blah.chat/commit/04866f80a6236716ebf8d8c5a79001727f85f4bf). Concurrent auditors may subsequently add research notes; these do not retroactively change this starting baseline.

#### Deterministic inventory

Inventory input is **2,256 tracked files**, not recursive filesystem enumeration. Categories are a reproducible first-match heuristic, not a claim that every file was semantically reviewed. Rule precedence: generated (`/_generated/`, `/generated/`, `.lock`, `.lockb`); test (test/tests/e2e/fixtures path segment or `.test.`/`.spec.`); docs (`.md/.mdx/.txt/.rst` or `docs/` prefix); asset (common image/font/audio/video/PDF suffix); infra (`.github/`, `/src-tauri/`, Dockerfile, `vercel.json`); script (`scripts/` path segment or root `install`); data/schema (`schema` substring, `/migrations/`, `.sql/.csv`); config (`.json/.yaml/.yml/.toml/.mjs/.cjs`, dot-prefixed basename, `.config.`); markup (`.html/.css`); remaining files code. Thus assets inside `docs/` count as docs and native sources inside `src-tauri/` count as infra. Source: audit `git ls-files -z` classification.

| Category | Files |
|---|---:|
| Code | 1,338 |
| Test, fixture and test-support | 160 |
| Config | 249 |
| Docs | 324 |
| Infra | 34 |
| Data/schema | 59 |
| Script | 20 |
| Markup | 15 |
| Generated/lock | 10 |
| Asset | 47 |
| **Total** | **2,256** |

Tracked extension counts: **962 `.ts`, 567 `.tsx`, 10 `.rs`, 8 `.js`, 3 `.mjs`, 1 `.jsx`, 2 `.kt`, 1 `.swift`, 1 `.h`, 8 `.css`, 8 `.html`, 308 `.md`, 222 `.json`, 19 `.yml`, 2 `.yaml`, 2 `.toml`**. These count declarations/tests/generated files too; do not present them as application LOC. Top-level concentration: `apps/` 1,250, `packages/` 688, `docs/` 217. Source: exact tracked-list extension and prefix counters.

There are **34 workspace manifests: four apps plus 30 packages**, excluding the root manifest. Script availability across those 34 manifests: build 31, lint **3**, typecheck 29, test:run **8**, test:e2e 1. Source: tracked `apps/*/package.json` and `packages/*/package.json`, parsed as JSON; [workspace declaration](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/package.json#L1-L36).

| Surface | Inventory / actual entrypoints | Baseline technology / commands |
|---|---|---|
| Web | `apps/web/src/app/layout.tsx`, `src/proxy.ts`; 40 nested `page.tsx`, 27 API `route.ts` files | Next `16.4.3`, React `19.2.6`, AI SDK `^6.0.3`, Convex `1.48.0`; `next build`, Biome, `tsc --noEmit`, Vitest, Playwright |
| Backend | `packages/backend/convex/http.ts`, `convex.config.ts`, `crons.ts`, `schema.ts`; 357 `.ts` under `convex/`, including 26 schema modules and 25 migration files | Convex `1.48.0`; dev/deploy/codegen scripts build four shared packages first; no package `build`, `lint` or `typecheck` script |
| CLI | `apps/cli/src/index.tsx` | Bun build/compile scripts, `bun test tests`, TypeScript and Biome |
| Mobile | `apps/mobile/app/_layout.tsx`, native Android/iOS projects | Expo `~54.0.0`, RN `0.81.5`, declared React `19.1.0`; `expo export`, Bun tests, Biome, TypeScript |
| Desktop | `apps/desktop/src-tauri/src/main.rs` | Tauri `2.9.1`, Rust 2021; macOS-only package build, Bun release/promotion tests; no package lint/typecheck script |
| Shared capabilities | 27 tracked `packages/*/src/index.ts` entrypoints | Mostly `tsup --format esm --dts --clean`; package-specific publishing |
| Task orchestration | Root `package.json`, `turbo.json` | Bun pinned `1.3.5`; Turbo `2.9.14`; Biome `2.4.15` |
| CI | 13 tracked `.github/workflows/*.yml` | CI lint/typecheck, tests, web build, deployed smoke; CodeQL JS/TS; release/rollback; Dependabot Bun and Actions |
| Deployment | `apps/web/vercel.json`, `release.yml`, `rollback.yml`; CLI/package/Raycast release workflows | Vercel London region; Convex deployed separately before staging; exact-artifact manual web promotion; desktop automatic release explicitly suspended |

Sources: [web manifest](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/package.json), [backend manifest](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/backend/package.json#L13-L19), [mobile manifest](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/mobile/package.json), [desktop Cargo manifest](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/desktop/src-tauri/Cargo.toml#L1-L21), [Vercel configuration](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/vercel.json#L1-L26), [desktop release suspension](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/docs/packaging.md#L27-L30). File counts are exact tracked-path counters, not framework-discovered runtime endpoints.

The 30 package directories are `ai`, `api-client`, `api-envelope`, `assistant-tools-core`, `auto-router`, `backend`, `bible-core`, `bible-service`, `byod-schema`, `chat-ui-core`, `code-execution-core`, `cognitive-memory`, `config`, `content-core`, `content-ingest`, `crypto-core`, `diagrams-mermaid`, `integrations-composio`, `jobs`, `markdown-web`, `notes-core`, `persistence-convex`, `rag-core`, `sdk`, `search-core`, `search-tools`, `shared`, `speech`, `storage`, `streaming-core`. Source: tracked workspace manifest inventory.

### Inferences

- Modernization should start from an already-modern Next 16 / React 19 / AI SDK 6 / Convex monorepo, not describe a hypothetical upgrade from Next 15 or a missing mobile/CLI application. Stabilizing the delivery contract is more urgent than changing orchestrators. Sources: manifests above; [stale monorepo target](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/docs/monorepo/README.md#L140-L200).

### Gaps

- Local runtime differs from the repository pin: `bun --version` **1.3.14**, `node --version` **v26.7.0**. Existing dependencies are incomplete; no install was authorized. Passing local checks are not clean-install reproducibility proof.
- The inherited production-environment blocker is documented, not freshly verified here: the November 2 packaging notes describe unrestricted GitHub production environment policy and explain why promotion must remain blocked. No credentialed GitHub/Vercel/environment queries were performed. [Existing operational observation and required remediation](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/docs/packaging.md#L86-L110).

## 2. Which build, test, CI and documentation issues materially affect reliability?

### Takeaway

The important risks are **false assurance at delivery boundaries**: deployed smoke does not test the candidate artifact or generation durability, most packages have no lint task, package-release validation confuses failure with absence, and setup documentation describes the old repository layout. Production promotion itself has useful exact-SHA/manual-journey safeguards that should be preserved.

### Cited Findings

#### B1 — High severity / high confidence: CI browser smoke does not validate the code being reviewed or the defining generation workflow

- **Evidence:** CI builds the candidate web app, then independently runs smoke against `SMOKE_BASE_URL`; PRs without that secret fall back to `https://www.blah.chat`. There is no candidate deployment handoff or local web server in the smoke config. Smoke checks health/sign-in and, when auth is available, creates/reads/deletes a conversation; it never sends a model message. PRs without storage state skip authenticated smoke. [`.github/workflows/ci.yml:170–245`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/.github/workflows/ci.yml#L170-L245), [`apps/web/playwright.smoke.config.ts:3–15`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/playwright.smoke.config.ts#L3-L15), [`smoke-staging.spec.ts:10–60`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/e2e/smoke-staging.spec.ts#L10-L60).
- **Coverage distinction:** Durable-generation browser tests exist, but missing authentication turns setup failure into `test.skip`. Backend generation tests explicitly test supporting queries/mutations rather than the external-LLM main action. [`resilient-generation.spec.ts:26–37,44–93`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/e2e/resilient-generation.spec.ts#L26-L93), [`generation.test.ts:19–28`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/backend/convex/__tests__/generation.test.ts#L19-L28).
- **Impact:** A healthy older deployment can coexist with a broken candidate; green automated CI does not demonstrate send → durable partial response → refresh → completed persisted response. This is a coverage defect, not evidence that generation currently fails.
- **Fix path:** Keep deployed liveness as a separate operational signal. Add an isolated candidate-artifact journey using deterministic fake-provider streaming and seeded/authenticated test state. Missing required auth should fail this gate rather than skip. Keep opt-in paid-provider canaries separate and budgeted.
- **Validation:** Introduce deliberate refresh-persistence and stream-completion faults; candidate CI must fail, with nonzero assertions for tests executed. Attach reports/traces with credential-safe retention. [Current Playwright CI guidance](https://playwright.dev/docs/ci-intro).
- **Existing mitigation:** Production staging/promotion requires exact-source checks plus manual sign-in/send/refresh/persistence acknowledgement; do not remove that protection when adding automation. [`release.yml:25–60,100–159`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/.github/workflows/release.yml#L25-L159).

#### B2 — Medium severity / high confidence: repository-wide lint is actually three app checks; backend type checking has no explicit CI task

- **Evidence:** Only CLI, mobile and web define `lint`; the other **31/34** workspaces do not. The Turbo dry run has 43 graph nodes but only **three real lint commands**, so node count is not check coverage. Backend defines dev/deploy/generate/tests but no lint/typecheck; CI explicitly selects only web typecheck. Shared `.d.ts` builds are useful but do not substitute for lint or guarantee all backend roots are checked. [`package.json:14–18`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/package.json#L14-L18), [`packages/backend/package.json:13–19`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/backend/package.json#L13-L19), [`ci.yml:67–85`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/.github/workflows/ci.yml#L67-L85), exact dry-run results below.
- **Impact:** Core shared packages and server-side generation/security code can miss repository lint entirely. Backend TypeScript diagnostics may be discovered only through incidental web imports or deployment instead of an explicit PR gate.
- **Fix path:** Define and document a scope matrix: backend offline typecheck, shared package typechecks, tracked-source Biome coverage, web/mobile/CLI checks, platform-specific release gates. Avoid linting thousands of untracked experiments by accident.
- **Validation:** A seeded lint violation in backend/shared code and an error in a backend module unreachable from web imports must fail the intended PR checks. Assert the expected package/task set in a dry-run contract test.

#### B3 — Medium severity / high confidence: package release treats a failed build/typecheck as a missing script

- **Evidence:** The release workflow executes each command inside `if ... >/dev/null 2>&1`; a nonzero result enters an informational “No typecheck/build script” branch and continues. On success it executes the same command again. This checks exit status, not script existence. [`.github/workflows/release-package.yml:117–134`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/.github/workflows/release-package.yml#L117-L134).
- **Impact:** Typecheck failures are hidden and release advances to packaging/publishing. A later `prepublishOnly` build may independently catch some build failures; do not claim every broken build necessarily publishes. Double execution also wastes release time.
- **Fix path:** Inspect `package.json.scripts` for existence, then execute the command once with its output visible and failure fatal. Build workspace dependencies before the package where necessary.
- **Validation:** In isolated workflow tests, a package with no optional script should be handled intentionally; a package whose declared script exits 1 must fail before rewriting metadata or publishing.

#### B4 — Medium severity / high confidence: documented web onboarding invokes the wrong project scope and obsolete backend location

- **Evidence:** CONTRIBUTING tells contributors to run root `bunx convex dev` and a root Convex seed, then `bun dev` as Next.js. Backend lives in `packages/backend`, while root `dev` is `turbo dev`. The actual dry run starts **five dev commands**: backend, CLI, desktop/Tauri, mobile/Expo and web. [`CONTRIBUTING.md:25–40`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/CONTRIBUTING.md#L25-L40), [`package.json:10–22`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/package.json#L10-L22), [`packages/backend/package.json:14–16`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/backend/package.json#L14-L16).
- **Measured scope:** Six additional real graph commands are shared-package builds. The root dry run has 43 total nodes, 11 real commands and 32 nonexistent task placeholders.
- **Impact:** A web contributor unexpectedly needs native/Expo/terminal-client prerequisites, and the separately launched backend can conflict with the backend already selected by root dev. Root-relative Convex instructions no longer identify the actual functions project.
- **Fix path:** Document a web+backend scoped command and package-qualified seed/codegen operations; distinguish “all apps” from normal web development. Keep backend credentials in the backend environment, not generic instructions to add everything locally.
- **Validation:** Fresh isolated checkout, documented minimum toolchain, no native SDKs: follow the web quickstart verbatim and obtain only web/backend services. Do not perform this validation against production data.

#### B5 — Medium severity / high confidence: deployment/setup docs promise incompatible runtime/layout assumptions

- **Evidence:** SELF_HOSTING describes Next.js 15 and Node 18+, while manifest pins Next 16.4.3. Current official Next docs require Node **20.9+** and note that Next 16 does not run lint during build. The guide still invokes root `bunx convex dev`. [`SELF_HOSTING.md:12–18,141–162`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/SELF_HOSTING.md#L141-L162), [Next installation/system requirements](https://nextjs.org/docs/app/getting-started/installation), [web manifest](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/package.json).
- **Related evidence:** `docs/README.md:5` links missing root `CLAUDE.md`; monorepo docs label mobile/CLI future and shared packages scaffolds despite their implemented workspace manifests. Root AGENTS still cites `src/lib/utils/formatEntity.ts` and `src/lib/...` instead of current app/package paths. [`docs/README.md:3–5`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/docs/README.md#L3-L5), [`docs/monorepo/README.md:192–200`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/docs/monorepo/README.md#L192-L200), [`AGENTS.md`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/AGENTS.md).
- **Impact:** Supported-looking deployment recipes can fail before application startup; obsolete project plans mislead both humans and agents about what needs building. This is operational drift, not merely cosmetic wording.
- **Fix path:** Reconcile README/CONTRIBUTING/SELF_HOSTING against current manifests and environment boundaries; mark historical monorepo plans as historical; have one versioned setup source and current operational index.
- **Validation:** Check documented file links and commands in CI; smoke the documented minimum Node/Bun versions and a no-native-tools web-only setup.

#### B6 — Medium severity / medium confidence: PR affected filtering lacks sufficient Git history

- **Evidence:** Checkout uses action defaults (shallow history); the only explicit base fetch is `git fetch origin "$BASE_REF" --depth=1`. The custom filter is `--filter=...[origin/<base>]`. This pattern repeats in lint/test/build jobs, although the build later uses a fixed web filter. [`ci.yml:19,28–35,94–101,137–144`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/.github/workflows/ci.yml#L19-L35).
- **Current research:** Turborepo explicitly warns that Git-history filtering needs available history; current `--affected` has a full-run fallback for shallow clones. Latest docs are newer than this repo's pinned Turbo, so verify behavior on **2.9.14**, not just the latest CLI. [Constructing CI](https://turborepo.com/docs/crafting-your-repository/constructing-ci), [run/affected reference](https://turborepo.com/docs/reference/run#--affected).
- **Impact / confidence limit:** Merge-base discovery can fail or force unexpectedly broad work. This audit did not replay a GitHub PR merge checkout, so this is a concrete configuration risk, **not a reproduced CI failure**.
- **Fix path:** Fetch sufficient ancestry or use a tested affected-mode configuration with intentional fallback. Prefer simple full scoped quality gates with caching until the optimization is demonstrated safe.
- **Validation:** Reproduce depth-one merge checkouts for same-repo/fork PRs, diverged branches, rename-only/shared-package/root-config changes, and verify exact task selections with pinned Turbo.

#### Existing safeguards and caveats, not additional defects

- `ignoreBuildErrors: true` means `next build` deliberately bypasses TypeScript, but CI has a separate web typecheck and promotion requires its named successful check. Do **not** report that TypeScript is completely unchecked. Keep those gates inseparable, or restore build-time checking. [`next.config.ts:30–32`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/next.config.ts#L30-L32), [`ci.yml:84–85`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/.github/workflows/ci.yml#L84-L85), [official warning and precise bypass semantics](https://nextjs.org/docs/app/api-reference/config/next-config-js/typescript).
- Backend test discovery selects `convex/**/*.test.ts`, leaving **nine legacy test files** under `packages/backend/__tests__/` undiscovered. Many have newer similarly named copies under `convex/__tests__`; this is a discovery/accounting gap, not proof that nine behaviors lack coverage. [`packages/backend/vitest.config.ts:5–9`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/backend/vitest.config.ts#L5-L9), [legacy conversations test](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/backend/__tests__/conversations.test.ts#L1-L29).
- CodeQL and production dependency audit exist; dependency automation groups patches and deliberately avoids independent Expo/RN minor-major bumps. Preserve this compatibility-aware behavior rather than suggesting blind “upgrade everything.” [`codeql.yml:17–34`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/.github/workflows/codeql.yml#L17-L34), [`ci.yml:49–53`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/.github/workflows/ci.yml#L49-L53), [`dependabot.yml:18–51`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/.github/dependabot.yml#L18-L51).

### Inferences

- A quality-gate coverage matrix and deterministic provider test seam would yield more confidence than substituting a different monorepo tool or test runner. The existing Bun/Turbo/Vitest/Playwright stack already supplies the necessary primitives. Sources: manifest/task inventory, B1–B3, and official CI guidance above.

### Gaps

- No claim is made about current GitHub check conclusions, branch-protection rules, remote cache hits, production environment protections, deployed backend schema, actual browser behavior or live provider success. Those require authorized runtime evidence beyond this offline audit.

## 3. What verification was possible, and how should the modernization blueprint use it?

### Takeaway

Static task/discovery evidence is complete for this scope; local execution is constrained by an incomplete existing dependency tree and must not be presented as clean CI reproduction. Create a **fresh current-state blueprint**, reusing and linking existing architecture/runbook content rather than overwriting historical plans.

### Cited Findings

#### Verification ledger

Heavy checks used `agent-work run -- ...`, with `RAYON_NUM_THREADS=4`, `UV_THREADPOOL_SIZE=4` and Vitest `--maxWorkers=4`. Each actual queued check has an internal 30/40/100-second subprocess timeout; no dependencies were installed. Inherited environment keys containing API_KEY/TOKEN/SECRET/PASSWORD/CONVEX/CLERK were removed from these check processes. No deployed smoke, generation, migrations, Convex dev/deploy/codegen or provider calls were intentionally invoked.

Local log directory: `/private/var/folders/3p/n76j7jp14ljcvr1bhf7qmlh00000gn/T/opencode/blah-baseline-verification/`. Results below are command evidence, not source-code assertions.

| Check | Exact invocation / working directory | Result |
|---|---|---|
| Package publishing docs | `bun run package-docs:check`, root | **Exit 0**, 1.14 s including queue; `check-package-docs: ok (27 packages)`; `package-docs.log` |
| Web Biome | `../../node_modules/.bin/biome check . --max-diagnostics=10`, `apps/web` | **Exit 0**, 1.15 s including queue; **793 files checked**, 264 ms tool time; no fixes; `web-lint.log` |
| Initial Vitest/tsc paths | `../../node_modules/.bin/vitest run --maxWorkers=4` in backend/web; `../../node_modules/.bin/tsc --noEmit --incremental false` in web | All **exit 1 before tool launch**: root does not contain these binaries. These were audit invocation errors, **not failing tests/type diagnostics**; corrected attempts below |
| Backend package test script | `bun run test:run --maxWorkers=4`, `packages/backend` | **Exit 127**, 1.10 s including queue; `vitest: command not found`; no tests executed; `backend-script.log` |
| Web Vitest | `node_modules/.bin/vitest run --maxWorkers=4`, `apps/web` | **Exit 1**, 10.27 s including queue / 8.91 s Vitest time; **30 failed / 36 passed files (66)**; **13 failed / 323 passed tests (336)**; `web-tests-actual.log` |
| Web TypeScript | `node_modules/.bin/tsc --noEmit --incremental false`, `apps/web` | **Exit 2**, 9.78 s including queue; **3,792 diagnostics across 468 files**, including **863 TS2307 unresolved-import errors**; `web-typecheck-actual.log` |
| Build planning | `node_modules/.bin/turbo build --filter=@blah-chat/web --dry=json`, root | **Exit 0**; 10 graph nodes, **7 real build commands**, 3 nonexistent placeholders; no compilation |
| Typecheck planning | `node_modules/.bin/turbo typecheck --filter=@blah-chat/web --dry=json`, root | **Exit 0**; 10 nodes, 6 real dependency builds + web typecheck, 3 nonexistent placeholders |
| Lint planning | `node_modules/.bin/turbo lint --dry=json`, root | **Exit 0**; 43 graph nodes; 3 real lint commands + 6 real dependency builds |
| Dev planning | `node_modules/.bin/turbo dev --dry=json`, root | **Exit 0**; 43 nodes, 5 dev + 6 shared-build commands |
| Test planning | `node_modules/.bin/turbo test:run --dry=json`, root | **Exit 0**; 43 nodes, **8 real test commands** + 6 dependency builds |

An earlier queued `python3 -` heredoc attempt waited on daemon stdin and was explicitly cancelled via `agent-work cancel 697`, exit **143**; it executed no checks and is not application failure evidence. Subsequent submissions used `python3 -c` and one actual check per queue slot. Queue task IDs were reused after completion, so use log filenames rather than ID as the durable evidence key.

**Interpretation of failed checks (local environment, not established upstream defects):** `packages/backend/node_modules` is absent, and `apps/web/node_modules/convex` is absent. Twenty-five web suites fail at module import; six additional individual API tests also fail resolving `convex/server`. The remaining seven failing assertions/errors are in AI registry, pricing and model transforms. They resolve through `@blah-chat/ai` exports to existing `dist/` files: local `dist/registry.js` lacks the OpenRouter preflight message present in current source, and local `dist/models.js` lacks `openrouter:gpt-5.5`, which current source defines. Therefore stale artifacts are a confirmed confounder, not just a theory. Direct package execution intentionally bypassed Turbo's dependency rebuilds; no claim is made that the full properly installed root test command fails for these reasons. [Web re-export](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/src/lib/ai/registry.ts#L1), [AI dist export contract](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/ai/package.json#L7-L30), [current preflight source](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/ai/src/registry.ts#L75-L85), [current model entry](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/ai/src/models.ts#L1040-L1052). Local existence/content checks and failure details are recorded in the audit command outputs/logs above.

TypeScript diagnostic counts by code: TS7006 2,428; TS2307 863; TS7031 303; TS18046 106; TS2339 33; TS7053 19; TS2305 14; TS2322 8; TS2875 7; TS2769 4; TS2345 3; TS2454 2; TS2353 1; TS7022 1. These include unresolved dependencies and cascading errors; **do not convert this into 3,792 confirmed source bugs**. The command also demonstrates that web TypeScript does traverse many imported backend modules, reinforcing the distinction between incidental coverage and an explicit backend gate in B2. Source: `web-typecheck-actual.log`, regex count `error (TS\d+):`.

Post-verification `git diff --stat` and `git diff --cached --stat` both remained empty. Only this assigned research-note file was added; no tracked application source/configuration was changed.

#### Test and coverage inventory

Exact tracked test-file regex: `\.(test|spec)\.[jt]sx?$`, yielding **152 files**. Source: tracked-list counter and test configs.

| Workspace | Tracked test/spec files | Discovery / meaning |
|---|---:|---|
| web | 79 | 66 unit/component/API/hook tests + 13 E2E specs; normal Playwright excludes smoke; CI smoke selects only one spec |
| backend | 52 | 43 selected under `convex/`; 9 legacy top-level suites outside configured include |
| auto-router | 7 | Vitest classifier/router/embedding/registry/core/hard-rules/bin-selector |
| cognitive-memory | 7 | Vitest; package test:run requests coverage |
| chat-ui-core | 2 | Vitest commands/drafts |
| CLI | 1 | Bun transport tests |
| desktop | 2 | Bun promotion/release tests, not native UI coverage |
| mobile | 2 | Bun action lifecycle/native regression tests, not simulator journeys |
| **Total** | **152** | File counts are not executed-test or assertion counts |

Only cognitive-memory config declares enforced coverage thresholds (lines/functions/statements **80%**, branches **75%**); web emits coverage reports if requested but defines no thresholds, and backend config defines no coverage gate. This is a risk-based coverage-policy gap, not a recommendation to chase global percentages. [`packages/cognitive-memory/vitest.config.ts:9–24`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/cognitive-memory/vitest.config.ts#L9-L24), [`apps/web/vitest.config.ts:19–30`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/vitest.config.ts#L19-L30), [`packages/backend/vitest.config.ts`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/packages/backend/vitest.config.ts).

#### Existing docs versus a fresh blueprint

No tracked path contains `blueprint`, no `docs/blueprint/` directory was found, and content search of `docs/` found no `blueprint` mention. Existing material is distributed across `docs/spec.md` (product intent), `docs/architecture/*` (principles), `docs/monorepo/*` (historical migration plan), `docs/packaging.md` (current release safety), and `docs/migrations/restore-postgres-to-convex.md` (operational recovery). The architecture index has just four pattern documents and describes mobile as REST; it is not a current cross-platform operational blueprint. [`docs/architecture/README.md:5–17`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/docs/architecture/README.md#L5-L17), [`docs/spec.md:1–57`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/docs/spec.md#L1-L57), [`docs/packaging.md:32–110`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/docs/packaging.md#L32-L110).

### Inferences

Recommended blueprint content, **research/planning only, not authorization to implement**:

1. **Baseline and constraints:** exact audited SHA, dirty-state boundary, supported runtime versions, user-critical workflow, no paid/live mutations in default checks.
2. **Current architecture and ownership:** four apps, Convex event/cron/HTTP entrypoints, package boundaries, build graph and which contracts are generated; distinguish implemented behavior from product intent.
3. **Decision ledger:** retain Bun/Turbo, Next/Convex durable execution and current promotion safeguards unless another auditor supplies contrary evidence; record alternatives with dated primary sources and migration costs.
4. **Verification contract:** explicit package-by-check matrix, known skips, deterministic streaming test seam, candidate-artifact browser gate, separate live-environment health and opt-in provider canaries.
5. **Delivery plan:** first reproduce clean-install baseline on pinned tools in an isolated environment; then close B1–B6 with focused independently verifiable milestones. Do not mask known diagnostics or call a remote liveness test candidate validation.
6. **Operations and rollback:** staged exact-SHA artifacts, backend compatibility, migration pause/audit/unpause, external production-policy blocker, owner and approval requirements. Reuse current runbooks instead of copying them into divergent prose.
7. **Acceptance and evidence:** clean install → lint/typecheck/unit tests → candidate build → authenticated deterministic refresh/reconnect/cancel journeys → staged manual/live validation → protected promotion; separate measured results, inference, open question and implementation proposal.

These recommendations follow the evidenced gaps B1–B6 and existing release/runbook constraints, not a general-purpose rewrite agenda.

### Gaps

- **No production build executed:** full root build would also select native/mobile products; web production build needs application configuration and fetches Google fonts (`next/font/google`). With incomplete existing package installation and prohibited dependency installs, the bounded offline lint/test/typecheck attempts provide more useful evidence than an uncontrolled build. No build pass or production readiness is claimed. [`apps/web/src/app/layout.tsx:12`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/src/app/layout.tsx#L12), [`turbo.json:4–13`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/turbo.json#L4-L13).
- E2E suites that authenticate, mutate Convex or call paid models were deliberately not run. In particular, authenticated deployed smoke performs writes and deletes, so even “smoke” is not read-only. [`smoke-staging.spec.ts:34–56`](https://github.com/planetaryescape/blah.chat/blob/04866f80a6236716ebf8d8c5a79001727f85f4bf/apps/web/e2e/smoke-staging.spec.ts#L34-L56).
- Dependency vulnerability freshness, latest compatible framework versions, actual native builds/device behavior, deployment permissions and provider latency/cost are assigned to adjacent audits or require separate authorized evidence. No dependencies, credentials, deployments or tracked source files were changed.
