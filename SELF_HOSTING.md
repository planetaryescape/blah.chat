# Self-Hosting Guide

blah.chat can be self-hosted with your own Convex and Clerk accounts. This gives you full control over your data while maintaining the resilient, real-time architecture.

## Why Self-Host?

- **Data ownership**: Your conversations, preferences, and usage data stay in your accounts
- **Cost control**: Pay only for infrastructure (no per-user subscription)
- **Customization**: Modify features, add models, adjust limits
- **Privacy**: No data shared with blah.chat cloud service

## Architecture Overview

blah.chat uses a "batteries-included" architecture:
- **Frontend**: Next.js 15 (deploy anywhere)
- **Backend**: Convex (managed real-time database + serverless functions)
- **Auth**: Clerk (managed authentication)
- **AI**: Vercel AI Gateway (single key for 10+ providers)

**Why external services?** Running PostgreSQL + Redis + Auth server + AI provider management is complex. Convex and Clerk offer generous free tiers and handle the hard parts (real-time sync, auth flows, scaling).

## Quick Deploy (10 minutes)

### Option 1: Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bhekanik/blah.chat&integration-ids=oac_VqOgBHqhEoFTPzGZ8ZzE1Qsa,oac_7yeSwUoVR5no3SlA9WM6oZ7l)

This will:
1. Fork the repo to your GitHub
2. Create Convex project (auto-configures `NEXT_PUBLIC_CONVEX_URL`)
3. Create Clerk app (auto-configures Clerk env vars)
4. Prompt for `AI_GATEWAY_API_KEY` (get from [Vercel AI Gateway](https://vercel.com/docs/ai-gateway))
5. Deploy your instance!

**After deployment:**
- Set usage limits via environment variables (see Configuration below)
- Optionally disable telemetry: `TELEMETRY_DISABLED=1`

### Option 2: Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/blah-chat)

Railway auto-detects environment variables from `.env.example` and guides you through setup.

**Time**: ~10 minutes

---

## Environment Variables Reference

### Core Variables (Required)

These environment variables are required for basic functionality:

```bash
# Convex Backend
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=prod:your-project|your-deploy-key

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# AI Models
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key
```

### Speech Features (Optional)

Speech-to-text and text-to-speech are optional features. If API keys are not configured, these features will be automatically disabled for users.

#### Speech-to-Text (STT)

**Configure ONE provider** (admin selects in Settings → Admin → General → Integrations):

```bash
# Groq (Recommended, Default)
GROQ_API_KEY=gsk_...
# Cost: $0.04/hour, fastest processing

# OpenAI
OPENAI_API_KEY=sk-...
# Cost: $0.006/min, industry standard

# Deepgram
DEEPGRAM_API_KEY=...
# Cost: $0.0077/min, high accuracy

# AssemblyAI
ASSEMBLYAI_API_KEY=...
# Cost: $0.0025/min, most affordable
```

Admin users select the active provider in **Settings → Admin → General → Integrations**. The system validates that the corresponding API key exists before allowing the change.

#### Text-to-Speech (TTS)

```bash
# Deepgram (Required for TTS)
DEEPGRAM_API_KEY=...
```

TTS uses Deepgram Aura voices exclusively. $200 free credits, then pay-as-you-go.

### Feature Availability Behavior

**When API keys are missing:**
- Settings UI shows warning banner with error message
- Toggle switches are disabled (cannot be turned on)
- **Development mode**: Specific error like "STT requires GROQ_API_KEY"
- **Production mode**: Generic error "Please contact your administrator"
- Modal appears if user attempts to enable feature

**When API keys are present:**
- Features work normally
- Users can toggle on/off freely
- Cost tracking works as expected

### Optional Features

```bash
# Analytics
POSTHOG_KEY=phc_...

# Local Models
OLLAMA_BASE_URL=http://localhost:11434

# Email Alerts
RESEND_API_KEY=re_...
```

See [Environment Variables](#configuration) section below for detailed descriptions of each variable.

---

## Manual Setup (20 minutes)

For full control or non-Vercel deployments.

### Prerequisites

- Node.js 18+ (we recommend [Bun](https://bun.sh))
- Git
- GitHub account (for Convex deployment)

### Step 1: Clone Repository

```bash
git clone https://github.com/bhekanik/blah.chat.git
cd blah.chat
bun install
```

### Step 2: Set Up Convex

1. **Sign up for Convex**: https://convex.dev (free tier includes unlimited development)
2. **Create a new project** in the Convex dashboard
3. **Deploy backend**:
   ```bash
   bunx convex dev
   ```
4. **Copy environment variables** from the Convex dashboard:
   - `NEXT_PUBLIC_CONVEX_URL` (shown after deployment)
   - `CONVEX_DEPLOYMENT` (your deployment name)

### Step 3: Set Up Clerk

1. **Sign up for Clerk**: https://clerk.com (free tier: 10,000 monthly active users)
2. **Create a new application** in the Clerk dashboard
3. **Configure settings**:
   - Enable email/password authentication
   - Optionally enable Google, GitHub, etc. OAuth providers
4. **Copy API keys** from Clerk dashboard → API Keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
5. **Set up webhooks** (required for user sync):
   - Add webhook endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Subscribe to events: `user.created`, `user.updated`, `user.deleted`
   - Copy `CLERK_WEBHOOK_SECRET`
6. **Copy issuer domain**: From Clerk dashboard → Settings → Advanced:
   - `CLERK_ISSUER_DOMAIN` (e.g., `https://your-app.clerk.accounts.dev`)

### Step 4: Get Vercel AI Gateway Key

1. **Sign up for Vercel**: https://vercel.com (free tier available)
2. **Create AI Gateway key**: https://vercel.com/docs/ai-gateway
3. **Copy key**: `AI_GATEWAY_API_KEY`

**Why AI Gateway?** Instead of managing 10+ API keys from OpenAI, Anthropic, Google, xAI, etc., you use one key. Vercel routes to providers at cost with small transaction fees.

### Step 5: Configure Environment Variables

Create `.env.local`:

```bash
# Convex (from Step 2)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=prod:your-deployment

# Clerk (from Step 3)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
CLERK_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app

# Vercel AI Gateway (from Step 4)
AI_GATEWAY_API_KEY=your-ai-gateway-key

# Optional: Self-hosted configuration
DEFAULT_DAILY_MESSAGE_LIMIT=50
DEFAULT_MONTHLY_BUDGET=10
TELEMETRY_DISABLED=1
```

### Step 6: Set Up Admin Access

To access the admin dashboard (`/admin`), you need to:

1. **Set your first admin via Convex Dashboard**:
   - Go to your Convex Dashboard → Data → `users` table
   - Find your user and set `isAdmin: true`

2. **Sync admin status to Clerk** (required for middleware):
   ```bash
   bun run scripts/sync-admin-to-clerk.ts
   ```
   This syncs the `isAdmin` flag to Clerk's `publicMetadata` so the middleware can verify admin access.

3. **Sign out and back in** to refresh your session token.

**Note**: Future admin role changes via the Admin Dashboard automatically sync to Clerk.

### Step 7: Run Locally

```bash
bun dev
```

Visit http://localhost:3000

### Step 8: Deploy to Production

#### Vercel (Recommended)
```bash
bunx vercel
```

#### Railway
```bash
railway up
```

#### Fly.io
```bash
fly launch
```

#### Custom VPS
```bash
bun run build
bun start  # Runs on port 3000
```

Use nginx or Caddy as reverse proxy.

---

## Configuration

### Usage Limits (Environment Variables)

Override default limits via env vars:

| Variable | Default | Description |
|----------|---------|-------------|
| `DEFAULT_DAILY_MESSAGE_LIMIT` | `50` | Messages per user per day |
| `DEFAULT_MONTHLY_BUDGET` | `10` | USD monthly budget per user |
| `BUDGET_HARD_LIMIT_ENABLED` | `true` | Block requests when budget exceeded |
| `BUDGET_ALERT_THRESHOLD` | `0.8` | Send email at 80% budget usage |
| `ALERT_EMAIL` | (your email) | Admin email for budget alerts |

**Example** (unlimited for personal use):
```bash
DEFAULT_DAILY_MESSAGE_LIMIT=999999
DEFAULT_MONTHLY_BUDGET=1000
BUDGET_HARD_LIMIT_ENABLED=false
```

**Note**: These limits are configurable in code. For commercial use exceeding these defaults, a commercial license is required under AGPLv3 terms.

### Telemetry (Opt-In)

blah.chat collects anonymous usage statistics to improve the software:
- Instance ID (random UUID, not linked to you)
- Feature usage counts (no message content)
- Error rates and performance metrics

**No personal data is collected.** All data is anonymized.

**Disable telemetry**:
```bash
TELEMETRY_DISABLED=1
```

**Debug mode** (see what would be sent):
```bash
TELEMETRY_DEBUG=1
```

**What's tracked**:
- Daily heartbeat (instance alive signal)
- Active features (voice, search, memory enabled)
- Model providers configured (names only, not API keys)
- Error counts (no stack traces with PII)

See [Privacy Policy](./PRIVACY.md) for full details.

### Optional AI Tools

Add these for advanced features:

```bash
# Web search tool
TAVILY_API_KEY=your-key  # Get from tavily.com

# URL to markdown parser
JINA_API_KEY=your-key  # Get from jina.ai

# Code execution sandbox
E2B_API_KEY=your-key  # Get from e2b.dev

# Audio transcription (if not using OpenAI)
GROQ_API_KEY=your-key  # Faster/cheaper Whisper alternative
```

### Analytics (Optional)

If you want to track your own usage:

```bash
# PostHog (self-hosted or cloud)
NEXT_PUBLIC_POSTHOG_KEY=your-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com  # or your self-hosted instance
POSTHOG_API_KEY=your-key  # Same as NEXT_PUBLIC_POSTHOG_KEY
```

---

## Cost Breakdown

### Free Tier (Personal Use)

| Service | Free Tier | Cost Beyond Free |
|---------|-----------|------------------|
| **Convex** | Unlimited dev, 1 prod project | $25/mo (Launch plan) |
| **Clerk** | 10,000 MAU | $25/mo + $0.02/MAU |
| **Vercel AI Gateway** | Pay-as-you-go | Model costs + 1-2% transaction fee |
| **Vercel Hosting** | 100GB bandwidth | $20/mo (Pro) |

**Estimated monthly cost** (personal use, <100 messages/day):
- Development: **$0**
- Production (low traffic): **$25-50**
- Production (moderate traffic): **$100-200**

Compare to blah.chat cloud (when launched): $X/month for similar usage.

---

## Troubleshooting

### Clerk Infinite Redirect Loop

**Symptom**: After sign-in, you're redirected back to sign-in page infinitely.

**Cause**: Webhook not configured - Convex doesn't have user data.

**Fix**:
1. Go to Clerk dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`
4. Copy webhook secret to `CLERK_WEBHOOK_SECRET` env var
5. Restart app

### Admin Dashboard Redirect (Can't Access /admin)

**Symptom**: You're an admin in Convex (sidebar shows admin link) but clicking it redirects to `/app`.

**Cause**: Admin status exists in Convex but not synced to Clerk's `publicMetadata`.

**Fix**:
```bash
bun run scripts/sync-admin-to-clerk.ts
```
Then sign out and back in to refresh your session token.

**Why?** The middleware checks `sessionClaims.publicMetadata.isAdmin` (from Clerk JWT) for fast edge-level protection. This must be synced from the Convex `users.isAdmin` field.

### Convex Deployment Errors

**Symptom**: `convex dev` fails with "Authentication error"

**Fix**:
```bash
bunx convex logout
bunx convex login
bunx convex dev
```

### AI Gateway Not Working

**Symptom**: Models return 401 errors

**Fix**:
1. Verify `AI_GATEWAY_API_KEY` is set correctly
2. Check Vercel dashboard → AI Gateway → Usage to confirm key is active
3. Ensure you've enabled models in AI Gateway settings

### Database Migrations

**If you upgrade blah.chat and see schema errors**:

Convex auto-migrates schema. If you see errors:
```bash
bunx convex deploy --reset  # WARNING: Deletes all data
```

For production, export data first:
```bash
bunx convex export
# Upgrade
bunx convex import
```

---

## Updating Your Instance

```bash
git pull origin main
bun install
bunx convex deploy  # Deploys new schema + functions
bun run build
```

For Vercel/Railway, they auto-deploy on git push.

---

## Advanced: Alternative Auth Providers

blah.chat currently uses Clerk. We welcome community contributions for self-hosted alternatives:

### Planned: Better Auth Support

[Better Auth](https://better-auth.com) is a self-hosted, TypeScript-native auth library with Convex integration.

**Status**: Accepting PRs
**Complexity**: Medium
**Issue**: [#TBD]

**Why Better Auth?**
- Fully self-hosted (no external service)
- Data in your Convex database
- Feature parity with Clerk (OAuth, 2FA, organizations)
- Free (infrastructure costs only)

**Implementation needed**:
- Abstraction layer: `src/lib/auth/adapter.ts`
- Better Auth adapter implementation
- Migration utilities (Clerk → Better Auth)
- Documentation

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

### Future: WorkOS (Enterprise SSO)

For cloud version, we may add WorkOS for enterprise SAML/SSO. Self-hosted instances can use Better Auth's SSO plugin.

---

## Data Export

To export all your data from Convex:

```bash
bunx convex export --output backup.json
```

This creates a JSON file with all tables. You can:
- Back up regularly (cron job)
- Migrate to another Convex deployment
- Import into PostgreSQL (with conversion script)

---

## Getting Help

- **Documentation**: [docs/](./docs)
- **GitHub Issues**: https://github.com/bhekanik/blah.chat/issues
- **Discussions**: https://github.com/bhekanik/blah.chat/discussions
- **Discord**: [coming soon]

For commercial licensing or enterprise support, contact: blah.chat@bhekani.com

---

## License

blah.chat is licensed under AGPLv3. See [LICENSE](./LICENSE) for details.

**Self-hosted usage**: Free under AGPLv3 with default limits (50 msgs/day, $10/mo budget).
**Commercial usage** (exceeding limits or without source disclosure): Requires commercial license.

---

**Enjoy your self-hosted blah.chat instance!** 🎉

If you modify the code, remember to share your improvements with the community per AGPLv3 Section 13.
