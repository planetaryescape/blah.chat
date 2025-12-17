# Phase 1: Project Setup & Authentication

**Duration**: 4-6 hours
**Difficulty**: Intermediate
**Prerequisites**: Phase 0 complete, web app running locally

---

## Project Context

### What is blah.chat?

blah.chat is a personal AI chat assistant with access to 60+ AI models (OpenAI, Claude, Gemini, Groq, etc.), conversation branching, RAG memories, and transparent cost tracking. Built with Next.js, Convex (real-time DB), and Clerk (auth).

### Tech Stack

**Backend (Shared)**:
- Convex: Real-time database with WebSocket subscriptions
- Clerk: Authentication with OAuth support
- Vercel AI SDK: LLM integrations

**Frontend Web (Existing)**:
- Next.js 15, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui

**Frontend Mobile (Building Now)**:
- React Native via Expo
- TypeScript
- React Navigation
- Convex + Clerk integration

---

## What You'll Build

By the end of this phase, you'll have:

✅ Expo app with TypeScript configured
✅ Metro bundler with Node.js polyfills for Convex
✅ Clerk authentication (email, Google, Apple)
✅ Convex client connected with auth
✅ Sign-in and sign-up screens
✅ Protected tab navigation
✅ Simple test screen showing Convex data

**This is the foundation** for all future phases. Get this right.

---

## Current State

**Before This Phase**:
- Web app runs at http://localhost:3000
- Convex backend running (`bunx convex dev`)
- Clerk configured in web app
- Development environment ready (iOS/Android simulators)

**After This Phase**:
- Mobile app running on simulator
- User can sign in/out
- Convex queries work in mobile app
- Navigation structure in place

---

## Architecture Overview

### Authentication Flow

```
User Interaction
    ↓
Clerk (Email/OAuth)
    ↓
JWT Token (with user ID)
    ↓
ConvexProviderWithClerk
    ↓
WebSocket Connection (authenticated)
    ↓
Convex Backend (validates JWT)
    ↓
Data Query/Mutation (with user context)
```

### Provider Hierarchy

```typescript
<ClerkProvider>           // Auth provider
  <ClerkLoaded>           // Wait for Clerk to initialize
    <ConvexProviderWithClerk>  // Convex with auth
      <NavigationContainer>     // React Navigation
        <App />
      </NavigationContainer>
    </ConvexProviderWithClerk>
  </ClerkLoaded>
</ClerkProvider>
```

---

## Step 1: Create Expo Project

### 1.1 Create New App

Navigate to where you want the mobile app (separate from web):

```bash
cd ~/code  # Or wherever you keep projects
npx create-expo-app@latest blah-chat-mobile

# Select template:
# ✓ blank (TypeScript)
```

**Expected output**:
```
✅ Your project is ready!

To run your project, navigate to the directory and run:
  cd blah-chat-mobile
  npx expo start
```

### 1.2 Navigate and Install Core Dependencies

```bash
cd blah-chat-mobile

# Install Convex
npm install convex

# Install Clerk + Secure Storage
npm install @clerk/clerk-expo expo-secure-store

# Install React Navigation
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack

# Install React Navigation dependencies (required by Expo)
npx expo install react-native-screens react-native-safe-area-context
```

### 1.3 Verify Installation

```bash
npm list convex @clerk/clerk-expo
```

**Expected**:
```
blah-chat-mobile@1.0.0
├── @clerk/clerk-expo@2.x.x
└── convex@1.x.x
```

---

## Step 2: Configure Metro Bundler (Critical)

### 2.1 Why This Matters

Convex client depends on Node.js globals (`Buffer`, `process`) not available in React Native. Without polyfills, you'll get errors like:

```
❌ ReferenceError: Buffer is not defined
❌ ReferenceError: process is not defined
```

### 2.2 Install Polyfill Dependencies

```bash
npm install \
  buffer \
  process \
  readable-stream \
  crypto-browserify \
  stream-browserify \
  react-native-url-polyfill
```

### 2.3 Create Polyfills File

Create `polyfills.ts` in project root:

```typescript
// polyfills.ts
import { Buffer } from 'buffer';
import process from 'process';
import 'react-native-url-polyfill/auto';

// Assign to global scope
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

if (typeof global.process === 'undefined') {
  global.process = process;
}

// Prevent "process is not defined" in production
global.process.env = global.process.env || {};
```

### 2.4 Configure Metro

Create `metro.config.js` in project root:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable Node.js polyfills
config.resolver.extraNodeModules = {
  buffer: require.resolve('buffer'),
  process: require.resolve('process'),
  crypto: require.resolve('crypto-browserify'),
  stream: require.resolve('readable-stream'),
};

// Enable package.json "exports" field (required for modern packages)
config.resolver.unstable_enablePackageExports = true;

// Set condition names for module resolution
config.resolver.unstable_conditionNames = [
  'browser',
  'require',
  'react-native',
];

module.exports = config;
```

### 2.5 Import Polyfills in App Entry

Edit `App.tsx` (or `app/_layout.tsx` if using Expo Router):

```typescript
// FIRST LINE - import polyfills before anything else
import './polyfills';

// Now import other modules
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
// ... rest of imports
```

**CRITICAL**: Polyfill import must be first line, before React Native imports.

---

## Step 3: Configure Environment Variables

### 3.1 Create Environment Config

Create `app.config.js` in project root (replaces `app.json`):

```javascript
// app.config.js
export default {
  expo: {
    name: 'blah.chat',
    slug: 'blah-chat-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.blahchat.mobile',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      package: 'com.blahchat.mobile',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      // Environment variables accessible via Constants.expoConfig.extra
      clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
      convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
    },
  },
};
```

### 3.2 Create .env File

Create `.env` in project root:

```bash
# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... # From Clerk dashboard

# Convex Real-time Database
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud # From bunx convex dev
```

**Get these values**:
1. **Clerk Key**: https://dashboard.clerk.com → Your App → API Keys
2. **Convex URL**: From terminal where `bunx convex dev` is running

### 3.3 Add .env to .gitignore

Edit `.gitignore`:

```
# Environment variables
.env
.env.local
```

---

## Step 4: Set Up Clerk Authentication

### 4.1 Configure Clerk Dashboard for Mobile

1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to **Configure → JWT Templates**
4. Find the "convex" template (created in Phase 0)
5. Go to **Configure → User & Authentication → Social Connections**
6. Enable:
   - ✅ **Google** (for OAuth)
   - ✅ **Apple** (required for iOS App Store)
7. Go to **Configure → User & Authentication → Email, Phone, Username**
8. Ensure **Email address** is required

### 4.2 Create Token Cache

Create `lib/tokenCache.ts`:

```typescript
// lib/tokenCache.ts
import * as SecureStore from 'expo-secure-store';

export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (error) {
      console.error('SecureStore get item error:', error);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore set item error:', error);
      return;
    }
  },
};
```

**Why SecureStore?**
- Encrypts tokens (not plain localStorage)
- Required for production apps
- Uses iOS Keychain / Android Keystore

### 4.3 Create Convex Client Setup

Create `lib/convex.ts`:

```typescript
// lib/convex.ts
import { ConvexReactClient } from 'convex/react';
import Constants from 'expo-constants';

const convexUrl = Constants.expoConfig?.extra?.convexUrl;

if (!convexUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_CONVEX_URL environment variable.\n' +
      'Add it to your .env file:\n' +
      'EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud'
  );
}

// Initialize Convex client (singleton)
export const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false, // Disable browser-only warning
  verbose: __DEV__, // Enable debug logs in development
});
```

---

## Step 5: Create Root Layout with Providers

### 5.1 Install Expo Router (File-Based Routing)

```bash
npx expo install expo-router
```

### 5.2 Update package.json Entry Point

Edit `package.json`:

```json
{
  "main": "expo-router/entry"
}
```

### 5.3 Create App Directory Structure

```bash
mkdir -p app/(auth)
mkdir -p app/(tabs)
```

### 5.4 Create Root Layout

Create `app/_layout.tsx`:

```typescript
// app/_layout.tsx
import './polyfills'; // MUST BE FIRST

import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { Slot } from 'expo-router';
import Constants from 'expo-constants';
import { tokenCache } from '@/lib/tokenCache';
import { convex } from '@/lib/convex';

const clerkPublishableKey = Constants.expoConfig?.extra?.clerkPublishableKey;

if (!clerkPublishableKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable.\n' +
      'Add it to your .env file:\n' +
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...'
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
- `ClerkProvider` wraps everything (auth state)
- `ClerkLoaded` waits for Clerk to initialize (prevents flicker)
- `ConvexProviderWithClerk` connects Convex with Clerk auth
- `Slot` renders child routes (Expo Router pattern)

---

## Step 6: Create Authentication Screens

### 6.1 Create Sign-In Screen

Create `app/(auth)/sign-in.tsx`:

```typescript
// app/(auth)/sign-in.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSignIn, useOAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Email/Password Sign-In
  const handleEmailSignIn = async () => {
    if (!isLoaded || !signIn) return;

    setLoading(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Sign-in incomplete. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Sign-In Failed', err.errors?.[0]?.longMessage || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { createdSessionId, setActive } = await startGoogleOAuth();

      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('OAuth Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>blah.chat</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleEmailSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.googleButton, loading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/(auth)/sign-up')}
          disabled={loading}
        >
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#0066ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#fff',
  },
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#666',
    fontSize: 14,
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#999',
    fontSize: 14,
  },
  linkTextBold: {
    color: '#0066ff',
    fontWeight: '600',
  },
});
```

### 6.2 Create Sign-Up Screen

Create `app/(auth)/sign-up.tsx`:

```typescript
// app/(auth)/sign-up.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export default function SignUpScreen() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  // Step 1: Create account
  const handleSignUp = async () => {
    if (!isLoaded || !signUp) return;

    setLoading(true);
    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      // Send verification email
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      setPendingVerification(true);
    } catch (err: any) {
      Alert.alert('Sign-Up Failed', err.errors?.[0]?.longMessage || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify email code
  const handleVerify = async () => {
    if (!isLoaded || !signUp) return;

    setLoading(true);
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.errors?.[0]?.longMessage || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>
            We sent a code to {email}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setPendingVerification(false)}
            disabled={loading}
          >
            <Text style={styles.linkText}>Back to sign up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join blah.chat today</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#0066ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#999',
    fontSize: 14,
  },
  linkTextBold: {
    color: '#0066ff',
    fontWeight: '600',
  },
});
```

---

## Step 7: Create Protected Navigation

### 7.1 Create Index Route (Entry Point)

Create `app/index.tsx`:

```typescript
// app/index.tsx
import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading while checking auth
  if (!isLoaded) {
    return (
      <View style={styles.container}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### 7.2 Create Tab Navigation Layout

Create `app/(tabs)/_layout.tsx`:

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0066ff',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#333',
        },
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

---

## Step 8: Create Test Screens with Convex Data

### 8.1 Create Chat Tab (Convex Test)

Create `app/(tabs)/index.tsx`:

```typescript
// app/(tabs)/index.tsx
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function ChatTab() {
  // Test Convex query - list conversations
  const conversations = useQuery(api.conversations.list);

  if (conversations === undefined) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066ff" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Conversations</Text>
        <Text style={styles.subtitle}>
          {conversations.length === 0
            ? 'No conversations yet. Start one in the web app!'
            : `Found ${conversations.length} conversation(s)`}
        </Text>

        {conversations.map((conv) => (
          <View key={conv._id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {conv.title || 'Untitled Conversation'}
            </Text>
            <Text style={styles.cardMeta}>
              {conv.modelId || 'No model'} • {new Date(conv.createdAt).toLocaleDateString()}
            </Text>
          </View>
        ))}

        {conversations.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              ✨ This is working!{'\n\n'}
              Go to http://localhost:3000 in your browser and create a conversation.
              {'\n\n'}It will appear here in real-time.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    marginTop: 40,
    padding: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
});
```

### 8.2 Create Profile Tab (Auth Test)

Create `app/(tabs)/profile.tsx`:

```typescript
// app/(tabs)/profile.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export default function ProfileTab() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.primaryEmailAddress?.emailAddress}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>User ID</Text>
          <Text style={styles.valueSmall}>{user?.id}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Joined</Text>
          <Text style={styles.value}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    color: '#fff',
  },
  valueSmall: {
    fontSize: 12,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  button: {
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## Step 9: Set Up TypeScript Path Aliases

### 9.1 Configure tsconfig.json

Edit `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/convex/*": ["../blah.chat/convex/*"]
    }
  }
}
```

**Note**: Adjust `"../blah.chat/convex/*"` path to match your web app location.

### 9.2 Create Convex Types Symlink

From mobile project root:

```bash
# macOS/Linux
ln -s ../blah.chat/convex ./convex

# Windows (run as Administrator)
mklink /D convex ..\blah.chat\convex
```

This allows importing: `import { api } from '@/convex/_generated/api'`

---

## Step 10: Run and Test

### 10.1 Start Development Server

Ensure web app and Convex are still running:

Terminal 1 (web app):
```bash
cd ~/code/blah.chat
bunx convex dev
```

Terminal 2 (web app):
```bash
cd ~/code/blah.chat
bun dev
```

Terminal 3 (mobile app):
```bash
cd ~/code/blah-chat-mobile
npx expo start --clear
```

### 10.2 Open on Simulator

In Expo Dev Tools:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator

**Or scan QR code** with Expo Go on physical device

### 10.3 Test Authentication

1. App opens to sign-in screen
2. Click **Sign Up**
3. Enter email and password
4. Receive verification code email
5. Enter code
6. Redirected to Chat tab
7. See "Found 0 conversations" (or your existing ones)

### 10.4 Test Convex Real-Time

1. Keep mobile app open on Chat tab
2. In web browser (http://localhost:3000):
   - Create a new conversation
   - Send a message
3. Mobile app should update immediately (no refresh needed)

### 10.5 Test Sign Out

1. Go to Profile tab
2. Click **Sign Out**
3. Redirected to sign-in screen

---

## Testing Checklist

- [ ] App builds without errors
- [ ] No "Buffer is not defined" errors
- [ ] No "process is not defined" errors
- [ ] Sign-up flow works (email verification)
- [ ] Sign-in with email/password works
- [ ] Google OAuth works (if configured)
- [ ] Sign-out redirects to auth screen
- [ ] Chat tab loads conversations
- [ ] Creating conversation in web app shows in mobile real-time
- [ ] Profile tab shows user info
- [ ] Tab navigation works smoothly
- [ ] No console errors or warnings

---

## Troubleshooting

### "Buffer is not defined"

**Cause**: Polyfills not loaded first
**Solution**:
1. Verify `polyfills.ts` exists in root
2. Check `import './polyfills';` is **first line** in `app/_layout.tsx`
3. Clear cache: `npx expo start --clear`

---

### "process.env is not defined"

**Cause**: Process polyfill incomplete
**Solution**: Add to `polyfills.ts`:
```typescript
global.process.env = global.process.env || {};
```

---

### "Unable to resolve module 'convex'"

**Cause**: Metro bundler not configured
**Solution**:
1. Verify `metro.config.js` has `extraNodeModules`
2. Restart bundler: `npx expo start --clear`
3. Reinstall: `rm -rf node_modules && npm install`

---

### Clerk "Invalid publishable key"

**Cause**: Wrong key or not set
**Solution**:
1. Check `.env` has correct `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
2. Verify key starts with `pk_test_` or `pk_live_`
3. Restart expo: `npx expo start --clear`

---

### "Cannot connect to Convex"

**Cause**: Wrong URL or Convex not running
**Solution**:
1. Check `.env` has correct `EXPO_PUBLIC_CONVEX_URL`
2. Verify Convex dev running: `bunx convex dev`
3. Test URL in browser (should show JSON response)

---

### Google OAuth "Redirect URI mismatch"

**Cause**: Clerk not configured for mobile redirects
**Solution**:
1. In Clerk Dashboard → Social Connections → Google
2. Add redirect URI: `exp://localhost:8081`
3. Add: `https://your-app.clerk.accounts.dev/v1/oauth_callback`

---

### Conversations not showing

**Cause**: Auth not working or no conversations in web
**Solution**:
1. Check Profile tab shows your email (auth working)
2. Create conversation in web app (http://localhost:3000)
3. Check Convex dashboard for data: https://dashboard.convex.dev

---

## Next Steps

### What You Built

✅ Expo app with TypeScript
✅ Metro bundler configured with polyfills
✅ Clerk authentication (email + OAuth)
✅ Convex client with auth
✅ Sign-in/sign-up screens
✅ Protected tab navigation
✅ Real-time data sync test

### What's Next (Phase 2)

**Phase 2: Core Chat Implementation** will add:
- Conversation list with pull-to-refresh
- Full chat screen with message list
- Virtualized message rendering
- Chat input with auto-expand
- Model selector bottom sheet
- Real-time message streaming
- Offline message queue
- Message actions (copy, edit, delete, regenerate)

**Estimated Time**: 8-12 hours

---

## Resources

- **Expo Router Docs**: https://docs.expo.dev/router/introduction/
- **Clerk Expo SDK**: https://clerk.com/docs/reference/expo/overview
- **Convex React Native**: https://docs.convex.dev/client/react-native
- **React Navigation**: https://reactnavigation.org

---

**Next**: [Phase 2: Core Chat Implementation](./phase-2-core-chat.md)
