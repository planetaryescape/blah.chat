# Historical Convex workflow

Superseded by the Postgres rewrite. Consult only for historical branches; do not apply these examples to current code.

# Next.js Page Scaffolder

Scaffold list/detail pages following blah.chat patterns: URL-persisted state, debounced search, Convex queries, mobile/desktop responsive.

## Core Pattern (List Page)

```tsx
"use client";

import { useQuery } from "convex/react";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { Suspense, useMemo } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/useDebounce";
import { useMobileDetect } from "@/hooks/useMobileDetect";

function EntityPageContent() {
  // URL-persisted filters
  const [searchParam, setSearchParam] = useQueryState("q", parseAsString.withDefault(""));
  const searchQuery = useDebounce(searchParam, 300);

  const [filterActive, setFilterActive] = useQueryState("active", parseAsBoolean.withDefault(true));

  const { isMobile } = useMobileDetect();

  // @ts-ignore - Type depth exceeded with complex Convex query
  const items = useQuery(api.entities.search, {
    searchQuery,
    filterActive: filterActive || undefined,
  });

  if (!items) return <LoadingSkeleton />;
  if (items.data.length === 0) return <EmptyState />;

  return (
    <div className="container mx-auto py-8">
      <SearchBar value={searchParam} onChange={setSearchParam} />
      <FilterToggles active={filterActive} onToggle={setFilterActive} />
      <DataTable data={items.data} />
    </div>
  );
}

export default function EntityPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EntityPageContent />
    </Suspense>
  );
}
```

## Key Elements

### 1. URL State (nuqs)

```tsx
import { parseAsBoolean, parseAsString, parseAsArrayOf, useQueryState } from "nuqs";

// String
const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));

// Boolean
const [active, setActive] = useQueryState("active", parseAsBoolean);

// Array
const [tags, setTags] = useQueryState("tags", parseAsArrayOf(parseAsString).withDefault([]));

// Cast to Convex ID
const entityId = useMemo(() => entityIdParam ? (entityIdParam as Id<"entities">) : null, [entityIdParam]);
```

### 2. Debounced Search

```tsx
import { useDebounce } from "@/hooks/useDebounce";

const [searchParam, setSearchParam] = useQueryState("q", parseAsString.withDefault(""));
const searchQuery = useDebounce(searchParam, 300); // 300ms delay

// Use searchQuery in useQuery, not searchParam
const results = useQuery(api.entities.search, { searchQuery });
```

### 3. Convex Query with Type Workaround

```tsx
// @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
const items = useQuery(api.entities.list, { filters });

// Ensure Id type imported
import type { Doc, Id } from "@/convex/_generated/dataModel";
```

### 4. Mobile Detection

```tsx
import { useMobileDetect } from "@/hooks/useMobileDetect";

const { isMobile } = useMobileDetect();

return isMobile ? <MobileLayout /> : <DesktopLayout />;
```

### 5. Suspense Boundaries

```tsx
export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <PageContent /> {/* Client component with useQuery */}
    </Suspense>
  );
}
```

## Convex Query Pattern

```typescript
// convex/entities.ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { formatEntityList } from "@/lib/utils/formatEntity";

export const search = query({
  args: {
    searchQuery: v.optional(v.string()),
    filterActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return formatEntityList([], "entity");

    let results = await ctx.db
      .query("entities")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      results = results.filter((e) => e.name.toLowerCase().includes(query));
    }

    if (args.filterActive) {
      results = results.filter((e) => e.status === "active");
    }

    return formatEntityList(results, "entity");
  },
});
```

## Common Components

### Search Bar

```tsx
<Input
  placeholder="Search..."
  value={searchParam}
  onChange={(e) => setSearchParam(e.target.value)}
/>
```

### Filter Toggles

```tsx
<div className="flex gap-2">
  <Button
    variant={filterActive ? "default" : "outline"}
    onClick={() => setFilterActive(!filterActive)}
  >
    Active Only
  </Button>
</div>
```

### Empty State

```tsx
<div className="text-center py-12">
  <p className="text-muted-foreground">No items found</p>
  <Button onClick={() => setSearchParam("")}>Clear filters</Button>
</div>
```

## Live Reference

When scaffolding pages, skill will Read existing patterns from:
- `src/app/(main)/notes/page.tsx` - URL state, filters, mobile layout
- `src/app/(main)/bookmarks/page.tsx` - Grid layout, tags
- `src/app/(main)/projects/page.tsx` - Status filters

See `references/complete-example.md` for full page implementation.

## Quick Checklist

- [ ] Suspense wrapper for page
- [ ] Client component for useQuery
- [ ] URL-persisted state with nuqs
- [ ] Debounced search (300ms)
- [ ] @ts-ignore on useQuery with comment
- [ ] Mobile detection if needed
- [ ] Loading skeleton matches layout
- [ ] Empty state with clear action
- [ ] Filters reset search when changed
- [ ] Import Id type from dataModel
