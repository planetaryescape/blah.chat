# Phase 4: DAL Refactoring (Dual-Database Routing)

## Context

### What is BYOD?

BYOD allows users to store their content on their own Convex instance. This means queries for conversations, messages, etc. must route to the user's database instead of main.

### Overall Architecture

- **Main DB**: users, templates, adminSettings, feedback (always on blah.chat's Convex)
- **User's DB**: conversations, messages, memories, files (on user's Convex if BYOD enabled)

### Where This Phase Fits

```
Phase 1: Foundation ✓
Phase 2: Schema Package ✓
Phase 3: Deployment ✓
         │
         ▼
[Phase 4: DAL Routing] ◄── YOU ARE HERE
         │
         ▼
Phase 5: Migrations
Phase 6: Settings UI
Phase 7: Error Handling
Phase 8: Documentation
```

**Dependencies**: Phase 1 (credentials), Phase 3 (user's instance deployed)
**Unlocks**: Phase 5 (migrations), Phase 7 (error handling)

---

## Goal

Route queries and mutations to the correct database based on table type and user's BYOD configuration.

---

## Deliverables

### 1. Database Router

Create `/src/lib/byod/router.ts`:

```typescript
export type TableLocation = "main" | "user";

/**
 * Defines which tables live on which database
 */
export const TABLE_LOCATIONS: Record<string, TableLocation> = {
  // Main DB (app operations)
  users: "main",
  userPreferences: "main",
  userOnboarding: "main",
  userStats: "main",
  templates: "main",
  adminSettings: "main",
  feedback: "main",
  shares: "main",
  notifications: "main",
  migrations: "main",
  emailAlerts: "main",
  jobs: "main",
  userDatabaseConfig: "main",
  byodMigrations: "main",

  // User's DB (content)
  conversations: "user",
  conversationParticipants: "user",
  messages: "user",
  toolCalls: "user",
  sources: "user",
  attachments: "user",
  memories: "user",
  files: "user",
  fileChunks: "user",
  projects: "user",
  projectConversations: "user",
  projectNotes: "user",
  projectFiles: "user",
  notes: "user",
  bookmarks: "user",
  snippets: "user",
  tasks: "user",
  tags: "user",
  conversationTags: "user",
  noteTags: "user",
  taskTags: "user",
  usageRecords: "user",
  ttsCache: "user",
  presentations: "user",
  slides: "user",
  outlineItems: "user",
  designTemplates: "user",
  presentationSessions: "user",
  activityEvents: "user",
};

/**
 * Get the database location for a table
 */
export function getTableLocation(table: string): TableLocation {
  const location = TABLE_LOCATIONS[table];
  if (!location) {
    console.warn(`Unknown table: ${table}, defaulting to main`);
    return "main";
  }
  return location;
}

/**
 * Check if a table is on the user's database
 */
export function isUserTable(table: string): boolean {
  return getTableLocation(table) === "user";
}

/**
 * Check if a table is on the main database
 */
export function isMainTable(table: string): boolean {
  return getTableLocation(table) === "main";
}
```

### 2. Client Factory

Extend `/src/lib/api/convex.ts` (NOT a new file - follow existing patterns):

```typescript
import { ConvexHttpClient } from "convex/browser";
import { getTableLocation } from "./router";

// Cache for user clients (cleared on disconnect)
const userClientCache = new Map<string, ConvexHttpClient>();

/**
 * Get the main Convex client (singleton)
 */
let mainClient: ConvexHttpClient | null = null;

export function getMainClient(): ConvexHttpClient {
  if (!mainClient) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL not set");
    mainClient = new ConvexHttpClient(url);
  }
  return mainClient;
}

/**
 * Get or create a client for user's BYOD instance
 */
export async function getUserClient(
  userId: string,
  deploymentUrl: string,
  deployKey?: string
): Promise<ConvexHttpClient> {
  const cacheKey = `${userId}:${deploymentUrl}`;

  if (userClientCache.has(cacheKey)) {
    return userClientCache.get(cacheKey)!;
  }

  const client = new ConvexHttpClient(deploymentUrl);

  // Set admin auth if deploy key provided (for server-side operations)
  if (deployKey) {
    client.setAdminAuth(deployKey);
  }

  userClientCache.set(cacheKey, client);
  return client;
}

/**
 * Clear cached client for user (call on disconnect)
 */
export function clearUserClient(userId: string): void {
  for (const [key] of userClientCache) {
    if (key.startsWith(`${userId}:`)) {
      userClientCache.delete(key);
    }
  }
}

/**
 * Get the appropriate client for a table
 */
export async function getClientForTable(
  table: string,
  userId: string,
  byodConfig?: {
    deploymentUrl: string;
    deployKey?: string;
    connectionStatus: string;
  } | null
): Promise<{ client: ConvexHttpClient; isUserDb: boolean }> {
  const location = getTableLocation(table);

  if (location === "main") {
    return { client: getMainClient(), isUserDb: false };
  }

  // User table - check if BYOD enabled
  if (!byodConfig || byodConfig.connectionStatus !== "connected") {
    // No BYOD or not connected - use main DB
    return { client: getMainClient(), isUserDb: false };
  }

  // BYOD enabled - use user's client
  const client = await getUserClient(
    userId,
    byodConfig.deploymentUrl,
    byodConfig.deployKey
  );
  return { client, isUserDb: true };
}
```

### 3. BYOD Hook (No new provider needed)

Create `/src/lib/hooks/queries/useBYODConfig.ts` (follows existing hook pattern):

**Note**: No new provider needed - use existing `ConvexClerkProvider`.

Create a hook instead of a provider:

```typescript
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface BYODConfig {
  connectionStatus: "pending" | "connected" | "error" | "disconnected";
  deploymentUrl?: string;
  schemaVersion: number;
  lastSchemaDeploy?: number;
}

interface BYODContextType {
  isEnabled: boolean;
  isLoading: boolean;
  config: BYODConfig | null;
  error: string | null;
}

const BYODContext = createContext<BYODContextType>({
  isEnabled: false,
  isLoading: true,
  config: null,
  error: null,
});

export function BYODProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user } = useUser();

  // Query BYOD config from main DB
  const config = useQuery(
    api.byod.credentials.getConfig,
    isSignedIn ? {} : "skip"
  );

  const isLoading = config === undefined;
  const isEnabled = config?.connectionStatus === "connected";
  const error = config?.connectionError || null;

  return (
    <BYODContext.Provider
      value={{
        isEnabled,
        isLoading,
        config: config || null,
        error,
      }}
    >
      {children}
    </BYODContext.Provider>
  );
}

export function useBYOD() {
  return useContext(BYODContext);
}

/**
 * Hook to check if user has BYOD enabled and connected
 */
export function useBYODEnabled(): boolean {
  const { isEnabled } = useBYOD();
  return isEnabled;
}
```

### 4. Server-Side BYOD Helper

Create `/src/lib/byod/serverHelpers.ts`:

```typescript
import { ConvexHttpClient } from "convex/browser";
import { getMainClient, getUserClient } from "./clientFactory";
import { getTableLocation } from "./router";
import { decryptCredential } from "@/convex/lib/encryption";

interface BYODConfig {
  encryptedDeploymentUrl: string;
  encryptedDeployKey: string;
  encryptionIV: string;
  authTags: string;
  connectionStatus: string;
}

/**
 * Get BYOD config for a user (server-side)
 */
export async function getBYODConfig(
  userId: string
): Promise<BYODConfig | null> {
  const mainClient = getMainClient();
  const config = await mainClient.query(
    api.byod.credentials.getConfigInternal,
    { userId }
  );
  return config;
}

/**
 * Get decrypted credentials (server-side only)
 */
export async function getDecryptedCredentials(
  config: BYODConfig
): Promise<{ deploymentUrl: string; deployKey: string }> {
  const [urlIv, keyIv] = config.encryptionIV.split(":");
  const [urlAuthTag, keyAuthTag] = config.authTags.split(":");

  const deploymentUrl = await decryptCredential(
    config.encryptedDeploymentUrl,
    urlIv,
    urlAuthTag
  );

  const deployKey = await decryptCredential(
    config.encryptedDeployKey,
    keyIv,
    keyAuthTag
  );

  return { deploymentUrl, deployKey };
}

/**
 * Get client for table (server-side with decryption)
 */
export async function getServerClientForTable(
  table: string,
  userId: string
): Promise<{ client: ConvexHttpClient; isUserDb: boolean }> {
  const location = getTableLocation(table);

  if (location === "main") {
    return { client: getMainClient(), isUserDb: false };
  }

  // Check BYOD config
  const config = await getBYODConfig(userId);

  if (!config || config.connectionStatus !== "connected") {
    return { client: getMainClient(), isUserDb: false };
  }

  // Decrypt and create client
  const { deploymentUrl, deployKey } = await getDecryptedCredentials(config);
  const client = await getUserClient(userId, deploymentUrl, deployKey);

  return { client, isUserDb: true };
}
```

### 5. DAL Wrapper Example

Create `/src/lib/byod/wrappers/conversations.ts`:

```typescript
import { getServerClientForTable } from "../serverHelpers";
import { api } from "@/convex/_generated/api";

/**
 * List conversations for user
 * Routes to user's DB if BYOD enabled
 */
export async function listConversations(
  userId: string,
  clerkId: string,
  options?: { archived?: boolean; limit?: number }
) {
  const { client, isUserDb } = await getServerClientForTable(
    "conversations",
    userId
  );

  if (isUserDb) {
    // Query user's BYOD instance
    // Note: userId in BYOD is clerkId (string, not Id)
    return await client.query(api.conversations.list, {
      userId: clerkId,
      ...options,
    });
  } else {
    // Query main instance (original behavior)
    return await client.query(api.conversations.list, {
      ...options,
    });
  }
}

/**
 * Create conversation
 */
export async function createConversation(
  userId: string,
  clerkId: string,
  data: {
    title?: string;
    model?: string;
    systemPrompt?: string;
  }
) {
  const { client, isUserDb } = await getServerClientForTable(
    "conversations",
    userId
  );

  if (isUserDb) {
    return await client.mutation(api.conversations.create, {
      userId: clerkId,
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } else {
    return await client.mutation(api.conversations.create, data);
  }
}

// Add more wrapper functions as needed...
```

### 6. Update Existing DAL

Modify `/src/lib/api/dal/conversations.ts` to use routing:

```typescript
import { getServerClientForTable } from "@/lib/byod/serverHelpers";

export async function listConversations(
  userId: string,
  clerkId: string,
  options?: ListConversationsOptions
) {
  // Use BYOD routing instead of direct client
  const { client, isUserDb } = await getServerClientForTable(
    "conversations",
    userId
  );

  // Rest of implementation...
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/src/lib/byod/router.ts` | Create | Table location mapping |
| `/src/lib/api/convex.ts` | Modify | Add BYOD client factory (extend existing) |
| `/src/lib/api/dal/byod.ts` | Create | BYOD DAL (follows existing pattern) |
| `/src/lib/hooks/queries/useBYODConfig.ts` | Create | BYOD hook (no new provider) |
| `/src/lib/api/dal/*.ts` | Modify | Update to use routing |

**Note**: No new provider needed - use existing `ConvexClerkProvider`.

---

## Testing Criteria

- [ ] Queries route to correct database based on table
- [ ] Mutations write to correct database
- [ ] BYOD disabled users use main DB (no change)
- [ ] Client cache works (no recreating on every request)
- [ ] Client cleared on disconnect
- [ ] React context provides BYOD status
- [ ] Server-side helpers decrypt correctly
- [ ] Error handling for connection failures

---

## Migration Strategy

1. **Start with read operations** - Easier to test
2. **Add write operations** - More critical
3. **Update incrementally** - Don't change all DAL at once
4. **Feature flag** - Allow rollback if issues

---

## Key Considerations

### Real-Time Subscriptions

For BYOD users, real-time subscriptions (useQuery with Convex React) need to connect to their instance. Options:

1. **Separate ConvexProvider** - Wrap content areas with user's provider
2. **HTTP polling** - Fallback for BYOD users
3. **Hybrid** - Main for app UI, user's for content

Recommended: Start with HTTP client for BYOD, add real-time later.

### Performance

- Cache user clients (don't recreate)
- Batch queries where possible
- Consider connection pooling

### Error Handling

- Catch connection errors
- Update status to "error" on failure
- Provide retry mechanism
- Block UI until resolved (per Phase 7)

---

## Next Phase

After completing Phase 4, proceed to [Phase 5: Migration Pipeline](./phase-5-migrations.md) to handle schema updates across user instances.
