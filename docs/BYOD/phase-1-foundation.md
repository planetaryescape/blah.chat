# Phase 1: Foundation (Schema + Credential Storage)

## Context

### What is BYOD?

BYOD (Bring Your Own Database) allows users to connect their own Convex instance for storing personal content. This gives users:
- Data ownership (stored on their infrastructure)
- Direct export access via Convex dashboard
- Cost transparency (they pay their own Convex usage)

### Overall Architecture

blah.chat uses a two-database model:
- **Main DB** (blah.chat's Convex): users, templates, adminSettings, feedback, shares, notifications
- **User's DB** (their Convex): conversations, messages, memories, files, projects, notes, tasks

Users configure their Convex credentials in Settings, we deploy our schema to their instance, and route queries accordingly.

### Where This Phase Fits

```
[Phase 1: Foundation] ◄── YOU ARE HERE
         │
         ▼
Phase 2: Schema Package
Phase 3: Deployment
Phase 4: DAL Routing
Phase 5: Migrations
Phase 6: Settings UI
Phase 7: Error Handling
Phase 8: Documentation
```

**Dependencies**: None (this is the foundation)
**Unlocks**: All subsequent phases

---

## Goal

Create the schema and encryption infrastructure for storing user database credentials securely.

---

## Deliverables

### 1. Schema: `userDatabaseConfig` Table

Add to `/convex/schema.ts`:

```typescript
userDatabaseConfig: defineTable({
  userId: v.id("users"),

  // Encrypted Convex credentials (AES-256-GCM)
  encryptedDeploymentUrl: v.string(),
  encryptedDeployKey: v.string(),
  encryptionIV: v.string(),  // Initialization vector for decryption

  // Connection status
  connectionStatus: v.union(
    v.literal("pending"),      // Credentials saved, not verified
    v.literal("connected"),    // Successfully connected
    v.literal("error"),        // Connection failed
    v.literal("disconnected")  // User disconnected
  ),
  lastConnectionTest: v.optional(v.number()),
  connectionError: v.optional(v.string()),

  // Schema version tracking
  schemaVersion: v.number(),       // Track which version deployed
  lastSchemaDeploy: v.optional(v.number()),

  // Deployment status (added in Phase 3)
  deploymentStatus: v.optional(v.union(
    v.literal("not_started"),
    v.literal("deploying"),
    v.literal("deployed"),
    v.literal("failed")
  )),
  deploymentProgress: v.optional(v.string()),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_status", ["connectionStatus"])
```

### 2. Encryption Module

Create `/convex/lib/encryption.ts`:

```typescript
"use node";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits

function getEncryptionKey(): Buffer {
  const key = process.env.BYOD_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("BYOD_ENCRYPTION_KEY environment variable not set");
  }
  // Key should be 32 bytes (64 hex chars) or we derive it
  if (key.length === 64) {
    return Buffer.from(key, "hex");
  }
  // If not exact length, hash it to get 32 bytes
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(key).digest();
}

export async function encryptCredential(
  plaintext: string
): Promise<{ encrypted: string; iv: string; authTag: string }> {
  const key = getEncryptionKey();
  const iv = randomBytes(16);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

export async function decryptCredential(
  encrypted: string,
  iv: string,
  authTag: string
): Promise<string> {
  const key = getEncryptionKey();

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
```

### 3. Credential CRUD Operations

Create `/convex/byod/credentials.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { getCurrentUser } from "../lib/helpers";
import { encryptCredential, decryptCredential } from "../lib/encryption";

// Get current BYOD config for user
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const config = await ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!config) return null;

    // Never return encrypted credentials to client
    return {
      connectionStatus: config.connectionStatus,
      lastConnectionTest: config.lastConnectionTest,
      connectionError: config.connectionError,
      schemaVersion: config.schemaVersion,
      lastSchemaDeploy: config.lastSchemaDeploy,
      deploymentStatus: config.deploymentStatus,
      deploymentProgress: config.deploymentProgress,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  },
});

// Save credentials (encrypts before storing)
export const saveCredentials = action({
  args: {
    deploymentUrl: v.string(),
    deployKey: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Validate URL format
    if (!args.deploymentUrl.startsWith("https://")) {
      throw new Error("Deployment URL must start with https://");
    }

    // Encrypt credentials
    const encryptedUrl = await encryptCredential(args.deploymentUrl);
    const encryptedKey = await encryptCredential(args.deployKey);

    const now = Date.now();

    // Check if config exists
    const existing = await ctx.runQuery(internal.byod.credentials.getConfigInternal, {
      userId: user._id,
    });

    if (existing) {
      await ctx.runMutation(internal.byod.credentials.updateConfig, {
        configId: existing._id,
        encryptedDeploymentUrl: encryptedUrl.encrypted,
        encryptedDeployKey: encryptedKey.encrypted,
        encryptionIV: `${encryptedUrl.iv}:${encryptedKey.iv}`,
        authTags: `${encryptedUrl.authTag}:${encryptedKey.authTag}`,
        connectionStatus: "pending",
        updatedAt: now,
      });
    } else {
      await ctx.runMutation(internal.byod.credentials.createConfig, {
        userId: user._id,
        encryptedDeploymentUrl: encryptedUrl.encrypted,
        encryptedDeployKey: encryptedKey.encrypted,
        encryptionIV: `${encryptedUrl.iv}:${encryptedKey.iv}`,
        authTags: `${encryptedUrl.authTag}:${encryptedKey.authTag}`,
        connectionStatus: "pending",
        schemaVersion: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Disconnect BYOD
export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const config = await ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!config) return { success: true };

    await ctx.db.patch(config._id, {
      connectionStatus: "disconnected",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Internal queries/mutations for use by actions
export const getConfigInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const createConfig = internalMutation({
  args: {
    userId: v.id("users"),
    encryptedDeploymentUrl: v.string(),
    encryptedDeployKey: v.string(),
    encryptionIV: v.string(),
    authTags: v.string(),
    connectionStatus: v.string(),
    schemaVersion: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("userDatabaseConfig", args);
  },
});

export const updateConfig = internalMutation({
  args: {
    configId: v.id("userDatabaseConfig"),
    encryptedDeploymentUrl: v.optional(v.string()),
    encryptedDeployKey: v.optional(v.string()),
    encryptionIV: v.optional(v.string()),
    authTags: v.optional(v.string()),
    connectionStatus: v.optional(v.string()),
    connectionError: v.optional(v.string()),
    lastConnectionTest: v.optional(v.number()),
    schemaVersion: v.optional(v.number()),
    deploymentStatus: v.optional(v.string()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { configId, ...updates } = args;
    await ctx.db.patch(configId, updates);
  },
});
```

### 4. Connection Test Action

Create `/convex/byod/testConnection.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { ConvexHttpClient } from "convex/browser";
import { getCurrentUser } from "../lib/helpers";
import { decryptCredential } from "../lib/encryption";
import { internal } from "../_generated/api";

export const testConnection = action({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Get encrypted config
    const config = await ctx.runQuery(internal.byod.credentials.getConfigInternal, {
      userId: user._id,
    });

    if (!config) {
      throw new Error("No BYOD configuration found");
    }

    try {
      // Decrypt credentials
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

      // Attempt connection
      const client = new ConvexHttpClient(deploymentUrl);
      // Set deploy key for admin access
      client.setAdminAuth(deployKey);

      // Try a simple query to verify connection
      // This will fail if credentials are invalid
      await client.query("_system/cli/queryEnvironmentVariables");

      // Update status to connected
      await ctx.runMutation(internal.byod.credentials.updateConfig, {
        configId: config._id,
        connectionStatus: "connected",
        connectionError: undefined,
        lastConnectionTest: Date.now(),
        updatedAt: Date.now(),
      });

      return { success: true, message: "Connection successful" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Update status to error
      await ctx.runMutation(internal.byod.credentials.updateConfig, {
        configId: config._id,
        connectionStatus: "error",
        connectionError: errorMessage,
        lastConnectionTest: Date.now(),
        updatedAt: Date.now(),
      });

      return { success: false, message: errorMessage };
    }
  },
});
```

### 5. Environment Variable

Add to `.env.local.example`:

```bash
# BYOD (Bring Your Own Database)
# Generate with: openssl rand -hex 32
BYOD_ENCRYPTION_KEY=
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/convex/schema.ts` | Modify | Add `userDatabaseConfig` table |
| `/convex/lib/encryption.ts` | Create | AES-256-GCM encryption utilities |
| `/convex/byod/credentials.ts` | Create | Credential CRUD operations |
| `/convex/byod/testConnection.ts` | Create | Connection testing action |
| `.env.local.example` | Modify | Add `BYOD_ENCRYPTION_KEY` |

---

## Testing Criteria

- [ ] Encrypt/decrypt roundtrip produces original value
- [ ] Connection test validates Convex deployment URL format
- [ ] Connection test validates deploy key works
- [ ] Wrong encryption key causes decryption to fail (security)
- [ ] Credentials never returned to client (only status)
- [ ] Config persists across sessions
- [ ] Multiple save calls update existing config (no duplicates)

---

## Security Considerations

1. **Encryption Key Management**
   - Use strong key (32 bytes / 64 hex chars)
   - Rotate key requires re-encrypting all stored credentials
   - Never log the key or decrypted credentials

2. **Credential Access**
   - Only actions with Node runtime can decrypt
   - Queries never return encrypted fields
   - Use internalQuery/internalMutation for sensitive operations

3. **Validation**
   - Validate URL format before storing
   - Test connection before marking as "connected"
   - Store error messages for debugging (but sanitize)

---

## Next Phase

After completing Phase 1, proceed to [Phase 2: Schema Package](./phase-2-schema-package.md) to create the deployable schema for user Convex instances.
