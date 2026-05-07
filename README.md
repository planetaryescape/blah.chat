# blah.chat

Personal AI chat assistant with access to all models (OpenAI, Gemini, Claude, xAI, Perplexity, and more), mid-chat model switching, conversation branching, and transparent cost tracking.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](./LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bhekanik/blah.chat&integration-ids=oac_VqOgBHqhEoFTPzGZ8ZzE1Qsa,oac_7yeSwUoVR5no3SlA9WM6oZ7l)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/blah-chat)

## ✨ Features

- **All Models in One Place**: Access GPT-5, Claude Opus 4.5, Gemini 2.5 Pro, Grok, and 50+ models via Vercel AI Gateway
- **Mid-Chat Model Switching**: Compare responses or switch models without losing context
- **Conversation Branching**: Fork conversations to explore different directions
- **Resilient Generation**: Responses survive page refresh, tab close, even browser crashes
- **RAG Memory**: Automatic semantic memory extraction and retrieval
- **Voice Input**: Audio transcription with Whisper (OpenAI/Groq)
- **AI Tools**: Web search (Tavily), code execution (E2B), URL parsing (Jina)
- **Cost Tracking**: Per-message token usage and cost breakdown
- **Real-Time Collaboration**: Multi-user projects with live sync (via Convex)

## 💻 CLI

Chat with AI models directly from your terminal.

### Install

```bash
# Shell (macOS/Linux)
curl -fsSL https://blah.chat/install | bash

# npm
npm i -g @blah-chat/cli

# Homebrew (coming soon)
brew install planetaryescape/tap/blah
```

### Usage

```bash
# First time: authenticate via browser
blah login

# Start chatting
blah "What is the capital of France?"
blah --model claude-3-opus "Explain quantum computing"
blah --help
```

## 📸 Preview

<table>
  <tr>
    <td width="50%">
      <img src="./public/assets/app-preview.jpeg" alt="Dark mode" />
      <p align="center"><em>Dark mode</em></p>
    </td>
    <td width="50%">
      <img src="./public/assets/app-preview-light.jpeg" alt="Light mode" />
      <p align="center"><em>Light mode</em></p>
    </td>
  </tr>
</table>

## 🔑 Required API Keys

blah.chat requires API keys for certain features:

### Core Features (Required)

- **`AI_GATEWAY_API_KEY`** - Vercel AI Gateway for all AI model access

### Speech Features (Optional)

#### Speech-to-Text (STT)

Requires ONE of the following providers (configured by admin in Settings):

- **`GROQ_API_KEY`** - Groq Whisper Turbo (default, $0.04/hour)
- **`OPENAI_API_KEY`** - OpenAI Whisper ($0.006/min)
- **`DEEPGRAM_API_KEY`** - Deepgram Nova-3 ($0.0077/min)
- **`ASSEMBLYAI_API_KEY`** - AssemblyAI ($0.0025/min)

#### Text-to-Speech (TTS)

- **`DEEPGRAM_API_KEY`** - Deepgram Aura voices (required)

**Note:** If STT/TTS API keys are not configured, these features will be automatically disabled. Users will see an error message when attempting to enable them:

- **Development**: Specific missing key name shown
- **Production**: "Please contact your administrator" message

See the [Self-Hosting Guide](SELF_HOSTING.md) for full environment variable setup.

## 🚀 Quick Deploy

### Vercel (Recommended - 10 minutes)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bhekanik/blah.chat&integration-ids=oac_VqOgBHqhEoFTPzGZ8ZzE1Qsa,oac_7yeSwUoVR5no3SlA9WM6oZ7l)

Auto-configures Convex and Clerk integrations. Just add your `AI_GATEWAY_API_KEY`.

### Railway (10 minutes)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/blah-chat)

Railway auto-detects environment variables and guides you through setup.

### Self-Hosting

For full instructions on self-hosting (including Fly.io, custom VPS, Docker), see [SELF_HOSTING.md](./SELF_HOSTING.md).

## 📄 License

blah.chat is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE).

**Self-hosted usage**: Free under AGPL-3.0 with default limits (50 messages/day, $10/month budget per user).
**Commercial usage** (exceeding limits or without source disclosure): Requires commercial license.
**Cloud version**: Coming soon with subscription plans.

For commercial licensing or questions, contact: blah.chat@bhekani.com

### Why AGPL?

We chose AGPL to:

- Protect the community from exploitation by cloud providers
- Ensure improvements are shared back with the community
- Allow free self-hosting while building a sustainable business

If you modify blah.chat and run it as a network service, AGPL Section 13 requires you to provide users with access to your modified source code.

---

## Development Setup

### 1. Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

You will need to configure the following API keys in `.env.local`:

**Core Services**

- **Vercel AI Gateway** (`AI_GATEWAY_API_KEY`): Required for all AI model inference (or every user must enable BYOK).
- **Clerk** (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_ISSUER_DOMAIN`, `CLERK_WEBHOOK_SECRET`): User authentication and webhook user-sync.
- **Postgres** (`DATABASE_URL`): Primary database — Neon recommended in production.
- **Upstash Redis** (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`): Live generation event log and cache.
- **Cloudflare R2** (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`): Attachment + transcription storage.
- **Trigger.dev** (`TRIGGER_SECRET_KEY`, `TRIGGER_API_URL`, `INTERNAL_TASK_SECRET`, `INTERNAL_TASK_BASE_URL`): Durable generation workers and recovery cron.
- **Encryption** (`BYOD_ENCRYPTION_KEY`): Encrypts user BYOK provider keys and BYOD connection strings — long-lived, do not rotate without re-encrypting stored credentials.

**AI Tools & Integrations**

- **Tavily** (`TAVILY_API_KEY`): Enables real-time web search capabilities.
- **Jina** (`JINA_API_KEY`): Used by the URL Reader tool to parse web pages into markdown.
- **E2B** (`E2B_API_KEY`): Powers the code interpreter sandbox for executing code safely.
- **Firecrawl** (`FIRECRAWL_API_KEY`): Optional alternative for advanced web scraping/crawling.
- **OpenAI** (`OPENAI_API_KEY`): Needed for audio transcription (Whisper) if not using Groq.

### 2. Production environment checklist

See [`docs/operations/production-env-checklist.md`](./docs/operations/production-env-checklist.md)
for the canonical list derived from `parsePersistenceEnv`. Before promoting
to production, every "Required" entry must be set and `/api/v1/health` must
return `200` with `database`, `redis`, `r2`, and `trigger` all `"ok"`.

### 3. Clerk Webhook Setup

Clerk webhooks sync user data to Convex. **Without this, users will hit an infinite redirect loop on their first sign-in.**

#### Local Development (Tunnel Required)

Since Clerk needs to reach your local server, set up a tunnel:

1. **Start a tunnel** (choose one):

   ```bash
   # Using ngrok
   ngrok http 3000

   # Using cloudflared
   cloudflared tunnel --url http://localhost:3000
   ```

2. **Configure webhook in Clerk Dashboard**:
   - Go to [Clerk Dashboard](https://dashboard.clerk.com) → Webhooks → Add Endpoint
   - Set endpoint URL: `https://your-tunnel-url.ngrok.io/api/webhooks/clerk`
   - Subscribe to events: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing Secret**

3. **Add to `.env.local`**:

   ```bash
   CLERK_WEBHOOK_SECRET=whsec_your_signing_secret_here
   CLERK_ISSUER_DOMAIN=your-clerk-frontend-url.clerk.accounts.dev
   ```

   **Important**: `CLERK_ISSUER_DOMAIN` is your Clerk Frontend API URL (found in Clerk Dashboard → API Keys → Frontend API). Format: `your-app-name.clerk.accounts.dev` for development, `clerk.yourdomain.com` for production.

> **Tip**: Use a **static ngrok URL** (free tier includes one) to avoid reconfiguring the webhook each session:
>
> ```bash
> ngrok http 3000 --domain=your-static-subdomain.ngrok-free.app
> ```
>
> Set this up once in the Clerk dashboard and you're done.

### 4. Clerk JWT Template Setup

**Required for Convex integration**: Configure Clerk to generate JWTs for Convex.

1. **Create JWT Template**:
   - Go to [Clerk Dashboard](https://dashboard.clerk.com) → **JWT templates**
   - Click **New template** → Select **Convex**
   - Copy the **Issuer** URL (this matches your `CLERK_FRONTEND_API_URL`)

2. **Verify Claims** (pre-configured for Convex):
   - `aud`: Convex audience (auto-set)
   - `name`: User's full name from `user.full_name`
   - Add any additional claims as needed using [shortcodes](https://clerk.com/docs/guides/sessions/jwt-templates#shortcodes)

3. **Configure Convex Auth**:
   Your `convex/auth.config.ts` should reference the environment variable:
   ```ts
   export default {
     providers: [
       {
         domain: process.env.CLERK_ISSUER_DOMAIN,
         applicationID: "convex",
       },
     ],
   };
   ```

**Note**: `CLERK_ISSUER_DOMAIN` should be set without protocol (e.g., `your-app-name.clerk.accounts.dev`, not `https://your-app-name.clerk.accounts.dev`).

**Reference**: For complete Convex + Clerk integration guide, see [Clerk Documentation](https://clerk.com/docs/guides/development/integrations/databases/convex).

**Note**: The `applicationID: 'convex'` is correct - it's a constant identifier, not your deployment name.

### 5. Admin Access Setup (Optional)

To access the admin dashboard (`/admin`):

1. **Set yourself as admin** in Convex Dashboard → Data → `users` table → set `isAdmin: true`
2. **Sync to Clerk**:
   ```bash
   bun run scripts/sync-admin-to-clerk.ts
   ```
3. **Sign out and back in** to refresh your session token.

Future admin changes via `/admin/users` auto-sync to Clerk.

### 6. Seed the Database with Models

**Required for new deployments**: The models table must be seeded before the app can function.

Run the seed command via Convex dashboard or CLI:

```bash
# Via Convex CLI (recommended)
bunx convex run models/seed:seedModels

# Or with clear existing (resets all model data)
bunx convex run models/seed:seedModels '{"clearExisting": true}'
```

This inserts:
- 40+ AI models (GPT-5, Claude, Gemini, etc.)
- Model profiles for auto-router scoring
- Default auto-router configuration

**When to seed:**
- Initial deployment (required)
- After `bunx convex deploy --reset`
- When new models are added to `packages/backend/convex/models/seed.ts`

### 7. Run Locally

1. Install dependencies:

   ```bash
   bun install
   ```

2. Start the Convex backend (in a separate terminal):

   ```bash
   bunx convex dev
   ```

3. Start the Next.js development server:
   ```bash
   bun dev
   ```

Open [http://localhost:3000](http://localhost:3000) to see the app.
