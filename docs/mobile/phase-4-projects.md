# Phase 4: Projects & Organization

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

✅ Project list and creation
✅ Project detail view with tabs
✅ Link conversations to projects
✅ Notes system with markdown editor
✅ Bookmarks screen
✅ Global search (conversations, messages, notes)
✅ Tag management
✅ Settings screen
✅ Complete mobile app feature parity

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

## Step 1: Create Projects Tab

### 1.1 Update Tab Navigation

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
    tabBarIcon: ({ color, size}) => (
      <Ionicons name="search" size={size} color={color} />
    ),
  }}
/>
```

### 1.2 Create Projects List Screen

Create `app/(tabs)/projects.tsx`:

```typescript
// app/(tabs)/projects.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProjectsTab() {
  const projects = useQuery(api.projects.list);
  const router = useRouter();

  const renderProject = ({ item }) => (
    <TouchableOpacity
      style={styles.projectCard}
      onPress={() => router.push(`/projects/${item._id}`)}
    >
      <View style={styles.projectHeader}>
        <Text style={styles.projectTitle}>{item.name}</Text>
        {item.conversationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.conversationCount}</Text>
          </View>
        )}
      </View>
      {item.description && (
        <Text style={styles.projectDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      <View style={styles.projectMeta}>
        <Ionicons name="chatbubbles" size={14} color="#666" />
        <Text style={styles.metaText}>
          {item.conversationCount} conversation{item.conversationCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/projects/new')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <FlashList
        data={projects || []}
        renderItem={renderProject}
        estimatedItemSize={120}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>No projects yet</Text>
            <Text style={styles.emptySubtext}>
              Create a project to organize conversations
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0066ff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#0066ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  projectCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  badge: {
    backgroundColor: '#0066ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  projectDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
    lineHeight: 20,
  },
  projectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#444',
    marginTop: 8,
    textAlign: 'center',
  },
});
```

---

## Step 2: Create Project Detail Screen

Create `app/projects/[id].tsx`:

```typescript
// app/projects/[id].tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
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
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
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
          tabBarActiveTintColor: '#0066ff',
          tabBarInactiveTintColor: '#666',
          tabBarIndicatorStyle: { backgroundColor: '#0066ff' },
        }}
      >
        <Tab.Screen name="Conversations" component={ProjectConversations} />
        <Tab.Screen name="Notes" component={ProjectNotes} />
        <Tab.Screen name="Settings" component={ProjectSettings} />
      </Tab.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
});
```

---

## Step 3: Add Bookmarks Screen

Create `app/(tabs)/bookmarks.tsx`:

```typescript
// app/(tabs)/bookmarks.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

export default function BookmarksTab() {
  const bookmarks = useQuery(api.bookmarks.list);
  const router = useRouter();

  const renderBookmark = ({ item }) => (
    <TouchableOpacity
      style={styles.bookmarkCard}
      onPress={() => router.push(`/chat/${item.conversationId}`)}
    >
      <View style={styles.bookmarkHeader}>
        <Text style={styles.conversationTitle} numberOfLines={1}>
          {item.conversationTitle || 'Untitled'}
        </Text>
        <Ionicons name="star" size={16} color="#ffd700" />
      </View>

      <View style={styles.messagePreview}>
        <Markdown style={markdownStyles}>
          {item.content.slice(0, 200)}
          {item.content.length > 200 && '...'}
        </Markdown>
      </View>

      <Text style={styles.bookmarkMeta}>
        {item.model} • {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlashList
        data={bookmarks || []}
        renderItem={renderBookmark}
        estimatedItemSize={150}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>No bookmarks yet</Text>
            <Text style={styles.emptySubtext}>
              Bookmark messages to save them here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bookmarkCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  bookmarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conversationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0066ff',
    flex: 1,
  },
  messagePreview: {
    marginBottom: 8,
  },
  bookmarkMeta: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#444',
    marginTop: 8,
  },
});

const markdownStyles = {
  body: { color: '#999', fontSize: 14, lineHeight: 20 },
  paragraph: { marginTop: 0, marginBottom: 4 },
};
```

---

## Step 4: Add Search Screen

Create `app/(tabs)/search.tsx`:

```typescript
// app/(tabs)/search.tsx
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
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
      style={styles.resultCard}
      onPress={() => {
        if (item.type === 'message') {
          router.push(`/chat/${item.conversationId}`);
        } else if (item.type === 'note') {
          router.push(`/notes/${item.noteId}`);
        }
      }}
    >
      <View style={styles.resultHeader}>
        <Ionicons
          name={item.type === 'message' ? 'chatbubble' : 'document-text'}
          size={16}
          color="#0066ff"
        />
        <Text style={styles.resultType}>{item.type}</Text>
      </View>

      <Text style={styles.resultContent} numberOfLines={3}>
        {item.content}
      </Text>

      <Text style={styles.resultMeta}>
        Score: {item.score.toFixed(2)} • {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
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
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlashList
          data={results}
          renderItem={renderResult}
          estimatedItemSize={120}
        />
      ) : query.length > 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={64} color="#333" />
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      ) : (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={64} color="#333" />
          <Text style={styles.emptyText}>Search your conversations</Text>
          <Text style={styles.emptySubtext}>
            Uses hybrid full-text and semantic search
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  resultCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resultType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0066ff',
    textTransform: 'uppercase',
  },
  resultContent: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 8,
  },
  resultMeta: {
    fontSize: 12,
    color: '#666',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#444',
    marginTop: 8,
    textAlign: 'center',
  },
});
```

---

## Step 5: Update Settings Screen

Edit `app/(tabs)/profile.tsx` (rename to `settings.tsx`):

```typescript
// app/(tabs)/settings.tsx
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function SettingsTab() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const preferences = useQuery(api.users.getAllUserPreferences);
  const updatePreferences = useMutation(api.users.updateUserPreferences);

  const [ttsEnabled, setTtsEnabled] = useState(preferences?.ttsEnabled ?? true);
  const [messageActions, setMessageActions] = useState(preferences?.showMessageActions ?? true);

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
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.primaryEmailAddress?.emailAddress}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Member Since</Text>
          <Text style={styles.value}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
          </Text>
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="volume-high" size={20} color="#fff" />
            <Text style={styles.settingLabel}>Text-to-Speech</Text>
          </View>
          <Switch
            value={ttsEnabled}
            onValueChange={handleToggleTTS}
            trackColor={{ false: '#333', true: '#0066ff' }}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
            <Text style={styles.settingLabel}>Show Message Actions</Text>
          </View>
          <Switch
            value={messageActions}
            onValueChange={handleToggleMessageActions}
            trackColor={{ false: '#333', true: '#0066ff' }}
          />
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <TouchableOpacity style={styles.linkRow}>
          <Ionicons name="document-text" size={20} color="#0066ff" />
          <Text style={styles.linkText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow}>
          <Ionicons name="shield-checkmark" size={20} color="#0066ff" />
          <Text style={styles.linkText}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>Version</Text>
          <Text style={styles.versionText}>1.0.0</Text>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ using Convex & Clerk</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  versionLabel: {
    fontSize: 16,
    color: '#fff',
  },
  versionText: {
    fontSize: 16,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 32,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#666',
  },
});
```

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
**Solution**: `npm install @react-navigation/material-top-tabs react-native-tab-view`

### Search action timeout
**Cause**: Large dataset or slow network
**Solution**: Add loading indicator, increase action timeout

### Preferences not persisting
**Cause**: Mutation not awaited
**Solution**: Ensure `await updatePreferences()` completes before UI update

---

## Phase Complete!

🎉 **Congratulations!** You've built a complete mobile app for blah.chat with:

✅ Authentication (Clerk with OAuth)
✅ Real-time chat with streaming
✅ 60+ AI models with switching
✅ Image and document uploads
✅ Voice recording and transcription
✅ Text-to-speech playback
✅ Project management
✅ Notes with markdown
✅ Bookmarks
✅ Hybrid search
✅ Settings and preferences

### What's Next?

**Production Checklist**:
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

**Performance Optimization**:
- [ ] Profile with React DevTools
- [ ] Optimize re-renders
- [ ] Add memoization
- [ ] Lazy load heavy components
- [ ] Reduce bundle size
- [ ] Implement code splitting

---

**Deployment**: See [Expo Application Services (EAS) Build documentation](https://docs.expo.dev/build/introduction/)
