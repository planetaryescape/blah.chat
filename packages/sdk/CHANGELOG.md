# Changelog

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
