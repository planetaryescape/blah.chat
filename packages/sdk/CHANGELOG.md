# Changelog

## [0.3.0](https://github.com/planetaryescape/blah.chat/compare/sdk-v0.2.1...sdk-v0.3.0) (2026-02-07)


### Features

* **sdk:** add publish-ready typed SDK ([002152b](https://github.com/planetaryescape/blah.chat/commit/002152ba3a0c276316d11f5327067efc43cb9a37))


### Bug Fixes

* **ci:** stabilize failing PR checks ([cc2412f](https://github.com/planetaryescape/blah.chat/commit/cc2412f40e66e4d8c3be060b60a0e392ca3e70b6))

## 0.2.0 - 2026-02-06

- Added OpenAPI doc serving endpoints for API consumers (`/api/v1/openapi.json`, `/api/v1/doc`).
- Added SDK release automation workflow for merge-to-main publishing.
- Added merge guard to require SDK version bumps when contract/runtime files change.
- Added expanded README with concrete SDK usage patterns and project ideas.
- Switched published SDK artifact to compiled `dist` output (`.js` + `.d.ts`) for external consumers.

## 0.1.0 - 2026-02-06

- Added initial OpenAPI source contract under `openapi/openapi.json`.
- Added generated OpenAPI TS types (`src/generated/openapi.ts`).
- Added typed HTTP client (`BlahClient`) with bearer and API-key auth support.
- Added CLI RPC wrappers and SSE stream helpers.
- Added CI drift checks for generated OpenAPI types.
