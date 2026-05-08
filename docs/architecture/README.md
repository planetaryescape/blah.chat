# Architecture Documentation

Core system design patterns and architectural decisions.

## Contents

- [API Hybrid Architecture](./api-hybrid.md) - Historical dual-transport notes from the Convex-to-REST migration
- [Resilient Generation](./resilient-generation.md) - Server-side streaming that survives page refresh
- [Schema Normalization](./schema-normalization.md) - Database design patterns and migration guide
- [TypeScript Workarounds](./typescript-workarounds.md) - Legacy Convex type-depth notes
- [v1 Launch Readiness Assessment](./v1-launch-readiness-assessment.md) - Snapshot from 2026-05-06

## Key Principles

1. **Resilient by default** - All generations persist server-side
2. **REST-first transport** - Web, mobile, and external clients use HTTP APIs backed by Postgres
3. **Normalized schema** - Junction tables over nested arrays
4. **Type-safe pragmatism** - Work around TypeScript limits without losing safety
