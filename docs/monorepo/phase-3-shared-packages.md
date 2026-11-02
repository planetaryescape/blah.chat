# Phase 3: Shared Packages Extraction

## Overview

This phase extracts shared code into reusable workspace packages: `@blah-chat/ai` for AI configurations, `@blah-chat/shared` for utilities, and `@blah-chat/config` for shared TypeScript/Biome configs.

**Risk Level**: Medium (many import path changes)
**Prerequisite**: Phase 2 (Convex Backend Extraction) complete
**Blocks**: Phase 4 (Mobile App), Phase 5 (CLI/TUI/Raycast)
**Status**: PARTIALLY COMPLETE - Package scaffolds created, full code extraction deferred

---

## Migration Status

Package structures created with placeholder content:
- `packages/ai/` - Scaffold ready (TODO: extract from apps/web/src/lib/ai/)
- `packages/shared/` - Scaffold ready (TODO: extract from apps/web/src/lib/utils/)
- `packages/config/` - tsconfig.base.json created

**Why deferred?** The AI code has many interdependencies with UI-specific code. Full extraction requires careful analysis to separate platform-agnostic from web-specific code. The monorepo foundation is solid - extraction can be done incrementally when needed for mobile/CLI apps.

---

## Context

### Current State (After Phase 2)

```
blah.chat/
├── apps/
│   └── web/
│       └── src/
│           └── lib/
│               ├── ai/           # AI configs - EXTRACT
│               │   ├── models.ts # 46 model definitions
│               │   ├── types.ts
│               │   ├── registry.ts
│               │   └── ...
│               ├── utils/        # Utilities - EXTRACT
│               │   ├── formatEntity.ts
│               │   ├── tokens.ts
│               │   └── ...
│               ├── prompts/      # Prompts - EXTRACT
│               └── ...
├── packages/
│   └── backend/              # @blah-chat/backend (from Phase 2)
│       └── convex/
│           └── lib/
│               └── prompts/  # Server-side prompts - may stay here
└── ...
```

### Target State

```
blah.chat/
├── apps/
│   └── web/
│       └── src/
│           └── lib/          # Only web-specific code remains
├── packages/
│   ├── backend/              # @blah-chat/backend
│   ├── ai/                   # @blah-chat/ai (NEW)
│   │   └── src/
│   │       ├── models.ts
│   │       ├── types.ts
│   │       ├── prompts/
│   │       └── index.ts
│   ├── shared/               # @blah-chat/shared (NEW)
│   │   └── src/
│   │       ├── formatEntity.ts
│   │       ├── tokens.ts
│   │       ├── types/
│   │       └── index.ts
│   └── config/               # @blah-chat/config (NEW)
│       ├── tsconfig.base.json
│       └── biome.base.json
└── ...
```

---

## What This Phase Accomplishes

1. **Creates `@blah-chat/ai`** - Centralized AI model configs, pricing, prompts
2. **Creates `@blah-chat/shared`** - Cross-platform utilities
3. **Creates `@blah-chat/config`** - Shared TypeScript and Biome configurations
4. **Updates all imports** - Both web app and Convex backend use new packages
5. **Enables future apps** - Mobile/CLI/TUI can import shared code without duplication

---

## Package Analysis: What Goes Where

### @blah-chat/ai

**Current Location**: `apps/web/src/lib/ai/`

**Files to Extract**:
| File | Purpose | Lines |
|------|---------|-------|
| `models.ts` | 46 model definitions, pricing, capabilities | ~865 |
| `types.ts` | AI-related TypeScript types | ~200 |
| `registry.ts` | Model instantiation via Gateway | ~150 |
| `reasoning.ts` | Extended thinking handlers | ~100 |
| `benchmarks.ts` | Model benchmarks data | ~50 |

**Files to Keep in Web (UI-specific)**:
- Provider-specific React components
- UI hooks for model selection

**Prompts Decision**:
- Server-side prompts (`convex/lib/prompts/`) stay in backend
- Shared prompt templates move to `@blah-chat/ai/prompts/`

### @blah-chat/shared

**Current Location**: `apps/web/src/lib/utils/`

**Files to Extract**:
| File | Purpose |
|------|---------|
| `formatEntity.ts` | API envelope formatting |
| `tokens.ts` | Token counting utilities |
| `date.ts` | Date formatting helpers |
| `stringUtils.ts` | String manipulation |
| `markdown.ts` | Markdown processing (if platform-agnostic) |

**Types to Extract** (from `apps/web/src/types/`):
- API response types
- Entity types
- Utility types

**Files to Keep in Web**:
- React-specific utilities
- Browser-only code (localStorage, DOM)
- Next.js-specific helpers

### @blah-chat/config

**Purpose**: Shared configuration files

**Files**:
- `tsconfig.base.json` - Base TypeScript config
- `biome.base.json` - Base Biome config (optional)

---

## Tasks

### Task 3.1: Create AI Package

**Create directory**:
```bash
mkdir -p packages/ai/src/prompts
```

**`packages/ai/package.json`**:
```json
{
  "name": "@blah-chat/ai",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./models": "./src/models.ts",
    "./types": "./src/types.ts",
    "./prompts/*": "./src/prompts/*"
  },
  "scripts": {
    "lint": "biome check .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/google": "^1.0.0",
    "@ai-sdk/openai": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**`packages/ai/tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**`packages/ai/src/index.ts`** (barrel export):
```typescript
// Models
export { MODEL_CONFIG, type ModelConfig } from "./models";
export { modelRegistry, createModel } from "./registry";

// Types
export type {
  AIModel,
  ModelProvider,
  ModelCapabilities,
  ModelPricing,
} from "./types";

// Reasoning
export { handleExtendedThinking } from "./reasoning";

// Benchmarks
export { MODEL_BENCHMARKS } from "./benchmarks";
```

### Task 3.2: Move AI Files

```bash
# Move files
mv apps/web/src/lib/ai/models.ts packages/ai/src/
mv apps/web/src/lib/ai/types.ts packages/ai/src/
mv apps/web/src/lib/ai/registry.ts packages/ai/src/
mv apps/web/src/lib/ai/reasoning.ts packages/ai/src/
mv apps/web/src/lib/ai/benchmarks.ts packages/ai/src/

# Move prompts (shared ones only)
mv apps/web/src/lib/prompts/* packages/ai/src/prompts/
```

### Task 3.3: Create Shared Package

**Create directory**:
```bash
mkdir -p packages/shared/src/types
```

**`packages/shared/package.json`**:
```json
{
  "name": "@blah-chat/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./formatEntity": "./src/formatEntity.ts",
    "./tokens": "./src/tokens.ts",
    "./types/*": "./src/types/*"
  },
  "scripts": {
    "lint": "biome check .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "tiktoken": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**`packages/shared/tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**`packages/shared/src/index.ts`** (barrel export):
```typescript
// Entity formatting
export {
  formatEntity,
  formatEntityList,
  formatErrorEntity,
} from "./formatEntity";

// Token utilities
export { countTokens, truncateToTokenLimit } from "./tokens";

// Date utilities
export { formatDate, formatRelativeTime } from "./date";

// Types
export type * from "./types";
```

### Task 3.4: Move Shared Files

```bash
# Move utilities
mv apps/web/src/lib/utils/formatEntity.ts packages/shared/src/
mv apps/web/src/lib/utils/tokens.ts packages/shared/src/
mv apps/web/src/lib/utils/date.ts packages/shared/src/

# Move shared types
mv apps/web/src/types/api.ts packages/shared/src/types/
mv apps/web/src/types/entity.ts packages/shared/src/types/
```

### Task 3.5: Create Config Package

**Create directory**:
```bash
mkdir -p packages/config
```

**`packages/config/package.json`**:
```json
{
  "name": "@blah-chat/config",
  "version": "0.0.0",
  "private": true
}
```

**`packages/config/tsconfig.base.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

### Task 3.6: Update Web App Imports

Replace all imports:

```typescript
// Before
import { MODEL_CONFIG } from "@/lib/ai/models";
import { formatEntity } from "@/lib/utils/formatEntity";
import { countTokens } from "@/lib/utils/tokens";

// After
import { MODEL_CONFIG } from "@blah-chat/ai";
import { formatEntity } from "@blah-chat/shared";
import { countTokens } from "@blah-chat/shared";
```

### Task 3.7: Update Convex Backend Imports

The Convex backend imports AI configs. Update:

```typescript
// Before (in convex/*.ts files)
import { MODEL_CONFIG } from "@/lib/ai/models";

// After
import { MODEL_CONFIG } from "@blah-chat/ai";
```

### Task 3.8: Update Web App Package.json

**`apps/web/package.json`**:
```json
{
  "dependencies": {
    "@blah-chat/ai": "workspace:*",
    "@blah-chat/shared": "workspace:*",
    "@blah-chat/backend": "workspace:*"
  }
}
```

### Task 3.9: Update Backend Package.json

**`packages/backend/package.json`**:
```json
{
  "dependencies": {
    "@blah-chat/ai": "workspace:*",
    "@blah-chat/shared": "workspace:*"
  }
}
```

### Task 3.10: Update Web App tsconfig.json

**`apps/web/tsconfig.json`**:
```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@blah-chat/ai": ["../../packages/ai/src/index.ts"],
      "@blah-chat/ai/*": ["../../packages/ai/src/*"],
      "@blah-chat/shared": ["../../packages/shared/src/index.ts"],
      "@blah-chat/shared/*": ["../../packages/shared/src/*"],
      "@blah-chat/backend/*": ["../../packages/backend/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Verification Checklist

- [ ] `bun install` from root succeeds
- [ ] All packages have correct `package.json`
- [ ] `bun dev` starts without import errors
- [ ] Web app functions (send message, get response)
- [ ] `bunx convex dev` from `packages/backend/` works
- [ ] AI model selection works in UI
- [ ] Cost tracking displays correctly
- [ ] `bun test` passes
- [ ] `bun build` creates production build
- [ ] `bun lint` runs across all packages

---

## Import Migration Strategy

### Step 1: Identify All Imports

```bash
# Find AI imports
grep -r "from ['\"]@/lib/ai" apps/web/src/
grep -r "from ['\"]@/lib/ai" packages/backend/convex/

# Find utils imports
grep -r "from ['\"]@/lib/utils" apps/web/src/
grep -r "from ['\"]@/lib/utils" packages/backend/convex/
```

### Step 2: Bulk Replace

```bash
# AI imports
find apps/web/src packages/backend/convex -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i '' 's|from "@/lib/ai/models"|from "@blah-chat/ai"|g'

# Utils imports
find apps/web/src packages/backend/convex -name "*.ts" -o -name "*.tsx" | \
  xargs sed -i '' 's|from "@/lib/utils/formatEntity"|from "@blah-chat/shared"|g'
```

### Step 3: Handle Named Exports

Some files import specific items:
```typescript
// May need adjustment
import { MODEL_CONFIG, type ModelConfig } from "@blah-chat/ai";
import { formatEntity, formatEntityList } from "@blah-chat/shared";
```

Ensure barrel exports include all needed items.

---

## Common Issues

### Issue: "Module not found: @blah-chat/ai"
**Solution**: Run `bun install` to link workspace packages.

### Issue: "Export X not found in @blah-chat/ai"
**Solution**: Add missing export to `packages/ai/src/index.ts`.

### Issue: "Circular dependency"
**Solution**: Check that packages don't import each other in a cycle. `@blah-chat/ai` and `@blah-chat/shared` should not depend on each other.

### Issue: "Types not found in barrel export"
**Solution**: Use `export type * from "./types"` for type-only exports.

---

## Rollback Plan

1. Move files back from `packages/*/src/` to `apps/web/src/lib/`
2. Revert import changes (git checkout)
3. Delete `packages/ai/`, `packages/shared/`, `packages/config/`
4. Run `bun install`

---

## What Comes Before

**Phase 2: Convex Backend** must be complete:
- `@blah-chat/backend` exists
- Convex types accessible from packages directory
- Web app imports from `@blah-chat/backend`

---

## What Comes Next

**Phase 4: Mobile App** (Future) - Create Expo/React Native app:
- Import `@blah-chat/ai` for model configs
- Import `@blah-chat/shared` for utilities
- Import types from `@blah-chat/backend/_generated/`
- Use `ConvexReactNativeClient` for real-time data

**Phase 5: CLI/TUI/Raycast** (Future) - Create additional apps:
- All share the same packages
- Use `ConvexHttpClient` for Node.js environments
