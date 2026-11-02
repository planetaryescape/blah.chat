# Phase 1: Project Setup & Authentication

**Duration**: 4-6 hours
**Difficulty**: Intermediate
**Prerequisites**: Phase 0 complete, web app running locally

---

## What You'll Build

By the end of this phase:

- Expo app at `apps/mobile/` in the monorepo
- Metro bundler configured for workspace packages
- Node.js polyfills for Convex (Buffer, process)
- Clerk authentication (email, Google, Apple)
- Convex client connected with auth
- NativeWind (Tailwind CSS for React Native)
- Sign-in/sign-up screens
- Protected tab navigation
- Test screen showing Convex data

**This is the foundation** for all future phases. Get this right.

---

## Architecture Overview

### Provider Hierarchy

```typescript
<ClerkProvider>                     // Auth provider
  <ClerkLoaded>                     // Wait for Clerk to initialize
    <ConvexProviderWithClerk>       // Convex with auth
      <Slot />                      // Expo Router renders children
    </ConvexProviderWithClerk>
  </ClerkLoaded>
</ClerkProvider>
```

### Authentication Flow

```
User Interaction
    ↓
Clerk (Email/OAuth) via @clerk/clerk-expo
    ↓
JWT Token (with user ID)
    ↓
ConvexProviderWithClerk (convex/react-clerk)
    ↓
WebSocket Connection (authenticated)
    ↓
Convex Backend (validates JWT via auth.config.ts)
    ↓
Data Query/Mutation (with user context)
```

---

## Step 1: Create Expo App in Monorepo

### 1.1 Create App Directory

```bash
cd /path/to/blah.chat
mkdir -p apps/mobile
cd apps/mobile
```

### 1.2 Initialize Expo Project

```bash
bunx create-expo-app@latest . --template blank-typescript
```

**Note**: The `.` creates the project in the current directory.

### 1.3 Update package.json for Monorepo

Edit `apps/mobile/package.json`:

```json
{
  "name": "@blah-chat/mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "dev": "bunx expo start",
    "ios": "bunx expo run:ios",
    "android": "bunx expo run:android",
    "build:ios": "bunx eas build --platform ios",
    "build:android": "bunx eas build --platform android"
  },
  "dependencies": {
    "@blah-chat/backend": "workspace:*",
    "convex": "^1.17.0",
    "@clerk/clerk-expo": "^2.4.0",
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "nativewind": "^4.1.0",
    "tailwindcss": "^3.4.0",
    "@expo/vector-icons": "^14.0.0",
    "buffer": "^6.0.3",
    "process": "^0.11.10",
    "react-native-url-polyfill": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "~18.3.0",
    "typescript": "~5.3.0"
  }
}
```

**Key Changes**:
- `name`: Scoped package name for monorepo
- `main`: Entry point for Expo Router
- `@blah-chat/backend`: workspace dependency (shared Convex)
- `nativewind`: Tailwind CSS for React Native

### 1.4 Install Dependencies

From monorepo root:

```bash
cd /path/to/blah.chat
bun install
```

This installs all workspace dependencies, including linking `@blah-chat/backend`.

---

## Step 2: Configure Metro Bundler for Monorepo

### 2.1 Why This Matters

Metro bundler needs to:
1. Resolve workspace packages (`@blah-chat/backend`)
2. Watch monorepo root `node_modules`
3. Provide Node.js polyfills (Buffer, process) for Convex

### 2.2 Create Metro Config

Create `apps/mobile/metro.config.js`:

```javascript
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in monorepo (for workspace packages)
config.watchFolders = [monorepoRoot];

// 2. Resolve node_modules from both project and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. Node.js polyfills for Convex
config.resolver.extraNodeModules = {
  buffer: require.resolve("buffer"),
  process: require.resolve("process"),
};

// 4. Enable package.json "exports" field (modern packages)
config.resolver.unstable_enablePackageExports = true;

// 5. Condition names for module resolution
config.resolver.unstable_conditionNames = [
  "browser",
  "require",
  "react-native",
];

// 6. Disable package.json main field resolution for workspace packages
// This ensures Metro uses the "exports" field instead
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
```

### 2.3 Create Polyfills File

Create `apps/mobile/lib/polyfills.ts`:

```typescript
// lib/polyfills.ts
// MUST be imported as FIRST line in app/_layout.tsx

import { Buffer } from "buffer";
import process from "process";
import "react-native-url-polyfill/auto";

// Assign to global scope
if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

if (typeof global.process === "undefined") {
  global.process = process;
}

// Prevent "process is not defined" errors
global.process.env = global.process.env || {};
```

**CRITICAL**: This file must be imported as the FIRST line in `app/_layout.tsx`.

---

## Step 3: Configure TypeScript for Monorepo

### 3.1 Create tsconfig.json

Create `apps/mobile/tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@blah-chat/backend/*": ["../../packages/backend/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

**Key Points**:
- `@/*` maps to `./src/` for app code
- `@blah-chat/backend/*` maps to the shared backend package

### 3.2 Create Type Declaration

Create `apps/mobile/expo-env.d.ts`:

```typescript
/// <reference types="nativewind/types" />
/// <reference types="expo-router/types" />
```

This enables NativeWind and Expo Router types.

---

## Step 4: Set Up NativeWind (Tailwind CSS)

### 4.1 Create Tailwind Config

Create `apps/mobile/tailwind.config.js`:

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Match web app theme
        background: "#000000",
        foreground: "#ffffff",
        primary: "#0066ff",
        muted: "#666666",
        border: "#333333",
        card: "#1a1a1a",
      },
    },
  },
  plugins: [],
};
```

### 4.2 Create Global CSS

Create `apps/mobile/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4.3 Configure Babel

Create `apps/mobile/babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

---

## Step 5: Environment Variables

### 5.1 Create App Config

Create `apps/mobile/app.config.js`:

```javascript
// app.config.js
export default {
  expo: {
    name: "blah.chat",
    slug: "blah-chat-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    scheme: "blahchat", // For deep linking
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.blahchat.mobile",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#000000",
      },
      package: "com.blahchat.mobile",
    },
    extra: {
      clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
      convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
    },
    plugins: ["expo-router", "expo-secure-store"],
  },
};
```

### 5.2 Create Environment File

Create `apps/mobile/.env`:

```bash
# Clerk Authentication (same as web app)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# Convex URL (same as web app)
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Optional: PostHog Analytics
EXPO_PUBLIC_POSTHOG_KEY=phc_...
```

**Get these values from**:
1. **Clerk Key**: Same as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `apps/web/.env.local`
2. **Convex URL**: Same as `NEXT_PUBLIC_CONVEX_URL` in `apps/web/.env.local`

### 5.3 Add to .gitignore

Ensure `apps/mobile/.gitignore` includes:

```
.env
.env.local
```

---

## Step 6: Create Convex Client Setup

### 6.1 Create Convex Client

Create `apps/mobile/lib/convex.ts`:

```typescript
// lib/convex.ts
import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";

const convexUrl = Constants.expoConfig?.extra?.convexUrl;

if (!convexUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_CONVEX_URL environment variable.\n" +
      "Add it to your .env file:\n" +
      "EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud"
  );
}

// Initialize Convex client (singleton)
export const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false, // Disable browser-only warning
  verbose: __DEV__, // Enable debug logs in development
});
```

### 6.2 Create Token Cache

Create `apps/mobile/lib/tokenCache.ts`:

```typescript
// lib/tokenCache.ts
import * as SecureStore from "expo-secure-store";

export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error("SecureStore get error:", error);
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error("SecureStore set error:", error);
    }
  },
};
```

**Why SecureStore?**
- Encrypts tokens (not plain AsyncStorage)
- Uses iOS Keychain / Android Keystore
- Required for production apps

---

## Step 7: Create Root Layout with Providers

### 7.1 Create Directory Structure

```bash
cd apps/mobile
mkdir -p app/(auth) app/(tabs) src/components lib
```

### 7.2 Create Root Layout

Create `apps/mobile/app/_layout.tsx`:

```typescript
// app/_layout.tsx
import "../lib/polyfills"; // MUST BE FIRST LINE
import "../global.css"; // NativeWind styles

import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Slot } from "expo-router";
import Constants from "expo-constants";
import { tokenCache } from "@/lib/tokenCache";
import { convex } from "@/lib/convex";

const clerkPublishableKey = Constants.expoConfig?.extra?.clerkPublishableKey;

if (!clerkPublishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.\n" +
      "Add it to your .env file."
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <Slot />
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
```

**Key Points**:
- Polyfills imported FIRST (before React Native)
- NativeWind CSS imported second
- `ClerkLoaded` prevents auth flicker
- `ConvexProviderWithClerk` provides authenticated Convex client

---

## Step 8: Create Index Route (Auth Gate)

Create `apps/mobile/app/index.tsx`:

```typescript
// app/index.tsx
import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading while checking auth
  if (!isLoaded) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#0066ff" />
      </View>
    );
  }

  // Redirect based on auth state
  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
```

---

## Step 9: Create Authentication Screens

### 9.1 Create Sign-In Screen

Create `apps/mobile/app/(auth)/sign-in.tsx`:

```typescript
// app/(auth)/sign-in.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({
    strategy: "oauth_google",
  });
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSignIn = async () => {
    if (!isLoaded || !signIn) return;

    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        Alert.alert("Error", "Sign-in incomplete. Please try again.");
      }
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string }>; message?: string };
      Alert.alert(
        "Sign-In Failed",
        error.errors?.[0]?.longMessage || error.message || "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { createdSessionId, setActive: setOAuthActive } =
        await startGoogleOAuth();

      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert("OAuth Failed", error.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-4xl font-bold text-foreground mb-2 text-center">
          blah.chat
        </Text>
        <Text className="text-base text-muted mb-8 text-center">
          Sign in to your account
        </Text>

        <TextInput
          className="bg-card rounded-xl p-4 text-base text-foreground mb-3 border border-border"
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          className="bg-card rounded-xl p-4 text-base text-foreground mb-3 border border-border"
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          className={`bg-primary rounded-xl p-4 items-center mt-2 ${
            loading ? "opacity-60" : ""
          }`}
          onPress={handleEmailSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-foreground text-base font-semibold">
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-border" />
          <Text className="mx-3 text-muted text-sm">or</Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        <TouchableOpacity
          className={`bg-foreground rounded-xl p-4 items-center ${
            loading ? "opacity-60" : ""
          }`}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Text className="text-background text-base font-semibold">
            Continue with Google
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-6 items-center"
          onPress={() => router.push("/(auth)/sign-up")}
          disabled={loading}
        >
          <Text className="text-muted text-sm">
            Don't have an account?{" "}
            <Text className="text-primary font-semibold">Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
```

### 9.2 Create Sign-Up Screen

Create `apps/mobile/app/(auth)/sign-up.tsx`:

```typescript
// app/(auth)/sign-up.tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export default function SignUpScreen() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!isLoaded || !signUp) return;

    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string }>; message?: string };
      Alert.alert(
        "Sign-Up Failed",
        error.errors?.[0]?.longMessage || error.message || "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded || !signUp) return;

    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        Alert.alert("Error", "Verification incomplete.");
      }
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ longMessage?: string }>; message?: string };
      Alert.alert(
        "Verification Failed",
        error.errors?.[0]?.longMessage || error.message || "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 justify-center px-6">
          <Text className="text-4xl font-bold text-foreground mb-2 text-center">
            Verify Email
          </Text>
          <Text className="text-base text-muted mb-8 text-center">
            We sent a code to {email}
          </Text>

          <TextInput
            className="bg-card rounded-xl p-4 text-base text-foreground mb-3 border border-border"
            placeholder="Enter 6-digit code"
            placeholderTextColor="#666"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
          />

          <TouchableOpacity
            className={`bg-primary rounded-xl p-4 items-center mt-2 ${
              loading ? "opacity-60" : ""
            }`}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-foreground text-base font-semibold">
                Verify
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-6 items-center"
            onPress={() => setPendingVerification(false)}
            disabled={loading}
          >
            <Text className="text-muted text-sm">Back to sign up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-4xl font-bold text-foreground mb-2 text-center">
          Create Account
        </Text>
        <Text className="text-base text-muted mb-8 text-center">
          Join blah.chat today
        </Text>

        <TextInput
          className="bg-card rounded-xl p-4 text-base text-foreground mb-3 border border-border"
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          className="bg-card rounded-xl p-4 text-base text-foreground mb-3 border border-border"
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          className={`bg-primary rounded-xl p-4 items-center mt-2 ${
            loading ? "opacity-60" : ""
          }`}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-foreground text-base font-semibold">
              Sign Up
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-6 items-center"
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text className="text-muted text-sm">
            Already have an account?{" "}
            <Text className="text-primary font-semibold">Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
```

---

## Step 10: Create Tab Navigation

### 10.1 Create Tab Layout

Create `apps/mobile/app/(tabs)/_layout.tsx`:

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#0066ff",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: {
          backgroundColor: "#000",
          borderTopColor: "#333",
        },
        headerStyle: {
          backgroundColor: "#000",
        },
        headerTintColor: "#fff",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### 10.2 Create Chat Tab (Convex Test)

Create `apps/mobile/app/(tabs)/index.tsx`:

```typescript
// app/(tabs)/index.tsx
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@blah-chat/backend/convex/_generated/api";

export default function ChatTab() {
  // Test Convex query - list conversations
  const conversations = useQuery(api.conversations.list);

  if (conversations === undefined) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#0066ff" />
        <Text className="mt-4 text-base text-muted">
          Loading conversations...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-5">
        <Text className="text-3xl font-bold text-foreground mb-2">
          Conversations
        </Text>
        <Text className="text-base text-muted mb-6">
          {conversations.length === 0
            ? "No conversations yet. Start one in the web app!"
            : `Found ${conversations.length} conversation(s)`}
        </Text>

        {conversations.map((conv) => (
          <View
            key={conv._id}
            className="bg-card rounded-xl p-4 mb-3 border border-border"
          >
            <Text className="text-lg font-semibold text-foreground mb-1">
              {conv.title || "Untitled Conversation"}
            </Text>
            <Text className="text-sm text-muted">
              {conv.model || "No model"} •{" "}
              {new Date(conv._creationTime).toLocaleDateString()}
            </Text>
          </View>
        ))}

        {conversations.length === 0 && (
          <View className="mt-10 p-6 bg-card rounded-xl border border-border">
            <Text className="text-base text-muted text-center leading-6">
              This is working!{"\n\n"}
              Go to http://localhost:3000 in your browser and create a
              conversation.{"\n\n"}
              It will appear here in real-time.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
```

### 10.3 Create Profile Tab

Create `apps/mobile/app/(tabs)/profile.tsx`:

```typescript
// app/(tabs)/profile.tsx
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export default function ProfileTab() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  return (
    <View className="flex-1 bg-background p-5">
      <Text className="text-3xl font-bold text-foreground mb-6">Profile</Text>

      <View className="bg-card rounded-xl p-4 mb-3 border border-border">
        <Text className="text-xs text-muted uppercase tracking-wide mb-1">
          Email
        </Text>
        <Text className="text-base text-foreground">
          {user?.primaryEmailAddress?.emailAddress}
        </Text>
      </View>

      <View className="bg-card rounded-xl p-4 mb-3 border border-border">
        <Text className="text-xs text-muted uppercase tracking-wide mb-1">
          User ID
        </Text>
        <Text
          className={`text-xs text-muted ${
            Platform.OS === "ios" ? "font-mono" : ""
          }`}
        >
          {user?.id}
        </Text>
      </View>

      <View className="bg-card rounded-xl p-4 mb-3 border border-border">
        <Text className="text-xs text-muted uppercase tracking-wide mb-1">
          Joined
        </Text>
        <Text className="text-base text-foreground">
          {user?.createdAt
            ? new Date(user.createdAt).toLocaleDateString()
            : "Unknown"}
        </Text>
      </View>

      <TouchableOpacity
        className="bg-red-500 rounded-xl p-4 items-center mt-6"
        onPress={handleSignOut}
      >
        <Text className="text-foreground text-base font-semibold">
          Sign Out
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Step 11: Update turbo.json for Mobile

Update the root `turbo.json` to include mobile tasks:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "mobile:dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## Step 12: Run and Test

### 12.1 Start Development

**Terminal 1** (Convex backend):
```bash
cd packages/backend
bunx convex dev
```

**Terminal 2** (Web app - optional, for testing real-time):
```bash
bun dev
```

**Terminal 3** (Mobile app):
```bash
cd apps/mobile
bunx expo start --clear
```

### 12.2 Open on Simulator

In Expo CLI:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator

### 12.3 Test Checklist

- [ ] App builds without errors
- [ ] No "Buffer is not defined" errors
- [ ] Sign-in redirects to tabs
- [ ] Chat tab loads conversations from Convex
- [ ] Creating conversation in web app shows in mobile (real-time)
- [ ] Profile tab shows user info
- [ ] Sign-out redirects to auth screen

---

## Troubleshooting

### "Buffer is not defined"

**Cause**: Polyfills not loaded first
**Fix**:
1. Verify `import "../lib/polyfills"` is **first line** in `app/_layout.tsx`
2. Clear cache: `bunx expo start --clear`

### "Cannot find module @blah-chat/backend"

**Cause**: Monorepo packages not linked
**Fix**:
1. Run `bun install` from monorepo root
2. Verify `metro.config.js` has correct `watchFolders`
3. Restart: `bunx expo start --clear`

### "Clerk invalid publishable key"

**Cause**: Wrong key or not set
**Fix**:
1. Check `apps/mobile/.env` has correct key
2. Key should match `apps/web/.env.local`
3. Restart expo after env changes

### "Cannot connect to Convex"

**Cause**: Wrong URL or Convex not running
**Fix**:
1. Check `.env` has correct `EXPO_PUBLIC_CONVEX_URL`
2. Verify Convex dev running: `cd packages/backend && bunx convex dev`

### NativeWind styles not applying

**Cause**: Babel plugin or CSS import missing
**Fix**:
1. Verify `babel.config.js` has `nativewind/babel` preset
2. Verify `global.css` is imported in `app/_layout.tsx`
3. Clear cache: `bunx expo start --clear`

---

## Success Criteria

You're ready for Phase 2 when:

1. Mobile app builds without errors
2. Sign-in/sign-up flow works
3. Convex queries load data
4. Real-time updates work (create in web, see in mobile)
5. NativeWind styles render correctly
6. Tab navigation works

---

## Next Phase Preview

**Phase 2: Core Chat Implementation** will cover:

- Conversation list with FlashList
- Chat screen with virtualized messages
- Real-time streaming display (`partialContent`)
- Chat input with model selector
- Resilient generation pattern
- Message actions (copy, regenerate)

**Estimated Time**: 8-12 hours

---

**Next**: [Phase 2: Core Chat Implementation](./phase-2-core-chat.md)
