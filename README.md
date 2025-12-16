This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Development Setup

### 1. Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

You will need to configure the following API keys in `.env.local`:

**Core Services**

- **Vercel AI Gateway** (`AI_GATEWAY_API_KEY`): Required for all AI model inference.
- **Clerk** (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_ISSUER_DOMAIN`): For user authentication and Convex integration.
- **Convex** (`NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`): Backend database and functions (configured automatically via `bunx convex dev`).

**AI Tools & Integrations**

- **Tavily** (`TAVILY_API_KEY`): Enables real-time web search capabilities.
- **Jina** (`JINA_API_KEY`): Used by the URL Reader tool to parse web pages into markdown.
- **E2B** (`E2B_API_KEY`): Powers the code interpreter sandbox for executing code safely.
- **Firecrawl** (`FIRECRAWL_API_KEY`): Optional alternative for advanced web scraping/crawling.
- **OpenAI** (`OPENAI_API_KEY`): Needed for audio transcription (Whisper) if not using Groq.

### 2. Clerk Webhook Setup

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
         applicationID: 'convex',
       },
     ],
   };
   ```

**Note**: `CLERK_ISSUER_DOMAIN` should be set without protocol (e.g., `your-app-name.clerk.accounts.dev`, not `https://your-app-name.clerk.accounts.dev`).

**Reference**: For complete Convex + Clerk integration guide, see [Clerk Documentation](https://clerk.com/docs/guides/development/integrations/databases/convex).

**Note**: The `applicationID: 'convex'` is correct - it's a constant identifier, not your deployment name.

### 5. Run Locally

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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
