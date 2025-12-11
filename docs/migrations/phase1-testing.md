# Phase 1 Migration Testing Plan

**Status**: Schema deployed ✓ | Backfill complete ✓ | Ready for live testing

## Migration Summary

- **Migrated**: 834 messages
- **Attachments created**: 14
- **Tool calls created**: 60
- **Duration**: 6.13s (136.1 msg/sec)
- **Migration state**: COMPLETED

## Verification Complete ✓

### Data Integrity
- ✅ 14 attachments in new table (Word documents, proper storage IDs)
- ✅ 60 tool calls in new table (all marked complete, no orphaned partials)
- ✅ Args/results stored as native JSON (not stringified) - AI SDK v5 pattern
- ✅ Dual-read queries work - old messages successfully read from new tables
- ✅ Migration state tracking in `migrations` table

### Code Review ✓
- ✅ `upsertToolCall` mutation implements dual-write (new table + old array)
- ✅ Tool results update both locations with native JSON
- ✅ `finalizeToolCalls` marks partials complete in new table
- ✅ `completeMessage` writes final state to old structure for backward compat
- ✅ Frontend queries use new `getAttachments` and `getToolCalls` exports

---

## Live Testing (Required)

### Test 1: Basic Tool Call Streaming

**Goal**: Verify dual-write works for new messages with tool calls.

**Steps**:
1. Open app at `http://localhost:3000`
2. Start new conversation
3. Send: `"What's the weather in Paris?"`
4. **During streaming** - observe:
   - Tool call appears with loading indicator
   - Partial state visible (if UI supports)
   - No console errors
5. **After completion** - verify:
   - Weather data displays correctly
   - Tool call marked complete
6. **Run verification query**:
   ```bash
   bunx convex run migrations/verify_dual_write:checkLatestMessage
   ```
   Expected: `dualWriteWorking: true`

**Pass criteria**:
- Tool call completes successfully
- Data in both old array AND new table
- No errors in browser console or Convex logs

---

### Test 2: Resilient Generation (CRITICAL)

**Goal**: Ensure tool calls survive page refresh (server-side persistence).

**Steps**:
1. Send: `"What's the weather in London and Tokyo?"`
2. **While streaming** (before completion):
   - Hit F5 to refresh browser
   - OR close tab and reopen
3. **Expected behavior**:
   - Generation continues server-side
   - On reload, see completed tool calls
   - Both weather results displayed

**Pass criteria**:
- Tool calls complete despite refresh
- No data loss
- Final message shows all tool results

---

### Test 3: Multiple Tool Calls

**Goal**: Test streaming with multiple tool calls in single message.

**Steps**:
1. Send: `"Compare weather in New York, London, and Tokyo"`
2. **Observe**:
   - 3 tool calls stream in
   - Each shows loading → result transition
3. **Verify data**:
   ```bash
   bunx convex run migrations/verify_dual_write:checkLatestMessage
   ```

**Pass criteria**:
- All 3 tool calls complete
- Correct data in both old/new locations
- No race conditions or missing results

---

### Test 4: Attachments Dual-Read

**Goal**: Verify old messages with attachments display correctly.

**Steps**:
1. Find conversation with file attachments (from before migration)
2. Navigate to that conversation
3. **Verify**:
   - Attachments render correctly
   - File names, sizes, types match original
   - Download/preview works
4. **Check browser DevTools**:
   - Network tab → attachments fetched via new query
   - No errors about missing data

**Pass criteria**:
- Old attachments display identical to pre-migration
- Data fetched from new `attachments` table (verify in network tab)
- No UI glitches or missing metadata

---

### Test 5: Error Handling

**Goal**: Ensure tool call errors don't break dual-write.

**Steps**:
1. Send: `"What's the weather in InvalidCityXYZ?"`
2. **Expected**:
   - Tool call attempts
   - Error result stored (e.g., "City not found")
   - Error displayed gracefully in UI
3. **Verify**:
   - Error stored in both old array and new table
   - `result` field contains error object
   - Message still marked complete (not stuck in loading)

**Pass criteria**:
- Error handled gracefully
- Dual-write includes error state
- UI shows user-friendly error message

---

## Performance Verification (Optional)

**Query speed comparison** (before migration vs after):

```bash
# Before migration (nested arrays):
# Average query time: ~X ms

# After migration (normalized tables):
# Run this query 10 times, average the results
bunx convex run messages:getAttachments '{"messageId": "jh73n413s2tzvcj1cgwe6cgmad7wywqt"}'
```

**Expected**: Similar or faster (indexed foreign keys vs full doc scan).

---

## Monitoring Plan (3-7 Days)

**What to watch**:
1. **Error logs** in Convex dashboard
   - Search for "upsertToolCall" errors
   - Check for migration-related failures
2. **Query performance**
   - Monitor dashboard → Functions → `getAttachments`, `getToolCalls`
   - Alert if p95 latency > 100ms
3. **Data consistency**
   - Weekly verification query:
     ```bash
     bunx convex run migrations/verify_dual_write:checkLatestMessage
     ```
   - Ensure `dualWriteWorking: true` for all recent messages

**Red flags** (require investigation):
- ❌ Tool calls in new table but NOT in old array
- ❌ Partial tool calls stuck (not finalized after completion)
- ❌ Attachments missing from new table for new uploads
- ❌ Query errors referencing old nested structure

---

## Rollback Plan (If Needed)

**When to rollback**:
- Critical data inconsistency discovered
- Severe performance degradation (>500ms queries)
- User-facing bugs preventing core functionality

**Rollback steps**:
1. Revert code changes:
   ```bash
   git revert <phase1-commits>
   bun convex deploy
   ```
2. Drop new tables:
   ```bash
   # Via Convex dashboard → Tables → Delete
   # attachments, toolCalls, migrations
   ```
3. Verify old structure still works
4. Post-mortem: analyze logs, fix issues
5. Re-attempt migration after fixes

---

## Cleanup Phase (After 7-30 Days Confidence)

**Once all tests pass and monitoring shows stability**:

1. Remove deprecated fields from schema:
   ```typescript
   // Remove from messages table:
   - attachments: v.optional(v.array(...))
   - toolCalls: v.optional(v.array(...))
   - partialToolCalls: v.optional(v.array(...))
   ```

2. Remove dual-write logic:
   ```typescript
   // In upsertToolCall mutation:
   // Delete section that writes to old message.partialToolCalls array
   ```

3. Remove fallback dual-read logic:
   ```typescript
   // In getMessageAttachments helper:
   // Delete fallback to message.attachments array
   ```

4. Deploy final schema:
   ```bash
   bun convex deploy
   ```

5. Archive migration code:
   ```bash
   git mv convex/migrations/001_normalize_message_attachments.ts \
          convex/migrations/archive/
   ```

---

## Success Criteria

**Phase 1 considered complete when**:
- ✅ All 5 live tests pass
- ✅ 7+ days monitoring with zero critical issues
- ✅ Data consistency verified (dual-write working)
- ✅ Performance meets/exceeds baseline
- ✅ User acceptance - no reported bugs related to attachments/tool calls

**Next**: Proceed to Phase 2 (Message Sources & Metadata) or cleanup deprecated fields.
