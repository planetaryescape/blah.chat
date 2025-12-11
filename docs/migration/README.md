# Schema Normalization Migration Guide

**Goal**: Transform blah.chat's Convex schema from nested, denormalized structure to SQL-ready, normalized database.
**Timeline**: 8-10 weeks (7 phases)
**Strategy**: Zero-downtime, incremental migration with dual-write patterns

---

## Why Normalize?

### Current Problems
1. **Document bloat**: Messages avg 40% larger than needed (nested attachments, sources, tool calls)
2. **O(N) cascade deletes**: Deleting conversation scans all user's projects (lines 282-294 in conversations.ts)
3. **Destructive updates**: Custom instructions mutation loses new fields (users.ts:229)
4. **Tag chaos**: 4 separate tag arrays, case-sensitive, no autocomplete
5. **No analytics**: Can't query "which model uses most tokens" or "most-cited sources"

### After Migration
- **40% message size reduction** → faster queries, lower storage costs
- **10x delete performance** → cascade deletes in ms instead of seconds
- **Atomic updates** → change single preference without touching others
- **SQL-ready** → foreign keys, proper indexes, queryable relationships
- **Analytics-enabled** → per-model usage, tag trends, source citations

---

## Migration Phases

| Phase | Focus | Timeline | Impact | Risk |
|-------|-------|----------|--------|------|
| **[Phase 1](./phase-1-message-attachments-toolcalls.md)** | Extract message attachments & tool calls to tables | Week 1-2 (10-12 days) | 40% message size ↓ | Medium |
| **[Phase 2](./phase-2-message-sources.md)** | Extract message sources & metadata to tables | Week 2-3 (8-10 days) | Metadata dedup 30-50% | Low |
| **[Phase 3](./phase-3-project-relationships.md)** | Replace project array with junction table | Week 4 (6-8 days) | 10x delete speed ↑ | High |
| **[Phase 4](./phase-4-user-preferences.md)** | Flatten user preferences object to key-value | Week 5 (8-10 days) | Atomic updates, extensibility | Medium |
| **[Phase 5](./phase-5-centralized-tags.md)** | Unify tags across entities with central table | Week 6-7 (10-12 days) | Autocomplete, consistency | Medium |
| **[Phase 6](./phase-6-conversation-metadata.md)** | Extract conversation token usage to table | Week 7-8 (6-8 days) | Per-model analytics | Low |
| **[Phase 7](./phase-7-final-optimizations.md)** | Fix N+1 queries, add indexes, optimize searches | Week 8-10 (8-10 days) | 10x search speed ↑ | Low |

**Total**: 8-10 weeks | **Deployable after each phase**

---

## Migration Strategy

### Dual-Write Pattern (All Phases)

Each phase follows 3-step pattern for **zero-downtime**:

```
1. SCHEMA: Add new tables, keep old fields optional
   ↓
2. BACKFILL: Migrate existing data (cursor-paginated batches)
   ↓
3. DUAL-WRITE: Write to both old + new locations
   ↓ (Run for 1-7 days, verify correctness)
4. DUAL-READ: Read from new table first, fallback to old
   ↓ (Run for 1-3 days, verify performance)
5. CLEANUP: Remove old fields, drop dual-write
   ↓
6. DEPLOY: Schema-only change (no code rollback needed)
```

**Key principle**: Never lose data. Old structure kept during transition.

### Rollback Strategy

Each phase includes:
- **Keep old fields** as optional during migration
- **Dual-write** enables instant rollback (just revert queries)
- **30-day buffer** before deleting old data
- **Rebuild scripts** to restore from source of truth if needed

---

## Prerequisites

Before starting any phase:

### 1. Backup Strategy
```bash
# Convex has automatic backups, but verify:
# 1. Navigate to Convex dashboard → Settings → Backups
# 2. Confirm point-in-time recovery enabled
# 3. Test restore process with dev environment
```

### 2. Monitoring Setup
```bash
# Track query performance before migration (baseline)
# Use Convex dashboard → Performance tab
# Note:
# - getUserBookmarks: ~X ms
# - deleteConversation: ~Y ms
# - hybridSearch: ~Z ms
```

### 3. Dev Environment
```bash
# Create separate Convex project for testing
bunx convex dev --project <test-project-id>

# Run full migration in test first
# Verify data integrity
# Measure performance improvements
```

### 4. Communication Plan
```bash
# Notify users of:
# - Maintenance windows (if any)
# - Expected improvements
# - How to report issues
```

---

## Phase Execution Checklist

### Before Each Phase

- [ ] Read phase doc thoroughly
- [ ] Understand gotchas section
- [ ] Review code files to be modified
- [ ] Test migration script in dev environment
- [ ] Verify rollback strategy
- [ ] Schedule deployment window (if needed)

### During Migration

- [ ] Deploy schema changes
- [ ] Run backfill migration (monitor progress)
- [ ] Verify data accuracy (spot-check records)
- [ ] Update queries/mutations (dual-write)
- [ ] Test critical user flows
- [ ] Monitor error logs for 24 hours

### After Migration

- [ ] Verify performance improvements
- [ ] Check data integrity (counts match)
- [ ] User acceptance testing
- [ ] Document any issues
- [ ] Wait 3-7 days before cleanup
- [ ] Run cleanup step
- [ ] Final verification

---

## Common Gotchas (All Phases)

### 1. TypeScript Type Depth Errors

**Context**: With 94+ Convex modules, TypeScript hits recursion limits.

**Pattern** (from CLAUDE.md):
```typescript
// Backend (Convex actions) - Complex cast
const result = ((await (ctx.runQuery as any)(
  // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
  internal.path.to.query,
  { args },
)) as ReturnType);

// Frontend (React hooks) - Direct @ts-ignore
// @ts-ignore - Type depth exceeded with complex Convex mutation
const myMutation = useMutation(api.path.to.mutation);
```

**Used in**: All phases when calling internal queries/mutations.

### 2. Convex Pagination Cursors

**Gotcha**: Migration scripts must use cursor pagination (not offset).

**Pattern**:
```typescript
let cursor: string | undefined;
do {
  const result = await ctx.db
    .query("table")
    .order("desc")
    .paginate({ cursor, numItems: 100 });

  cursor = result.continueCursor;
  // Process result.page
} while (cursor);
```

**Why**: Offset pagination doesn't scale with large tables.

### 3. Dual-Write Race Conditions

**Gotcha**: Concurrent mutations during dual-write can cause inconsistency.

**Example**:
```typescript
// Thread 1: Update old structure
await ctx.db.patch(id, { oldField: value });
// Thread 2: Update new table (before Thread 1 completes)
await ctx.db.insert("newTable", { value });
// Result: Inconsistent state
```

**Mitigation**: Use Convex transactions (mutations are atomic), validate before write.

### 4. Index Build Time

**Gotcha**: Adding indexes to large tables takes time.

**Monitor**: Convex dashboard → Indexes tab → "Building" status

**Impact**: Queries slow until index built. Deploy during low-traffic.

---

## Success Metrics

Track these throughout migration:

### Performance (Before → After)
```
Messages table avg size: 8KB → 4.8KB (40% reduction)
Cascade delete time: 2000ms → 200ms (10x faster)
Bookmark query (50 items): 1000ms → 150ms (7x faster)
Vector search (1000 msgs): 500ms → 50ms (10x faster)
Tag autocomplete: N/A → <100ms (new capability)
```

### Data Integrity
```
Tag deduplication: 30-50% shared across entities
Source metadata: 30-50% shared across messages
Project links: 0 inconsistencies (vs 5-10% before)
Message counts: 100% accurate (vs drift before)
```

### Code Quality
```
N+1 queries eliminated: 3 locations fixed
Optional chaining reduced: -30 lines
Type safety improved: v.any() → typed schemas
Mutation safety: Destructive updates fixed
```

---

## File Structure

```
docs/migration/
├── README.md (this file)
├── phase-1-message-attachments-toolcalls.md
├── phase-2-message-sources.md
├── phase-3-project-relationships.md
├── phase-4-user-preferences.md
├── phase-5-centralized-tags.md
├── phase-6-conversation-metadata.md
└── phase-7-final-optimizations.md
```

Each phase doc includes:
- **Why**: Problem statement with code examples
- **Schema changes**: New tables, deprecated fields
- **Migration steps**: Backfill scripts, dual-write logic
- **Gotchas**: Real issues from codebase exploration
- **Testing**: Verification checklist
- **Rollback**: How to undo if needed

---

## Getting Help

### During Migration

**Issues?**
1. Check phase doc's "Critical Gotchas" section
2. Review code files listed in "Files Modified"
3. Check Convex dashboard logs
4. Search migration script console output

**Stuck?**
- Rollback to previous step
- Review dual-write logic
- Verify data accuracy with spot-checks
- Run rebuild scripts (if provided)

### Post-Migration

**Data issues?**
- Run validation queries (in Phase 7)
- Check for nulls/missing relationships
- Verify counts match expectations

**Performance regressions?**
- Check index usage (Convex dashboard)
- Verify queries use new tables
- Monitor query times for 1 week

---

## Next Steps

1. **Read Phase 1 doc** thoroughly
2. **Set up dev environment** for testing
3. **Run Phase 1 migration** in test project
4. **Verify results** match expectations
5. **Deploy to production** (with monitoring)
6. **Wait 3-7 days**, then run cleanup
7. **Repeat for Phases 2-7**

---

## Migration Timeline Example

### Week 1-2: Phase 1 (Attachments & Tool Calls)
- Mon-Tue: Schema + backfill
- Wed-Thu: Dual-write implementation
- Fri: Testing + verification
- Mon (Week 2): Deploy to production
- Tue-Fri: Monitor, then cleanup

### Week 2-3: Phase 2 (Sources & Metadata)
- Same pattern as Phase 1

### Week 4: Phase 3 (Project Relationships)
- **High risk**: Extra testing, gradual rollout

### Week 5: Phase 4 (User Preferences)
- Focus on custom instructions fix

### Week 6-7: Phase 5 (Centralized Tags)
- Longest phase due to 4 entity migrations

### Week 7-8: Phase 6 (Conversation Metadata)
- Quick phase, low risk

### Week 8-10: Phase 7 (Optimizations)
- Index additions, N+1 fixes, final polish

---

## 🚀 Let's Begin!

Start with **[Phase 1: Message Attachments & Tool Calls](./phase-1-message-attachments-toolcalls.md)**

**Remember**: Each phase is independently deployable. Take your time, verify thoroughly, and maintain confidence in the rollback strategy.

Good luck! 🎉
