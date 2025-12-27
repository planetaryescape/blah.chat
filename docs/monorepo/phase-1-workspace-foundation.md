# Phase 1: Workspace Foundation

## Overview

This phase establishes the Turborepo monorepo foundation by creating the workspace structure and moving the existing Next.js application into `apps/web/`.

**Risk Level**: Low
**Prerequisite**: None (this is the first phase)
**Blocks**: Phase 2, Phase 3

---

## Context

### Current State

blah.chat is a single Next.js 15 application with:
- **839 TypeScript files** (594 in `src/`, 245 in `convex/`)
- **Bun** as the exclusive package manager (`bun.lock`)
- **Convex** for real-time database and backend functions
- **Biome** for linting and formatting
- **Vitest** for unit tests, **Playwright** for E2E tests

The current structure:
```
blah.chat/
├── src/                  # Next.js app source
├── convex/               # Convex backend
├── docs/                 # Documentation
├── e2e/                  # Playwright tests
├── public/               # Static assets
├── package.json          # All dependencies
├── tsconfig.json         # TypeScript config
├── next.config.ts        # Next.js config
├── biome.json            # Linting config
├── vitest.config.ts      # Test config
└── ...
```

### Target State

After Phase 1:
```
blah.chat/
├── apps/
│   └── web/              # Next.js app (moved here)
│       ├── src/
│       ├── convex/       # Still here temporarily (moved in Phase 2)
│       ├── e2e/
│       ├── public/
│       ├── package.json  # App-specific deps
│       ├── tsconfig.json # Extends base
│       └── next.config.ts
├── packages/             # Empty (populated in Phase 2-3)
├── turbo.json            # Task orchestration
├── package.json          # Root workspace config
├── bun.lock
├── biome.json            # Root biome config
└── .gitignore
```

---

## What This Phase Accomplishes

1. **Creates Turborepo workspace** - Root `package.json` with workspaces, `turbo.json` for task orchestration
2. **Moves Next.js app** - All app code relocates to `apps/web/`
3. **Updates import paths** - `@/*` alias continues to work from new location
4. **Preserves functionality** - `bun dev`, `bun build`, tests all work identically

---

## Tasks

### Task 1.1: Create Root Workspace Configuration

**Files to create**:

**`turbo.json`** (root):
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "test:run": {
      "dependsOn": ["^build"]
    },
    "format": {
      "cache": false
    }
  }
}
```

**`package.json`** (root) - Update existing:
```json
{
  "name": "blah-chat",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "format": "turbo format",
    "test": "turbo test",
    "test:run": "turbo test:run"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  }
}
```

### Task 1.2: Create Directory Structure

```bash
mkdir -p apps/web
mkdir -p packages
```

### Task 1.3: Move Web App Files

Move these to `apps/web/`:
- `src/` directory
- `convex/` directory (temporarily, moved to packages in Phase 2)
- `e2e/` directory
- `public/` directory
- `next.config.ts`
- `postcss.config.mjs`
- `tailwind.config.ts` (if exists)
- `vitest.config.ts`
- `playwright.config.ts`
- `components.json` (shadcn)

**Keep at root**:
- `turbo.json` (new)
- `package.json` (modified to workspace root)
- `bun.lock`
- `biome.json`
- `.gitignore`
- `.env*` files
- `docs/`

### Task 1.4: Create Web App Package.json

**`apps/web/package.json`**:
```json
{
  "name": "@blah-chat/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "format": "biome format --write .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    // Move all dependencies from root package.json
  },
  "devDependencies": {
    // Move all devDependencies from root package.json
  }
}
```

### Task 1.5: Update TypeScript Configuration

**`apps/web/tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@/convex/*": ["./convex/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Note: `@/*` and `@/convex/*` paths remain the same - they're relative to `apps/web/`.

### Task 1.6: Update .gitignore

Add Turborepo cache to `.gitignore`:
```gitignore
# Turborepo
.turbo
```

### Task 1.7: Update Next.js Config

**`apps/web/next.config.ts`** - No changes needed if paths are relative. Verify:
- No hardcoded absolute paths
- Webpack aliases (if any) use relative paths

### Task 1.8: Install Turborepo

```bash
bun add -D turbo
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `bun install` runs without errors from root
- [ ] `bun dev` starts the Next.js dev server
- [ ] App loads at `http://localhost:3000`
- [ ] `bun build` creates production build in `apps/web/.next/`
- [ ] `bun test` runs Vitest tests
- [ ] `bun test:run` runs tests in single-run mode
- [ ] `bun lint` runs Biome linting
- [ ] `bun format` formats code
- [ ] `bunx convex dev` works from `apps/web/` (Convex still in apps/web temporarily)
- [ ] All existing functionality works (send message, get response, etc.)
- [ ] Git history preserved (files moved, not deleted/recreated)

---

## Rollback Plan

If issues arise:
1. `git reset --hard HEAD~1` to revert the commit
2. Delete `apps/`, `packages/`, `turbo.json`
3. Restore original structure

---

## Common Issues

### Issue: "Cannot find module '@/...'"
**Solution**: Ensure `tsconfig.json` paths are correct and relative to `apps/web/`.

### Issue: "Turborepo not found"
**Solution**: Run `bun add -D turbo` at root.

### Issue: "Convex functions not found"
**Solution**: Run `bunx convex dev` from `apps/web/` (Convex moves in Phase 2).

### Issue: "Biome config not found"
**Solution**: Biome config stays at root. Web app inherits from root `biome.json`.

---

## What Comes Next

**Phase 2: Convex Backend** - Extract `convex/` folder to `packages/backend/`:
- Create `@blah-chat/backend` package
- Update all Convex imports
- Configure Convex to run from packages directory

**Phase 3: Shared Packages** - Extract shared code:
- `@blah-chat/ai` - Model configs, prompts
- `@blah-chat/shared` - Utilities
- `@blah-chat/config` - Shared TypeScript/Biome configs
