# blah.chat Mobile App - Implementation Guide

**Last Updated**: December 2024
**Target Platform**: React Native (iOS & Android) via Expo
**Architecture**: Hybrid - Convex WebSocket for real-time, REST API fallback

---

## Overview

This directory contains comprehensive, self-contained guides for implementing the blah.chat mobile app using React Native and Expo. Each phase document is standalone - a developer can pick up any phase and execute it without referencing other documents.

**Project Context**: blah.chat is a personal AI chat assistant with access to 60+ models, mid-chat switching, conversation branching, RAG memories, and transparent cost tracking. Built with Next.js, Convex (real-time DB), Clerk (auth), and Vercel AI SDK.

---

## Architecture Decision

### Why Keep REST API?

The mobile app will use **both Convex WebSocket and REST API**:

**Convex WebSocket (Primary)**:
- Real-time chat message streaming
- Live conversation updates
- Instant UI synchronization
- <100ms latency

**REST API (Secondary)**:
- Offline message queue
- Future TUI (Terminal UI) app support
- Graceful degradation on poor networks
- HTTP caching benefits

This hybrid approach provides maximum flexibility and resilience.

---

## Phase Structure

Each phase is designed to be **executed sequentially** but **documented independently**. Every phase file contains:

- **Full Project Context**: What blah.chat is, tech stack, architecture
- **Current State**: What exists before this phase
- **Phase Goals**: What will be achieved
- **Prerequisites**: What needs to be in place first
- **Step-by-Step Implementation**: Detailed instructions with code
- **Testing Checklist**: How to verify success
- **Troubleshooting**: Common issues and solutions
- **Next Phase Preview**: What comes after

---

## Implementation Phases

### **Phase 0: Prerequisites & Setup** (`phase-0-prerequisites.md`)
**Duration**: 1-2 hours
**Skills Required**: Basic React Native, environment setup

**What You'll Do**:
- Install development tools (Node.js, Bun, Expo CLI)
- Set up iOS/Android simulators
- Understand Convex and Clerk architecture
- Verify web app is running locally

**Deliverables**:
- Development environment ready
- Ability to run Expo apps
- Understanding of blah.chat architecture

---

### **Phase 1: Project Setup & Authentication** (`phase-1-setup-auth.md`)
**Duration**: 4-6 hours
**Skills Required**: React Native, Expo, authentication flows

**What You'll Do**:
- Bootstrap Expo app with TypeScript
- Configure Metro bundler for Convex
- Integrate Clerk authentication
- Set up Convex client with auth
- Implement sign-in/sign-up flows
- Create protected route structure

**Deliverables**:
- Authenticated Expo app
- User can sign in with email/Google/Apple
- Convex queries work for authenticated users
- Basic navigation structure

**Key Files Created**:
- `app/_layout.tsx` - Root providers
- `app/(auth)/sign-in.tsx` - Sign-in screen
- `app/(tabs)/` - Main app navigation
- `lib/convex.ts` - Convex client setup
- `metro.config.js` - Bundler configuration

---

### **Phase 2: Core Chat Implementation** (`phase-2-core-chat.md`)
**Duration**: 8-12 hours
**Skills Required**: React Native lists, WebSockets, real-time data

**What You'll Do**:
- Build conversation list with pull-to-refresh
- Implement virtualized message list
- Create chat input with auto-expand
- Add model selector bottom sheet
- Implement real-time message streaming
- Add offline message queue
- Create message action menu (copy, regenerate, delete)

**Deliverables**:
- Functional chat interface
- Real-time streaming responses
- Offline support with queue
- Model switching mid-conversation
- Message actions (copy, edit, delete, regenerate)

**Key Components**:
- `ConversationList.tsx` - Conversation sidebar
- `ChatScreen.tsx` - Main chat view
- `MessageList.tsx` - Virtualized messages
- `ChatInput.tsx` - Message input with attachments
- `ModelSelector.tsx` - Model picker bottom sheet
- `MessageActions.tsx` - Action menu

---

### **Phase 3: File Uploads & Voice** (`phase-3-files-voice.md`)
**Duration**: 6-8 hours
**Skills Required**: React Native media APIs, file handling

**What You'll Do**:
- Integrate image picker and camera
- Implement file upload to Convex storage
- Add voice recording with waveform
- Integrate speech-to-text (STT)
- Add text-to-speech (TTS) playback
- Create attachment preview component

**Deliverables**:
- Image upload from gallery/camera
- Document file uploads (PDF, TXT)
- Voice message recording
- Audio transcription
- TTS message playback
- Attachment management

**Key Components**:
- `ImagePicker.tsx` - Camera & gallery
- `FileUploadButton.tsx` - Document picker
- `VoiceRecorder.tsx` - Audio recording
- `AudioWaveform.tsx` - Visual feedback
- `TTSPlayer.tsx` - Playback controls
- `AttachmentPreview.tsx` - File thumbnails

---

### **Phase 4: Projects & Organization** (`phase-4-projects.md`)
**Duration**: 6-8 hours
**Skills Required**: Tab navigation, CRUD operations

**What You'll Do**:
- Create project list screen
- Implement project creation/editing
- Add project-scoped conversations
- Build notes system (markdown editor)
- Add bookmarks screen
- Implement search functionality

**Deliverables**:
- Project management interface
- Link conversations to projects
- Create/edit notes with markdown
- Bookmark messages
- Search across conversations
- Filter by project/date/model

**Key Components**:
- `ProjectList.tsx` - Project cards
- `ProjectDetail.tsx` - Project view with tabs
- `NoteEditor.tsx` - Markdown editor
- `BookmarkList.tsx` - Saved messages
- `SearchScreen.tsx` - Global search

---

### **Phase 5: Advanced Features** (`phase-5-advanced.md`)
**Duration**: 8-10 hours
**Skills Required**: Advanced React Native, native modules

**What You'll Do**:
- Add push notifications
- Implement background sync
- Create comparison mode (multi-model)
- Add conversation branching UI
- Build memory management interface
- Implement usage/cost tracking
- Add settings screens
- Create share functionality

**Deliverables**:
- Push notifications for completed messages
- Background message generation
- Side-by-side model comparison
- Conversation branch navigation
- Memory (RAG) management
- Cost tracking dashboard
- Comprehensive settings
- Native share integration

**Key Components**:
- `NotificationHandler.tsx` - Push setup
- `ComparisonView.tsx` - Multi-model UI
- `BranchNavigator.tsx` - Tree visualization
- `MemoryManager.tsx` - RAG interface
- `UsageDashboard.tsx` - Cost tracking
- `SettingsScreen.tsx` - User preferences

---

## Development Workflow

### Recommended Sequence

1. **Complete Phase 0** - Set up environment
2. **Complete Phase 1** - Auth working, can query Convex
3. **Test Phase 1** thoroughly - Don't proceed until auth solid
4. **Complete Phase 2** - Core chat functional
5. **Test Phase 2** thoroughly - Send messages, real-time works
6. **Complete Phase 3** - Media support
7. **Complete Phase 4** - Organization features
8. **Complete Phase 5** - Polish & advanced features

### Between Phases

- **Git commit** after each phase
- **Test on physical device** (not just simulator)
- **Review code quality** - refactor before moving on
- **Update documentation** - note any deviations from plan

---

## Technology Stack

### Frontend (Mobile)
- **React Native** - Cross-platform framework
- **Expo SDK 52+** - Managed workflow with native modules
- **TypeScript** - Type safety
- **React Navigation 7** - Navigation library
- **React Native Paper** or **Tamagui** - UI component library

### Backend (Shared with Web)
- **Convex** - Real-time database with WebSocket
- **Clerk** - Authentication
- **Vercel AI SDK** - LLM integrations
- **Next.js API Routes** - REST API fallback

### State Management
- **Convex Reactive Queries** - Real-time data (primary)
- **TanStack Query** - REST API caching (fallback)
- **Zustand** or **Redux Toolkit** - Local state & offline queue
- **AsyncStorage** or **MMKV** - Persistent storage

### Key Libraries
- **@clerk/clerk-expo** - Authentication
- **convex** - Real-time sync
- **expo-image-picker** - Camera & gallery
- **expo-av** - Audio recording/playback
- **expo-file-system** - File operations
- **expo-notifications** - Push notifications
- **react-native-markdown-display** - Markdown rendering
- **@shopify/flash-list** - Virtualized lists

---

## Project Structure

```
mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Root providers
│   ├── (auth)/
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── (tabs)/
│       ├── _layout.tsx           # Tab navigation
│       ├── index.tsx             # Conversations
│       ├── projects.tsx          # Projects
│       ├── search.tsx            # Search
│       └── settings.tsx          # Settings
├── components/
│   ├── chat/                     # Chat UI components
│   ├── projects/                 # Project components
│   ├── common/                   # Shared components
│   └── ui/                       # UI primitives
├── lib/
│   ├── convex.ts                 # Convex client setup
│   ├── api.ts                    # REST API client
│   ├── hooks/                    # Custom hooks
│   └── utils/                    # Utilities
├── constants/
│   ├── Colors.ts
│   └── Layout.ts
├── assets/                       # Images, fonts
├── app.config.js                 # Expo configuration
├── metro.config.js               # Metro bundler config
├── package.json
└── tsconfig.json
```

---

## Environment Variables

Create `.env` file in mobile project root:

```bash
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Convex Real-time Database
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# REST API (web app backend)
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_API_URL_PRODUCTION=https://blah.chat/api/v1

# Optional: Analytics, monitoring
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_SENTRY_DSN=
```

**Security Note**: `EXPO_PUBLIC_` prefix makes variables available in client code. Never put secrets here.

---

## Testing Strategy

### Unit Tests
- Use **Jest** + **React Native Testing Library**
- Test components in isolation
- Mock Convex queries and API calls

### Integration Tests
- Test authentication flows
- Test chat message sending/receiving
- Test file uploads
- Test offline queue

### E2E Tests
- Use **Detox** or **Maestro**
- Test critical user journeys
- Run on physical devices

### Manual Testing Checklist
- Test on iOS simulator
- Test on Android emulator
- Test on physical iPhone
- Test on physical Android device
- Test on slow network (throttled)
- Test offline scenarios
- Test with large conversations (1000+ messages)
- Test with multiple file types

---

## Performance Targets

- **Initial Load**: <2s on 4G
- **Message Send**: <100ms perceived latency (optimistic UI)
- **Message Receive**: <500ms (real-time streaming)
- **Conversation List**: <1s to load 100 conversations
- **Message List**: <1s to render 100 messages (virtualized)
- **File Upload**: <5s for 5MB image
- **Memory Usage**: <150MB for typical session
- **Battery**: <5% drain per hour of active use

---

## Common Issues & Solutions

### "Buffer is not defined"
**Cause**: Missing Node.js polyfills
**Solution**: Add polyfills in Phase 1 setup

### "Cannot find module 'convex'"
**Cause**: Metro bundler cache or incorrect config
**Solution**: Clear cache with `npx expo start -c`

### Clerk authentication loops
**Cause**: Token cache not configured
**Solution**: Implement SecureStore token cache (Phase 1)

### Messages not streaming
**Cause**: WebSocket connection issues
**Solution**: Check Convex URL, enable verbose logging

### File uploads fail
**Cause**: CORS or authentication issues
**Solution**: Verify Convex auth token in headers

---

## Resources

### Official Documentation
- **Expo**: https://docs.expo.dev
- **React Navigation**: https://reactnavigation.org
- **Convex React Native**: https://docs.convex.dev/client/react-native
- **Clerk Expo**: https://clerk.com/docs/expo

### Example Apps
- **Convex + Expo Monorepo**: https://github.com/get-convex/turbo-expo-nextjs-clerk-convex-monorepo
- **React Native Chat**: https://github.com/galaxies-dev/react-native-chat-convex

### Community
- **Convex Discord**: https://convex.dev/community
- **Clerk Discord**: https://clerk.com/discord
- **Expo Discord**: https://chat.expo.dev

---

## Support & Troubleshooting

### Before Starting
1. Read Phase 0 completely
2. Ensure all prerequisites installed
3. Verify web app runs locally
4. Join community Discord channels

### While Implementing
1. Follow phases sequentially
2. Test thoroughly after each phase
3. Commit code after each phase
4. Document any deviations

### If Stuck
1. Check troubleshooting section in phase doc
2. Search Convex/Clerk/Expo documentation
3. Ask in community Discord
4. Review example apps linked above

---

## Success Criteria

### Phase 1 Complete
- ✅ User can sign in/out
- ✅ Convex queries work
- ✅ Navigation functional

### Phase 2 Complete
- ✅ Send messages
- ✅ Receive real-time responses
- ✅ Switch models
- ✅ Offline queue works

### Phase 3 Complete
- ✅ Upload images
- ✅ Record voice messages
- ✅ Play TTS

### Phase 4 Complete
- ✅ Create projects
- ✅ Take notes
- ✅ Search works

### Phase 5 Complete
- ✅ Push notifications
- ✅ Background sync
- ✅ All features parity with web

---

## Timeline Estimates

**Solo Developer (experienced with React Native)**:
- Phase 0: 1-2 hours
- Phase 1: 4-6 hours
- Phase 2: 8-12 hours
- Phase 3: 6-8 hours
- Phase 4: 6-8 hours
- Phase 5: 8-10 hours
- **Total**: 33-46 hours (5-7 days full-time, 2-3 weeks part-time)

**Solo Developer (new to React Native)**:
- Add 50-100% to estimates above
- **Total**: 50-90 hours (7-12 days full-time, 3-6 weeks part-time)

**Team of 2-3 Developers**:
- Can parallelize Phases 3, 4, 5
- **Total**: 2-3 weeks calendar time

---

## Next Steps

1. **Read Phase 0** (`phase-0-prerequisites.md`)
2. **Set up development environment**
3. **Verify web app runs locally**
4. **Proceed to Phase 1** (`phase-1-setup-auth.md`)

Good luck! 🚀
