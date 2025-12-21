# Dead Code Report

Generated during refactoring of files over 500 lines.

**Policy:** Report only - do not delete. Review and decide manually.

---

## Files Reviewed

### 1. convex/presentations.ts (1,866 → ~450 lines)

**Status:** Split into submodules

**Created:**
- `convex/presentations/slides.ts` (~350 lines)
- `convex/presentations/outline.ts` (~400 lines)
- `convex/presentations/internal.ts` (~180 lines)
- `convex/presentations/retry.ts` (~250 lines)

**Observations:**
- No unused exports detected
- All functions are re-exported for backward compatibility
- Validators are duplicated across files (could share, but keeping isolated for simplicity)

### 2. convex/generation.ts (1,730 lines) - KEPT AS-IS

**Status:** Reviewed, no split needed

**Reason:**
- Already uses submodules: `attachments.ts`, `sources.ts`, `image.ts`, `slideImage.ts`
- Main `generateResponse` is one cohesive streaming operation (~1200 lines)
- Tightly coupled steps: message status → history → prompts → tools → stream → errors
- Splitting would add parameter-passing complexity without benefit
- Error handling is model-specific (Gemini, OpenAI have different error formats)

**Observations:**
- No unused exports detected
- Tool imports from `./ai/tools/*` are all used
- Re-exports `image` submodule

### 3. convex/conversations.ts (1,249 → 486 lines)

**Status:** Split into submodules

**Created:**
- `convex/conversations/tokens.ts` (~163 lines) - Token usage tracking
- `convex/conversations/bulk.ts` (~127 lines) - Bulk operations
- `convex/conversations/branching.ts` (~131 lines) - Branch/collaboration
- `convex/conversations/consolidation.ts` (~192 lines) - Model comparison consolidation
- `convex/conversations/internal.ts` (~181 lines) - Internal queries/mutations

**Pre-existing submodules:**
- `convex/conversations/actions.ts` (110 lines) - bulkAutoRename action
- `convex/conversations/hybridSearch.ts` (194 lines) - Hybrid search

**Observations:**
- No unused exports detected
- All functions re-exported for backward compatibility
- `canAccessConversation` helper exported for use by other modules

### 4. convex/memories.ts (904 → 385 lines)

**Status:** Split into submodules

**Created:**
- `convex/memories/consolidation.ts` (~340 lines) - Migration/consolidation actions
- `convex/memories/queries.ts` (~188 lines) - List and search queries

**Pre-existing submodules:**
- `convex/memories/search.ts` (255 lines) - Hybrid search
- `convex/memories/extract.ts` (383 lines) - Memory extraction
- `convex/memories/delete.ts` (188 lines) - Deletion logic
- `convex/memories/save.ts` (85 lines) - Save operations
- `convex/memories/mutations.ts` (71 lines) - Mutations
- `convex/memories/expiration.ts` (25 lines) - Expiration handling

**Observations:**
- No unused exports detected
- All functions re-exported for backward compatibility
- Namespace export renamed from `search` to `hybridSearch` to avoid conflict

