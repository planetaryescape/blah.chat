# Phase 2: Convex Backend Extraction

## Overview

This phase extracts the Convex backend from `apps/web/convex/` to `packages/backend/`, creating the `@blah-chat/backend` package that all future apps will share.

**Risk Level**: Medium (Convex deployment path changes)
**Prerequisite**: Phase 1 (Workspace Foundation) complete
**Blocks**: Phase 3 (shared packages import from backend)

---

## Context

### Current State (After Phase 1)

```
blah.chat/
├── apps/
│   └── web/
│       ├── src/
│       ├── convex/           # Convex still here
│       │   ├── _generated/   # Auto-generated types
│       │   ├── schema.ts     # 1,666 lines, ~30 tables
│       │   ├── chat.ts       # Main entry point
│       │   ├── generation.ts # AI generation (critical path)
│       │   ├── messages.ts   # Message mutations
│       │   └── ...           # 245 total TS files
│       └── ...
├── packages/                 # Empty
├── turbo.json
└── package.json
```

### Target State

```
blah.chat/
├── apps/
│   └── web/
│       ├── src/
│       └── ...               # No convex/ folder
├── packages/
│   └── backend/              # @blah-chat/backend
│       ├── convex/
│       │   ├── _generated/   # Auto-generated types
│       │   ├── schema.ts
│       │   ├── chat.ts
│       │   ├── generation.ts
│       │   └── ...
│       ├── convex.json       # Convex configuration
│       ├── package.json      # Package definition
│       └── tsconfig.json
├── turbo.json
└── package.json
```

---

## What This Phase Accomplishes

1. **Creates `@blah-chat/backend` package** - Convex backend as a workspace package
2. **Centralizes Convex types** - All apps import from `@blah-chat/backend/_generated/`
3. **Updates import paths** - Web app imports from package, not local folder
4. **Preserves Convex deployment** - `convex dev` and `convex deploy` work from new location

---

## Critical Understanding: Convex Architecture

### How Convex Works

1. **Schema Definition**: `convex/schema.ts` defines database tables
2. **Functions**: Queries, mutations, actions in `convex/*.ts`
3. **Code Generation**: `convex dev` generates `_generated/` folder with:
   - `api.d.ts` - Public API types
   - `dataModel.d.ts` - Schema types (Doc, Id)
   - `server.d.ts` - Server utilities
4. **Deployment**: Functions run on Convex Cloud, not Next.js server

### Current Convex Stats

- **94+ modules** (causes TypeScript recursion limits - 390 @ts-ignore)
- **1,666 line schema** (~30 normalized tables)
- **Critical files**: `generation.ts`, `chat.ts`, `messages.ts`
- **Dependencies**: Imports from `@/lib/ai/models` (will move to `@blah-chat/ai` in Phase 3)

---

## Tasks

### Task 2.1: Create Backend Package Structure

```bash
mkdir -p packages/backend
```

### Task 2.2: Move Convex Folder

```bash
mv apps/web/convex packages/backend/convex
```

### Task 2.3: Create Backend Package.json

**`packages/backend/package.json`**:
```json
{
  "name": "@blah-chat/backend",
  "version": "0.0.0",
  "private": true,
  "main": "./convex/index.ts",
  "types": "./convex/_generated/dataModel.d.ts",
  "scripts": {
    "dev": "convex dev",
    "deploy": "convex deploy",
    "generate": "convex codegen"
  },
  "dependencies": {
    "convex": "^1.31.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0"
  },
  "peerDependencies": {
    "@blah-chat/ai": "workspace:*"
  }
}
```

Note: `@blah-chat/ai` as peerDependency because Convex imports AI configs. Created in Phase 3.

### Task 2.4: Create Convex Configuration

**`packages/backend/convex.json`**:
```json
{
  "functions": "convex/"
}
```

### Task 2.5: Create Backend TypeScript Config

**`packages/backend/tsconfig.json`**:
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
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["node"],
    "paths": {
      "@blah-chat/ai": ["../ai/src/index.ts"],
      "@blah-chat/ai/*": ["../ai/src/*"],
      "@blah-chat/shared": ["../shared/src/index.ts"],
      "@blah-chat/shared/*": ["../shared/src/*"]
    }
  },
  "include": ["convex/**/*.ts"],
  "exclude": ["node_modules", "convex/_generated"]
}
```

### Task 2.6: Update Web App Imports

Update all imports in `apps/web/src/` from:
```typescript
// Before
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
```

To:
```typescript
// After
import type { Doc, Id } from "@blah-chat/backend/_generated/dataModel";
import { api } from "@blah-chat/backend/_generated/api";
```

**Files to update** (grep for `@/convex`):
- All files in `apps/web/src/` that import Convex types
- Provider components that initialize Convex client
- Hooks that use `useQuery`, `useMutation`, `useAction`

### Task 2.7: Update Web App tsconfig.json

**`apps/web/tsconfig.json`** - Add backend path:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@blah-chat/backend/*": ["../../packages/backend/*"]
    }
  }
}
```

Remove the old `@/convex/*` path.

### Task 2.8: Update Web App Package.json

**`apps/web/package.json`** - Add backend dependency:
```json
{
  "dependencies": {
    "@blah-chat/backend": "workspace:*",
    // ... other deps
  }
}
```

### Task 2.9: Update Turbo Tasks

**`turbo.json`** - Add convex tasks:
```json
{
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "convex:dev": {
      "cache": false,
      "persistent": true
    },
    "convex:deploy": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Task 2.10: Add Convex Scripts to Backend

**`packages/backend/package.json`** scripts are already defined in Task 2.3.

### Task 2.11: Regenerate Convex Types

From `packages/backend/`:
```bash
bunx convex dev
```

This regenerates `_generated/` folder with correct paths.

---

## Verification Checklist

- [ ] `bun install` from root succeeds
- [ ] `cd packages/backend && bunx convex dev` starts Convex dev server
- [ ] `_generated/` folder exists in `packages/backend/convex/`
- [ ] `bun dev` from root starts both Next.js and shows no import errors
- [ ] Web app can send messages and receive responses
- [ ] All Convex queries, mutations, actions work
- [ ] `bun test` passes (Convex tests may need path updates)
- [ ] `bun build` creates production build
- [ ] `bunx convex deploy` from `packages/backend/` deploys successfully

---

## Import Migration Script

To bulk-update imports, create a script or use find/replace:

```bash
# Find all files importing from @/convex
grep -r "from ['\"]@/convex" apps/web/src/

# Example sed command (test first!)
find apps/web/src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/convex/_generated|@blah-chat/backend/_generated|g'
```

---

## Environment Variables

Convex environment variables stay the same:
- `NEXT_PUBLIC_CONVEX_URL` - Used by web app
- `CONVEX_DEPLOY_KEY` - Used for `convex deploy`

These are read from root `.env.local` or CI environment.

---

## Common Issues

### Issue: "Cannot find module '@blah-chat/backend'"
**Solution**: Run `bun install` from root to link workspace packages.

### Issue: "Convex functions not found"
**Solution**: Run `bunx convex dev` from `packages/backend/` to regenerate.

### Issue: "Type 'Doc<...>' not found"
**Solution**: Check import path is `@blah-chat/backend/_generated/dataModel`.

### Issue: "Circular dependency between @blah-chat/backend and @blah-chat/ai"
**Solution**: `@blah-chat/ai` is a peerDependency, not dependency. Install it in web app.

---

## Rollback Plan

1. Move `packages/backend/convex/` back to `apps/web/convex/`
2. Revert import changes (git checkout)
3. Delete `packages/backend/`
4. Run `bun install`

---

## What Comes Before

**Phase 1: Workspace Foundation** must be complete:
- Turborepo configured
- Web app in `apps/web/`
- Workspace dependencies working

---

## What Comes Next

**Phase 3: Shared Packages** - Extract shared code that Convex backend imports:
- `@blah-chat/ai` - Model configs (currently `@/lib/ai/models`)
- `@blah-chat/shared` - Utilities (currently `@/lib/utils/*`)
- `@blah-chat/config` - Shared TypeScript/Biome configs

After Phase 3, the Convex backend's peerDependency on `@blah-chat/ai` will be satisfied.
