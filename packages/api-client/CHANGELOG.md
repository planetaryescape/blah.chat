# Changelog

## [0.4.0](https://github.com/planetaryescape/blah.chat/compare/api-client-v0.3.1...api-client-v0.4.0) (2026-03-29)


### Features

* [] add trigger jobs and transport client ([974cbf4](https://github.com/planetaryescape/blah.chat/commit/974cbf4ccadf2353f0e3bf869ec078f316ca72b4))
* [] cut cli chat to generation-v2 ([d2e8af3](https://github.com/planetaryescape/blah.chat/commit/d2e8af36daafcb5d10c7ab261011cb8c9f44465d))
* [] move blob flows to r2 and postgres ([eeba2c1](https://github.com/planetaryescape/blah.chat/commit/eeba2c172b4ddc8c298cdda6ff3d8ed222ce0bb5))
* **chat:** add per-chat integration scope ([e0f0561](https://github.com/planetaryescape/blah.chat/commit/e0f056123509bdd7ab59863cf43d3e2636fddbc4))
* phase 15 - switch ALL remaining web surfaces from Convex to REST ([3137308](https://github.com/planetaryescape/blah.chat/commit/3137308d00fad960daff57746d7fef4c1010fe07))
* phase 15 - templates, projects, shares, chat components cutover ([aaf5187](https://github.com/planetaryescape/blah.chat/commit/aaf51870e7c35b2ec5c8a568b4f71d27413dccab))
* phase 15 cutover - switch web surfaces from Convex to REST/Postgres ([3ea9f68](https://github.com/planetaryescape/blah.chat/commit/3ea9f68f985e9f1c3cacc9fa8bf619800fceabfc))

## 0.3.0 (2026-02-07)


### Features

* **api-client:** add publish-ready typed API client ([002152b](https://github.com/planetaryescape/blah.chat/commit/002152ba3a0c276316d11f5327067efc43cb9a37))


### Bug Fixes

* **ci:** stabilize failing PR checks ([cc2412f](https://github.com/planetaryescape/blah.chat/commit/cc2412f40e66e4d8c3be060b60a0e392ca3e70b6))

## 0.2.0 - 2026-02-06

- Added OpenAPI doc serving endpoints for API consumers (`/api/v1/openapi.json`, `/api/v1/doc`).
- Added API client release automation workflow for merge-to-main publishing.
- Added merge guard to require API client version bumps when contract/runtime files change.
- Added expanded README with concrete API client usage patterns and project ideas.
- Switched published SDK artifact to compiled `dist` output (`.js` + `.d.ts`) for external consumers.

## 0.1.0 - 2026-02-06

- Added initial OpenAPI source contract under `openapi/openapi.json`.
- Added generated OpenAPI TS types (`src/generated/openapi.ts`).
- Added typed HTTP client (`BlahClient`) with bearer and API-key auth support.
- Added CLI RPC wrappers and SSE stream helpers.
- Added CI drift checks for generated OpenAPI types.
