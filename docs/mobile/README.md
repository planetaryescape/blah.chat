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

### **Phase 0: Prerequisites & Setup** (`phase-0-prerequisites.md`) ✅ COMPLETE
**Duration**: 1-2 hours | **Completed**: December 2025

- ✅ Install development tools (Bun, Expo CLI, simulators)
- ✅ Verify monorepo is set up correctly
- ✅ Understand Convex + Clerk architecture
- ✅ Run `bunx convex dev` from `packages/backend/`

**Deliverable**: Development environment ready

---

### **Phase 1: Project Setup & Authentication** (`phase-1-setup-auth.md`) ✅ COMPLETE
**Duration**: 4-6 hours | **Completed**: December 2025

- ✅ Create `apps/mobile/` with Expo Router
- ✅ Configure Metro bundler for monorepo workspaces
- ✅ Add Node.js polyfills (Buffer, process)
- ✅ Integrate Clerk authentication (email)
- ✅ Set up Convex client with `ConvexProviderWithClerk`
- ✅ Design system (Obsidian Void theme, custom fonts)
- ✅ TypeScript configuration with backend type shims

**Deliverables**:
- ✅ Authenticated Expo app (SDK 54)
- ✅ Convex queries work (connection status in Settings)
- ✅ Drawer navigation (ChatGPT/Claude pattern)
- ✅ Design system ready (colors, fonts, spacing)

**Key Files**:
```
apps/mobile/
├── app/_layout.tsx           # Root providers (Clerk + Convex)
├── app/(auth)/sign-in.tsx
├── app/(drawer)/_layout.tsx  # Drawer navigation
├── lib/polyfills.ts          # Buffer/process polyfills
├── lib/convex.ts             # Convex client
├── lib/clerk.ts              # Token cache
├── lib/theme/                # Design system (colors, fonts, spacing)
├── types/backend.d.ts        # Backend type shims
├── metro.config.js           # Monorepo + polyfills
└── tsconfig.json             # TypeScript config
```

**Notes**:
- Drawer navigation (ChatGPT/Claude pattern)
- StyleSheet with theme tokens (no NativeWind)
- Syne + Manrope fonts via expo-google-fonts
- TypeScript passes (`bun run typecheck`)

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

## Design System

See **[`design-system.md`](./design-system.md)** for complete styling reference:

- **Colors**: Obsidian Void theme (deep indigo + rose quartz)
- **Typography**: Syne (headings) + Manrope (body)
- **Spacing**: 4px grid system
- **Components**: Buttons, inputs, cards, message bubbles

All components must use theme tokens from `@/lib/theme`.

---

## Technology Stack

### Mobile App
- **Framework**: Expo SDK 54+ with Expo Router
- **Language**: TypeScript
- **Styling**: StyleSheet with theme tokens (not NativeWind)
- **Lists**: FlashList v2 (5x faster than FlatList)
- **Markdown**: react-native-markdown-display
- **Fonts**: @expo-google-fonts/syne, @expo-google-fonts/manrope

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

### Fonts not loading
**Cause**: Fonts not loaded in root layout
**Fix**: Use `useFonts` hook in `_layout.tsx` and show loading state

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

~~1. **Read Phase 0** (`phase-0-prerequisites.md`)~~ ✅ Done
~~2. **Verify monorepo works**: `bun install && bun dev`~~ ✅ Done
~~3. **Start Convex**: `cd packages/backend && bunx convex dev`~~ ✅ Done
~~4. **Proceed to Phase 1** (`phase-1-setup-auth.md`)~~ ✅ Done

**Current**: Phase 2 - Core Chat Implementation
1. Start mobile app: `cd apps/mobile && bunx expo start`
2. Read Phase 2 guide: `phase-2-core-chat.md`
3. Implement conversation list, chat input, message streaming
