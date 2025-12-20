# BYOD (Bring Your Own Database) Implementation

## Overview

BYOD allows users to connect their own Convex instance for storing personal content (conversations, messages, memories, files) while app operations remain on the main blah.chat Convex instance.

## Architecture

**Two-Database Model:**
- **Main DB**: users, userPreferences, templates, adminSettings, feedback, shares, notifications
- **User's DB**: conversations, messages, memories, files, projects, notes, bookmarks, tasks, usageRecords

**Auth**: Same Clerk app (shared JWT, simpler setup)

## Phase Overview

| Phase | Name | Description | Dependencies |
|-------|------|-------------|--------------|
| 1 | [Foundation](./phase-1-foundation.md) | Schema + credential encryption | None |
| 2 | [Schema Package](./phase-2-schema-package.md) | Deployable schema for user instances | Phase 1 |
| 3 | [Deployment](./phase-3-deployment.md) | Deploy schema to user's Convex | Phase 1, 2 |
| 4 | [DAL Routing](./phase-4-dal-routing.md) | Dual-database query routing | Phase 1, 3 |
| 5 | [Migrations](./phase-5-migrations.md) | Schema updates across instances | Phase 3, 4 |
| 6 | [Settings UI](./phase-6-settings-ui.md) | User configuration interface | Phase 1, 3 |
| 7 | [Error Handling](./phase-7-error-handling.md) | Connection monitoring + blocking | Phase 4, 6 |
| 8 | [Documentation](./phase-8-documentation.md) | User docs + premium gate | Phase 6 |

## Implementation Order

```
Phase 1 ─────────┐
                 │
Phase 2 ─────────┼──► Phase 3 ──┐
                 │               │
                 │               ▼
                 ├──► Phase 4 ───┼──► Phase 7
                 │               │
Phase 6 ◄────────┘               │
                                 │
Phase 5 ◄────────────────────────┘

Phase 8 (anytime after Phase 6)
```

## Key Decisions

1. **Credentials**: Encrypted with AES-256-GCM, stored in Convex
2. **Error Handling**: Block app until connection resolved
3. **Disconnect Options**: User chooses (keep/migrate/delete data)
4. **Availability**: Anyone now, premium-gatable later
5. **Deployment**: Shell to `npx convex deploy`
6. **Storage Files**: Keep on main DB for now

## Quick Links

- [User-facing documentation](../features/bring-your-own-database.md)
- [API reference](../api/byod.md)
