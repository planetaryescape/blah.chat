> Historical Convex reference. The current Postgres workflow is in [the project skill](../SKILL.md). Verify the branch before applying these examples.

# Complete Page Example

Full implementation of list page with all patterns.

```tsx
"use client";

import { useMutation, useQuery } from "convex/react";
import { Plus, Search } from "lucide-react";
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  useQueryState,
} from "nuqs";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/useDebounce";
import { useMobileDetect } from "@/hooks/useMobileDetect";

// Components
function LoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-muted-foreground mb-4">No items found</p>
      <Button variant="outline" onClick={onClear}>
        Clear Filters
      </Button>
    </div>
  );
}

function EntityPageContent() {
  // URL-persisted state
  const [searchParam, setSearchParam] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const searchQuery = useDebounce(searchParam, 300);

  const [filterActive, setFilterActive] = useQueryState(
    "active",
    parseAsBoolean.withDefault(true),
  );

  const [selectedTags, setSelectedTags] = useQueryState(
    "tags",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const [selectedId, setSelectedId] = useQueryState(
    "id",
    parseAsString.withDefault(""),
  );

  const entityId = useMemo(
    () => (selectedId ? (selectedId as Id<"entities">) : null),
    [selectedId],
  );

  // Mobile detection
  const { isMobile } = useMobileDetect();
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // Convex queries
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const items = useQuery(api.entities.search, {
    searchQuery,
    filterActive: filterActive || undefined,
    filterTags: selectedTags.length > 0 ? selectedTags : undefined,
  });

  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const selectedItem = useQuery(
    api.entities.get,
    entityId ? { id: entityId } : "skip",
  );

  // Convex mutations
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const createItem = useMutation(api.entities.create);

  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updateItem = useMutation(api.entities.update);

  // Handlers
  const handleCreate = async () => {
    try {
      const newId = await createItem({ name: "New Item" });
      setSelectedId(newId);
      toast.success("Item created");
    } catch (error) {
      toast.error("Failed to create item");
    }
  };

  const handleClearFilters = () => {
    setSearchParam("");
    setFilterActive(true);
    setSelectedTags([]);
  };

  // Loading state
  if (!items) return <LoadingSkeleton />;

  // Empty state
  if (items.data.length === 0) {
    return <EmptyState onClear={handleClearFilters} />;
  }

  // Mobile layout
  if (isMobile) {
    if (mobileView === "detail" && selectedItem) {
      return (
        <div className="container mx-auto py-4">
          <Button
            variant="ghost"
            onClick={() => setMobileView("list")}
            className="mb-4"
          >
            ← Back
          </Button>
          <DetailView item={selectedItem.data} onUpdate={updateItem} />
        </div>
      );
    }

    return (
      <div className="container mx-auto py-4">
        <div className="mb-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchParam}
              onChange={(e) => setSearchParam(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={filterActive ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterActive(!filterActive)}
            >
              Active Only
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {items.data.map((item) => (
            <button
              key={item._id}
              onClick={() => {
                setSelectedId(item._id);
                setMobileView("detail");
              }}
              className="w-full text-left p-4 rounded-lg border hover:bg-accent"
            >
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop layout (split view)
  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-3 gap-6">
        {/* Left: List */}
        <div className="col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Items</h1>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchParam}
              onChange={(e) => setSearchParam(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={filterActive ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterActive(!filterActive)}
            >
              Active Only
            </Button>
          </div>

          <div className="space-y-2">
            {items.data.map((item) => (
              <button
                key={item._id}
                onClick={() => setSelectedId(item._id)}
                className={`w-full text-left p-3 rounded-lg border ${
                  item._id === entityId
                    ? "bg-accent border-primary"
                    : "hover:bg-accent"
                }`}
              >
                <h3 className="font-medium text-sm">{item.name}</h3>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="col-span-2">
          {selectedItem ? (
            <DetailView item={selectedItem.data} onUpdate={updateItem} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select an item to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Detail view component
function DetailView({
  item,
  onUpdate,
}: {
  item: Doc<"entities">;
  onUpdate: any;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description || "");

  const handleSave = async () => {
    try {
      await onUpdate({ id: item._id, name, description });
      toast.success("Saved");
    } catch (error) {
      toast.error("Failed to save");
    }
  };

  return (
    <div className="space-y-4">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="w-full h-32 p-3 rounded-lg border"
      />
      <Button onClick={handleSave}>Save Changes</Button>
    </div>
  );
}

// Page export (with Suspense)
export default function EntityPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EntityPageContent />
    </Suspense>
  );
}
```

## Convex Backend

```typescript
// convex/entities.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { formatEntity, formatEntityList } from "@/lib/utils/formatEntity";

async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  // Implementation from internal helper
  return { _id: "user123" as Id<"users"> };
}

export const search = query({
  args: {
    searchQuery: v.optional(v.string()),
    filterActive: v.optional(v.boolean()),
    filterTags: v.optional(v.array(v.string())),
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
      results = results.filter((e) =>
        e.name.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
      );
    }

    if (args.filterActive) {
      results = results.filter((e) => e.status === "active");
    }

    if (args.filterTags && args.filterTags.length > 0) {
      results = results.filter((e) =>
        args.filterTags!.some((tag) => e.tags?.includes(tag))
      );
    }

    return formatEntityList(results, "entity");
  },
});

export const get = query({
  args: { id: v.id("entities") },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id);
    if (!item) return formatEntity(null, "entity");

    const user = await getCurrentUser(ctx);
    if (item.userId !== user._id) return formatEntity(null, "entity");

    return formatEntity(item, "entity");
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const id = await ctx.db.insert("entities", {
      userId: user._id,
      name,
      status: "active",
      createdAt: Date.now(),
    });

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("entities"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { id, name, description }) => {
    const item = await ctx.db.get(id);
    if (!item) throw new Error("Not found");

    const user = await getCurrentUser(ctx);
    if (item.userId !== user._id) throw new Error("Unauthorized");

    await ctx.db.patch(id, { name, description, updatedAt: Date.now() });
  },
});
```

---

This example demonstrates all key patterns: URL state, debouncing, Convex queries, mobile/desktop layouts, CRUD operations, error handling, empty states.
