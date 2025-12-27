# blah.chat Mobile App - Implementation Guide

**Last Updated**: December 2025
**Target Platform**: React Native (iOS & Android) via Expo
**Architecture**: Convex Direct (WebSocket real-time subscriptions)
**Location**: `apps/mobile/` in monorepo

---

## Overview

This directory contains comprehensive guides for implementing the blah.chat mobile app using Expo and React Native within the existing Turborepo monorepo. The mobile app uses **Convex directly** for real-time WebSocket subscriptions - the same pattern as the web app.

**Project Context**: blah.chat is a personal AI chat assistant with access to 46+ models, mid-chat switching, conversation branching, RAG memories, and transparent cost tracking. The monorepo structure:

```
blah.chat/
├── apps/
│   ├── web/           # Next.js 15 (production)
│   └── mobile/        # Expo (this guide)
├── packages/
│   ├── backend/       # @blah-chat/backend - Convex (shared)
│   ├── ai/            # @blah-chat/ai - Model configs (scaffold)
│   ├── shared/        # @blah-chat/shared - Utilities (scaffold)
│   └── config/        # @blah-chat/config - TypeScript configs
└── turbo.json
```

---

## Architecture Decision

### Why Convex Direct (Not REST API)?

The mobile app uses **Convex React client directly** - same as web:

**Benefits:**
- Real-time WebSocket subscriptions (auto-updating UI)
- Same reactive patterns as web (less code duplication)
- Type-safe queries/mutations shared with web
- <100ms latency for updates
- Built-in offline retry (Convex SDK handles reconnection)
- Single source of truth: `packages/backend/convex/`

**How it works:**
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@blah-chat/backend/convex/_generated/api";

// Reactive subscription - auto-updates when data changes
const messages = useQuery(api.messages.list, { conversationId });

// Mutation - optimistic updates built-in
const sendMessage = useMutation(api.chat.sendMessage);
```

**Polyfills Required:** React Native needs Node.js polyfills (Buffer, process) configured in Metro bundler - covered in Phase 1.

---

## V1 Scope

### Included in V1
- **Chat**: Send messages, real-time streaming responses
- **Resilient Generation**: Responses survive app crash/refresh
- **RAG/Memories**: Auto-extraction, semantic search, personalization
- **Multi-Model**: 46 model selector, switch mid-conversation
- **Tool Calls**: Web search, code execution, file processing (server-side)
- **Cost Tracking**: Per-message pricing, usage dashboard
- **PostHog Analytics**: Session tracking, feature flags

### Deferred to V2
- Projects management
- Notes system
- Tasks
- File attachments in projects

---

## Implementation Phases

### **Phase 0: Prerequisites & Setup** (`phase-0-prerequisites.md`)
**Duration**: 1-2 hours

- Install development tools (Bun, Expo CLI, simulators)
- Verify monorepo is set up correctly
- Understand Convex + Clerk architecture
- Run `bunx convex dev` from `packages/backend/`

**Deliverable**: Development environment ready

---

### **Phase 1: Project Setup & Authentication** (`phase-1-setup-auth.md`)
**Duration**: 4-6 hours

- Create `apps/mobile/` with Expo Router
- Configure Metro bundler for monorepo workspaces
- Add Node.js polyfills (Buffer, process)
- Integrate Clerk authentication
- Set up Convex client with `ConvexProviderWithClerk`
- Configure NativeWind (Tailwind CSS for RN)

**Deliverables**:
- Authenticated Expo app
- Convex queries work
- Basic navigation structure
- NativeWind styling ready

**Key Files**:
```
apps/mobile/
├── app/_layout.tsx       # Root providers (Clerk + Convex)
├── app/(auth)/sign-in.tsx
├── app/(tabs)/_layout.tsx
├── metro.config.js       # Monorepo + polyfills
├── tailwind.config.js    # NativeWind
└── tsconfig.json         # Paths to @blah-chat/backend
```

---

### **Phase 2: Core Chat Implementation** (`phase-2-core-chat.md`)
**Duration**: 8-12 hours

- Build conversation list with FlashList
- Implement virtualized message list
- Create chat input with model selector
- Add real-time streaming display (`partialContent`)
- Implement resilient generation pattern
- Add message actions (copy, regenerate, delete)

**Deliverables**:
- Functional chat interface
- Real-time streaming responses
- Model switching
- Optimistic UI updates

**Key Components**:
```
components/
├── ConversationList.tsx   # FlashList + pull-to-refresh
├── MessageList.tsx        # Virtualized with streaming
├── ChatInput.tsx          # Auto-expand + model picker
├── ModelSelector.tsx      # Bottom sheet (46 models)
└── MessageBubble.tsx      # Markdown + code highlighting
```

**Critical Pattern - Resilient Generation**:
```typescript
// Message stored in DB with partialContent
// If app crashes, response continues server-side
// On reopen, useQuery auto-fetches completed/partial response
const messages = useQuery(api.messages.list, { conversationId });
// Each message has: status, content, partialContent
```

---

### **Phase 3: Files & Voice** (`phase-3-files-voice.md`)
**Duration**: 6-8 hours

- Image picker (camera + gallery)
- File upload to Convex storage
- Voice recording with waveform
- Speech-to-text (STT)
- Text-to-speech (TTS) playback

**Deliverables**:
- Image uploads in chat
- Voice messages
- Audio transcription
- TTS playback

---

### **Phase 4: Projects & Organization** (`phase-4-projects.md`)
**Status**: V2 - Future Work

- Project management
- Notes system
- Tasks
- Search functionality

**Note**: This phase is documented for future reference but is outside V1 scope.

---

## Technology Stack

### Mobile App
- **Framework**: Expo SDK 54+ with Expo Router
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS for RN)
- **Lists**: FlashList v2 (5x faster than FlatList)
- **Markdown**: react-native-markdown-display
- **Code Highlighting**: Shiki (via react-native-shiki-engine) or Prism

### Shared Backend
- **Database**: Convex (shared via `@blah-chat/backend`)
- **Auth**: Clerk (shared configuration)
- **AI**: Vercel AI SDK + Gateway (server-side)
- **Analytics**: PostHog (React Native SDK)

### State Management
- **Primary**: Convex reactive queries (real-time)
- **Local**: React Context for UI state
- **Offline**: Convex SDK auto-retry (minimal setup)

---

## Project Structure

```
apps/mobile/
├── app/                          # Expo Router
│   ├── _layout.tsx               # Root: Clerk + Convex providers
│   ├── (auth)/
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── (tabs)/
│       ├── _layout.tsx           # Tab navigation
│       ├── index.tsx             # Conversations list
│       ├── chat/[id].tsx         # Chat screen
│       └── settings.tsx          # Settings
├── components/
│   ├── chat/                     # Chat components
│   ├── common/                   # Shared components
│   └── ui/                       # NativeWind primitives
├── lib/
│   ├── polyfills.ts              # Buffer, process (MUST import first)
│   └── hooks/                    # Custom hooks
├── app.config.js                 # Expo config
├── metro.config.js               # Monorepo + polyfills
├── tailwind.config.js            # NativeWind
├── package.json
└── tsconfig.json
```

---

## Environment Variables

In `apps/mobile/.env`:

```bash
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Convex (same deployment as web)
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Analytics (optional)
EXPO_PUBLIC_POSTHOG_KEY=phc_...
```

**Note**: `EXPO_PUBLIC_` prefix required for client access. Never put secrets here.

---

## Key Commands

```bash
# From monorepo root
bun install                          # Install all workspaces

# Start Convex backend (terminal 1)
cd packages/backend && bunx convex dev

# Start mobile app (terminal 2)
cd apps/mobile && bunx expo start

# Run on iOS simulator
bunx expo run:ios

# Run on Android emulator
bunx expo run:android

# Clear Metro cache
bunx expo start -c
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial Load | <2s on 4G |
| Message Send | <100ms (optimistic UI) |
| Streaming Update | <200ms latency |
| 100 Messages | <1s render (FlashList) |
| Memory Usage | <150MB typical |
| Battery | <5% drain/hour active |

---

## Common Issues

### "Buffer is not defined"
**Cause**: Missing polyfills
**Fix**: Import polyfills first line of `_layout.tsx`

### Convex queries return undefined
**Cause**: Auth not ready
**Fix**: Wait for `isLoaded` from Clerk before rendering

### Metro can't find workspace packages
**Cause**: Missing watchFolders
**Fix**: Configure `metro.config.js` for monorepo (Phase 1)

### Styles not applying
**Cause**: NativeWind not configured
**Fix**: Add babel plugin + tailwind.config.js (Phase 1)

---

## Resources

### Official Docs
- [Expo](https://docs.expo.dev)
- [Convex React Native](https://docs.convex.dev/client/react-native)
- [Clerk Expo](https://clerk.com/docs/expo)
- [NativeWind](https://www.nativewind.dev)
- [FlashList](https://shopify.github.io/flash-list)

### Reference Template
- [get-convex/turbo-expo-nextjs-clerk-convex-monorepo](https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo)

---

## Timeline Estimates

**V1 (Chat + RAG + Memories)**:
- Phase 0: 1-2 hours
- Phase 1: 4-6 hours
- Phase 2: 8-12 hours
- Phase 3: 6-8 hours
- **Total V1**: 19-28 hours (3-4 days full-time)

**V2 (Projects + Notes + Tasks)**:
- Phase 4: 6-8 hours
- **Total with V2**: 25-36 hours

---

## Next Steps

1. **Read Phase 0** (`phase-0-prerequisites.md`)
2. **Verify monorepo works**: `bun install && bun dev`
3. **Start Convex**: `cd packages/backend && bunx convex dev`
4. **Proceed to Phase 1** (`phase-1-setup-auth.md`)
