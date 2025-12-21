# Bring Your Own Database (BYOD)

Technical documentation for the BYOD feature allowing users to connect their own Convex instance.

## Overview

BYOD enables users to store personal content (conversations, messages, memories, files) on their own Convex instance while app operations remain on blah.chat's main Convex instance.

**User Benefits:**
- Data ownership (stored on infrastructure they control)
- Direct export access via Convex dashboard
- Cost transparency (they pay their own Convex usage)

## Architecture

### Two-Database Model

| Database | Tables | Rationale |
|----------|--------|-----------|
| **Main DB** (blah.chat) | users, userPreferences, templates, adminSettings, feedback, shares, notifications, userDatabaseConfig, byodMigrations | App operations, user management, BYOD config storage |
| **User's DB** | conversations, messages, memories, files, projects, notes, tasks, bookmarks, tags, usageRecords, presentations | User-generated content |

### Authentication

Same Clerk app for both databases. Users don't need separate auth setup - their Clerk JWT works across both instances.

### Data Flow

1. User sends message
2. Message processed through blah.chat servers (AI, memory extraction, etc.)
3. Message stored on user's Convex instance
4. Response streamed back and stored on user's instance

**Key point**: Data flows through blah.chat for processing but is only persisted on the user's instance.

## Key Implementation Decisions

### 1. Credential Storage
- **Decision**: AES-256-GCM encryption stored in Convex
- **Rationale**: Standard symmetric encryption, stored alongside config for simplicity
- **Environment variable**: `BYOD_ENCRYPTION_KEY` (generate with `openssl rand -hex 32`)

### 2. Error Handling Strategy
- **Decision**: Block app until connection resolved
- **Rationale**: Safest approach for data integrity. Silent failures or fallbacks could cause data loss or inconsistency.
- **Implementation**: `ConnectionBlocker` component wraps authenticated app content

### 3. Disconnect Options
Users choose what happens to data:
- **Keep**: Data stays on their instance, accessible via Convex dashboard
- **Migrate**: Copy data back to blah.chat's DB
- **Delete**: Permanently remove from their instance

### 4. Deployment Approach
- **Decision**: Shell to `npx convex deploy` with user's deploy key
- **Alternative considered**: Convex HTTP API - more complex, less reliable
- **Fallback**: Downloadable project for manual deployment if automated fails

### 5. File Storage
- **Current**: Files remain on main DB
- **Future**: Migrate to user's Convex storage (tracked in features.ts flags)

### 6. Real-time Subscriptions
- **Current**: HTTP polling for BYOD users
- **Future**: WebSocket connections to user's instance (experimental flag exists)

### 7. userId in BYOD Schema
- **Decision**: Use Clerk ID (string) not Convex ID
- **Rationale**: Users table is on main DB, so can't reference `v.id("users")` in BYOD schema

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
│       ├── index.ts      # Migration registry
│       └── 001_initial.ts # etc.

src/lib/
├── byod/
│   ├── version.ts        # BYOD_SCHEMA_VERSION constant
│   ├── router.ts         # TABLE_LOCATIONS mapping
│   ├── schemaGenerator.ts # Generate deployable schema files
│   ├── downloadProject.ts # Fallback downloadable project
│   └── schema/           # BYOD table definitions
│       ├── index.ts
│       ├── conversations.ts
│       ├── messages.ts
│       └── ...

src/components/
├── byod/
│   └── ConnectionBlocker.tsx  # Blocking UI when connection fails
└── settings/
    └── BYODSettings.tsx       # Settings UI (single file pattern)

src/lib/api/dal/
└── byod.ts                    # BYOD data access layer

src/lib/hooks/queries/
└── useBYODConfig.tsx          # BYOD React hook
```

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

## Migration System

When schema changes:

1. Increment `BYOD_SCHEMA_VERSION` in `version.ts`
2. Create migration file in `convex/byod/migrations/`
3. Register in `migrations/index.ts`
4. Deploy main app (updates schema generator)
5. Run `runMigrationsForAll` action (can be triggered from admin dashboard)

Migrations are tracked per-user in `byodMigrations` table with status: pending → running → completed/failed.

## Health Monitoring

- **Cron job**: Every 5 minutes checks all connected instances
- **On failure**: Updates connection status to "error", sends admin alert email
- **User experience**: App blocks with clear error UI and retry button

## Admin Dashboard

Located at `/admin/byod`:
- Total/connected/error instance counts
- Pending migrations count
- Instance list with status, schema version, last check, errors
- Actions: Check health, Run migrations

## Settings UI

Single-file pattern (`BYODSettings.tsx`) with inline sub-components:
- `ConfigForm`: URL + deploy key input, test connection, deploy
- `ConnectionStatusCard`: Current status display
- `DisconnectDialog`: Three-option disconnect flow

**UI Flow**:
1. User enters Convex URL and deploy key
2. Click "Test Connection" - validates credentials
3. If success, click "Save & Deploy"
4. Schema deploys to their instance (~1-2 min)
5. Status shows "Connected"

## Feature Flags

In `src/lib/features.ts`:
- `BYOD_REQUIRES_PREMIUM`: Gate behind subscription (currently false)
- `BYOD_ENABLED`: Kill switch
- `BYOD_REALTIME`: Experimental WebSocket support
- `BYOD_FILE_STORAGE`: File migration to user storage

## Security Considerations

1. **Credentials**: Only decrypted server-side in Node actions, never returned to client
2. **Deploy key scope**: Has admin access to user's Convex project
3. **Temp files**: Deployment creates temp project dir, cleaned up immediately after
4. **Logging**: Never log credentials or decrypted values

## Future Enhancements

Tracked but not implemented:
1. **File storage migration** - Move files to user's Convex storage
2. **Real-time subscriptions** - WebSocket to user's instance
3. **Multi-region support** - User chooses Convex region
4. **Backup/restore tools** - User data backup utilities
5. **Usage analytics** - Show users their Convex usage stats

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Invalid deploy key | Key expired/revoked | Regenerate in Convex dashboard |
| Connection timeout | Network or Convex issue | Check status.convex.dev, retry |
| Schema mismatch | Migration failed | Wait for auto-retry or manual redeploy |
| Project paused | Convex pauses inactive free projects | Resume in Convex dashboard |

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
