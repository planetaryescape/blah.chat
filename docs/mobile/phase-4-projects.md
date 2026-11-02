# Phase 4: Projects & Organization

> **V2 - FUTURE WORK**
>
> This phase is **deferred to V2**. The content below is preserved for future reference.
> V1 scope (Phases 0-3) covers: Chat, RAG/Memories, Voice, Files, Cost Tracking.
>
> **Why deferred?** Projects, notes, bookmarks, and search add organizational complexity. V1 focuses on core chat functionality with real-time streaming and RAG.

**Duration**: 6-8 hours
**Difficulty**: Intermediate
**Prerequisites**: Phase 3 complete, media support working

---

## Project Context

### What is blah.chat?

blah.chat provides powerful organization features: projects (workspaces with custom prompts), notes (markdown editor), bookmarks (saved messages), and hybrid search (full-text + semantic). This phase implements the productivity layer for mobile.

### Architecture: Many-to-Many Relationships

**Normalized Schema** (no nested arrays):
- `projects` table - project metadata
- `projectConversations` junction table - many-to-many
- `projectNotes` junction table
- `projectFiles` junction table
- `notes` table with tags
- `bookmarks` table linking to messages

**This enables**:
- Conversations in multiple projects
- Efficient queries
- Atomic updates

---

## What You'll Build

By the end of this phase:

- Project list and creation
- Project detail view with tabs
- Link conversations to projects
- Notes system with markdown editor
- Tasks system
- Bookmarks screen
- Global search (conversations, messages, notes)
- Tag management
- Settings screen
- Complete mobile app feature parity

---

## Current State

**Before This Phase**:
- Chat fully functional
- Media support working
- Voice and TTS integrated

**After This Phase**:
- Complete productivity suite
- Full feature parity with web
- Production-ready mobile app

---

## Step 1: Install Dependencies

```bash
cd apps/mobile
bun add @react-navigation/material-top-tabs react-native-tab-view react-native-pager-view
```

---

## Step 2: Create Projects Tab

### 2.1 Update Tab Navigation

Edit `app/(tabs)/_layout.tsx`:

```typescript
<Tabs.Screen
  name="projects"
  options={{
    title: 'Projects',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="folder" size={size} color={color} />
    ),
  }}
/>
<Tabs.Screen
  name="search"
  options={{
    title: 'Search',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="search" size={size} color={color} />
    ),
  }}
/>
```

### 2.2 Create Projects List Screen

Create `app/(tabs)/projects.tsx`:

```typescript
// app/(tabs)/projects.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from 'convex/react';
import { api } from '@blah-chat/backend/convex/_generated/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProjectsTab() {
  const projects = useQuery(api.projects.list);
  const router = useRouter();

  const renderProject = ({ item }) => (
    <TouchableOpacity
      className="bg-zinc-900 p-4 mx-4 my-1.5 rounded-xl border border-zinc-800"
      onPress={() => router.push(`/projects/${item._id}`)}
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-lg font-semibold text-white flex-1">
          {item.name}
        </Text>
        {item.conversationCount > 0 && (
          <View className="bg-blue-600 rounded-full px-2 py-0.5 ml-2">
            <Text className="text-xs font-semibold text-white">
              {item.conversationCount}
            </Text>
          </View>
        )}
      </View>
      {item.description && (
        <Text className="text-sm text-zinc-400 mb-2 leading-5" numberOfLines={2}>
          {item.description}
        </Text>
      )}
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="chatbubbles" size={14} color="#666" />
        <Text className="text-xs text-zinc-500">
          {item.conversationCount} conversation{item.conversationCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-black">
      <TouchableOpacity
        className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-blue-600 justify-center items-center z-10 shadow-lg"
        onPress={() => router.push('/projects/new')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <FlashList
        data={projects || []}
        renderItem={renderProject}
        estimatedItemSize={120}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center pt-24">
            <Ionicons name="folder-outline" size={64} color="#333" />
            <Text className="text-xl font-semibold text-zinc-500 mt-4">
              No projects yet
            </Text>
            <Text className="text-sm text-zinc-600 mt-2 text-center">
              Create a project to organize conversations
            </Text>
          </View>
        }
      />
    </View>
  );
}
```

---

## Step 3: Create Project Detail Screen

Create `app/projects/[id].tsx`:

```typescript
// app/projects/[id].tsx
import { View, Text } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@blah-chat/backend/convex/_generated/api';
import type { Id } from '@blah-chat/backend/convex/_generated/dataModel';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { ProjectConversations } from '@/components/projects/ProjectConversations';
import { ProjectNotes } from '@/components/projects/ProjectNotes';
import { ProjectSettings } from '@/components/projects/ProjectSettings';

const Tab = createMaterialTopTabNavigator();

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = id as Id<'projects'>;
  const project = useQuery(api.projects.get, { projectId });

  if (!project) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <Text className="text-zinc-500 text-base">Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: project.name,
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
        }}
      />
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: { backgroundColor: '#000' },
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#666',
          tabBarIndicatorStyle: { backgroundColor: '#2563eb' },
        }}
      >
        <Tab.Screen name="Conversations" component={ProjectConversations} />
        <Tab.Screen name="Notes" component={ProjectNotes} />
        <Tab.Screen name="Settings" component={ProjectSettings} />
      </Tab.Navigator>
    </>
  );
}
```

---

## Step 4: Add Bookmarks Screen

Create `app/(tabs)/bookmarks.tsx`:

```typescript
// app/(tabs)/bookmarks.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from 'convex/react';
import { api } from '@blah-chat/backend/convex/_generated/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

export default function BookmarksTab() {
  const bookmarks = useQuery(api.bookmarks.list);
  const router = useRouter();

  const renderBookmark = ({ item }) => (
    <TouchableOpacity
      className="bg-zinc-900 p-4 mx-4 my-1.5 rounded-xl border border-zinc-800"
      onPress={() => router.push(`/chat/${item.conversationId}`)}
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-semibold text-blue-500 flex-1" numberOfLines={1}>
          {item.conversationTitle || 'Untitled'}
        </Text>
        <Ionicons name="star" size={16} color="#ffd700" />
      </View>

      <View className="mb-2">
        <Markdown style={markdownStyles}>
          {item.content.slice(0, 200)}
          {item.content.length > 200 && '...'}
        </Markdown>
      </View>

      <Text className="text-xs text-zinc-500">
        {item.model} - {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-black">
      <FlashList
        data={bookmarks || []}
        renderItem={renderBookmark}
        estimatedItemSize={150}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center pt-24">
            <Ionicons name="bookmark-outline" size={64} color="#333" />
            <Text className="text-xl font-semibold text-zinc-500 mt-4">
              No bookmarks yet
            </Text>
            <Text className="text-sm text-zinc-600 mt-2">
              Bookmark messages to save them here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const markdownStyles = {
  body: { color: '#999', fontSize: 14, lineHeight: 20 },
  paragraph: { marginTop: 0, marginBottom: 4 },
};
```

---

## Step 5: Add Search Screen

Create `app/(tabs)/search.tsx`:

```typescript
// app/(tabs)/search.tsx
import { View, TextInput, Text, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useAction } from 'convex/react';
import { api } from '@blah-chat/backend/convex/_generated/api';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SearchTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const search = useAction(api.search.hybridSearch);
  const router = useRouter();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const searchResults = await search({ query });
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderResult = ({ item }) => (
    <TouchableOpacity
      className="bg-zinc-900 p-4 mx-4 my-1.5 rounded-xl border border-zinc-800"
      onPress={() => {
        if (item.type === 'message') {
          router.push(`/chat/${item.conversationId}`);
        } else if (item.type === 'note') {
          router.push(`/notes/${item.noteId}`);
        }
      }}
    >
      <View className="flex-row items-center gap-2 mb-2">
        <Ionicons
          name={item.type === 'message' ? 'chatbubble' : 'document-text'}
          size={16}
          color="#2563eb"
        />
        <Text className="text-xs font-semibold text-blue-500 uppercase">
          {item.type}
        </Text>
      </View>

      <Text className="text-sm text-white leading-5 mb-2" numberOfLines={3}>
        {item.content}
      </Text>

      <Text className="text-xs text-zinc-500">
        Score: {item.score.toFixed(2)} - {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-black">
      <View className="flex-row items-center bg-zinc-900 m-4 px-4 py-3 rounded-xl border border-zinc-800 gap-3">
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          className="flex-1 text-base text-white"
          placeholder="Search conversations, notes..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-base text-zinc-500">Searching...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlashList
          data={results}
          renderItem={renderResult}
          estimatedItemSize={120}
        />
      ) : query.length > 0 ? (
        <View className="flex-1 justify-center items-center px-10">
          <Ionicons name="search-outline" size={64} color="#333" />
          <Text className="text-xl font-semibold text-zinc-500 mt-4 text-center">
            No results found
          </Text>
        </View>
      ) : (
        <View className="flex-1 justify-center items-center px-10">
          <Ionicons name="search-outline" size={64} color="#333" />
          <Text className="text-xl font-semibold text-zinc-500 mt-4 text-center">
            Search your conversations
          </Text>
          <Text className="text-sm text-zinc-600 mt-2 text-center">
            Uses hybrid full-text and semantic search
          </Text>
        </View>
      )}
    </View>
  );
}
```

---

## Step 6: Update Settings Screen

Edit `app/(tabs)/settings.tsx`:

```typescript
// app/(tabs)/settings.tsx
import { View, Text, TouchableOpacity, ScrollView, Switch, Platform } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@blah-chat/backend/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

export default function SettingsTab() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const preferences = useQuery(api.users.getAllUserPreferences);
  const updatePreferences = useMutation(api.users.updateUserPreferences);

  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [messageActions, setMessageActions] = useState(true);

  useEffect(() => {
    if (preferences) {
      setTtsEnabled(preferences.ttsEnabled ?? true);
      setMessageActions(preferences.showMessageActions ?? true);
    }
  }, [preferences]);

  const handleToggleTTS = async (value: boolean) => {
    setTtsEnabled(value);
    await updatePreferences({ ttsEnabled: value });
  };

  const handleToggleMessageActions = async (value: boolean) => {
    setMessageActions(value);
    await updatePreferences({ showMessageActions: value });
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <ScrollView className="flex-1 bg-black">
      {/* Account Section */}
      <View className="mt-6 px-4">
        <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Account
        </Text>

        <View className="bg-zinc-900 rounded-xl p-4 mb-2 border border-zinc-800">
          <Text className="text-xs text-zinc-500 mb-1">Email</Text>
          <Text className="text-base text-white">
            {user?.primaryEmailAddress?.emailAddress}
          </Text>
        </View>

        <View className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <Text className="text-xs text-zinc-500 mb-1">Member Since</Text>
          <Text className="text-base text-white">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
          </Text>
        </View>
      </View>

      {/* Preferences Section */}
      <View className="mt-6 px-4">
        <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Preferences
        </Text>

        <View className="bg-zinc-900 rounded-xl p-4 mb-2 border border-zinc-800 flex-row justify-between items-center">
          <View className="flex-row items-center gap-3">
            <Ionicons name="volume-high" size={20} color="#fff" />
            <Text className="text-base text-white">Text-to-Speech</Text>
          </View>
          <Switch
            value={ttsEnabled}
            onValueChange={handleToggleTTS}
            trackColor={{ false: '#333', true: '#2563eb' }}
          />
        </View>

        <View className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex-row justify-between items-center">
          <View className="flex-row items-center gap-3">
            <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
            <Text className="text-base text-white">Show Message Actions</Text>
          </View>
          <Switch
            value={messageActions}
            onValueChange={handleToggleMessageActions}
            trackColor={{ false: '#333', true: '#2563eb' }}
          />
        </View>
      </View>

      {/* About Section */}
      <View className="mt-6 px-4">
        <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          About
        </Text>

        <TouchableOpacity className="bg-zinc-900 rounded-xl p-4 mb-2 border border-zinc-800 flex-row items-center gap-3">
          <Ionicons name="document-text" size={20} color="#2563eb" />
          <Text className="flex-1 text-base text-white">Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity className="bg-zinc-900 rounded-xl p-4 mb-2 border border-zinc-800 flex-row items-center gap-3">
          <Ionicons name="shield-checkmark" size={20} color="#2563eb" />
          <Text className="flex-1 text-base text-white">Terms of Service</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <View className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex-row justify-between items-center">
          <Text className="text-base text-white">Version</Text>
          <Text className="text-base text-zinc-500 font-mono">1.0.0</Text>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        className="bg-red-500 rounded-xl p-4 mx-4 mt-8 items-center"
        onPress={handleSignOut}
      >
        <Text className="text-base font-semibold text-white">Sign Out</Text>
      </TouchableOpacity>

      <View className="p-8 items-center">
        <Text className="text-xs text-zinc-500">Made with Convex & Clerk</Text>
      </View>
    </ScrollView>
  );
}
```

---

## Backend Requirements

Ensure these Convex functions exist in `packages/backend/convex/`:

| Function | Type | Purpose |
|----------|------|---------|
| `api.projects.list` | Query | List user's projects |
| `api.projects.get` | Query | Get single project |
| `api.projects.create` | Mutation | Create project |
| `api.projects.update` | Mutation | Update project |
| `api.projects.delete` | Mutation | Delete project |
| `api.bookmarks.list` | Query | List user's bookmarks |
| `api.bookmarks.create` | Mutation | Bookmark message |
| `api.bookmarks.delete` | Mutation | Remove bookmark |
| `api.search.hybridSearch` | Action | Full-text + semantic search |
| `api.users.getAllUserPreferences` | Query | Get all preferences |
| `api.users.updateUserPreferences` | Mutation | Update preferences |

---

## Testing Checklist

- [ ] Projects list loads
- [ ] Can create new project
- [ ] Project detail tabs work (Conversations, Notes, Settings)
- [ ] Can link conversations to projects
- [ ] Notes editor supports markdown
- [ ] Can create and edit notes
- [ ] Bookmarks display correctly
- [ ] Can navigate to bookmarked messages
- [ ] Search finds conversations and notes
- [ ] Hybrid search ranking works correctly
- [ ] Settings save and persist
- [ ] TTS toggle works
- [ ] Sign out redirects to auth screen

---

## Troubleshooting

### Tab navigator not showing
**Cause**: Missing @react-navigation/material-top-tabs
**Solution**: `bun add @react-navigation/material-top-tabs react-native-tab-view`

### Search action timeout
**Cause**: Large dataset or slow network
**Solution**: Add loading indicator, increase action timeout

### Preferences not persisting
**Cause**: Mutation not awaited
**Solution**: Ensure `await updatePreferences()` completes before UI update

---

## V2 Complete!

This phase completes the V2 feature set with:

- Project management
- Notes with markdown
- Tasks
- Bookmarks
- Hybrid search
- Settings and preferences

### Full App Features (V1 + V2)

**V1 (Phases 0-3)**:
- Authentication (Clerk with OAuth)
- Real-time chat with streaming
- 46 AI models with switching
- Image and document uploads
- Voice recording and transcription
- Text-to-speech playback
- RAG/Memories
- Cost tracking

**V2 (Phase 4)**:
- Project management
- Notes with markdown
- Tasks
- Bookmarks
- Hybrid search
- Full settings

---

## Production Checklist

After completing V2:

- [ ] Add error tracking (Sentry)
- [ ] Add analytics (PostHog/Mixpanel)
- [ ] Implement push notifications
- [ ] Add offline sync for extended periods
- [ ] Optimize images (compression, WebP)
- [ ] Add haptic feedback
- [ ] Implement deep linking
- [ ] Create app icons and splash screens
- [ ] Set up EAS Build for TestFlight/Play Store
- [ ] Write tests (Jest + Detox)

---

## Resources

- **Expo EAS Build**: https://docs.expo.dev/build/introduction/
- **FlashList**: https://shopify.github.io/flash-list
- **NativeWind**: https://www.nativewind.dev
- **React Navigation Top Tabs**: https://reactnavigation.org/docs/material-top-tab-navigator/
