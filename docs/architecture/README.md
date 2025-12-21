# Architecture Documentation

Core system design patterns and architectural decisions.

## Contents

- [API Hybrid Architecture](./api-hybrid.md) - Dual transport layer (Convex WebSocket + REST API)
- [Resilient Generation](./resilient-generation.md) - Server-side streaming that survives page refresh
- [Schema Normalization](./schema-normalization.md) - Database design patterns and migration guide
- [TypeScript Workarounds](./typescript-workarounds.md) - Solutions for Convex type depth issues

## Key Principles

1. **Resilient by default** - All generations persist server-side
2. **Hybrid transport** - Convex for web, REST for mobile
3. **Normalized schema** - Junction tables over nested arrays
4. **Type-safe pragmatism** - Work around TypeScript limits without losing safety
