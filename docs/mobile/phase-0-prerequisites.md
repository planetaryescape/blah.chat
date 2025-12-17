# Phase 0: Prerequisites & Setup

**Duration**: 1-2 hours
**Difficulty**: Beginner
**Prerequisites**: Basic command line knowledge

---

## Project Context

### What is blah.chat?

blah.chat is a personal AI chat assistant with the following key features:

- **Multi-Model Support**: Access to 60+ AI models (OpenAI, Claude, Gemini, Groq, Cerebras, xAI, Perplexity, Ollama)
- **Mid-Chat Model Switching**: Change models without losing context
- **Conversation Branching**: Fork conversations to explore different paths
- **RAG Memories**: AI remembers facts about you across conversations
- **Resilient Generation**: Responses survive page refresh/disconnection
- **Project Management**: Organize conversations into projects with custom prompts
- **Voice I/O**: Speech-to-text input and text-to-speech output
- **File Attachments**: Upload images, PDFs, documents
- **Cost Tracking**: Transparent token usage and costs per message

### Tech Stack Overview

**Frontend (Web - Existing)**:
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Framer Motion animations

**Frontend (Mobile - What We're Building)**:
- React Native via Expo
- TypeScript
- React Navigation
- React Native Paper or Tamagui (UI)

**Backend (Shared)**:
- **Convex**: Real-time database with WebSocket subscriptions, vector search, and file storage
- **Clerk**: Authentication (OAuth, email/password, magic links)
- **Vercel AI SDK**: Unified interface to 10+ LLM providers
- **Bun**: Package manager and JavaScript runtime

**Key Architecture Pattern**:
- **Hybrid Data Layer**: Convex WebSocket for real-time updates + REST API for fallback
- **Resilient Generation**: Server-side message generation via Convex actions (survives disconnects)
- **Normalized Schema**: No nested arrays, junction tables for many-to-many relationships

---

## Why This Phase Matters

Before writing any code, you need:
1. **Development tools** - Node.js, Bun, Expo CLI, simulators
2. **Understanding** - How Convex, Clerk, and the hybrid architecture work
3. **Verification** - The web app runs locally and you can test features
4. **Environment** - iOS/Android simulators or physical devices ready

Skipping this phase causes:
- ❌ "Module not found" errors
- ❌ Authentication failures
- ❌ Simulator crashes
- ❌ Hours of debugging

---

## What You'll Achieve

By the end of this phase:
- ✅ Development environment configured
- ✅ Expo CLI installed and working
- ✅ iOS Simulator and/or Android Emulator running
- ✅ Web app running locally at http://localhost:3000
- ✅ Understanding of Convex real-time architecture
- ✅ Understanding of Clerk authentication flow
- ✅ Familiarity with the existing codebase structure

---

## Step 1: Install Core Development Tools

### 1.1 Node.js (v20+)

**macOS (via Homebrew)**:
```bash
brew install node@20
```

**macOS/Linux (via nvm - recommended)**:
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20
```

**Windows**:
Download from https://nodejs.org (LTS version)

**Verify**:
```bash
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

---

### 1.2 Bun (Package Manager)

blah.chat uses **Bun** instead of npm for faster installs.

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
npm install -g expo-cli eas-cli
```

**Verify**:
```bash
expo --version    # Should show 7.x.x or higher
eas --version     # Should show 14.x.x or higher
```

**Note**: Expo CLI is the command-line interface for Expo. EAS CLI is for build/submit services (used later).

---

### 1.4 Watchman (macOS/Linux - Optional but Recommended)

Watchman improves file watching performance for React Native.

**macOS**:
```bash
brew install watchman
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt-get install watchman
```

**Verify**:
```bash
watchman --version  # Should show 2024.x.x
```

---

## Step 2: Set Up iOS Simulator (macOS Only)

### 2.1 Install Xcode

1. Open **App Store**
2. Search for "Xcode"
3. Click **Install** (14GB+, takes 30-60 min)
4. Accept license: `sudo xcodebuild -license accept`

**Verify**:
```bash
xcodebuild -version
# Should show: Xcode 15.x
```

---

### 2.2 Install Xcode Command Line Tools

```bash
xcode-select --install
```

---

### 2.3 Install iOS Simulators

1. Open **Xcode**
2. Go to **Settings → Platforms** (or **Preferences → Components** in older versions)
3. Download **iOS 17.x Simulator** or latest
4. Wait for download to complete

---

### 2.4 Test iOS Simulator

```bash
# List available simulators
xcrun simctl list devices

# Boot a simulator (replace with actual device name)
xcrun simctl boot "iPhone 15 Pro"

# Or use Expo helper:
expo start --ios
```

**Expected**: iPhone simulator window opens

---

## Step 3: Set Up Android Emulator (All Platforms)

### 3.1 Install Android Studio

**Download**: https://developer.android.com/studio

**macOS**:
1. Download `.dmg` file
2. Drag Android Studio to Applications
3. Open Android Studio
4. Follow setup wizard (install SDK, emulator, etc.)

**Windows/Linux**:
Follow installer instructions

---

### 3.2 Install Android SDK Components

In Android Studio:
1. Open **Settings → Languages & Frameworks → Android SDK** (or **Preferences → Appearance & Behavior → System Settings → Android SDK**)
2. **SDK Platforms** tab:
   - Check **Android 14.0 (API 34)** or latest
   - Check **Android 13.0 (API 33)**
3. **SDK Tools** tab:
   - Check **Android SDK Build-Tools**
   - Check **Android Emulator**
   - Check **Android SDK Platform-Tools**
4. Click **Apply** → Wait for downloads

---

### 3.3 Set Environment Variables

Add to `~/.zshrc` (macOS) or `~/.bashrc` (Linux) or System Environment Variables (Windows):

```bash
# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# export ANDROID_HOME=$HOME/Android/Sdk        # Linux
# export ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk  # Windows

export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

**Apply changes**:
```bash
source ~/.zshrc  # macOS
# source ~/.bashrc  # Linux
```

**Verify**:
```bash
echo $ANDROID_HOME  # Should show path to SDK
adb --version       # Should show Android Debug Bridge version
```

---

### 3.4 Create Android Virtual Device (AVD)

In Android Studio:
1. Go to **Tools → Device Manager** (or **AVD Manager** in older versions)
2. Click **Create Device**
3. Select **Phone → Pixel 7 Pro** (or similar)
4. Click **Next**
5. Select **Tiramisu (API 33)** or **UpsideDownCake (API 34)**
6. Click **Next** → **Finish**

---

### 3.5 Test Android Emulator

```bash
# List available emulators
emulator -list-avds

# Start an emulator (replace with your AVD name)
emulator -avd Pixel_7_Pro_API_34

# Or use Expo helper:
expo start --android
```

**Expected**: Android emulator window opens

---

## Step 4: Set Up Physical Devices (Optional)

### iOS (iPhone/iPad)

1. **Install Expo Go** from App Store: https://apps.apple.com/app/expo-go/id982107779
2. **Connect to same WiFi** as your dev machine
3. **Enable Developer Mode** (iOS 16+):
   - Settings → Privacy & Security → Developer Mode → Enable
4. **Sign in to Apple account** (for development builds later)

---

### Android (Phone/Tablet)

1. **Install Expo Go** from Play Store: https://play.google.com/store/apps/details?id=host.exp.exponent
2. **Connect to same WiFi** as your dev machine
3. **Enable Developer Options**:
   - Settings → About Phone → Tap "Build Number" 7 times
4. **Enable USB Debugging**:
   - Settings → Developer Options → USB Debugging → Enable
5. **Connect via USB** and authorize computer

**Test USB connection**:
```bash
adb devices
# Should list your device
```

---

## Step 5: Clone & Run Web App Locally

### 5.1 Clone Repository

If you don't already have the codebase:

```bash
cd ~/code  # Or your preferred directory
git clone <repository-url> blah.chat
cd blah.chat
```

---

### 5.2 Install Dependencies

```bash
bun install
```

**Expected**: Installs 200+ packages in ~10 seconds

---

### 5.3 Set Up Environment Variables

Create `.env.local` file in project root:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in:

```bash
# Convex (auto-generated by bunx convex dev)
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=

# Clerk Authentication (get from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
CLERK_ISSUER_DOMAIN=

# Other keys (optional for now)
AI_GATEWAY_API_KEY=
```

**Getting Clerk Keys**:
1. Go to https://dashboard.clerk.com
2. Create account if needed
3. Create new application → Select "Next.js"
4. Copy keys to `.env.local`
5. In Clerk Dashboard: **Configure → JWT Templates → Create "convex" template**
6. Copy Issuer URL to `CLERK_ISSUER_DOMAIN`

---

### 5.4 Start Convex Backend

In a **new terminal** window:

```bash
cd blah.chat
bunx convex dev
```

**Expected output**:
```
✔ Convex deployed and code pushed to...
  Deployment URL: https://your-deployment.convex.cloud
  Dashboard: https://dashboard.convex.dev/...

Watching for file changes...
```

**Copy the Deployment URL** to `.env.local` as `NEXT_PUBLIC_CONVEX_URL`

**Leave this terminal running** - Convex dev server must stay active.

---

### 5.5 Start Next.js Web App

In a **new terminal** window:

```bash
cd blah.chat
bun dev
```

**Expected output**:
```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
- Ready in 2.5s
```

---

### 5.6 Verify Web App Works

1. Open http://localhost:3000 in browser
2. Click **Sign In**
3. Create account or sign in with Google
4. You should see the main app interface
5. Try:
   - Create a new conversation
   - Send a message "Hello!"
   - Get a response from the AI
   - Upload an image (if you have AI_GATEWAY_API_KEY set)

**If web app doesn't work**: Fix it before proceeding. Mobile app shares the same backend.

---

## Step 6: Understand Convex Architecture

### 6.1 What is Convex?

Convex is a **real-time backend** that replaces traditional databases + APIs:

**Key Features**:
- **Real-time Subscriptions**: `useQuery` automatically updates when data changes
- **Reactive Queries**: No manual refetching needed
- **Server Functions**: Write backend logic in TypeScript
- **Vector Search**: Built-in semantic search for RAG
- **File Storage**: Upload/download files with signed URLs
- **Actions**: Long-running tasks (up to 10 minutes) for LLM calls

---

### 6.2 Convex Function Types

**Queries** (Read Data):
```typescript
// convex/messages.ts
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});
```

**Usage in React**:
```typescript
const messages = useQuery(api.messages.list, { conversationId });
// Automatically re-fetches when messages change
```

**Mutations** (Write Data):
```typescript
export const send = mutation({
  args: { conversationId: v.id("conversations"), content: v.string() },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      content: args.content,
      userId: ctx.auth.getUserIdentity()!.subject,
      role: "user",
      status: "complete",
    });
    return messageId;
  },
});
```

**Usage in React**:
```typescript
const sendMessage = useMutation(api.messages.send);
await sendMessage({ conversationId, content: "Hello!" });
```

**Actions** (Long-Running, Can Call External APIs):
```typescript
export const generateResponse = action({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    // Fetch message
    const message = await ctx.runQuery(internal.messages.get, { messageId: args.messageId });

    // Call LLM (can take 10+ seconds)
    const stream = await openai.chat.completions.create({...});

    // Stream back to DB
    for await (const chunk of stream) {
      await ctx.runMutation(internal.messages.updatePartial, {
        messageId: args.messageId,
        partialContent: chunk.choices[0].delta.content,
      });
    }
  },
});
```

---

### 6.3 Why Convex for Mobile?

**Pros**:
- ✅ Real-time updates (<100ms latency)
- ✅ Offline support (queues mutations when disconnected)
- ✅ Type-safe (generated TypeScript types)
- ✅ No REST API boilerplate
- ✅ WebSocket works natively in React Native

**Cons**:
- ⚠️ Offline queue is memory-only (lost if app closes)
- ⚠️ Requires Node.js polyfills in React Native
- ⚠️ No HTTP caching (always fresh data)

**For blah.chat**: We use **hybrid approach** - Convex for real-time, REST API for offline queue.

---

## Step 7: Understand Clerk Authentication

### 7.1 What is Clerk?

Clerk provides **drop-in authentication** with:
- **Social Login**: Google, Apple, GitHub, etc.
- **Email/Password**: Traditional auth
- **Magic Links**: Passwordless email login
- **Multi-Factor Auth**: SMS, authenticator app
- **User Management**: Dashboard for managing users

---

### 7.2 How Clerk Works with Convex

**Flow**:
1. User signs in via Clerk (web or mobile)
2. Clerk issues JWT token with user ID
3. JWT sent to Convex in WebSocket handshake
4. Convex validates JWT via `convex/auth.config.ts`
5. Backend functions access `ctx.auth.getUserIdentity()`

**Configuration** (`convex/auth.config.ts`):
```typescript
export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_DOMAIN!, // e.g., https://your-app.clerk.accounts.dev
      applicationID: "convex",
    },
  ],
};
```

---

### 7.3 Clerk in React Native

**Key Differences from Web**:
- Use `@clerk/clerk-expo` package (not `@clerk/nextjs`)
- Tokens stored in `expo-secure-store` (encrypted)
- Native OAuth flows (Google, Apple) instead of web views
- No server-side rendering

**Example** (Phase 1 will implement this):
```typescript
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';

<ClerkProvider publishableKey={CLERK_KEY}>
  <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
    <App />
  </ConvexProviderWithClerk>
</ClerkProvider>
```

---

## Step 8: Explore Codebase Structure

### 8.1 Key Directories

Open the project in your code editor and explore:

**Backend** (`/convex/`):
- `schema.ts` - Database schema (users, conversations, messages, etc.)
- `auth.config.ts` - Clerk integration
- `chat.ts` - Message sending/receiving logic
- `conversations.ts` - Conversation CRUD
- `generation.ts` - LLM streaming logic
- `memories.ts` - RAG system

**Frontend Web** (`/src/`):
- `app/` - Next.js App Router pages
- `components/` - React components (450+ files)
- `lib/hooks/` - Custom hooks (queries, mutations)
- `lib/ai/` - Model configurations
- `lib/api/` - REST API client (for mobile fallback)

**API Routes** (`/src/app/api/v1/`):
- REST endpoints for mobile/TUI fallback
- `conversations/`, `messages/`, `preferences/`, `search/`

---

### 8.2 Important Files to Review

**Schema** (`convex/schema.ts`):
```typescript
defineTable("messages")
  .index("by_conversation", ["conversationId"])
  .index("by_user", ["userId"])
  .searchIndex("search_content", { searchField: "content" })
  .vectorIndex("by_embedding", { vectorField: "embedding", dimensions: 1536 });
```

**Hooks** (`src/lib/hooks/queries/useMessages.ts`):
```typescript
export function useMessages(conversationId: Id<"conversations">) {
  const useConvexMode = shouldUseConvex(); // Platform detection

  // Convex WebSocket (web)
  const convexData = usePaginatedQuery(
    api.messages.listPaginated,
    useConvexMode ? { conversationId } : "skip",
    { initialNumItems: 50 }
  );

  // REST API (mobile fallback)
  const restQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => apiClient.get(`/conversations/${conversationId}/messages`),
    enabled: !useConvexMode,
  });

  // Unified return
  return useConvexMode ? convexData : restQuery;
}
```

**This pattern** is what you'll replicate in mobile app.

---

## Step 9: Verify Prerequisites Checklist

Before proceeding to Phase 1, ensure:

### Tools Installed
- [ ] Node.js 20+ (`node --version`)
- [ ] Bun 1.x+ (`bun --version`)
- [ ] Expo CLI 7.x+ (`expo --version`)
- [ ] Watchman (macOS/Linux) (`watchman --version`)

### Simulators/Devices
- [ ] iOS Simulator working (macOS) OR
- [ ] Android Emulator working (all platforms) OR
- [ ] Physical device with Expo Go installed

### Web App Running
- [ ] Repository cloned
- [ ] Dependencies installed (`bun install`)
- [ ] Convex backend running (`bunx convex dev`)
- [ ] Web app running (`bun dev`)
- [ ] Can sign in at http://localhost:3000
- [ ] Can send a message and get AI response

### Understanding
- [ ] Understand Convex queries/mutations/actions
- [ ] Understand Clerk authentication flow
- [ ] Understand hybrid architecture (Convex + REST)
- [ ] Familiar with codebase structure

---

## Troubleshooting

### "Command not found: bun"

**Cause**: Bun not in PATH
**Solution**:
```bash
# Add to ~/.zshrc or ~/.bashrc
export PATH="$HOME/.bun/bin:$PATH"
source ~/.zshrc
```

---

### "Xcode license not accepted"

**Cause**: Need to accept Xcode license
**Solution**:
```bash
sudo xcodebuild -license accept
```

---

### "Unable to boot simulator"

**Cause**: Simulator not downloaded or corrupted
**Solution**:
1. Open Xcode
2. Window → Devices and Simulators
3. Delete simulator
4. Create new simulator (iPhone 15 Pro, iOS 17)

---

### "Android SDK not found"

**Cause**: ANDROID_HOME not set
**Solution**:
```bash
# Find SDK location
ls ~/Library/Android/sdk  # macOS
ls ~/Android/Sdk          # Linux
ls C:\Users\YourName\AppData\Local\Android\Sdk  # Windows

# Add to shell profile
export ANDROID_HOME=<path-from-above>
source ~/.zshrc
```

---

### "convex dev fails with authentication error"

**Cause**: Not logged in to Convex
**Solution**:
```bash
bunx convex login
# Opens browser for authentication
```

---

### "Clerk authentication fails in web app"

**Cause**: Missing or incorrect Clerk keys
**Solution**:
1. Check `.env.local` has correct keys
2. Verify keys in Clerk dashboard match
3. Ensure `CLERK_ISSUER_DOMAIN` matches JWT template
4. Restart `bun dev` after changing `.env.local`

---

### "Web app loads but no AI response"

**Cause**: Missing AI_GATEWAY_API_KEY or Convex action error
**Solution**:
1. Check Convex dashboard for errors: https://dashboard.convex.dev
2. Add AI_GATEWAY_API_KEY to `.env.local`
3. Restart `bunx convex dev` and `bun dev`

---

## Next Phase Preview

**Phase 1: Project Setup & Authentication** will cover:
- Creating Expo app with TypeScript
- Configuring Metro bundler for Convex
- Setting up Clerk authentication in React Native
- Implementing sign-in/sign-up screens
- Creating protected navigation structure
- Verifying Convex queries work with auth

**Estimated Time**: 4-6 hours

**Required**: All Phase 0 prerequisites complete ✅

---

## Resources

### Official Docs
- **Expo**: https://docs.expo.dev
- **Convex**: https://docs.convex.dev
- **Clerk**: https://clerk.com/docs
- **React Native**: https://reactnative.dev

### Tools
- **Xcode**: https://developer.apple.com/xcode/
- **Android Studio**: https://developer.android.com/studio
- **Bun**: https://bun.sh

### Community
- **Expo Discord**: https://chat.expo.dev
- **Convex Discord**: https://convex.dev/community
- **Clerk Discord**: https://clerk.com/discord

---

## Success Criteria

You're ready for Phase 1 when:
1. ✅ All tools installed and verified
2. ✅ Simulator or physical device working
3. ✅ Web app runs locally without errors
4. ✅ Can sign in and send messages in web app
5. ✅ Understand Convex and Clerk basics
6. ✅ Codebase structure makes sense

**If any item is ❌**: Go back and fix it. Don't proceed with partial setup.

---

**Next**: [Phase 1: Project Setup & Authentication](./phase-1-setup-auth.md)
