# Phase 0: Mobile App Implementation Plan

**Status**: ✅ Phase 0 & Phase 1 COMPLETE
**Current Phase**: Phase 2 - Core Chat Implementation
**Completed**: December 2025

---

## Research Summary

Comprehensive research completed on:
- Mobile AI chat app patterns (ChatGPT, Claude, Perplexity)
- React Native chat input/keyboard handling
- Sidebar navigation patterns
- Streaming message rendering
- Current web implementation analysis

---

## Key Architectural Decisions

### 1. Navigation Pattern: Drawer + Stack

**Rationale**: ChatGPT/Claude iOS pattern - drawer for conversation list, stack for chat screens.

```
Drawer (swipe from left edge)
├── ConversationList (default screen)
└── Chat [conversationId] (pushed on selection)

Settings accessed via header icon (not drawer item)
```

**Libraries**:
- `expo-router/drawer` (built on @react-navigation/drawer)
- `react-native-gesture-handler` (swipe gestures)
- `react-native-reanimated` (smooth animations)

### 2. Chat Input Pattern: ChatGPT-style

**Current web pattern** (ChatInput.tsx:585 lines):
- Auto-resize textarea (height: auto → scrollHeight, max 200px)
- Left: attachment button (Plus icon)
- Right: voice/send toggle (mic when empty, send when typing)
- Bottom: model selector, keyboard hints

**Mobile adaptation**:
- Same layout, touch-optimized sizing
- `react-native-keyboard-aware-scroll-view` for keyboard handling
- Platform-specific `keyboardVerticalOffset` (iOS: 40-50, Android: 0)
- `onContentSizeChange` for auto-grow TextInput
- Voice via expo-av + transcription action

### 3. Message Streaming Pattern: Server-Persisted

**Current web pattern** (generation.ts + useStreamBuffer.ts):
- Server writes `partialContent` to DB every ~200ms
- Client subscribes via Convex reactive query
- `useStreamBuffer` smooths display (200 chars/sec reveal)
- Survives page refresh (data in DB)

**Mobile adaptation**:
- Same resilient pattern (REST API + SSE or polling)
- `partialContent` in DB = resume after disconnect
- FlatList with `inverted={true}` for chat order
- Auto-scroll via `scrollToEnd({ animated: true })`

### 4. Markdown Rendering

**Current web**: Streamdown + Shiki (syntax highlighting)

**Mobile**:
- `react-native-markdown-display` v7.0.2 (native components, no WebView)
- Defer syntax highlighting to `requestIdleCallback`
- Simple regex-based code coloring (fallback)
- KaTeX for math via `react-native-katex`

---

## Critical Patterns to Implement

### Chat Input (Priority: Critical)

| Pattern | Web Implementation | Mobile Adaptation |
|---------|-------------------|-------------------|
| Auto-resize | `textarea.scrollHeight` in useEffect | `onContentSizeChange` + Math.min(height, 120) |
| Keyboard handling | CSS only | `KeyboardAwareFlatList` or `react-native-keyboard-controller` |
| Attachment upload | react-dropzone → Convex storage | expo-image-picker → same upload flow |
| Voice input | MediaRecorder → transcription | expo-av Recording → same transcription action |
| Send/mic toggle | `showMic = !hasContent && !isGenerating` | Same logic |
| Optimistic updates | useSendMessage mutation | React Query mutation + offline queue |

**Key files to study**:
- `apps/web/src/components/chat/ChatInput.tsx` (585 lines)
- `apps/web/src/components/chat/VoiceInput.tsx` (247 lines)
- `apps/web/src/lib/hooks/mutations/useSendMessage.ts` (170 lines)

### Sidebar/Navigation (Priority: High)

| Pattern | Web Implementation | Mobile Adaptation |
|---------|-------------------|-------------------|
| Conversation list | Flat render, no virtualization | FlashList with `estimatedItemSize={70}` |
| Item actions | Hover overlay | Swipe-to-reveal (ReanimatedSwipeable) |
| New chat button | SidebarHeader + Alt+N | FAB or drawer header button |
| Bulk selection | Checkbox per item | Long-press to enter selection mode |
| Prefetch on hover | ConversationPrefetcher | Prefetch on focus/tap |

**Key files to study**:
- `apps/web/src/components/sidebar/app-sidebar.tsx` (560 lines)
- `apps/web/src/components/sidebar/ConversationItem.tsx` (415 lines)

### Message Rendering (Priority: High)

| Pattern | Web Implementation | Mobile Adaptation |
|---------|-------------------|-------------------|
| Bubble styling | Glass-morphic, asymmetric radius | Simplified solid backgrounds |
| Streaming text | `partialContent` + useStreamBuffer | Same, or direct render if fast enough |
| Auto-scroll | MutationObserver + RAF | FlatList `onContentSizeChange` |
| Code blocks | Shiki highlighting | react-native-syntax-highlighter or plain |
| Copy code | navigator.clipboard | @react-native-clipboard/clipboard |
| Error/retry | AlertCircle + RotateCcw button | Same icons, touch targets |

**Key files to study**:
- `apps/web/src/components/chat/ChatMessage.tsx`
- `apps/web/src/components/chat/MarkdownContent.tsx`
- `apps/web/src/hooks/useStreamBuffer.ts` (175 lines)
- `apps/web/src/hooks/useAutoScroll.ts`

---

## Mobile-Specific Considerations

### Keyboard Handling (iOS vs Android)

```typescript
// Pattern from research
<KeyboardAwareFlatList
  inverted={true}
  data={messages}
  keyboardShouldPersistTaps="handled"
  keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
/>
```

**Gotchas**:
- iOS: `behavior="padding"` works best
- Android: `behavior="height"` more predictable
- React Native 0.76+ (New Architecture) broke TextInput auto-grow on iOS
- Test with different keyboard sizes (emoji, dictation)

### Safe Area Handling

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();

// Input container
<View style={{ paddingBottom: insets.bottom + 8 }}>
  <ChatInput />
</View>
```

### Performance Targets

- Message list: 60fps scrolling with 500+ messages
- Streaming: <16ms per frame during token updates
- Keyboard appear: <300ms input visible
- App launch: <2s to interactive

---

## Recommended Library Stack

| Purpose | Library | Notes |
|---------|---------|-------|
| Navigation | `expo-router` | File-based, drawer built-in |
| Gestures | `react-native-gesture-handler` | Swipe, pan, long-press |
| Animations | `react-native-reanimated` | Worklet-based, 60fps |
| List virtualization | `@shopify/flash-list` | 2-5x faster than FlatList |
| Keyboard | `react-native-keyboard-aware-scroll-view` | Battle-tested |
| Markdown | `react-native-markdown-display` | Native components |
| Clipboard | `@react-native-clipboard/clipboard` | Copy code/messages |
| Secure storage | `expo-secure-store` | Clerk token storage |
| Image picker | `expo-image-picker` | Attachments |
| Audio | `expo-av` | Voice recording |
| Haptics | `expo-haptics` | Feedback on actions |

---

## Phase 1 Scope ✅ COMPLETE

Created `apps/mobile/` Expo project with:

1. **Project scaffold** ✅
   - Expo Router with drawer layout (SDK 54)
   - NativeWind v4 styling (Tailwind v3)
   - TypeScript strict mode with backend type shims

2. **Convex + Clerk integration** ✅
   - ConvexProviderWithClerk wrapper
   - Secure token storage (expo-secure-store)
   - Auth screens (sign in/up with email)

3. **Basic navigation** ✅
   - Drawer with home screen placeholder
   - Chat screen placeholder
   - Settings screen with Convex connection status

4. **Metro config for monorepo** ✅
   - Workspace resolution
   - Node.js polyfills (Buffer, process)

---

## Open Questions

1. **Convex SDK or REST API?**
   - Research shows Convex SDK works in React Native (no special package)
   - Simpler than REST + polling
   - Decision: Use Convex SDK directly (same as web)

2. **Syntax highlighting approach?**
   - Backend pre-render vs native parsing
   - Decision: Start with simple regex coloring, upgrade if needed

3. **FlashList vs FlatList?**
   - Decision: Start with FlatList, migrate to FlashList if >500 messages causes jank

---

## Files Created/Modified

**New files** (Phase 1):
```
apps/mobile/
├── app/
│   ├── _layout.tsx          # Root layout with providers
│   ├── (drawer)/
│   │   ├── _layout.tsx      # Drawer navigation
│   │   ├── index.tsx        # Conversation list
│   │   └── chat/[id].tsx    # Chat screen
│   ├── (auth)/
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   └── settings.tsx
├── components/
│   ├── chat/
│   │   ├── ChatInput.tsx
│   │   ├── MessageBubble.tsx
│   │   └── MessageList.tsx
│   └── sidebar/
│       ├── ConversationItem.tsx
│       └── ConversationList.tsx
├── lib/
│   ├── convex.ts            # Convex client setup
│   └── clerk.ts             # Clerk config
├── metro.config.js          # Monorepo resolution
├── babel.config.js          # NativeWind plugin
├── tailwind.config.js       # Shared with web
├── app.json                 # Expo config
├── package.json
└── tsconfig.json
```

**Modified files**:
```
turbo.json                   # Add mobile tasks
package.json (root)          # Workspace includes mobile
```

---

## Success Criteria

### Phase 0 ✅
- [x] Research mobile AI chat patterns completed
- [x] Understand web implementation architecture
- [x] Document key patterns to replicate
- [x] Identify libraries and approaches
- [x] Plan Phase 1 scope and file structure

### Phase 1 ✅
- [x] Expo SDK 54 app created at `apps/mobile/`
- [x] Clerk + Convex providers configured
- [x] Email authentication working
- [x] Drawer navigation implemented
- [x] NativeWind styling configured
- [x] TypeScript passes (`bun run typecheck`)
- [x] Metro bundler configured for monorepo

**Ready for Phase 2: Core Chat Implementation.**
