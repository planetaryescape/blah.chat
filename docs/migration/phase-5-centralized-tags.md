# Phase 5: Centralized Tags System

**Timeline**: Week 6-7 (10-12 days)
**Impact**: Autocomplete, consistency enforcement, usage analytics, hierarchical tags
**Risk Level**: Medium - Tags scattered across 4 entities, case-sensitivity issues

---

## Why This Migration?

### Current Problem

Tags stored as string arrays in 4 separate entities:

```typescript
// bookmarks.ts:377, snippets.ts:390, notes.ts:413, feedback.ts:639
tags: v.optional(v.array(v.string()))
```

**Issues**:

### 1. Inconsistent Tag Handling

**Bookmarks** (convex/bookmarks.ts:30):
```typescript
tags: args.tags || [],  // Always array
```

**Snippets** (convex/snippets.ts:31):
```typescript
tags: args.tags,  // Could be undefined
```

**Notes** (convex/notes.ts:137):
```typescript
tags: only if in updates  // Conditional
```

### 2. No Normalization

**UI Input** (BookmarkButton.tsx:62):
```typescript
const tagList = tags ? tags.split(",").map((t: any) => t.trim()) : undefined;
```

**Result**: User can create:
- `"Important"` and `"important"` (case-sensitive duplicates)
- `"work/Project"` and `"work/project"` (hierarchy breaks)
- `" tag "` and `"tag"` (whitespace variants)

### 3. Tag Renaming Doesn't Cascade

**Notes only** (convex/notes.ts has renameTag mutation)
**Bookmarks/snippets/feedback**: No rename capability

**Scenario**:
1. User renames `"project-a"` → `"proj-a"` in notes
2. Bookmarks still have `"project-a"` (orphaned)
3. Tag autocomplete shows both variants

### 4. No Tag Management

- No usage counts
- No color/metadata
- No autocomplete source
- No validation

### SQL-Readiness Benefits
- **Central tags table**: Single source of truth
- **Junction tables**: Proper many-to-many relationships
- **Autocomplete**: Query by usage count, name prefix
- **Analytics**: Most-used tags, tag trends, co-occurrence

---

## Database Schema Changes

### New Tables

```typescript
// convex/schema.ts - Add after userPreferences

tags: defineTable({
  name: v.string(),  // Normalized (lowercase, trimmed)
  displayName: v.string(),  // Original casing for display
  color: v.optional(v.string()),  // Hex color for UI
  usageCount: v.number(),  // Denormalized for sorting
  category: v.optional(v.union(
    v.literal("bookmark"),
    v.literal("snippet"),
    v.literal("note"),
    v.literal("feedback"),
    v.literal("general")
  )),
  createdAt: v.number(),
  createdBy: v.id("users"),
})
  .index("by_name", ["name"])  // Case-insensitive lookup
  .index("by_usage", ["usageCount"])  // Autocomplete sorting
  .index("by_category", ["category", "usageCount"]),

// Junction tables for each entity

bookmarkTags: defineTable({
  bookmarkId: v.id("bookmarks"),
  tagId: v.id("tags"),
  addedAt: v.number(),
  addedBy: v.id("users"),
})
  .index("by_bookmark", ["bookmarkId"])
  .index("by_tag", ["tagId"]),

snippetTags: defineTable({
  snippetId: v.id("snippets"),
  tagId: v.id("tags"),
  addedAt: v.number(),
  addedBy: v.id("users"),
})
  .index("by_snippet", ["snippetId"])
  .index("by_tag", ["tagId"]),

noteTags: defineTable({
  noteId: v.id("notes"),
  tagId: v.id("tags"),
  addedAt: v.number(),
  addedBy: v.id("users"),
})
  .index("by_note", ["noteId"])
  .index("by_tag", ["tagId"]),

feedbackTags: defineTable({
  feedbackId: v.id("feedback"),
  tagId: v.id("tags"),
  addedAt: v.number(),
  addedBy: v.id("users"),
})
  .index("by_feedback", ["feedbackId"])
  .index("by_tag", ["tagId"]),
```

### Entity Table Updates

```typescript
// Remove tags arrays from:
bookmarks: { tags: v.optional(v.array(v.string())) }  // DEPRECATED
snippets: { tags: v.optional(v.array(v.string())) }   // DEPRECATED
notes: { tags: v.optional(v.array(v.string())) }      // DEPRECATED
feedback: { tags: v.optional(v.array(v.string())) }   // DEPRECATED
```

---

## Migration Steps

### Step 1: Deploy Schema (Day 1)

Add 5 new tables (tags + 4 junction tables), keep old tag arrays.

---

### Step 2: Backfill Data (Day 2-4)

```typescript
// convex/migrations/005_normalize_tags.ts
"use node";

import { internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Helper: Normalize tag name
function normalizeTagName(name: string): string {
  return name.toLowerCase().trim();
}

export const backfillTags = internalMutation({
  handler: async (ctx) => {
    const tagMap = new Map<string, Id<"tags">>();  // normalizedName → tagId
    let tagsCreated = 0;
    let linksCreated = 0;

    // Helper: Get or create tag
    const getOrCreateTag = async (
      name: string,
      userId: Id<"users">,
      category?: string
    ) => {
      const normalized = normalizeTagName(name);
      if (tagMap.has(normalized)) {
        return tagMap.get(normalized)!;
      }

      // Check if tag already exists
      const existing = await ctx.db
        .query("tags")
        .withIndex("by_name", q => q.eq("name", normalized))
        .unique();

      if (existing) {
        tagMap.set(normalized, existing._id);
        return existing._id;
      }

      // Create new tag
      const tagId = await ctx.db.insert("tags", {
        name: normalized,
        displayName: name,  // Preserve original casing
        usageCount: 0,
        category: category as any,
        createdAt: Date.now(),
        createdBy: userId,
      });

      tagMap.set(normalized, tagId);
      tagsCreated++;
      return tagId;
    };

    // Migrate bookmarks
    console.log("Migrating bookmark tags...");
    const bookmarks = await ctx.db.query("bookmarks").collect();
    for (const bookmark of bookmarks) {
      if (!bookmark.tags?.length) continue;

      for (const tagName of bookmark.tags) {
        const tagId = await getOrCreateTag(tagName, bookmark.userId, "bookmark");

        // Check if link exists
        const existing = await ctx.db
          .query("bookmarkTags")
          .withIndex("by_bookmark", q => q.eq("bookmarkId", bookmark._id))
          .filter(q => q.eq(q.field("tagId"), tagId))
          .unique();

        if (!existing) {
          await ctx.db.insert("bookmarkTags", {
            bookmarkId: bookmark._id,
            tagId,
            addedAt: bookmark.createdAt,
            addedBy: bookmark.userId,
          });
          linksCreated++;

          // Increment usage count
          const tag = await ctx.db.get(tagId);
          if (tag) {
            await ctx.db.patch(tagId, { usageCount: tag.usageCount + 1 });
          }
        }
      }
    }

    // Migrate snippets
    console.log("Migrating snippet tags...");
    const snippets = await ctx.db.query("snippets").collect();
    for (const snippet of snippets) {
      if (!snippet.tags?.length) continue;

      for (const tagName of snippet.tags) {
        const tagId = await getOrCreateTag(tagName, snippet.userId, "snippet");

        const existing = await ctx.db
          .query("snippetTags")
          .withIndex("by_snippet", q => q.eq("snippetId", snippet._id))
          .filter(q => q.eq(q.field("tagId"), tagId))
          .unique();

        if (!existing) {
          await ctx.db.insert("snippetTags", {
            snippetId: snippet._id,
            tagId,
            addedAt: snippet.createdAt,
            addedBy: snippet.userId,
          });
          linksCreated++;

          const tag = await ctx.db.get(tagId);
          if (tag) {
            await ctx.db.patch(tagId, { usageCount: tag.usageCount + 1 });
          }
        }
      }
    }

    // Migrate notes (same pattern)
    console.log("Migrating note tags...");
    const notes = await ctx.db.query("notes").collect();
    for (const note of notes) {
      if (!note.tags?.length) continue;

      for (const tagName of note.tags) {
        const tagId = await getOrCreateTag(tagName, note.userId, "note");

        const existing = await ctx.db
          .query("noteTags")
          .withIndex("by_note", q => q.eq("noteId", note._id))
          .filter(q => q.eq(q.field("tagId"), tagId))
          .unique();

        if (!existing) {
          await ctx.db.insert("noteTags", {
            noteId: note._id,
            tagId,
            addedAt: note.createdAt,
            addedBy: note.userId,
          });
          linksCreated++;

          const tag = await ctx.db.get(tagId);
          if (tag) {
            await ctx.db.patch(tagId, { usageCount: tag.usageCount + 1 });
          }
        }
      }
    }

    // Migrate feedback (same pattern)
    console.log("Migrating feedback tags...");
    const feedbacks = await ctx.db.query("feedback").collect();
    for (const feedback of feedbacks) {
      if (!feedback.tags?.length) continue;

      for (const tagName of feedback.tags) {
        const tagId = await getOrCreateTag(tagName, feedback.userId, "feedback");

        const existing = await ctx.db
          .query("feedbackTags")
          .withIndex("by_feedback", q => q.eq("feedbackId", feedback._id))
          .filter(q => q.eq(q.field("tagId"), tagId))
          .unique();

        if (!existing) {
          await ctx.db.insert("feedbackTags", {
            feedbackId: feedback._id,
            tagId,
            addedAt: feedback.createdAt,
            addedBy: feedback.userId,
          });
          linksCreated++;

          const tag = await ctx.db.get(tagId);
          if (tag) {
            await ctx.db.patch(tagId, { usageCount: tag.usageCount + 1 });
          }
        }
      }
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`   Tags created: ${tagsCreated}`);
    console.log(`   Links created: ${linksCreated}`);
    console.log(`   Deduplication: ${linksCreated - tagsCreated} shared tags`);

    return { tagsCreated, linksCreated };
  },
});

export const migrateTagsSystem = internalAction({
  handler: async (ctx) => {
    console.log("🚀 Starting tags migration...");
    const startTime = Date.now();

    const result = await ctx.runMutation(
      internal.migrations["005_normalize_tags"].backfillTags
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   Duration: ${duration}s`);
    return result;
  },
});
```

---

### Step 3: Update Tag APIs (Day 5-7)

#### Centralized Tag Management

```typescript
// convex/tags.ts - New file

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserId } from "./users";

// Search tags for autocomplete
export const searchTags = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, category, limit = 10 }) => {
    const normalized = query.toLowerCase().trim();

    let dbQuery = ctx.db.query("tags");

    if (category) {
      dbQuery = dbQuery.withIndex("by_category", q =>
        q.eq("category", category as any)
      );
    } else {
      dbQuery = dbQuery.withIndex("by_usage");
    }

    const tags = await dbQuery.collect();

    // Filter by prefix match
    const filtered = tags
      .filter(t => t.name.startsWith(normalized))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);

    return filtered;
  },
});

// Get popular tags
export const getPopularTags = query({
  args: { limit: v.optional(v.number()), category: v.optional(v.string()) },
  handler: async (ctx, { limit = 20, category }) => {
    let query = ctx.db.query("tags");

    if (category) {
      query = query.withIndex("by_category", q => q.eq("category", category as any));
    } else {
      query = query.withIndex("by_usage");
    }

    return query.order("desc").take(limit);
  },
});

// Get tag by name (case-insensitive)
export const getTagByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const normalized = name.toLowerCase().trim();
    return ctx.db
      .query("tags")
      .withIndex("by_name", q => q.eq("name", normalized))
      .unique();
  },
});

// Rename tag (cascades to all entities)
export const renameTag = mutation({
  args: { oldName: v.string(), newName: v.string() },
  handler: async (ctx, { oldName, newName }) => {
    const userId = await getCurrentUserId(ctx);

    // Find old tag
    const oldTag = await ctx.db
      .query("tags")
      .withIndex("by_name", q => q.eq("name", oldName.toLowerCase().trim()))
      .unique();

    if (!oldTag) {
      throw new Error("Tag not found");
    }

    // Check if new name already exists
    const existingTag = await ctx.db
      .query("tags")
      .withIndex("by_name", q => q.eq("name", newName.toLowerCase().trim()))
      .unique();

    if (existingTag && existingTag._id !== oldTag._id) {
      throw new Error("Tag with new name already exists");
    }

    // Update tag
    await ctx.db.patch(oldTag._id, {
      name: newName.toLowerCase().trim(),
      displayName: newName,
    });

    return { success: true };
  },
});

// Merge tags (combine multiple tags into one)
export const mergeTags = mutation({
  args: { sourceTags: v.array(v.string()), targetTag: v.string() },
  handler: async (ctx, { sourceTags, targetTag }) => {
    const userId = await getCurrentUserId(ctx);

    // Get or create target tag
    let target = await ctx.db
      .query("tags")
      .withIndex("by_name", q => q.eq("name", targetTag.toLowerCase().trim()))
      .unique();

    if (!target) {
      target = await ctx.db.get(
        await ctx.db.insert("tags", {
          name: targetTag.toLowerCase().trim(),
          displayName: targetTag,
          usageCount: 0,
          createdAt: Date.now(),
          createdBy: userId,
        })
      );
    }

    let totalMerged = 0;

    // Merge each source tag
    for (const sourceName of sourceTags) {
      const source = await ctx.db
        .query("tags")
        .withIndex("by_name", q => q.eq("name", sourceName.toLowerCase().trim()))
        .unique();

      if (!source || source._id === target!._id) continue;

      // Update all bookmark links
      const bookmarkLinks = await ctx.db
        .query("bookmarkTags")
        .withIndex("by_tag", q => q.eq("tagId", source._id))
        .collect();

      for (const link of bookmarkLinks) {
        // Delete old link
        await ctx.db.delete(link._id);

        // Create new link (if doesn't exist)
        const existing = await ctx.db
          .query("bookmarkTags")
          .withIndex("by_bookmark", q => q.eq("bookmarkId", link.bookmarkId))
          .filter(q => q.eq(q.field("tagId"), target!._id))
          .unique();

        if (!existing) {
          await ctx.db.insert("bookmarkTags", {
            ...link,
            tagId: target!._id,
          });
          totalMerged++;
        }
      }

      // Repeat for snippets, notes, feedback...
      // (similar pattern)

      // Delete source tag
      await ctx.db.delete(source._id);
    }

    // Update target usage count
    const allLinks = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_tag", q => q.eq("tagId", target!._id))
      .collect();
    // + snippetTags, noteTags, feedbackTags

    await ctx.db.patch(target!._id, {
      usageCount: allLinks.length,
    });

    return { merged: totalMerged };
  },
});
```

#### Update Entity APIs

```typescript
// convex/bookmarks.ts - Update tag handling

export const addTagToBookmark = mutation({
  args: { bookmarkId: v.id("bookmarks"), tagName: v.string() },
  handler: async (ctx, { bookmarkId, tagName }) => {
    const userId = await getCurrentUserId(ctx);

    // Get or create tag
    const normalized = tagName.toLowerCase().trim();
    let tag = await ctx.db
      .query("tags")
      .withIndex("by_name", q => q.eq("name", normalized))
      .unique();

    if (!tag) {
      const tagId = await ctx.db.insert("tags", {
        name: normalized,
        displayName: tagName,
        usageCount: 0,
        category: "bookmark",
        createdAt: Date.now(),
        createdBy: userId,
      });
      tag = await ctx.db.get(tagId);
    }

    // Create link (if doesn't exist)
    const existing = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", q => q.eq("bookmarkId", bookmarkId))
      .filter(q => q.eq(q.field("tagId"), tag!._id))
      .unique();

    if (!existing) {
      await ctx.db.insert("bookmarkTags", {
        bookmarkId,
        tagId: tag!._id,
        addedAt: Date.now(),
        addedBy: userId,
      });

      // Increment usage count
      await ctx.db.patch(tag!._id, { usageCount: tag!.usageCount + 1 });
    }
  },
});

export const getBookmarkTags = query({
  args: { bookmarkId: v.id("bookmarks") },
  handler: async (ctx, { bookmarkId }) => {
    const links = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", q => q.eq("bookmarkId", bookmarkId))
      .collect();

    return Promise.all(links.map(link => ctx.db.get(link.tagId)));
  },
});
```

---

### Step 4: Update Frontend (Day 8-10)

#### Tag Autocomplete Component

```typescript
// src/components/shared/TagAutocomplete.tsx - New component

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export function TagAutocomplete({ onSelect }: { onSelect: (tag: string) => void }) {
  const [query, setQuery] = useState("");

  const suggestions = useQuery(
    api.tags.searchTags,
    query.length >= 2 ? { query, limit: 10 } : "skip"
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tags..."
        className="w-full px-3 py-2 border rounded"
      />

      {suggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg">
          {suggestions.map((tag) => (
            <button
              key={tag._id}
              onClick={() => {
                onSelect(tag.displayName);
                setQuery("");
              }}
              className="w-full px-3 py-2 text-left hover:bg-gray-100"
            >
              <span className="font-medium">{tag.displayName}</span>
              <span className="ml-2 text-xs text-gray-500">
                ({tag.usageCount} uses)
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### Step 5: Cleanup (Day 11-12)

1. Remove tag arrays from schemas
2. Remove dual-write logic
3. Deploy and verify

---

## Critical Gotchas

### 1. Case-Sensitivity Nightmare

**Before migration**: `"Important"` ≠ `"important"` (separate arrays)
**After migration**: Both map to same tag (`name: "important"`, `displayName` preserves casing)

**Gotcha**: During backfill, first occurrence wins for `displayName`. Users who typed `"Important"` might see `"important"` if that was inserted first.

**Solution**: Use most common casing (max occurrence) or alphabetically first.

### 2. Tag Rename Only in Notes

**Current**: `convex/notes.ts` has renameTag, others don't
**New**: Central renameTag cascades to all entities

**Gotcha**: Existing rename calls in notes UI need to use new API.

### 3. Hierarchical Tags Validation

**Current**: `tagUtils.ts` validates `"work/project/sprint"` format
**New**: Validate in tag creation mutation

```typescript
import { validateTag } from "@/lib/utils/tagUtils";

// In addTagToBookmark:
if (!validateTag(tagName)) {
  throw new Error("Invalid tag format");
}
```

### 4. AI-Generated Suggested Tags

**Notes** have `suggestedTags` field (AI-generated)
**Decision**: Keep as array (not in tags table) since they're suggestions, not applied tags.

---

## Testing Checklist

- [ ] **Add tag**: Autocomplete shows usage count, sorted by popularity
- [ ] **Case variants**: "Important" and "important" map to same tag
- [ ] **Rename tag**: Cascades to bookmarks, snippets, notes, feedback
- [ ] **Merge tags**: Combines usage counts, removes duplicates
- [ ] **Migration stats**: Deduplication ratio (tags created vs links created)
- [ ] **Hierarchical tags**: `"work/project"` validates correctly

---

## Success Metrics

- **Deduplication**: 30-50% tags shared across entities
- **Autocomplete**: <100ms response for tag search
- **Consistency**: 0 case-sensitive duplicates
- **Rename cascade**: Updates all entities in single mutation

---

## Next Phase

After Phase 5 complete → **Phase 6 & 7: Remaining optimizations** (tokenUsage, memory metadata, N+1 fixes)
