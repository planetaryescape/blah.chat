# Phase 2 Migration: Execution Guide

## Quick Start

### Step 1: Pre-Verification

**Open Convex Dashboard** → Functions → Run Query

```typescript
// Run this query:
internal.migrations.verify_phase2.checkMigrationState

// Expected output (if not run yet):
{
  summary: {
    sources: 0,
    sourceMetadata: 0,
    messagesWithLegacySources: <count>,
    migrationStatus: "not_started"
  },
  recommendation: "Run migrations: migrateMetadata → migrateSources"
}
```

---

### Step 2: Run Metadata Backfill

**Convex Dashboard** → Functions → Run Action

```typescript
// Action to run:
internal.migrations.002_normalize_message_sources_actions.migrateMetadata

// No arguments needed
{}
```

**Expected console output:**
```
🚀 Starting Phase 2: Message Sources & Metadata - Phase 1: Metadata Backfill
   Migration ID: 002_normalize_message_sources
✅ Migration initialized (Phase 1: Metadata)
   Batch 1: 100 messages (15 created, 0 updated)
   Batch 2: 100 messages (12 created, 0 updated)
   ...
🎉 Phase 1 complete!
   Messages processed: X
   Metadata created: Y
   Duration: Zs
```

**If it fails:** Migration is idempotent - safe to re-run

---

### Step 3: Run Sources Backfill

**Convex Dashboard** → Functions → Run Action

```typescript
// Action to run:
internal.migrations.002_normalize_message_sources_actions.migrateSources

// No arguments needed
{}
```

**Expected console output:**
```
🚀 Starting Phase 2: Message Sources & Metadata - Phase 2: Sources Backfill
   Migration ID: 002_normalize_message_sources
   Batch 1: 100 messages (45 sources)
   Batch 2: 100 messages (38 sources)
   ...
🎉 Phase 2 complete!
   Messages processed: X
   Sources created: Y
   Duration: Zs
```

---

### Step 4: Verify Migration Success

**Convex Dashboard** → Functions → Run Query

```typescript
// Run this query:
internal.migrations.verify_phase2.verifySourcesMigration

// Check output:
{
  summary: {
    messagesWithSources: X,
    sourcesCreated: Y,
    metadataCreated: Z,
    deduplicationRatio: "XX%",  // Should be 20-50% typically
    enrichmentRate: "XX%"        // Increases over time (async)
  },
  sampleChecks: [
    { messageId: "...", legacyCount: 3, newCount: 3, match: true },
    ...
  ],
  integrityCheck: {
    allSamplesMatch: true,
    passed: "✅ All samples matched"
  }
}
```

**Success criteria:**
- ✅ `integrityCheck.passed` shows "✅ All samples matched"
- ✅ `deduplicationRatio` > 0% (confirms deduplication working)
- ✅ `sourcesCreated` ≈ sum of all legacy sources across messages

---

### Step 5: Check Deduplication

**Convex Dashboard** → Functions → Run Query

```typescript
// Run this query:
internal.migrations.verify_phase2.verifyDeduplication

// Check output:
{
  summary: {
    totalMetadata: Z,
    deduplicatedUrls: X,  // URLs referenced multiple times
    avgAccessCount: Y     // Should be > 1.0 if deduplication working
  },
  topDuplicates: [
    { url: "...", domain: "example.com", accessCount: 5, enriched: true },
    ...
  ],
  deduplicationWorking: "✅ Deduplication confirmed"
}
```

---

## UI Verification

### Test in Browser

1. **Find message with sources**
   - Run Perplexity query in your app
   - Or find existing message with citations

2. **Check source display**
   - [ ] Citation numbers [1], [2], [3] visible in message
   - [ ] Source cards appear at bottom
   - [ ] Favicons load (may take 5-10s for enrichment)
   - [ ] Click citation → smooth scroll to source card
   - [ ] Click source card → opens URL in new tab

3. **Check browser console**
   - [ ] No errors
   - [ ] Source query returns `source: "normalized"` (not "legacy")

---

## Troubleshooting

### Migration fails with timeout
**Cause:** Too many messages for 10min action limit

**Solution:** Migration uses cursor-based pagination - just re-run the same action. It will resume from where it left off.

### Sample checks don't match
**Cause:** Migration logic error or data inconsistency

**Solution:**
1. Check migration logs for errors
2. Run this cleanup query to delete migrated data:
   ```typescript
   // In Convex Dashboard
   const sources = await ctx.db.query("sources").collect();
   for (const s of sources) await ctx.db.delete(s._id);

   const metadata = await ctx.db.query("sourceMetadata").collect();
   for (const m of metadata) await ctx.db.delete(m._id);
   ```
3. Re-run migrations from Step 2

### Deduplication ratio is 0%
**Cause:** No URLs are referenced multiple times (low usage)

**This is okay!** Deduplication is an optimization. With low usage, might not see duplicates yet.

---

## Next Steps After Migration

Once migration verified successful:

### Immediate (Same Day)
- ✅ Create new Perplexity query
- ✅ Verify dual-write: sources in BOTH legacy arrays AND normalized tables
- ✅ Monitor for any errors in production

### After 24h
- 🔄 Proceed to Phase D: Remove dual-write code
- 🔄 Deploy code cleanup changes

### After 7 days
- ⚠️ Proceed to Phase E: Remove schema fields (IRREVERSIBLE)

---

## Manual Migration Commands Reference

All commands assume you're in Convex Dashboard → Functions tab

### Pre-verification
```
internal.migrations.verify_phase2.checkMigrationState
```

### Migration execution
```
internal.migrations.002_normalize_message_sources_actions.migrateMetadata
internal.migrations.002_normalize_message_sources_actions.migrateSources
```

### Post-verification
```
internal.migrations.verify_phase2.verifySourcesMigration
internal.migrations.verify_phase2.verifyDeduplication
```

---

## Timeline

| Step | Duration | Can Pause? |
|------|----------|------------|
| Pre-verification | 5 min | ✅ |
| Metadata backfill | 5-30 min | ❌ (but resumable) |
| Sources backfill | 5-30 min | ❌ (but resumable) |
| Verification | 10 min | ✅ |
| **Total** | **25-75 min** | |

**Note:** Actual duration depends on number of messages with sources in your database.
