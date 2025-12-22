# Phase 6: CI/CD Integration

**Priority:** P1 (High)
**Estimated Effort:** 1-2 hours
**Prerequisites:** Phases 1-5 (all tests written)

---

## Context

blah.chat already has a CI workflow (`.github/workflows/ci.yml`) that runs:
- Biome lint/format
- Convex typecheck
- Next.js build

This phase integrates automated tests into the existing pipeline.

---

## What Already Exists (EXTEND, not replace)

| Asset | Location | Purpose |
|-------|----------|---------|
| CI workflow | `.github/workflows/ci.yml` | Existing lint + build |
| Bun setup | In workflow | Package manager |
| Convex secrets | GitHub Secrets | For typecheck |

---

## What This Phase Creates

```
.github/workflows/
├── ci.yml                 # MODIFIED: Add test jobs
└── e2e.yml                # NEW: E2E tests (separate, runs less often)
docs/testing/
└── phase-6-cicd.md        # This document
```

---

## Step-by-Step Implementation

### Step 1: Update ci.yml with Test Job

Modify `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-and-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run Biome check (lint + format)
        run: bun run lint

      - name: Convex typecheck
        run: bunx convex dev --once --typecheck=enable
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}

  # NEW: Unit & Integration Tests
  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    needs: lint-and-typecheck

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run tests
        run: bun run test:run

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        if: always()
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, test]  # MODIFIED: Also needs tests

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build Next.js app
        run: bun run build
        env:
          NEXT_PUBLIC_CONVEX_URL: ${{ secrets.NEXT_PUBLIC_CONVEX_URL || 'https://example.convex.cloud' }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_MOCK' }}
```

### Step 2: Create E2E Workflow

Create `.github/workflows/e2e.yml` for Playwright tests:

```yaml
name: E2E Tests

on:
  # Run on PRs to main
  pull_request:
    branches: [main]
    # Only run when relevant files change
    paths:
      - 'src/**'
      - 'convex/**'
      - 'e2e/**'
      - 'package.json'
      - 'playwright.config.ts'
  # Manual trigger
  workflow_dispatch:

jobs:
  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install Playwright browsers
        run: bunx playwright install --with-deps chromium

      - name: Build application
        run: bun run build
        env:
          NEXT_PUBLIC_CONVEX_URL: ${{ secrets.NEXT_PUBLIC_CONVEX_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}

      - name: Run E2E tests
        run: bun run test:e2e
        env:
          CI: true
          NEXT_PUBLIC_CONVEX_URL: ${{ secrets.NEXT_PUBLIC_CONVEX_URL }}
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          # Test account credentials (for auth)
          E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
          E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

      - name: Upload test screenshots
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-screenshots
          path: test-results/
          retention-days: 7
```

### Step 3: Update package.json Scripts

Ensure these scripts exist in `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### Step 4: Configure Coverage Thresholds

Update `vitest.config.ts`:

```typescript
export default defineConfig({
  // ...
  test: {
    // ...
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "node_modules",
        "e2e",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/**",
      ],
      // Coverage thresholds (optional, adjust as needed)
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
      },
    },
  },
});
```

### Step 5: Set Up Required Secrets

Add these secrets in GitHub repository settings (`Settings → Secrets and variables → Actions`):

| Secret | Purpose |
|--------|---------|
| `CODECOV_TOKEN` | Coverage reporting (optional) |
| `E2E_TEST_EMAIL` | Test account email for E2E auth |
| `E2E_TEST_PASSWORD` | Test account password |

**Note:** Existing secrets (`CONVEX_DEPLOY_KEY`, `CLERK_SECRET_KEY`, etc.) are already configured.

---

## Workflow Summary

### On Every PR:
1. **Lint & Typecheck** - Biome + Convex types
2. **Unit/Integration Tests** - Vitest (fast)
3. **Build** - Verify production build

### On PRs with Code Changes:
4. **E2E Tests** - Playwright (runs separately, can be slow)

### Flow Diagram:
```
PR Created
    ↓
[lint-and-typecheck]
    ↓
[test] ←── Unit/Integration
    ↓
[build]

[e2e] ←── Runs in parallel (separate workflow)
```

---

## Verification

After implementation:

1. **Create a test PR** to verify pipeline:
```bash
git checkout -b test-ci-pipeline
# Make a small change
git commit -m "test: verify CI pipeline"
git push origin test-ci-pipeline
```

2. **Check GitHub Actions tab** for:
   - All jobs green
   - Coverage report uploaded
   - E2E artifacts available

3. **Merge and delete** test branch

---

## Key Patterns

### 1. Parallel Jobs
Tests run in parallel with build prep:
```yaml
needs: lint-and-typecheck  # Run after lint, parallel with build prep
```

### 2. Conditional E2E
E2E only runs when relevant files change:
```yaml
paths:
  - 'src/**'
  - 'convex/**'
  - 'e2e/**'
```

### 3. Artifact Upload
Test reports available for debugging:
```yaml
- uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
```

---

## Next Steps After CI/CD

With testing infrastructure complete:
1. Monitor test stability over time
2. Add tests as bugs are fixed (regression tests)
3. Increase coverage thresholds gradually
4. Consider adding visual regression tests

---

## Troubleshooting

### Tests Fail in CI but Pass Locally
- Check environment differences (Node version, timezone)
- Ensure all mocks are properly configured
- Check for race conditions in async tests

### E2E Auth Fails
- Verify test account credentials in secrets
- Check Clerk test mode configuration
- Consider using Clerk's testing tokens

### Coverage Not Uploading
- Verify `CODECOV_TOKEN` secret is set
- Check `coverage/lcov.info` is generated
- Review Codecov configuration

### Build Fails After Adding Tests
- Ensure test files are excluded from build
- Check for import issues between test and prod code
- Verify vitest.config.ts doesn't break Next.js

---

## Cost Considerations

GitHub Actions minutes usage:
- Unit tests: ~2-3 min per run
- E2E tests: ~10-15 min per run
- Free tier: 2,000 min/month

To optimize:
- E2E only on code changes (already configured)
- Cache Playwright browsers
- Run unit tests locally before push

---

## Convex Deployment Workflow

A separate workflow (`.github/workflows/deploy.yml`) handles Convex deployments using GitHub Environments for environment-specific secrets.

### Workflow Triggers

| Event | Branch | Action |
|-------|--------|--------|
| Pull Request | `main` or `prod` | Dry run (typecheck + schema validation) |
| Push/Merge | `main` | Deploy to staging |
| Push/Merge | `prod` | Deploy to production |

### GitHub Environments Setup

Create two environments in GitHub (**Settings → Environments**):

#### 1. `staging` Environment
- **Deployment branch:** `main`
- **Secret:** `CONVEX_DEPLOY_KEY` = Your staging Convex deploy key
- **Protection rules:** None (auto-deploy on merge)

#### 2. `production` Environment
- **Deployment branch:** `prod`
- **Secret:** `CONVEX_DEPLOY_KEY` = Your production Convex deploy key
- **Protection rules (recommended):**
  - Required reviewers: 1-2 team members
  - Wait timer: 5 minutes (optional)

### How to Get Convex Deploy Keys

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project (staging or production)
3. Navigate to **Settings → Deploy Keys**
4. Create a new deploy key
5. Copy and add to the corresponding GitHub environment

### Workflow File

Located at `.github/workflows/deploy.yml`:

```yaml
name: Deploy Convex

on:
  pull_request:
    branches: [main, prod]
  push:
    branches: [main, prod]

jobs:
  dry-run:
    if: github.event_name == 'pull_request'
    environment: staging  # Uses staging key for validation
    steps:
      - run: bunx convex dev --once --typecheck=enable

  deploy-staging:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - run: bunx convex deploy

  deploy-prod:
    if: github.event_name == 'push' && github.ref == 'refs/heads/prod'
    environment: production
    steps:
      - run: bunx convex deploy
```

### Benefits of GitHub Environments

- **Same secret name** (`CONVEX_DEPLOY_KEY`) across environments
- **Deployment history** visible in GitHub UI
- **Protection rules** for production (manual approval, wait timers)
- **Environment URLs** displayed in PRs and deployments

### Deployment Flow

```
PR to main/prod
    ↓
[dry-run] - Validates schema compiles
    ↓
Merge to main
    ↓
[deploy-staging] - Auto-deploys to staging
    ↓
Merge main → prod
    ↓
[deploy-prod] - Deploys to production (with optional approval)
```

### Troubleshooting Deployments

#### Deploy Key Not Found
- Verify `CONVEX_DEPLOY_KEY` exists in the environment secrets (not repo secrets)
- Check the environment name matches exactly (`staging` vs `Staging`)

#### Schema Validation Fails
- The dry-run catches breaking schema changes
- Fix schema issues before merging
- Run `bunx convex dev --once` locally to debug

#### Production Deploy Stuck
- Check if protection rules require approval
- Verify the user has permission to approve deployments
