# Phase 2: Normalize Message Sources & Metadata

**Timeline**: Week 2-3 (8-10 days)
**Impact**: Unified source metadata, deduplication across messages, enables source analytics
**Risk Level**: Low - Sources only from Perplexity/search models, limited usage

---

## Why This Migration?

### Current Problem

Messages store source citations as triple-nested arrays:

```typescript
// convex/schema.ts:241-276
sources: v.optional(v.array(v.object({
  id: v.string(),        // Sequential "1", "2", "3" for citation markers
  title: v.string(),
  url: v.string(),
  publishedDate: v.optional(v.string()),
  snippet: v.optional(v.string()),
})))

partialSources: v.optional(v.array(v.object({...})))  // ⚠️ Never used

sourceMetadata: v.optional(v.array(v.object({
  sourceId: v.string(),      // Links to sources[].id
  ogTitle: v.optional(v.string()),
  ogDescription: v.optional(v.string()),
  ogImage: v.optional(v.string()),
  favicon: v.optional(v.string()),
  domain: v.string(),
  fetchedAt: v.optional(v.number()),
  error: v.optional(v.string()),
})))
```

**Issues**:
1. **Duplicate metadata**: Same URL across messages = refetch OpenGraph data
2. **Split data**: Sources + sourceMetadata linked by string ID, not DB relationship
3. **Unused field**: `partialSources` exists but never populated (streaming not implemented)
4. **Citation coupling**: `id: "1"` is ephemeral, tied to extraction order

### SQL-Readiness Benefits
- **Normalized metadata**: One `sourceMetadata` row per unique URL
- **Proper foreign keys**: `sources.sourceId → sourceMetadata.sourceId`
- **Queryability**: "Find all messages citing domain X" becomes trivial
- **Analytics**: Track most-cited sources, metadata success rate

---

## Database Schema Changes

### New Tables

```typescript
// convex/schema.ts - Add after attachments table

sources: defineTable({
  messageId: v.id("messages"),
  conversationId: v.id("conversations"),  // Denormalized for filtering
  sourceId: v.string(),  // External ID (URL hash or provider ID)
  title: v.string(),
  url: v.string(),
  snippet: v.optional(v.string()),
  publishedDate: v.optional(v.string()),
  position: v.number(),  // Order in UI (for citation markers [1], [2], [3])
  isPartial: v.boolean(),  // For future streaming support
  createdAt: v.number(),
})
  .index("by_message", ["messageId"])
  .index("by_conversation", ["conversationId"])
  .index("by_source_id", ["sourceId"])
  .index("by_url", ["url"]),  // Find messages citing same URL

sourceMetadata: defineTable({
  sourceId: v.string(),  // Primary key (URL hash)
  url: v.string(),
  domain: v.string(),
  // OpenGraph metadata
  ogTitle: v.optional(v.string()),
  ogDescription: v.optional(v.string()),
  ogImage: v.optional(v.string()),
  favicon: v.optional(v.string()),
  // Provider metadata
  author: v.optional(v.string()),
  publishedDate: v.optional(v.string()),
  // Fetch tracking
  fetchedAt: v.optional(v.number()),
  lastUpdatedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  fetchCount: v.number(),  // How many messages reference this
  createdAt: v.number(),
})
  .index("by_source_id", ["sourceId"])
  .index("by_url", ["url"])
  .index("by_domain", ["domain"]),  // Analytics: most-cited domains
```

### Messages Table Updates

```typescript
// convex/schema.ts:241-276 - Make optional during transition
messages: defineTable({
  // ... existing fields ...

  // DEPRECATED - will be removed in cleanup
  sources: v.optional(v.array(v.object({...}))),
  partialSources: v.optional(v.array(v.object({...}))),
  sourceMetadata: v.optional(v.array(v.object({...}))),
})
```

---

## Migration Steps

### Step 1: Deploy Schema (Day 1)

**Checklist**:
- [ ] Add `sources` table to schema
- [ ] Add `sourceMetadata` table to schema
- [ ] Keep old message fields as optional
- [ ] Deploy via `bun convex deploy`
- [ ] Verify tables created

---

### Step 2: Backfill Data (Day 2-3)

```typescript
// convex/migrations/002_normalize_message_sources.ts
"use node";

import { internalMutation, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import crypto from "crypto";

// Helper: Generate stable source ID from URL
function generateSourceId(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export const backfillSources = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.number()
  },
  handler: async (ctx, { cursor, batchSize }) => {
    const messages = await ctx.db
      .query("messages")
      .order("desc")
      .paginate({ cursor, numItems: batchSize });

    let sourcesCreated = 0;
    let metadataCreated = 0;
    const metadataCache = new Map<string, boolean>();  // Track created metadata

    for (const msg of messages.page) {
      // Skip if no sources
      if (!msg.sources?.length) continue;

      // Migrate sources
      for (const [index, src] of msg.sources.entries()) {
        const sourceId = generateSourceId(src.url);

        // Insert source record
        await ctx.db.insert("sources", {
          messageId: msg._id,
          conversationId: msg.conversationId,
          sourceId,
          title: src.title,
          url: src.url,
          snippet: src.snippet,
          publishedDate: src.publishedDate,
          position: index + 1,  // 1-indexed for citation markers
          isPartial: false,
          createdAt: msg.createdAt,
        });
        sourcesCreated++;

        // Create or update metadata (deduplicated)
        if (!metadataCache.has(sourceId)) {
          const existingMetadata = await ctx.db
            .query("sourceMetadata")
            .withIndex("by_source_id", q => q.eq("sourceId", sourceId))
            .unique();

          if (!existingMetadata) {
            // Find matching metadata from old structure
            const oldMetadata = msg.sourceMetadata?.find(
              m => m.sourceId === src.id
            );

            await ctx.db.insert("sourceMetadata", {
              sourceId,
              url: src.url,
              domain: oldMetadata?.domain || new URL(src.url).hostname,
              ogTitle: oldMetadata?.ogTitle,
              ogDescription: oldMetadata?.ogDescription,
              ogImage: oldMetadata?.ogImage,
              favicon: oldMetadata?.favicon,
              fetchedAt: oldMetadata?.fetchedAt,
              error: oldMetadata?.error,
              fetchCount: 1,
              createdAt: msg.createdAt,
            });
            metadataCreated++;
          } else {
            // Increment fetch count (this URL used in multiple messages)
            await ctx.db.patch(existingMetadata._id, {
              fetchCount: existingMetadata.fetchCount + 1,
            });
          }

          metadataCache.set(sourceId, true);
        }
      }
    }

    return {
      done: messages.isDone,
      nextCursor: messages.continueCursor,
      processed: messages.page.length,
      sourcesCreated,
      metadataCreated,
    };
  },
});

export const migrateMessageSources = internalAction({
  handler: async (ctx) => {
    let cursor: string | undefined;
    let totalProcessed = 0;
    let totalSources = 0;
    let totalMetadata = 0;
    const startTime = Date.now();

    console.log("🚀 Starting message sources migration...");

    do {
      const result = await ctx.runMutation(
        internal.migrations["002_normalize_message_sources"].backfillSources,
        { cursor, batchSize: 100 }
      );

      cursor = result.nextCursor;
      totalProcessed += result.processed;
      totalSources += result.sourcesCreated;
      totalMetadata += result.metadataCreated;

      console.log(`✅ Migrated ${totalProcessed} messages (${totalSources} sources, ${totalMetadata} metadata records)`);
    } while (cursor);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Migration complete!`);
    console.log(`   Messages: ${totalProcessed}`);
    console.log(`   Sources: ${totalSources}`);
    console.log(`   Metadata: ${totalMetadata}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Deduplication: ${totalSources - totalMetadata} URLs shared across messages`);
  },
});
```

**Run migration**: Same process as Phase 1 (Convex dashboard → Run action)

---

### Step 3: Update Queries (Dual-Read Phase) (Day 4-6)

#### Source Extraction Logic

**File**: `convex/generation.ts` (lines 266-364)

**Current**: Extracts from provider metadata during generation
**New**: Also write to new table structure

```typescript
// convex/messages.ts - Add helper

export const addSources = internalMutation({
  args: {
    messageId: v.id("messages"),
    conversationId: v.id("conversations"),
    sources: v.array(v.object({
      id: v.string(),
      title: v.string(),
      url: v.string(),
      snippet: v.optional(v.string()),
      publishedDate: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const sourceIdMap = new Map<string, string>();  // url → sourceId

    for (const [index, src] of args.sources.entries()) {
      // Generate stable ID from URL
      const sourceId = crypto
        .createHash("sha256")
        .update(src.url)
        .digest("hex")
        .slice(0, 16);

      sourceIdMap.set(src.url, sourceId);

      // Insert source record
      await ctx.db.insert("sources", {
        messageId: args.messageId,
        conversationId: args.conversationId,
        sourceId,
        title: src.title,
        url: src.url,
        snippet: src.snippet,
        publishedDate: src.publishedDate,
        position: index + 1,
        isPartial: false,
        createdAt: Date.now(),
      });

      // Create or update metadata
      const existingMetadata = await ctx.db
        .query("sourceMetadata")
        .withIndex("by_source_id", q => q.eq("sourceId", sourceId))
        .unique();

      if (!existingMetadata) {
        const domain = new URL(src.url).hostname;
        await ctx.db.insert("sourceMetadata", {
          sourceId,
          url: src.url,
          domain,
          publishedDate: src.publishedDate,
          fetchCount: 1,
          createdAt: Date.now(),
        });

        // Schedule async enrichment
        await ctx.scheduler.runAfter(
          0,
          internal.sources.enrichment.enrichSourceMetadata,
          { sourceId, url: src.url }
        );
      } else {
        // Increment fetch count
        await ctx.db.patch(existingMetadata._id, {
          fetchCount: existingMetadata.fetchCount + 1,
        });
      }
    }

    // ALSO write to old location during transition (dual-write)
    const message = await ctx.db.get(args.messageId);
    await ctx.db.patch(args.messageId, {
      sources: args.sources,  // Keep old format populated
      updatedAt: Date.now(),
    });

    return sourceIdMap;
  },
});
```

#### Update Source Enrichment

**File**: `convex/sources/enrichment.ts`

**Current** (lines 9-75): Enriches `sourceMetadata` array on message
**New**: Update `sourceMetadata` table row

```typescript
// convex/sources/enrichment.ts - Refactor

export const enrichSourceMetadata = internalAction({
  args: {
    sourceId: v.string(),
    url: v.string(),
  },
  handler: async (ctx, { sourceId, url }) => {
    try {
      const domain = new URL(url).hostname;

      // Fetch OpenGraph data
      const ogData = await fetchOpenGraph(url);

      // Update metadata table (not message array)
      await ctx.runMutation(internal.sources.enrichment.updateMetadata, {
        sourceId,
        metadata: {
          ogTitle: ogData.title,
          ogDescription: ogData.description,
          ogImage: ogData.image,
          favicon: ogData.favicon || `https://www.google.com/s2/favicons?domain=${domain}`,
          domain,
          fetchedAt: Date.now(),
        },
      });
    } catch (error: any) {
      // Log error in metadata
      await ctx.runMutation(internal.sources.enrichment.updateMetadata, {
        sourceId,
        metadata: {
          error: error.message,
          fetchedAt: Date.now(),
        },
      });
    }
  },
});

export const updateMetadata = internalMutation({
  args: {
    sourceId: v.string(),
    metadata: v.object({
      ogTitle: v.optional(v.string()),
      ogDescription: v.optional(v.string()),
      ogImage: v.optional(v.string()),
      favicon: v.optional(v.string()),
      domain: v.optional(v.string()),
      error: v.optional(v.string()),
      fetchedAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { sourceId, metadata }) => {
    const existing = await ctx.db
      .query("sourceMetadata")
      .withIndex("by_source_id", q => q.eq("sourceId", sourceId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...metadata,
        lastUpdatedAt: Date.now(),
      });
    }
  },
});
```

#### Update Frontend Components

**File**: `src/components/chat/SourceList.tsx`

**Current** (lines 17-62): Reads `message.sources` array
**New**: Query sources table with enriched metadata

```typescript
// src/components/chat/SourceList.tsx

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function SourceList({ messageId }: { messageId: Id<"messages"> }) {
  const sources = useQuery(api.messages.getSources, { messageId });

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="text-xs font-medium opacity-60">Sources</div>
      <div className="grid gap-2">
        {sources.map((source) => (
          <a
            key={source._id}
            id={`source-${source.position}`}
            href={source.url}
            target="_blank"
            className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent"
          >
            {source.metadata?.favicon && (
              <img
                src={source.metadata.favicon}
                alt=""
                className="w-4 h-4 mt-0.5"
              />
            )}
            <span className="text-xs font-mono opacity-60">[{source.position}]</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm line-clamp-1">
                {source.metadata?.ogTitle || source.title}
              </div>
              {(source.metadata?.ogDescription || source.snippet) && (
                <div className="text-xs opacity-60 line-clamp-2 mt-1">
                  {source.metadata?.ogDescription || source.snippet}
                </div>
              )}
              <div className="text-xs opacity-40 mt-1">
                {source.metadata?.domain || source.url}
              </div>
            </div>
            <ExternalLink className="w-3 h-3 opacity-40 flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}
```

**Add query**:
```typescript
// convex/messages.ts

export const getSources = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    // Get sources for message
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_message", q => q.eq("messageId", messageId))
      .order("asc")
      .collect();

    // Enrich with metadata
    return Promise.all(
      sources.map(async (source) => {
        const metadata = await ctx.db
          .query("sourceMetadata")
          .withIndex("by_source_id", q => q.eq("sourceId", source.sourceId))
          .unique();

        return { ...source, metadata };
      })
    );
  },
});
```

---

### Step 4: Cleanup (Day 7-8)

1. **Remove old fields from schema**
2. **Remove dual-write logic**
3. **Deploy and verify**

---

## Critical Gotchas

### 1. Source ID is Ephemeral in Old Schema
**Current**: `id: "1"`, `"2"`, `"3"` assigned during extraction (position in array)
**New**: Hash-based stable ID from URL

**Gotcha**: Citation markers `[1]`, `[2]` in content won't break because we store `position` field.

### 2. Provider Metadata Format Inconsistency
**Current extraction** (generation.ts:271-364): 3 different formats
1. OpenRouter: `providerMetadata.openrouter.search_results[]`
2. Perplexity: `providerMetadata.perplexity.citations[]`
3. Generic: `providerMetadata.citations[]`

**Gotcha**: Must handle all 3 during migration. Extraction logic unchanged.

### 3. OpenGraph Enrichment Runs Async
**Current**: Scheduled after message completion (0-5s delay)
**New**: Same pattern, but updates `sourceMetadata` table instead of message array

**Gotcha**: Sources visible before metadata loads. UI must handle missing `ogTitle`/`ogImage`.

### 4. URL Deduplication Edge Case
**Scenario**: Same URL cited in messages A and B, but different titles

**Solution**: `sources` table stores per-message title, `sourceMetadata` stores canonical OpenGraph title.

```typescript
// Message A: "OpenAI Blog - GPT-4"
// Message B: "OpenAI - GPT-4 Announcement"
// Both reference same sourceMetadata with ogTitle: "GPT-4 - OpenAI"
```

### 5. Partial Sources Not Implemented
**Current**: `partialSources` field exists but never used
**New**: Add `isPartial` flag for future streaming support

**Gotcha**: No streaming logic needed yet. Future-proofing only.

---

## Testing Checklist

- [ ] **Perplexity query**: Sources appear with citations
- [ ] **View source metadata**: Favicon, OG title load within 5s
- [ ] **Same URL in 2 messages**: Metadata deduplicated (fetchCount: 2)
- [ ] **Migration stats**: Check deduplication ratio (sources - metadata)
- [ ] **Citation markers**: [1], [2], [3] match position field
- [ ] **Broken URL**: Error stored in sourceMetadata.error

---

## Success Metrics

- **Metadata deduplication**: 30-50% (typical: 100 sources → 70 unique URLs)
- **Storage savings**: ~2KB per duplicate URL avoided
- **Query capability**: New analytics (most-cited domains, source trends)
- **Enrichment success rate**: >90% (track sourceMetadata.error count)

---

## Files Modified

| File | Change |
|------|--------|
| `convex/schema.ts` | Add sources, sourceMetadata tables |
| `convex/messages.ts` | Add addSources, getSources |
| `convex/sources/enrichment.ts` | Update to new schema |
| `convex/generation.ts` | Dual-write sources |
| `src/components/chat/SourceList.tsx` | Use new query |

---

## Next Phase

After Phase 2 complete → **Phase 3: Project-Conversation Relationships** (junction table, major performance win)
