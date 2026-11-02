# Monorepo Migration Guide

This directory contains the complete plan for migrating blah.chat from a single Next.js application to a Turborepo monorepo supporting multiple apps (web, mobile, CLI, TUI, Raycast extension).

## Table of Contents

- [Overview](#overview)
- [Why Monorepo?](#why-monorepo)
- [Tool Selection: Turborepo vs NX](#tool-selection-turborepo-vs-nx)
- [Architecture Decisions](#architecture-decisions)
- [Target Structure](#target-structure)
- [Phase Overview](#phase-overview)
- [Package Naming Convention](#package-naming-convention)

---

## Overview

blah.chat is a personal AI chat assistant with multi-model support, conversation branching, and transparent cost tracking. The project aims to expand beyond web to include:

- **Mobile App**: React Native with Expo
- **CLI**: Command-line interface for terminal users
- **TUI**: Terminal UI for interactive terminal experience
- **Raycast Extension**: Quick access from Raycast launcher

A monorepo architecture enables code sharing across all these platforms while maintaining a single source of truth for the Convex backend, AI model configurations, and shared utilities.

---

## Why Monorepo?

### Problems with Current Structure

1. **Code Duplication**: Building mobile/CLI would require copying Convex schema, types, and configurations
2. **Type Drift**: Separate repos lead to type definitions getting out of sync
3. **Dependency Hell**: Managing different versions of shared dependencies across repos
4. **Development Friction**: Changes to shared code require updates across multiple repositories

### Benefits of Monorepo

1. **Single Source of Truth**: Convex schema, AI models, and utilities live in one place
2. **Atomic Changes**: Update shared code and all apps in one commit
3. **Simplified CI/CD**: One pipeline, coordinated deployments
4. **Type Safety**: All apps share generated Convex types automatically
5. **Developer Experience**: One `bun install`, one repo to clone

---

## Tool Selection: Turborepo vs NX

### Research Summary (December 2025)

| Factor | Turborepo | NX |
|--------|-----------|-----|
| **Bun Support** | STABLE (v2.6+) | None |
| **Setup Time** | ~15 minutes | 2-3 days |
| **Config Complexity** | ~20 lines | 200+ lines |
| **Learning Curve** | Shallow | Steep |
| **Build Speed (mid-size)** | 3-4x faster | Slower |
| **Workflow Changes** | Minimal | Forced restructuring |
| **Remote Caching** | Vercel (free tier) | Nx Cloud |

### Why Turborepo?

1. **Bun Compatibility**: blah.chat uses Bun exclusively. NX has no Bun support. Turborepo has stable Bun support since v2.6 (October 2025).

2. **Minimal Intrusiveness**: Turborepo works with existing package.json scripts. NX forces adoption of its project.json conventions and plugin system.

3. **Faster Setup**: Turborepo can be added to an existing project in 15 minutes. NX migrations typically take 2-3 days and require restructuring.

4. **Better Performance for Mid-Size Repos**: For projects under 10k packages, Turborepo benchmarks show 3-4x faster cold builds and 4x faster cached builds.

5. **Vercel Ecosystem**: As a Next.js project deployed on Vercel, Turborepo integration is seamless.

### When NX Would Be Better

- Polyglot monorepos (Rust, Java, Go)
- 10k+ package repositories
- Teams wanting code generation and advanced IDE features
- Organizations already invested in Nx ecosystem

**Decision**: Turborepo is the pragmatic choice for blah.chat.

---

## Architecture Decisions

### Decision 1: Package Naming - `@blah-chat/*`

**Options Considered**:
- `@blah/*` - Short but potential npm conflicts
- `@blah-chat/*` - Explicit, matches project name
- Unscoped (e.g., `backend`, `shared`) - Not publishable

**Decision**: `@blah-chat/*` for clarity and future npm publishing flexibility.

### Decision 2: Separate AI Package

**Options Considered**:
- Keep AI configs in Convex backend package
- Separate `@blah-chat/ai` package

**Decision**: Separate `@blah-chat/ai` package because:
- Mobile/CLI can import AI configs without Convex dependencies
- Cleaner separation of concerns
- AI configs (model definitions, pricing, prompts) are used across both frontend and backend

### Decision 3: Convex in `packages/backend/`

**Why not `apps/backend/`?**
- Convex is not a standalone "app" - it's a shared backend
- All apps import from the same generated types
- `packages/` indicates shared infrastructure

**Structure**:
```
packages/backend/
├── convex/
│   ├── _generated/    # Auto-generated, shared by all apps
│   ├── schema.ts
│   └── ...
├── convex.json
└── package.json
```

### Decision 4: Migration Scope

**Options Considered**:
- Full migration at once (all phases)
- Minimal migration (Phase 1 only)
- Phased approach (Phase 1-3 now, Phase 4-5 later)

**Decision**: Phase 1-3 now, Phase 4-5 when needed.
- Establishes monorepo foundation
- Extracts all shared code
- Defers mobile/CLI complexity until those features are prioritized

---

## Target Structure

```
blah.chat/
├── apps/
│   ├── web/                 # Next.js 15 (current app)
│   └── (future: mobile, cli, tui, raycast)
│
├── packages/
│   ├── backend/             # @blah-chat/backend - Convex
│   │   ├── convex/
│   │   │   ├── _generated/  # Auto-generated types
│   │   │   ├── schema.ts    # 1,666 lines, ~30 tables
│   │   │   ├── chat.ts, messages.ts, generation.ts, etc.
│   │   │   └── lib/         # Server-side utilities
│   │   ├── convex.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ai/                  # @blah-chat/ai - Model configs, prompts
│   │   ├── src/
│   │   │   ├── models.ts    # 46 model definitions
│   │   │   ├── prompts/     # Centralized prompt templates
│   │   │   ├── types.ts     # AI-related types
│   │   │   └── index.ts     # Barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared/              # @blah-chat/shared - Cross-platform utils
│   │   ├── src/
│   │   │   ├── formatEntity.ts
│   │   │   ├── tokens.ts
│   │   │   ├── date.ts
│   │   │   ├── types/       # Shared TypeScript types
│   │   │   └── index.ts     # Barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/              # @blah-chat/config - Shared configs
│       ├── tsconfig.base.json
│       ├── biome.base.json
│       └── package.json
│
├── turbo.json               # Task orchestration
├── package.json             # Root workspace: "workspaces": ["apps/*", "packages/*"]
├── bun.lock
├── biome.json
└── .gitignore
```

---

## Phase Overview

| Phase | Name | Scope | Status |
|-------|------|-------|--------|
| 1 | [Workspace Foundation](./phase-1-workspace-foundation.md) | Turborepo setup, move web app | **COMPLETE** |
| 2 | [Convex Backend](./phase-2-convex-backend.md) | Extract Convex to package | **COMPLETE** |
| 3 | [Shared Packages](./phase-3-shared-packages.md) | Extract AI and shared utils | **PARTIAL** (scaffolds created) |
| 4 | [Mobile App](./phase-4-mobile-app.md) | Expo/React Native setup | Future |
| 5 | [CLI/TUI/Raycast](./phase-5-cli-tui-raycast.md) | Additional apps | Future |

**Completed**: Phase 1-2 (monorepo foundation established, Convex extracted)
**Partial**: Phase 3 (package scaffolds created, code extraction deferred)

---

## Package Naming Convention

All workspace packages use the `@blah-chat/` scope:

| Package | Name | Description |
|---------|------|-------------|
| `packages/backend` | `@blah-chat/backend` | Convex schema, queries, mutations, actions |
| `packages/ai` | `@blah-chat/ai` | Model configs, prompts, AI types |
| `packages/shared` | `@blah-chat/shared` | Cross-platform utilities |
| `packages/config` | `@blah-chat/config` | Shared TypeScript/Biome configs |

### Import Patterns

```typescript
// Before (current single-app structure)
import { MODEL_CONFIG } from "@/lib/ai/models";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { formatEntity } from "@/lib/utils/formatEntity";

// After (monorepo)
import { MODEL_CONFIG } from "@blah-chat/ai";
import type { Doc, Id } from "@blah-chat/backend/_generated/dataModel";
import { formatEntity } from "@blah-chat/shared";
```

---

## Technical Considerations

### TypeScript Recursion Limits

The Convex backend has 94+ modules causing TypeScript type depth errors. This results in ~390 `@ts-ignore` comments. **This is a documented workaround and won't be fixed by the monorepo migration** - it's a fundamental TypeScript limitation with complex Convex API types.

### Convex Deployment

Convex has its own deployment pipeline separate from Next.js:
- `bunx convex dev` runs from `packages/backend/`
- `bunx convex deploy` deploys to Convex Cloud
- Web app references `NEXT_PUBLIC_CONVEX_URL` for the deployment

### Bun Workspaces

Root `package.json` uses Bun's native workspace support:
```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

No additional configuration needed - Bun handles dependency hoisting and linking.

---

## References

- [Official Convex Monorepo Template](https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/)
- [Bun Workspaces](https://bun.sh/docs/install/workspaces)
