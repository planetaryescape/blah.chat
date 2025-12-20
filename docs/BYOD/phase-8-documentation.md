# Phase 8: Documentation + Premium Gate

## Context

### What is BYOD?

BYOD allows users to store content on their own Convex instance. This phase completes the feature with comprehensive documentation and prepares for premium tier restriction.

### Where This Phase Fits

```
Phase 1: Foundation ✓
Phase 2: Schema Package ✓
Phase 3: Deployment ✓
Phase 4: DAL Routing ✓
Phase 5: Migrations ✓
Phase 6: Settings UI ✓
Phase 7: Error Handling ✓
         │
         ▼
[Phase 8: Documentation] ◄── YOU ARE HERE (FINAL)
```

**Dependencies**: Phase 6 (settings UI)
**Unlocks**: Production-ready BYOD feature

---

## Goal

Create comprehensive documentation and prepare the feature for premium tier restriction.

---

## Deliverables

### 1. User-Facing Documentation

Create `/docs/features/bring-your-own-database.md`:

```markdown
# Bring Your Own Database (BYOD)

## Overview

BYOD allows you to store your conversations, messages, memories, and files on your own Convex database instance. This gives you:

- **Data ownership**: Your data lives on infrastructure you control
- **Direct export access**: Export anytime via Convex dashboard
- **Transparency**: See exactly what's stored

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
| **blah.chat's Convex** | Account info, settings, templates | App operations that need to be on our infrastructure |
| **Your Convex** | Conversations, messages, memories, files, projects, notes | Your personal content |

### Authentication

You don't need a separate authentication setup. blah.chat uses the same Clerk authentication for both databases. Your session works seamlessly across both.

### Data Flow

1. You send a message
2. Message is processed through blah.chat servers (for AI features)
3. Message is stored on your Convex instance
4. Response is streamed back and also stored on your instance

**Important**: Your data flows through blah.chat servers for processing (AI, search, etc.) but is only stored on your Convex instance.

---

## Prerequisites

Before setting up BYOD, you'll need:

1. **Convex Account** (free tier works)
   - Sign up at [convex.dev](https://convex.dev)
   - No credit card required for free tier

2. **New Convex Project**
   - Create a project specifically for blah.chat
   - Don't use an existing project with other data

3. **Deploy Key**
   - Found in Convex Dashboard → Settings → Deploy Key
   - This gives blah.chat permission to deploy and manage schema

---

## Setup Guide

### Step 1: Create Convex Project

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Click "Create Project"
3. Name it something like "blahchat-data"
4. Select a region close to you

### Step 2: Get Your Deploy Key

1. Open your project in Convex dashboard
2. Go to Settings → Deploy Key
3. Click "Generate Deploy Key"
4. Copy the key (starts with `prod:`)

### Step 3: Configure in blah.chat

1. Go to Settings → Database
2. Click "Configure BYOD"
3. Enter your Convex deployment URL (e.g., `https://your-project.convex.cloud`)
4. Paste your deploy key
5. Click "Test Connection"

### Step 4: Deploy Schema

If the connection test passes:

1. Click "Save & Deploy"
2. Wait for deployment to complete (1-2 minutes)
3. You're done! Your data now goes to your Convex instance.

---

## What Happens to Your Data

### Where Data Goes

After enabling BYOD:

| Data Type | Location |
|-----------|----------|
| Conversations | Your Convex |
| Messages | Your Convex |
| Memories | Your Convex |
| Files | Your Convex |
| Projects | Your Convex |
| Notes | Your Convex |
| Tasks | Your Convex |
| Usage records | Your Convex |
| Account info | blah.chat's Convex |
| Settings/preferences | blah.chat's Convex |
| Templates | blah.chat's Convex |

### Processing vs Storage

Your data flows through blah.chat for:
- AI model calls (we don't store prompts/responses beyond your instance)
- Memory extraction (processes then stores on your instance)
- Search indexing (indexes on your instance)

We don't keep copies of your content on our servers.

### Encryption

- Your Convex credentials are encrypted with AES-256-GCM
- Encryption keys are never logged or exposed
- Credentials are only decrypted when needed for operations

---

## Disconnecting BYOD

When you disconnect, you have three options:

### Option 1: Keep Data on Your Instance

- **Best for**: Temporary disconnects, wanting to reconnect later
- **What happens**: Data stays on your Convex, you can access via dashboard
- **Data access**: Via Convex dashboard or reconnecting to blah.chat

### Option 2: Migrate Back to blah.chat

- **Best for**: Switching to standard cloud offering
- **What happens**: All data copied back to blah.chat servers
- **Time**: May take several minutes depending on data size

### Option 3: Delete Data

- **Best for**: Complete removal, starting fresh
- **What happens**: All data permanently deleted from your Convex
- **Warning**: This cannot be undone

---

## Connection Issues

### What Happens When Connection Fails

If blah.chat can't reach your Convex instance:

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

### blah.chat Costs

BYOD may be a premium feature in the future. Currently available to all users.

### What You Save

You don't pay blah.chat for:
- Storage of your content
- Vector embeddings storage
- Message history retention

---

## Data Export

### Direct Access

With BYOD, you have direct access to your data:

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Open your blah.chat project
3. Click "Data" to browse tables
4. Use "Export" to download data

### Export Formats

Convex supports exporting to:
- JSON
- CSV (via transformation)

### No Permission Needed

You don't need to ask blah.chat to export your data. You have the credentials and direct dashboard access.

---

## Limitations

### Current Limitations

1. **File storage** - Files currently stored on blah.chat's storage (migration planned)
2. **Schema updates** - Deployed by blah.chat, you can't modify schema
3. **Connection required** - App blocks if your instance unreachable

### Feature Parity

BYOD users have access to all features:
- All AI models
- Memory system
- Search
- Projects/organization
- Voice input/output
- File uploads

---

## Troubleshooting

### "Invalid deploy key"

**Cause**: Key expired, revoked, or incorrectly copied

**Fix**:
1. Go to Convex dashboard → Settings → Deploy Key
2. Generate a new key
3. Update in blah.chat Settings → Database

### "Connection timeout"

**Cause**: Network issues or Convex service problem

**Fix**:
1. Check [status.convex.dev](https://status.convex.dev)
2. Check your internet connection
3. Try the "Retry" button
4. If persistent, regenerate deploy key

### "Schema mismatch"

**Cause**: Migration failed to complete

**Fix**:
1. Wait 5 minutes for auto-retry
2. If still failing, contact support
3. We may need to manually redeploy schema

### "Project paused"

**Cause**: Convex pauses inactive free-tier projects

**Fix**:
1. Go to Convex dashboard
2. Open your project
3. Click "Resume" if paused
4. Retry connection in blah.chat

---

## FAQ

### Is my data really private?

Your content is stored only on your Convex instance. It flows through blah.chat servers for processing but isn't stored on our infrastructure.

### Can blah.chat access my data?

Technically, yes - you gave us credentials. Practically, we don't have reason to and don't want to. If you're concerned, you can:
- Monitor access in Convex logs
- Rotate credentials periodically
- Self-host for complete isolation

### What if blah.chat shuts down?

Your data is on your Convex instance. You can:
- Export via Convex dashboard
- Access directly with Convex SDK
- Migrate to another app

### Can I use an existing Convex project?

We recommend a dedicated project for blah.chat. Using an existing project could cause schema conflicts.

### How do schema updates work?

When we update the schema:
1. We push updates to all BYOD instances
2. Migrations run automatically
3. Your data is preserved
4. You may see brief connection issues during updates

---

## Support

For BYOD-specific issues:
- Check this documentation first
- Try the troubleshooting steps
- Contact support with your error message

Note: BYOD is designed for technically-apt users. We provide documentation but limited hands-on support for Convex-specific issues.
```

### 2. Premium Gate Hook

Create `/src/lib/hooks/useBYODAccess.ts`:

```typescript
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Feature flag - flip to true when ready to restrict
const BYOD_REQUIRES_PREMIUM = false;

export function useBYODAccess() {
  const { user } = useUser();

  // If premium not required, everyone has access
  if (!BYOD_REQUIRES_PREMIUM) {
    return {
      hasAccess: true,
      showUpgradePrompt: false,
      upgradeUrl: null,
    };
  }

  // TODO: Check subscription status when billing is implemented
  // const subscription = useQuery(api.billing.getSubscription);
  // const isPremium = subscription?.tier === "premium";

  const isPremium = false; // Placeholder

  return {
    hasAccess: isPremium,
    showUpgradePrompt: !isPremium,
    upgradeUrl: "/pricing?feature=byod",
  };
}
```

### 3. Feature Flag

Create `/src/lib/features.ts`:

```typescript
/**
 * Feature flags for blah.chat
 * These control access to various features
 */

export const FEATURES = {
  // BYOD requires premium subscription
  BYOD_REQUIRES_PREMIUM: false,

  // Enable BYOD feature at all (kill switch)
  BYOD_ENABLED: true,

  // Enable real-time subscriptions for BYOD (experimental)
  BYOD_REALTIME: false,

  // Enable file storage migration to BYOD
  BYOD_FILE_STORAGE: false,
} as const;

export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature];
}
```

---

## Files to Create

| File | Description |
|------|-------------|
| `/docs/features/bring-your-own-database.md` | User documentation |
| `/docs/api/byod.md` | API reference (optional) |
| `/src/lib/hooks/useBYODAccess.ts` | Access control hook |
| `/src/lib/features.ts` | Feature flags |

---

## Implementation Checklist

Before marking BYOD as production-ready:

- [ ] All phase documentation complete
- [ ] User documentation reviewed for clarity
- [ ] Error messages are helpful and actionable
- [ ] Settings UI tested on mobile
- [ ] Health check cron job running
- [ ] Admin dashboard functional
- [ ] Premium gate hook ready (even if not enabled)
- [ ] Monitoring/alerting in place

---

## Future Enhancements

After initial release:

1. **File storage migration** - Move files to user's Convex storage
2. **Real-time subscriptions** - WebSocket connections to user's instance
3. **Multi-region support** - Let users choose Convex region
4. **Backup/restore** - Tools for backing up BYOD data
5. **Usage analytics** - Show users their Convex usage

---

## Conclusion

Phase 8 completes the BYOD feature. With all phases implemented:

1. Users can connect their Convex instance
2. Schema deploys automatically
3. Data routes correctly
4. Migrations run automatically
5. Errors are handled gracefully
6. Documentation guides users

The feature is now production-ready.
