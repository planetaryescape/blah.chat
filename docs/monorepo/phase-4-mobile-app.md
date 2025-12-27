# Phase 4: Mobile App (Future)

## Overview

This phase creates the Expo/React Native mobile app that shares the Convex backend and AI configurations with the web app.

**Risk Level**: Medium-High (new platform, Expo configuration)
**Prerequisite**: Phase 1-3 complete (monorepo foundation, all shared packages)
**Blocks**: None (can be developed in parallel with Phase 5)
**Status**: Future - implement when mobile development is prioritized

---

## Context

### Monorepo State (After Phase 1-3)

```
blah.chat/
├── apps/
│   └── web/                  # Next.js 15
├── packages/
│   ├── backend/              # @blah-chat/backend - Convex
│   ├── ai/                   # @blah-chat/ai - Models, prompts
│   ├── shared/               # @blah-chat/shared - Utilities
│   └── config/               # @blah-chat/config - Shared configs
└── ...
```

### Target State

```
blah.chat/
├── apps/
│   ├── web/                  # Next.js 15
│   └── mobile/               # Expo/React Native (NEW)
│       ├── app/              # Expo Router app directory
│       ├── components/       # Mobile-specific components
│       ├── lib/              # Mobile-specific utilities
│       ├── app.json          # Expo config
│       ├── package.json
│       ├── tsconfig.json
│       └── metro.config.js   # (if needed, SDK 52+ auto-configures)
├── packages/
│   └── ...                   # Unchanged
└── ...
```

---

## What This Phase Accomplishes

1. **Creates mobile app** - Expo SDK 54+ with Expo Router
2. **Shares Convex types** - Imports from `@blah-chat/backend/_generated/`
3. **Shares AI configs** - Imports from `@blah-chat/ai`
4. **Shares utilities** - Imports from `@blah-chat/shared`
5. **Implements core chat** - Send messages, receive AI responses

---

## Technical Decisions

### Expo SDK Version

**Recommendation**: SDK 54+ (latest stable)

Why:
- Auto-configures Metro for monorepos (SDK 52+)
- Fixes autolinking inconsistencies
- Better conflict detection via `expo-doctor`
- Pinned Metro via `@expo/metro`

### Expo Router

Use Expo Router for file-based navigation (similar to Next.js App Router):
- `app/` directory structure
- Type-safe navigation
- Consistent mental model with web app

### Authentication

**Clerk + Expo** integration:
- `@clerk/clerk-expo` package
- Same Clerk project as web app
- Shared session management

### Convex Client

Use `convex/react-native` for real-time subscriptions:
```typescript
import { ConvexProvider, ConvexReactClient } from "convex/react-native";
```

---

## Tasks

### Task 4.1: Initialize Expo App

```bash
cd apps
bunx create-expo-app mobile --template tabs
cd mobile
```

Or manually:
```bash
mkdir -p apps/mobile
cd apps/mobile
bun init
bun add expo expo-router react-native
```

### Task 4.2: Configure Package.json

**`apps/mobile/package.json`**:
```json
{
  "name": "@blah-chat/mobile",
  "version": "0.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "lint": "biome check .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@blah-chat/ai": "workspace:*",
    "@blah-chat/backend": "workspace:*",
    "@blah-chat/shared": "workspace:*",
    "@clerk/clerk-expo": "^2.0.0",
    "convex": "^1.31.0",
    "expo": "^52.0.0",
    "expo-router": "^4.0.0",
    "expo-secure-store": "^14.0.0",
    "react": "^18.2.0",
    "react-native": "^0.76.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

### Task 4.3: Configure app.json

**`apps/mobile/app.json`**:
```json
{
  "expo": {
    "name": "blah.chat",
    "slug": "blah-chat",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "blahchat",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    },
    "ios": {
      "bundleIdentifier": "com.blahchat.app",
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      },
      "package": "com.blahchat.app"
    },
    "plugins": ["expo-router", "expo-secure-store"]
  }
}
```

### Task 4.4: Configure TypeScript

**`apps/mobile/tsconfig.json`**:
```json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-native",
    "paths": {
      "@/*": ["./src/*"],
      "@blah-chat/ai": ["../../packages/ai/src/index.ts"],
      "@blah-chat/shared": ["../../packages/shared/src/index.ts"],
      "@blah-chat/backend/*": ["../../packages/backend/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules"]
}
```

### Task 4.5: Configure Metro (if needed)

SDK 52+ auto-configures Metro for monorepos. If manual config needed:

**`apps/mobile/metro.config.js`**:
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all packages
config.watchFolders = [monorepoRoot];

// Resolve from monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = config;
```

### Task 4.6: Set Up Convex Provider

**`apps/mobile/app/_layout.tsx`**:
```typescript
import { ConvexProvider, ConvexReactClient } from "convex/react-native";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import * as SecureStore from "expo-secure-store";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <Stack />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### Task 4.7: Create Chat Screen

**`apps/mobile/app/(tabs)/chat/[conversationId].tsx`**:
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "@blah-chat/backend/_generated/api";
import type { Id } from "@blah-chat/backend/_generated/dataModel";
import { MODEL_CONFIG } from "@blah-chat/ai";

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  const messages = useQuery(api.messages.list, {
    conversationId: conversationId as Id<"conversations">,
  });

  const sendMessage = useMutation(api.chat.sendMessage);

  // ... render chat UI
}
```

### Task 4.8: Add Environment Variables

**`apps/mobile/.env`**:
```bash
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

### Task 4.9: Update Root Turbo Config

**`turbo.json`** - Add mobile tasks:
```json
{
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "start": {
      "cache": false,
      "persistent": true
    },
    "ios": {
      "cache": false,
      "persistent": true
    },
    "android": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## Verification Checklist

- [ ] `bun install` from root succeeds
- [ ] `cd apps/mobile && bun start` launches Expo dev server
- [ ] App loads on iOS simulator
- [ ] App loads on Android emulator
- [ ] Clerk authentication works
- [ ] Convex queries return data
- [ ] Can send a message and receive AI response
- [ ] Model selection works
- [ ] Cost tracking displays correctly
- [ ] Hot reload works when editing shared packages

---

## Shared Code Between Web and Mobile

### Fully Shared (from packages)

- `@blah-chat/ai` - Model configs, prompts, types
- `@blah-chat/shared` - Utilities (formatEntity, tokens, date)
- `@blah-chat/backend/_generated/*` - Convex types

### Platform-Specific

| Feature | Web | Mobile |
|---------|-----|--------|
| Navigation | Next.js App Router | Expo Router |
| Styling | Tailwind CSS | StyleSheet / NativeWind |
| Storage | localStorage | SecureStore |
| Auth UI | Clerk React | Clerk Expo |
| Convex Client | `convex/react` | `convex/react-native` |

### Potential Shared UI Package (Future)

If significant UI code can be shared, consider:
- `@blah-chat/ui` - Shared React Native Web components
- NativeWind for cross-platform styling

---

## Common Issues

### Issue: "Metro bundler can't find workspace packages"
**Solution**: Check `metro.config.js` watchFolders and nodeModulesPaths.

### Issue: "Cannot find module 'convex/react-native'"
**Solution**: Ensure `convex` package version supports React Native.

### Issue: "Clerk auth not persisting"
**Solution**: Verify `expo-secure-store` is installed and tokenCache is configured.

### Issue: "Duplicate React versions"
**Solution**: Run `bun dedupe` and ensure only one React version in monorepo.

---

## What Comes Before

**Phase 1-3** must be complete:
- Monorepo structure established
- `@blah-chat/backend` with Convex types
- `@blah-chat/ai` with model configs
- `@blah-chat/shared` with utilities

---

## What Comes Next

**Phase 5: CLI/TUI/Raycast** - Additional non-mobile apps:
- CLI for terminal users
- TUI for interactive terminal experience
- Raycast extension for quick access

All will share the same packages established in Phase 1-3.
