# Phase 0: Prerequisites & Setup

**Duration**: 1-2 hours
**Difficulty**: Beginner
**Prerequisites**: Basic command line knowledge

---

## Project Context

### What is blah.chat?

blah.chat is a personal AI chat assistant with the following key features:

- **Multi-Model Support**: Access to 46+ AI models (OpenAI, Claude, Gemini, Groq, Cerebras, xAI, Perplexity, Ollama)
- **Mid-Chat Model Switching**: Change models without losing context
- **Conversation Branching**: Fork conversations to explore different paths
- **RAG Memories**: AI remembers facts about you across conversations
- **Resilient Generation**: Responses survive page refresh/app crash
- **Project Management**: Organize conversations into projects with custom prompts
- **Voice I/O**: Speech-to-text input and text-to-speech output
- **File Attachments**: Upload images, PDFs, documents
- **Cost Tracking**: Transparent token usage and costs per message

### Monorepo Structure

blah.chat uses a **Turborepo monorepo**:

```
blah.chat/
├── apps/
│   ├── web/              # Next.js 15 (production)
│   └── mobile/           # Expo (what we're building)
├── packages/
│   ├── backend/          # @blah-chat/backend - Convex
│   │   └── convex/       # Shared backend code
│   ├── ai/               # @blah-chat/ai - Model configs (scaffold)
│   ├── shared/           # @blah-chat/shared - Utilities (scaffold)
│   └── config/           # @blah-chat/config - TypeScript configs
├── turbo.json            # Task orchestration
├── package.json          # Root workspace
└── bun.lock
```

### Tech Stack Overview

**Frontend (Web - Existing)**:

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui components

**Frontend (Mobile - What We're Building)**:

- React Native via Expo
- TypeScript
- Expo Router (file-based navigation)
- NativeWind (Tailwind CSS for RN)

**Backend (Shared at `packages/backend/`)**:

- **Convex**: Real-time database with WebSocket subscriptions
- **Clerk**: Authentication (OAuth, email/password)
- **Vercel AI SDK**: Unified interface to LLM providers
- **Bun**: Package manager (used throughout)

**Key Architecture Pattern**:

- **Convex Direct**: Mobile uses Convex React client directly (same as web)
- **Resilient Generation**: Server-side message generation survives disconnects
- **Single Backend**: Both web and mobile share `packages/backend/convex/`

---

## Why This Phase Matters

Before writing any code, you need:

1. **Development tools** - Bun, Expo CLI, simulators
2. **Understanding** - How Convex + Clerk work in monorepo
3. **Verification** - Monorepo runs correctly (`bun dev`)
4. **Environment** - iOS/Android simulators ready

Skipping this phase causes:

- "Module not found" errors
- Authentication failures
- Simulator crashes
- Hours of debugging

---

## What You'll Achieve

By the end of this phase:

- Development environment configured
- Expo CLI installed and working
- iOS Simulator and/or Android Emulator running
- Monorepo web app running locally
- Understanding of Convex real-time architecture
- Understanding of Clerk authentication flow
- Familiarity with monorepo structure

---

## Step 1: Install Core Development Tools

### 1.1 Node.js (v20+)

**macOS (via Homebrew)**:

```bash
brew install node@20
```

**macOS/Linux (via nvm)**:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
nvm alias default 20
```

**Verify**:

```bash
node --version  # Should show v20.x.x
```

---

### 1.2 Bun (Package Manager)

blah.chat uses **Bun exclusively** - never use npm, pnpm, or yarn.

**macOS/Linux**:

```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows**:

```bash
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Verify**:

```bash
bun --version  # Should show 1.x.x
```

---

### 1.3 Expo CLI

**Install globally**:

```bash
bun add -g expo-cli eas-cli
```

**Verify**:

```bash
bunx expo --version   # Should show SDK version
bunx eas --version    # For builds (used later)
```

---

### 1.4 Watchman (macOS/Linux - Recommended)

Watchman improves file watching performance.

**macOS**:

```bash
brew install watchman
```

**Verify**:

```bash
watchman --version
```

---

## Step 2: Set Up iOS Simulator (macOS Only)

### 2.1 Install Xcode

1. Open **App Store**
2. Search for "Xcode"
3. Click **Install** (14GB+)
4. Accept license: `sudo xcodebuild -license accept`

**Verify**:

```bash
xcodebuild -version  # Should show Xcode 15.x
```

### 2.2 Install iOS Simulators

1. Open Xcode
2. Settings → Platforms
3. Download **iOS 17.x Simulator** or latest

### 2.3 Test iOS Simulator

```bash
xcrun simctl list devices
bunx expo start --ios
```

---

## Step 3: Set Up Android Emulator

### 3.1 Install Android Studio

Download from <https://developer.android.com/studio>

### 3.2 Install SDK Components

In Android Studio Settings → Android SDK:

**SDK Platforms**:

- Android 14.0 (API 34)

**SDK Tools**:

- Android SDK Build-Tools
- Android Emulator
- Android SDK Platform-Tools

### 3.3 Set Environment Variables

Add to `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Apply: `source ~/.zshrc`

### 3.4 Create AVD

Tools → Device Manager → Create Device → Pixel 7 Pro → API 34

### 3.5 Test Android Emulator

```bash
emulator -list-avds
bunx expo start --android
```

---

## Step 4: Verify Monorepo Setup

### 4.1 Clone Repository (if needed)

```bash
cd ~/code
git clone <repository-url> blah.chat
cd blah.chat
```

### 4.2 Install Dependencies

```bash
bun install
```

**Expected**: Installs workspace packages in ~10 seconds

### 4.3 Start Convex Backend

**Terminal 1**:

```bash
cd packages/backend
bunx convex dev
```

**Expected output**:

```
✔ Convex functions ready
  Deployment URL: https://your-deployment.convex.cloud
  Dashboard: https://dashboard.convex.dev/...

Watching for file changes...
```

**Keep this terminal running.**

### 4.4 Start Web App

**Terminal 2**:

```bash
bun dev
```

Or specifically:

```bash
cd apps/web
bun dev
```

### 4.5 Verify Web App Works

1. Open <http://localhost:3000>
2. Sign in with Clerk
3. Create a conversation
4. Send a message
5. Verify AI responds

**If web app doesn't work**: Fix it before proceeding. Mobile shares the same backend.

---

## Step 5: Understand Convex Architecture

### What is Convex?

Convex is a **real-time backend** that replaces traditional databases + APIs:

**Key Features**:

- **Real-time Subscriptions**: `useQuery` auto-updates when data changes
- **Type-safe**: Generated TypeScript types from schema
- **Server Functions**: Queries, mutations, actions in TypeScript
- **Vector Search**: Built-in semantic search for RAG
- **Actions**: Long-running tasks (up to 10 min) for LLM calls

### Convex Function Types

**Queries** (Read - Reactive):

```typescript
// packages/backend/convex/messages.ts
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});
```

**Usage in React**:

```typescript
import { useQuery } from "convex/react";
import { api } from "@blah-chat/backend/convex/_generated/api";

const messages = useQuery(api.messages.list, { conversationId });
// Auto-updates when messages change - no manual refetch
```

**Mutations** (Write):

```typescript
export const send = mutation({
  args: { conversationId: v.id("conversations"), content: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      content: args.content,
      role: "user",
      status: "complete",
    });
  },
});
```

**Actions** (Long-running, External APIs):

```typescript
export const generateResponse = action({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    // Can run up to 10 minutes
    // Call LLMs, update DB incrementally
    // Survives app crashes via partialContent in DB
  },
});
```

### Why Convex Direct for Mobile?

**Pros**:

- Real-time updates (<100ms latency)
- Same patterns as web (code sharing)
- Type-safe API (generated types)
- Built-in offline retry
- WebSocket works in React Native

**Mobile requires**: Node.js polyfills (Buffer, process) - configured in Phase 1.

---

## Step 6: Understand Clerk Authentication

### What is Clerk?

Clerk provides **drop-in authentication**:

- Social Login (Google, Apple, GitHub)
- Email/Password
- Magic Links
- Multi-Factor Auth

### How Clerk Works with Convex

1. User signs in via Clerk (mobile)
2. Clerk issues JWT token
3. JWT sent to Convex in WebSocket handshake
4. Convex validates JWT via `auth.config.ts`
5. Backend functions access user via `ctx.auth`

### Clerk in React Native

Uses `@clerk/clerk-expo` package:

```typescript
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";

<ClerkProvider publishableKey={CLERK_KEY}>
  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
    <App />
  </ConvexProviderWithClerk>
</ClerkProvider>;
```

Tokens stored in `expo-secure-store` (encrypted).

---

## Step 7: Explore Codebase Structure

### Key Directories

**Backend** (`packages/backend/convex/`):

- `schema.ts` - Database schema (~30 tables)
- `auth.config.ts` - Clerk integration
- `chat.ts` - Message sending
- `generation.ts` - LLM streaming (resilient)
- `messages.ts` - Message CRUD
- `memories/` - RAG system

**Web App** (`apps/web/src/`):

- `app/` - Next.js pages
- `components/` - React components
- `lib/hooks/` - Custom hooks
- `lib/ai/` - Model configurations (46 models)

### Important Files to Review

**Schema** (`packages/backend/convex/schema.ts`):

```typescript
messages: defineTable({
  conversationId: v.id("conversations"),
  content: v.string(),
  partialContent: v.optional(v.string()), // For streaming
  status: v.union(
    v.literal("pending"),
    v.literal("generating"),
    v.literal("complete")
  ),
  role: v.union(v.literal("user"), v.literal("assistant")),
  // ...
});
```

**Generation** (`packages/backend/convex/generation.ts`):

- Handles LLM streaming
- Updates `partialContent` every ~200ms
- Survives disconnects (data in DB)

---

## Step 8: Verify Prerequisites Checklist

### Tools Installed

- [ ] Node.js 20+ (`node --version`)
- [ ] Bun 1.x+ (`bun --version`)
- [ ] Expo CLI (`bunx expo --version`)
- [ ] Watchman (macOS/Linux)

### Simulators/Devices

- [ ] iOS Simulator working (macOS) OR
- [ ] Android Emulator working OR
- [ ] Physical device with Expo Go

### Monorepo Running

- [ ] `bun install` completed
- [ ] Convex backend running (`cd packages/backend && bunx convex dev`)
- [ ] Web app running (`bun dev`)
- [ ] Can sign in at <http://localhost:3000>
- [ ] Can send message and get AI response

### Understanding

- [ ] Understand monorepo structure
- [ ] Understand Convex queries/mutations/actions
- [ ] Understand Clerk authentication flow
- [ ] Understand resilient generation pattern

---

## Troubleshooting

### "Command not found: bun"

```bash
export PATH="$HOME/.bun/bin:$PATH"
source ~/.zshrc
```

### "Xcode license not accepted"

```bash
sudo xcodebuild -license accept
```

### "Android SDK not found"

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
source ~/.zshrc
```

### "convex dev fails with authentication error"

```bash
bunx convex login
```

### "Clerk authentication fails"

1. Check `.env.local` has correct keys
2. Verify keys match Clerk dashboard
3. Restart `bun dev` after env changes

---

## Next Phase Preview

**Phase 1: Project Setup & Authentication** will cover:

- Creating `apps/mobile/` with Expo Router
- Configuring Metro bundler for monorepo
- Setting up Clerk authentication
- Adding NativeWind styling
- Verifying Convex queries work

**Estimated Time**: 4-6 hours

**Required**: All Phase 0 prerequisites complete

---

## Resources

### Official Docs

- **Expo**: <https://docs.expo.dev>
- **Convex React Native**: <https://docs.convex.dev/client/react-native>
- **Clerk Expo**: <https://clerk.com/docs/expo>
- **NativeWind**: <https://www.nativewind.dev>

### Reference Template

- **Convex Monorepo**: <https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo>

---

## Success Criteria

You're ready for Phase 1 when:

1. All tools installed and verified
2. Simulator or physical device working
3. Monorepo web app runs without errors
4. Can sign in and chat in web app
5. Understand Convex and Clerk basics
6. Understand monorepo structure

**If any item is incomplete**: Go back and fix it. Don't proceed with partial setup.

---

**Next**: [Phase 1: Project Setup & Authentication](./phase-1-setup-auth.md)
