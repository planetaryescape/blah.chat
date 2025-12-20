# Phase 5: Migration Pipeline

## Context

### What is BYOD?

BYOD allows users to store content on their own Convex instance. When we update the schema, we need to deploy those updates to all user instances.

### Overall Architecture

Each BYOD user has their own Convex instance with our schema. When schema changes:
1. Update `BYOD_SCHEMA_VERSION`
2. Create migration definition
3. Run migration across all instances

### Where This Phase Fits

```
Phase 1: Foundation ✓
Phase 2: Schema Package ✓
Phase 3: Deployment ✓
Phase 4: DAL Routing ✓
         │
         ▼
[Phase 5: Migrations] ◄── YOU ARE HERE
         │
         ▼
Phase 6: Settings UI
Phase 7: Error Handling
Phase 8: Documentation
```

**Dependencies**: Phase 3 (deployment), Phase 4 (routing)
**Unlocks**: Full BYOD functionality

---

## Goal

Handle schema updates across all BYOD user instances safely and reliably.

---

## Deliverables

### 1. Migration Status Schema

Add to `/convex/schema.ts`:

```typescript
byodMigrations: defineTable({
  userId: v.id("users"),
  migrationId: v.string(),     // e.g., "002_add_tags"
  version: v.number(),         // Schema version after migration
  status: v.union(
    v.literal("pending"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
    v.literal("skipped")
  ),
  error: v.optional(v.string()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_migration", ["migrationId"])
  .index("by_user_migration", ["userId", "migrationId"])
  .index("by_status", ["status"])
```

### 2. Migration Registry

Create `/convex/byod/migrations/index.ts`:

```typescript
import { migration001 } from "./001_initial";
import { migration002 } from "./002_add_tags";
// Import future migrations...

export interface Migration {
  id: string;
  version: number;
  name: string;
  description: string;
  up: (ctx: MigrationContext) => Promise<void>;
  down?: (ctx: MigrationContext) => Promise<void>;
}

export interface MigrationContext {
  userClient: ConvexHttpClient;
  mainClient: ConvexHttpClient;
  userId: string;
  clerkId: string;
}

// Registry of all migrations in order
export const MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  // Add future migrations here
];

// Get migrations after a specific version
export function getMigrationsAfter(version: number): Migration[] {
  return MIGRATIONS.filter((m) => m.version > version);
}

// Get a specific migration by ID
export function getMigration(id: string): Migration | undefined {
  return MIGRATIONS.find((m) => m.id === id);
}
```

### 3. Example Migrations

Create `/convex/byod/migrations/001_initial.ts`:

```typescript
import { Migration } from "./index";

export const migration001: Migration = {
  id: "001_initial",
  version: 1,
  name: "Initial Schema",
  description: "Deploy initial BYOD schema with all tables",

  up: async (ctx) => {
    // Initial deployment - schema already deployed in Phase 3
    // This migration just marks the version
    console.log(`Migration 001: Initial schema for user ${ctx.userId}`);

    // Verify tables exist
    const ping = await ctx.userClient.query(api.functions.ping);
    if (ping.version !== 1) {
      throw new Error("Schema version mismatch");
    }
  },

  down: async (ctx) => {
    // Cannot rollback initial migration
    throw new Error("Cannot rollback initial schema");
  },
};
```

Create `/convex/byod/migrations/002_add_tags.ts`:

```typescript
import { Migration } from "./index";

export const migration002: Migration = {
  id: "002_add_tags",
  version: 2,
  name: "Add Tags System",
  description: "Add tags table and junction tables for tagging",

  up: async (ctx) => {
    console.log(`Migration 002: Adding tags for user ${ctx.userId}`);

    // Schema changes are handled by redeployment
    // This migration handles any data transformations

    // Example: Migrate any existing data if needed
    // await ctx.userClient.mutation(api.migrations.transformData, {
    //   migrationId: "002_add_tags",
    // });
  },

  down: async (ctx) => {
    console.log(`Rollback 002: Removing tags for user ${ctx.userId}`);

    // Clean up any tag data
    // await ctx.userClient.mutation(api.migrations.cleanupTags);
  },
};
```

### 4. Migration Runner

Create `/convex/byod/migrationRunner.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { action, internalAction, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { getMigrationsAfter, MIGRATIONS, Migration } from "./migrations";
import { decryptCredential } from "../lib/encryption";
import { BYOD_SCHEMA_VERSION } from "../../src/lib/byod/version";

// Run migrations for a single user
export const runMigrationsForUser = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user's BYOD config
    const config = await ctx.runQuery(
      internal.byod.credentials.getConfigInternal,
      { userId: args.userId }
    );

    if (!config || config.connectionStatus !== "connected") {
      return { success: false, message: "User not BYOD or not connected" };
    }

    const currentVersion = config.schemaVersion || 0;
    const pendingMigrations = getMigrationsAfter(currentVersion);

    if (pendingMigrations.length === 0) {
      return { success: true, message: "Already up to date" };
    }

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

    // Create clients
    const userClient = new ConvexHttpClient(deploymentUrl);
    userClient.setAdminAuth(deployKey);
    const mainClient = new ConvexHttpClient(process.env.CONVEX_URL!);

    // Get user's clerk ID
    const user = await ctx.runQuery(internal.users.getById, {
      userId: args.userId,
    });

    const migrationCtx = {
      userClient,
      mainClient,
      userId: args.userId,
      clerkId: user?.clerkId || "",
    };

    // Run migrations in order
    for (const migration of pendingMigrations) {
      // Record migration start
      await ctx.runMutation(internal.byod.migrationRunner.recordMigrationStart, {
        userId: args.userId,
        migrationId: migration.id,
        version: migration.version,
      });

      try {
        // First, redeploy schema if needed
        if (migration.version > currentVersion) {
          await ctx.runAction(internal.byod.deploy.deployToUserInstance, {});
        }

        // Run migration logic
        await migration.up(migrationCtx);

        // Record success
        await ctx.runMutation(internal.byod.migrationRunner.recordMigrationComplete, {
          userId: args.userId,
          migrationId: migration.id,
        });

        // Update schema version
        await ctx.runMutation(internal.byod.credentials.updateConfig, {
          configId: config._id,
          schemaVersion: migration.version,
          updatedAt: Date.now(),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Record failure
        await ctx.runMutation(internal.byod.migrationRunner.recordMigrationFailed, {
          userId: args.userId,
          migrationId: migration.id,
          error: errorMessage,
        });

        return {
          success: false,
          message: `Migration ${migration.id} failed: ${errorMessage}`,
          failedAt: migration.id,
        };
      }
    }

    return {
      success: true,
      message: `Completed ${pendingMigrations.length} migrations`,
      newVersion: BYOD_SCHEMA_VERSION,
    };
  },
});

// Run migrations for all BYOD users (admin action)
export const runMigrationsForAll = action({
  args: {},
  handler: async (ctx) => {
    // Get all connected BYOD configs
    const configs = await ctx.runQuery(
      internal.byod.migrationRunner.getOutdatedConfigs,
      { targetVersion: BYOD_SCHEMA_VERSION }
    );

    const results = {
      total: configs.length,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [] as { userId: string; error: string }[],
    };

    for (const config of configs) {
      try {
        const result = await ctx.runAction(
          internal.byod.migrationRunner.runMigrationsForUser,
          { userId: config.userId }
        );

        if (result.success) {
          results.succeeded++;
        } else {
          results.failed++;
          results.errors.push({
            userId: config.userId,
            error: result.message,
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: config.userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  },
});

// Internal mutations for recording migration status
export const recordMigrationStart = internalMutation({
  args: {
    userId: v.id("users"),
    migrationId: v.string(),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if migration record exists
    const existing = await ctx.db
      .query("byodMigrations")
      .withIndex("by_user_migration", (q) =>
        q.eq("userId", args.userId).eq("migrationId", args.migrationId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "running",
        startedAt: Date.now(),
        error: undefined,
      });
    } else {
      await ctx.db.insert("byodMigrations", {
        userId: args.userId,
        migrationId: args.migrationId,
        version: args.version,
        status: "running",
        startedAt: Date.now(),
        createdAt: Date.now(),
      });
    }
  },
});

export const recordMigrationComplete = internalMutation({
  args: {
    userId: v.id("users"),
    migrationId: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("byodMigrations")
      .withIndex("by_user_migration", (q) =>
        q.eq("userId", args.userId).eq("migrationId", args.migrationId)
      )
      .first();

    if (record) {
      await ctx.db.patch(record._id, {
        status: "completed",
        completedAt: Date.now(),
      });
    }
  },
});

export const recordMigrationFailed = internalMutation({
  args: {
    userId: v.id("users"),
    migrationId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("byodMigrations")
      .withIndex("by_user_migration", (q) =>
        q.eq("userId", args.userId).eq("migrationId", args.migrationId)
      )
      .first();

    if (record) {
      await ctx.db.patch(record._id, {
        status: "failed",
        error: args.error,
        completedAt: Date.now(),
      });
    }
  },
});

// Query for outdated configs
export const getOutdatedConfigs = internalQuery({
  args: { targetVersion: v.number() },
  handler: async (ctx, args) => {
    const configs = await ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_status", (q) => q.eq("connectionStatus", "connected"))
      .collect();

    return configs.filter((c) => (c.schemaVersion || 0) < args.targetVersion);
  },
});
```

### 5. Migration Status Query

Add to `/convex/byod/credentials.ts`:

```typescript
// Get migration history for user
export const getMigrationHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("byodMigrations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// Get pending migrations count
export const getPendingMigrationsCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const config = await ctx.db
      .query("userDatabaseConfig")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!config) return 0;

    const currentVersion = config.schemaVersion || 0;
    return getMigrationsAfter(currentVersion).length;
  },
});
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/convex/schema.ts` | Modify | Add byodMigrations table |
| `/convex/byod/migrations/index.ts` | Create | Migration registry |
| `/convex/byod/migrations/001_initial.ts` | Create | Initial migration |
| `/convex/byod/migrations/002_add_tags.ts` | Create | Example migration |
| `/convex/byod/migrationRunner.ts` | Create | Migration executor |
| `/convex/byod/credentials.ts` | Modify | Add migration queries |
| `/src/lib/byod/version.ts` | Modify | Update when adding migrations |

---

## Testing Criteria

- [ ] Migrations run in correct order
- [ ] Failed migration stops chain
- [ ] Migration status recorded correctly
- [ ] Batch migration works for all users
- [ ] Idempotent (safe to re-run)
- [ ] Rollback works for migrations with `down`
- [ ] Schema version updates on success
- [ ] Errors are descriptive and logged

---

## Adding New Migrations

When schema changes are needed:

1. **Increment version** in `/src/lib/byod/version.ts`:
```typescript
export const BYOD_SCHEMA_VERSION = 2; // Was 1
```

2. **Create migration file**:
```typescript
// /convex/byod/migrations/002_new_feature.ts
export const migration002: Migration = {
  id: "002_new_feature",
  version: 2,
  name: "Add New Feature",
  description: "...",
  up: async (ctx) => { ... },
  down: async (ctx) => { ... }, // Optional
};
```

3. **Register migration**:
```typescript
// /convex/byod/migrations/index.ts
import { migration002 } from "./002_new_feature";
export const MIGRATIONS = [migration001, migration002];
```

4. **Deploy main app** - This updates schema generator

5. **Run batch migration**:
```typescript
await ctx.runAction(internal.byod.migrationRunner.runMigrationsForAll, {});
```

---

## Error Recovery

| Error | Cause | Resolution |
|-------|-------|------------|
| "Migration X failed" | Bug in migration logic | Fix migration, retry |
| "Connection failed" | User's instance unreachable | Mark as error, notify user |
| "Schema mismatch" | Deploy failed | Retry deployment, then migration |
| "Timeout" | Long migration | Increase timeout or chunk work |

---

## Next Phase

After completing Phase 5, proceed to [Phase 6: Settings UI](./phase-6-settings-ui.md) to build the user configuration interface.
