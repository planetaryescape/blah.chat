# Contributing to blah.chat

Thanks for your interest in contributing! This guide will help you get started.

## Quick Start

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/blah.chat.git`
3. **Install** dependencies: `bun install`
4. **Set up** environment variables (see [README.md](./README.md#development-setup))
5. **Create a branch**: `git checkout -b feature/your-feature`
6. **Make changes** and test
7. **Commit** with conventional commits (see below)
8. **Push** and create a Pull Request

## Development Workflow

### Prerequisites

- Bun 1.0+ (we don't use npm/yarn/pnpm)
- Convex account (free tier works)
- Clerk account (free tier works)
- Vercel AI Gateway API key

### Local Development

```bash
# Start Convex dev server
bunx convex dev

# In another terminal, start Next.js
bun dev
```

Visit http://localhost:3000

### Code Quality

**Before committing**, run:

```bash
bun run lint      # Biome lint check
bun run format    # Biome format --write
```

We use **Biome** for linting and formatting (not ESLint/Prettier).

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type: description

optional body
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Atomic Commits

One logical change per commit. Group related changes:

```
✅ GOOD - Atomic commits:
feat: add AGPL-3.0 license and update README
docs: add community guidelines and policies
chore: add GitHub templates and CI/CD workflows

❌ BAD - Kitchen sink:
feat: add license, docs, CI, and fix bugs
```

### Writing Good Messages

**Concise over verbose**. Focus on outcome, not implementation:

```
✅ GOOD:
feat: add opt-in telemetry system
refactor: humanize landing page copy

❌ BAD (too verbose):
feat: implement PostHog integration with daily heartbeat cron job that sends anonymous instance statistics
refactor: replace generic AI-sounding modifiers with human-friendly copy that doesn't sound like a robot wrote it
```

**Optional body** for context:

```
feat: add environment variable overrides for self-hosted limits

Allow self-hosters to customize rate limits via env vars
Defaults: 50 msg/day, $10/mo budget
```

### No Attribution Footers

Your contribution is credited via Git history.

```
❌ BAD:
feat: add dark mode

🤖 Generated with Claude Code
Co-Authored-By: ...

✅ GOOD:
feat: add dark mode toggle to settings
```

## What to Contribute

### Good First Issues

Look for issues labeled `good first issue`. These are beginner-friendly:
- Documentation improvements
- UI/UX polish
- Bug fixes with clear reproduction steps
- Adding new AI models to `src/lib/ai/models.ts`

### High-Priority Areas

- **Better Auth integration** - Self-hosted auth alternative (see Auth Adapter Pattern below)
- **Mobile app** - React Native client using REST API
- **Docker setup** - Better containerization
- **Tests** - E2E tests with Playwright
- **Accessibility** - ARIA labels, keyboard navigation

### Not Accepting (Right Now)

- Major architecture changes (discuss first in Discussions)
- UI framework changes (we're committed to shadcn/ui + Tailwind)
- Package manager changes (Bun only)
- Replacing Convex/Clerk (but adding alternatives is welcome)

## Auth Adapter Pattern

We're building an abstraction layer for authentication providers. If you want to add Better Auth, WorkOS, or another provider:

### Interface to Implement

```typescript
// src/lib/auth/adapter.ts (you'll create this)
export interface AuthAdapter {
  // User operations
  createUser(data: CreateUserInput): Promise<User>;
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(id: string, data: UpdateUserInput): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Session operations
  createSession(userId: string): Promise<Session>;
  validateSession(token: string): Promise<Session | null>;
  invalidateSession(token: string): Promise<void>;

  // OAuth operations
  linkOAuthAccount(
    userId: string,
    provider: string,
    accountData: OAuthAccount
  ): Promise<void>;
  unlinkOAuthAccount(userId: string, provider: string): Promise<void>;
  getOAuthAccounts(userId: string): Promise<OAuthAccount[]>;

  // Organization/Team operations (multi-tenant)
  createOrganization(data: CreateOrgInput): Promise<Organization>;
  addUserToOrg(userId: string, orgId: string, role: Role): Promise<void>;
  removeUserFromOrg(userId: string, orgId: string): Promise<void>;
  getOrgMembers(orgId: string): Promise<OrgMember[]>;
}
```

### Example Implementation

```typescript
// src/lib/auth/adapters/better-auth.ts
import { BetterAuth } from "better-auth";
import type { AuthAdapter } from "../adapter";

export class BetterAuthAdapter implements AuthAdapter {
  private auth: BetterAuth;

  constructor() {
    this.auth = new BetterAuth({
      // configuration
    });
  }

  async createUser(data: CreateUserInput): Promise<User> {
    // Implementation
  }

  // ... implement all methods
}
```

### Migration Utilities

Include migration scripts:

```typescript
// src/lib/auth/migrations/clerk-to-better-auth.ts
export async function migrateFromClerk() {
  // Export users from Clerk
  // Transform to Better Auth format
  // Import to Better Auth
  // Preserve OAuth connections
}
```

### PR Requirements for Auth Adapters

- [ ] Implement full `AuthAdapter` interface
- [ ] Add configuration in `.env.local.example`
- [ ] Write migration guide (`docs/auth/MIGRATION_TO_BETTER_AUTH.md`)
- [ ] Pass adapter test suite (create if doesn't exist)
- [ ] Update `SELF_HOSTING.md` with new option
- [ ] Document any breaking changes

## Pull Request Process

### Before Submitting

1. **Test locally**: Verify your changes work
2. **Run linter**: `bun run lint`
3. **Format code**: `bun run format`
4. **Check types**: `bunx convex dev --once --typecheck=enable`
5. **Update docs**: If you changed functionality, update relevant docs

### PR Description Template

See `.github/PULL_REQUEST_TEMPLATE.md` for the full template.

**Key sections**:
- What changed (bullet points)
- Why this change (link to issue if applicable)
- How to test
- Screenshots/videos (for UI changes)
- Breaking changes (if any)

### Review Process

1. **Automated checks** run (Biome, TypeScript, Convex deploy)
2. **Maintainer review** (usually within 48 hours)
3. **Address feedback** if requested
4. **Squash and merge** once approved

### After Merge

- Your contribution appears in the changelog
- You're added to contributors list (automatic via GitHub)
- Issue gets closed and linked

## Code Style

### TypeScript

- Strict mode enabled
- Use type inference where possible
- Avoid `any` (use `unknown` if needed)
- Document complex types

### React

- Functional components only
- Hooks for state management
- Server Components by default (use `"use client"` only when needed)
- Avoid prop drilling (use context or composition)

### Convex

- Queries for reads (reactive, cached)
- Mutations for writes (optimistic updates)
- Actions for long-running operations (LLM calls, external APIs)
- Always add `"use node"` to files importing Node.js APIs

**TypeScript recursion workaround** (for large Convex codebases):

```typescript
// Actions calling internal queries/mutations
const result = await ((ctx.runQuery as any)(
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.path.to.query,
  { args },
) as ReturnType);
```

### File Organization

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── ui/          # shadcn components (don't modify directly)
│   └── ...          # Feature components
├── lib/
│   ├── ai/          # Model configs, providers
│   ├── auth/        # Auth adapters (create for new providers)
│   └── utils/       # Helpers, formatters
├── hooks/           # Custom React hooks
└── types/           # Shared TypeScript types

convex/
├── _generated/      # Auto-generated (don't edit)
├── schema.ts        # Database schema
├── *.ts             # Queries, mutations (V8 runtime)
└── */actions.ts     # Actions with "use node" (Node runtime)
```

## Adding New AI Models

Easy contribution! Just edit `src/lib/ai/models.ts`:

```typescript
export const MODEL_CONFIG: Record<string, ModelConfig> = {
  // ... existing models

  "provider:new-model": {
    id: "provider:new-model",
    provider: "provider-name",
    name: "Display Name",
    description: "Short description for developers",
    contextWindow: 128000,
    pricing: { input: 0.5, output: 1.5 },
    capabilities: ["function-calling", "vision"],
    userFriendlyDescription: "Non-technical description for users",
    bestFor: "Use cases this model excels at",
  },
};
```

**Requirements**:
- Model must be available via Vercel AI Gateway
- Include accurate pricing (check provider docs)
- Add user-friendly description
- Test with a conversation

## Testing

**Current state**: Minimal tests (we need help here!)

**What we need**:
- Unit tests for utilities (`src/lib/utils/`)
- Integration tests for Convex functions
- E2E tests with Playwright (chat flows, auth flows)
- Visual regression tests (Chromatic/Percy)

**Test framework**: Vitest (unit/integration), Playwright (E2E)

### Running Tests (when they exist)

```bash
bun test              # Unit tests
bun test:e2e          # E2E tests
bun test:watch        # Watch mode
```

## Documentation

### Where to Document

- **User-facing**: `README.md`, `SELF_HOSTING.md`
- **Technical architecture**: `docs/` folder, inline code comments
- **API reference**: JSDoc comments on exported functions
- **Decisions**: `docs/decisions/` (Architectural Decision Records)

### Doc Style

- **Concise**: Minimal words, maximum clarity
- **Examples**: Show don't tell
- **Screenshots**: For UI features, setup steps
- **Links**: Cross-reference related docs

## Community Guidelines

- **Be respectful**: Assume good intent
- **Be helpful**: Answer questions, help debug
- **Be patient**: Maintainers are volunteers
- **Be constructive**: Suggest solutions, not just problems

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for full community standards.

## Getting Help

- **GitHub Discussions**: Questions, ideas, general chat
- **GitHub Issues**: Bug reports, feature requests (use templates)
- **Discord** (coming soon): Real-time chat

## License

By contributing, you agree your contributions will be licensed under AGPLv3 (see [LICENSE](./LICENSE)).

**Key implications**:
- Your code becomes open source
- Others can use it under AGPL terms
- You retain copyright but grant usage rights
- Commercial licensing is handled by project maintainers

## Recognition

Contributors are recognized via:
- Git commit history
- GitHub contributors page (automatic)
- Changelog mentions for significant features
- Special thanks in release notes

---

**Thank you for contributing to blah.chat!** 🚀

Your code helps make AI chat accessible to everyone through open source.
