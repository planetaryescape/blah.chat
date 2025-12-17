# GitHub Repository Setup

This document contains final setup steps for the GitHub repository.

## ✅ Completed Automatically

- [x] Topic tags added: `ai`, `chat`, `convex`, `nextjs`, `self-hosted`, `agpl`, `typescript`, `llm`
- [x] GitHub Discussions enabled

## Manual Steps Remaining

### 1. Create Pinned Discussion for Self-Hosting FAQ

1. Go to https://github.com/planetaryescape/blah.chat/discussions
2. Click "New discussion"
3. Category: **Q&A**
4. Title: `Self-Hosting Guide - FAQ`
5. Body: Copy from below
6. Click "Start discussion"
7. Click the pin icon (📌) to pin it

**Discussion body**:

```markdown
# Self-Hosting FAQ

For complete instructions, see [SELF_HOSTING.md](https://github.com/planetaryescape/blah.chat/blob/main/SELF_HOSTING.md).

## Quick Links

- **[Quick Deploy (Vercel)](https://vercel.com/new/clone?repository-url=https://github.com/bhekanik/blah.chat)** - 10 minutes
- **[Quick Deploy (Railway)](https://railway.app/template/blah-chat)** - 10 minutes
- **[Manual Setup Guide](https://github.com/planetaryescape/blah.chat/blob/main/SELF_HOSTING.md#manual-setup-20-minutes)** - 20 minutes

## Common Questions

### Do I need Docker?
No. blah.chat is a single Next.js app calling external services (Convex, Clerk). Docker is optional.

### What does it cost to self-host?
- **Free tier**: Development (Convex dev + Clerk 10k MAU = $0)
- **Production (low traffic)**: $25-50/month
- **Production (moderate)**: $100-200/month

See [cost breakdown](https://github.com/planetaryescape/blah.chat/blob/main/SELF_HOSTING.md#cost-breakdown).

### Can I replace Convex or Clerk?
Yes, but requires work:
- **Convex** → PostgreSQL + tRPC (4-6 weeks)
- **Clerk** → Better Auth (2-3 weeks, [accepting PRs](https://github.com/planetaryescape/blah.chat/blob/main/CONTRIBUTING.md#auth-adapter-pattern))

Current architecture uses these because they're easier than running Postgres + Redis + Auth server.

### How do I update my instance?
```bash
git pull origin main
bun install
bunx convex deploy
bun run build
```

For Vercel/Railway, they auto-deploy on git push.

### Can I disable telemetry?
Yes. Add `TELEMETRY_DISABLED=1` to your `.env` file. See [PRIVACY.md](https://github.com/planetaryescape/blah.chat/blob/main/PRIVACY.md).

### Where do I get help?
- **Bugs**: [Open an issue](https://github.com/planetaryescape/blah.chat/issues/new/choose)
- **Questions**: Ask here in Discussions
- **Email**: blah.chat@bhekani.com

---

**Ask your self-hosting questions below!** 👇
```

### 2. Configure Discussion Categories (Optional)

Recommended categories:
- **Q&A** - Questions and answers (default)
- **Ideas** - Feature requests and brainstorming
- **Show and Tell** - Community showcases
- **General** - Anything else

Configure at: https://github.com/planetaryescape/blah.chat/discussions/categories

### 3. Add Repository Description

Go to repository settings → About section:

**Description**: `Personal AI chat with all models (GPT-5, Claude, Gemini, Grok+). Self-host or use cloud. AGPL-3.0.`

**Website**: `https://blah.chat` (when launched)

### 4. Set Repository Social Image

Use the existing app preview image located at `public/assets/app-preview.jpeg`.

Upload at: Settings → Social preview → Upload an image

**File**: Upload `public/assets/app-preview.jpeg` from repository

### 5. Security Policy ✅

**Status**: Completed - `SECURITY.md` created in repository root

### 6. GitHub Actions ✅

**Status**: Completed - CI workflow and Dependabot configured

Created:
- `.github/workflows/ci.yml` - Lint, typecheck, build on PR/push
- `.github/dependabot.yml` - Auto-update dependencies (weekly npm, monthly actions)

---

## Current GitHub Status

✅ **Topics**: ai, chat, convex, nextjs, self-hosted, agpl, typescript, llm
✅ **Discussions**: Enabled
✅ **Issue templates**: Bug report, feature request (YAML forms)
✅ **PR template**: Checklist-based
✅ **Code of Conduct**: Contributor Covenant 2.1
✅ **Contributing guide**: Auth adapter pattern, commit style
✅ **Privacy policy**: Telemetry disclosure, GDPR compliance
✅ **Security policy**: Responsible disclosure, self-hosting best practices
✅ **License**: AGPL-3.0 with additional terms
✅ **CI/CD**: GitHub Actions (lint, typecheck, build)
✅ **Dependabot**: Auto-update dependencies (weekly)
