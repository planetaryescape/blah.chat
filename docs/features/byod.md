# Bring Your Own Database (BYOD)

**Status**: Production
**Last Updated**: December 2025

---

## Overview

BYOD allows you to store your conversations, messages, memories, and files on your own Convex database instance. This gives you:

- **Data ownership**: Your data lives on infrastructure you control
- **Direct export access**: Export anytime via Convex dashboard
- **Transparency**: See exactly what's stored
- **Cost transparency**: You pay your own Convex usage

### Who Should Use This

BYOD is designed for technically-apt users who:
- Want full control over their data storage
- Are comfortable creating and managing a Convex account
- Understand the implications of self-managed infrastructure

For most users, our standard cloud offering provides a simpler experience with the same privacy protections.

---

## How It Works

### Two-Database Architecture

When you enable BYOD, blah.chat uses two databases:

| Database | What's Stored | Why |
|----------|---------------|-----|
| **blah.chat's Convex** | users, userPreferences, templates, adminSettings, feedback, shares, notifications, userDatabaseConfig, byodMigrations | App operations, user management, BYOD config storage |
| **Your Convex** | conversations, messages, memories, files, projects, notes, tasks, bookmarks, tags, usageRecords, presentations | User-generated content |

### Authentication

Same Clerk app for both databases. Users don't need separate auth setup - your Clerk JWT works across both instances.

### Data Flow

1. You send a message
2. Message processed through blah.chat servers (AI, memory extraction, etc.)
3. Message stored on your Convex instance
4. Response streamed back and stored on your instance

**Key point**: Data flows through blah.chat for processing but is only persisted on your instance.

---

## Setup Guide

### Prerequisites

1. **Convex Account** (free tier works) - [convex.dev](https://convex.dev)
2. **New Convex Project** - Create specifically for blah.chat (don't use existing projects)
3. **Deploy Key** - Found in Convex Dashboard → Settings → Deploy Key

### Step-by-Step Setup

**Step 1: Create Convex Project**
1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Click "Create Project"
3. Name it something like "blahchat-data"
4. Select a region close to you

**Step 2: Get Your Deploy Key**
1. Open your project in Convex dashboard
2. Go to Settings → Deploy Key
3. Click "Generate Deploy Key"
4. Copy the key (starts with `prod:`)

**Step 3: Configure in blah.chat**
1. Go to Settings → Database
2. Click "Configure BYOD"
3. Enter your Convex deployment URL (e.g., `https://your-project.convex.cloud`)
4. Paste your deploy key
5. Click "Test Connection"

**Step 4: Deploy Schema**
If the connection test passes:
1. Click "Save & Deploy"
2. Wait for deployment to complete (1-2 minutes)
3. You're done! Your data now goes to your Convex instance.

---

## Key Implementation Decisions

### Credential Storage
- **Decision**: AES-256-GCM encryption stored in Convex
- **Rationale**: Standard symmetric encryption, stored alongside config for simplicity
- **Environment variable**: `BYOD_ENCRYPTION_KEY` (generate with `openssl rand -hex 32`)

### Error Handling Strategy
- **Decision**: Block app until connection resolved
- **Rationale**: Safest approach for data integrity. Silent failures or fallbacks could cause data loss or inconsistency.
- **Implementation**: `ConnectionBlocker` component wraps authenticated app content

### Disconnect Options
Users choose what happens to data:
- **Keep**: Data stays on their instance, accessible via Convex dashboard
- **Migrate**: Copy data back to blah.chat's DB
- **Delete**: Permanently remove from their instance

### Deployment Approach
- **Decision**: Shell to `npx convex deploy` with user's deploy key
- **Alternative considered**: Convex HTTP API - more complex, less reliable
- **Fallback**: Downloadable project for manual deployment if automated fails

### userId in BYOD Schema
- **Decision**: Use Clerk ID (string) not Convex ID
- **Rationale**: Users table is on main DB, so can't reference `v.id("users")` in BYOD schema

---

## File Structure

```
convex/
├── byod/
│   ├── credentials.ts    # Credential CRUD, config queries
│   ├── deploy.ts         # Schema deployment to user instances
│   ├── disconnect.ts     # Disconnect actions (migrate, delete)
│   ├── healthCheck.ts    # Connection health monitoring
│   ├── migrationRunner.ts # Run migrations across instances
│   └── migrations/       # Individual migration definitions

src/lib/
├── byod/
│   ├── version.ts        # BYOD_SCHEMA_VERSION constant
│   ├── router.ts         # TABLE_LOCATIONS mapping
│   ├── schemaGenerator.ts # Generate deployable schema files
│   ├── downloadProject.ts # Fallback downloadable project
│   └── schema/           # BYOD table definitions

src/components/
├── byod/
│   └── ConnectionBlocker.tsx  # Blocking UI when connection fails
└── settings/
    └── BYODSettings.tsx       # Settings UI (single file pattern)

src/lib/api/dal/
└── byod.ts                    # BYOD data access layer
```

---

## DAL Routing

The `router.ts` file defines which tables live on which database:

```typescript
// Main DB tables
users, userPreferences, templates, adminSettings, feedback, shares, notifications, userDatabaseConfig, byodMigrations

// User DB tables
conversations, messages, memories, files, projects, notes, tasks, bookmarks, tags, usageRecords, presentations
```

When a query/mutation runs:
1. Check table name against `TABLE_LOCATIONS`
2. If "main", use main client
3. If "user", check BYOD config
4. If BYOD connected, use user's client; otherwise use main

---

## Migration System

When schema changes:

1. Increment `BYOD_SCHEMA_VERSION` in `version.ts`
2. Create migration file in `convex/byod/migrations/`
3. Register in `migrations/index.ts`
4. Deploy main app (updates schema generator)
5. Run `runMigrationsForAll` action (can be triggered from admin dashboard)

Migrations are tracked per-user in `byodMigrations` table with status: pending → running → completed/failed.

---

## Health Monitoring

- **Cron job**: Every 5 minutes checks all connected instances
- **On failure**: Updates connection status to "error", sends admin alert email
- **User experience**: App blocks with clear error UI and retry button

---

## Connection Issues

### What Happens When Connection Fails

1. **App blocks** - You'll see a connection error screen
2. **Data protected** - No operations proceed that could lose data
3. **Retry available** - One-click retry to test connection again

### Why We Block

We block rather than fail silently to:
- Prevent data loss
- Ensure data integrity
- Make issues obvious and fixable

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Invalid deploy key | Key expired or revoked | Generate new key in Convex dashboard |
| Connection timeout | Network issues | Check your internet, retry |
| Schema mismatch | Failed migration | Wait for auto-retry or contact support |
| Project paused | Convex paused inactive project | Resume in Convex dashboard |

---

## Cost Implications

### Your Convex Costs
You pay for your own Convex usage:
- Free tier: Generous limits for personal use
- Pro tier: Needed for heavier usage
- See [Convex pricing](https://convex.dev/pricing)

### What You Save
You don't pay blah.chat for storage, vector embeddings, or message history retention.

---

## Data Export

With BYOD, you have direct access to your data:
1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Open your blah.chat project
3. Click "Data" to browse tables
4. Use "Export" to download data (JSON, CSV)

No permission needed from blah.chat. You have the credentials and direct dashboard access.

---

## Feature Flags

In `src/lib/features.ts`:
- `BYOD_REQUIRES_PREMIUM`: Gate behind subscription (currently false)
- `BYOD_ENABLED`: Kill switch
- `BYOD_REALTIME`: Experimental WebSocket support
- `BYOD_FILE_STORAGE`: File migration to user storage

---

## Security Considerations

1. **Credentials**: Only decrypted server-side in Node actions, never returned to client
2. **Deploy key scope**: Has admin access to user's Convex project
3. **Temp files**: Deployment creates temp project dir, cleaned up immediately after
4. **Logging**: Never log credentials or decrypted values

---

## Limitations

### Current Limitations
1. **File storage** - Files currently stored on blah.chat's storage (migration planned)
2. **Schema updates** - Deployed by blah.chat, you can't modify schema
3. **Connection required** - App blocks if your instance unreachable

### Feature Parity
BYOD users have access to all features: AI models, memory system, search, projects, voice, file uploads.

---

## FAQ

**Is my data really private?**
Your content is stored only on your Convex instance. It flows through blah.chat servers for processing but isn't stored on our infrastructure.

**Can blah.chat access my data?**
Technically, yes - you gave us credentials. Practically, we don't have reason to and don't want to. You can monitor access in Convex logs and rotate credentials periodically.

**What if blah.chat shuts down?**
Your data is on your Convex instance. You can export via Convex dashboard or access directly with Convex SDK.

**Can I use an existing Convex project?**
We recommend a dedicated project for blah.chat. Using an existing project could cause schema conflicts.

**How do schema updates work?**
We push updates to all BYOD instances, migrations run automatically, your data is preserved. You may see brief connection issues during updates.

---

## Testing Checklist

- [ ] Encrypt/decrypt roundtrip works
- [ ] Connection test validates credentials
- [ ] Deployment creates valid schema
- [ ] Vector indexes functional (1536 dimensions)
- [ ] Queries route to correct database
- [ ] Connection blocker shows on error
- [ ] Retry reconnects successfully
- [ ] Disconnect options work (keep/migrate/delete)
- [ ] Health check cron runs
- [ ] Admin dashboard shows accurate stats
