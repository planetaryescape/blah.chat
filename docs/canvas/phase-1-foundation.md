# Phase 1: Canvas Foundation

## Overview

This phase establishes the foundational infrastructure for the Canvas feature - a split-screen document editor that appears alongside chat for collaborative writing and coding tasks. Similar to ChatGPT Canvas and Claude Artifacts, this feature keeps chat lean while enabling LLM-assisted document editing via diffs rather than full rewrites.

## Context

### What is Canvas?

Canvas is a persistent document editor that opens alongside chat when users work on writing or coding tasks. Instead of the LLM rewriting entire documents in chat messages (which bloats context and loses edit history), Canvas:

1. **Opens a split-screen editor** when document editing begins
2. **Persists document state** in the database (survives refresh)
3. **Uses diffs for edits** - LLM sends targeted changes, not full rewrites
4. **Supports user edits** - users can manually edit, and changes are tracked as diffs
5. **Keeps chat lean** - conversation focuses on instructions, not content display

### Why Build This?

- **Context efficiency**: Sending full documents on every message wastes tokens
- **Edit precision**: Diffs show exactly what changed (like git)
- **User control**: Direct editing + LLM assistance in one workspace
- **Better UX**: Long documents don't clutter the chat interface

## Prerequisites

- Existing chat implementation (complete)
- Convex schema and mutations (complete)
- Tool system with 18+ tools (complete)
- Split-screen patterns (Tasks dashboard reference)

## What Comes After

- **Phase 2**: Monaco editor integration
- **Phase 3**: Document management tools for LLM
- **Phase 4**: Diff system (grabber + applier)
- **Phase 5**: Mode system with context injection
- **Phase 6**: Polish and conflict resolution

---

## Scope

### In Scope

1. Database schema for canvas documents
2. Convex queries/mutations for document CRUD
3. Canvas context provider for state management
4. Split-screen layout component
5. Basic UI shell (header, placeholder editor area)

### Out of Scope

- Actual Monaco editor (Phase 2)
- LLM tools (Phase 3)
- Diff operations (Phase 4)
- Mode switching logic (Phase 5)

---

## Implementation

### 1. Database Schema

Add to `convex/schema.ts`:

```typescript
// Canvas documents table
canvasDocuments: defineTable({
  // Ownership
  userId: v.id("users"),
  conversationId: v.id("conversations"),

  // Content
  title: v.string(),
  content: v.string(),
  language: v.optional(v.string()), // "typescript", "python", "markdown", etc.

  // Type: "code" for programming, "prose" for essays/articles
  documentType: v.union(v.literal("code"), v.literal("prose")),

  // Versioning (for undo/redo and conflict resolution)
  version: v.number(),

  // Status
  status: v.union(
    v.literal("active"),
    v.literal("archived")
  ),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_conversation", ["conversationId"])
  .index("by_user_conversation", ["userId", "conversationId"]),

// Canvas version history (follows activityEvents pattern)
canvasHistory: defineTable({
  documentId: v.id("canvasDocuments"),
  userId: v.id("users"),
  content: v.string(),
  version: v.number(),
  source: v.union(
    v.literal("user_edit"),
    v.literal("llm_diff"),
    v.literal("created")
  ),
  diff: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_document", ["documentId"])
  .index("by_document_version", ["documentId", "version"]),
```

### 2. Convex Queries and Mutations

Create `convex/canvas/documents.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUser, getCurrentUserOrCreate } from "../lib/userSync";

// Get active document for a conversation
export const getByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    return await ctx.db
      .query("canvasDocuments")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", user._id).eq("conversationId", conversationId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

// Get document by ID
export const get = query({
  args: { documentId: v.id("canvasDocuments") },
  handler: async (ctx, { documentId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== user._id) return null;

    return doc;
  },
});

// Create new document
export const create = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
    content: v.string(),
    language: v.optional(v.string()),
    documentType: v.union(v.literal("code"), v.literal("prose")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrCreate(ctx);
    if (!user) throw new Error("Not authenticated");

    // Archive any existing active document for this conversation
    const existing = await ctx.db
      .query("canvasDocuments")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", user._id).eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { status: "archived" });
    }

    const now = Date.now();
    const documentId = await ctx.db.insert("canvasDocuments", {
      userId: user._id,
      conversationId: args.conversationId,
      title: args.title,
      content: args.content,
      language: args.language,
      documentType: args.documentType,
      version: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Create initial history entry
    await ctx.db.insert("canvasHistory", {
      documentId,
      userId: user._id,
      content: args.content,
      version: 1,
      source: "created",
      createdAt: now,
    });

    return documentId;
  },
});

// Update document content
export const updateContent = mutation({
  args: {
    documentId: v.id("canvasDocuments"),
    content: v.string(),
    source: v.union(v.literal("user_edit"), v.literal("llm_diff")),
    diff: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, content, source, diff }) => {
    const user = await getCurrentUserOrCreate(ctx);
    if (!user) throw new Error("Not authenticated");

    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== user._id) {
      throw new Error("Document not found");
    }

    const newVersion = doc.version + 1;
    const now = Date.now();

    // Update document
    await ctx.db.patch(documentId, {
      content,
      version: newVersion,
      updatedAt: now,
    });

    // Add history entry
    await ctx.db.insert("canvasHistory", {
      documentId,
      userId: user._id,
      content,
      version: newVersion,
      source,
      diff,
      createdAt: now,
    });

    return { version: newVersion };
  },
});

// Update document metadata (title, language)
export const updateMetadata = mutation({
  args: {
    documentId: v.id("canvasDocuments"),
    title: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, { documentId, ...updates }) => {
    const user = await getCurrentUserOrCreate(ctx);
    if (!user) throw new Error("Not authenticated");

    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== user._id) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(documentId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Archive document
export const archive = mutation({
  args: { documentId: v.id("canvasDocuments") },
  handler: async (ctx, { documentId }) => {
    const user = await getCurrentUserOrCreate(ctx);
    if (!user) throw new Error("Not authenticated");

    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== user._id) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(documentId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});
```

Create `convex/canvas/history.ts`:

```typescript
import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser } from "../lib/userSync";

// Get document history for undo/redo
export const getHistory = query({
  args: {
    documentId: v.id("canvasDocuments"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { documentId, limit = 50 }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== user._id) return [];

    return await ctx.db
      .query("canvasHistory")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .order("desc")
      .take(limit);
  },
});

// Get specific version
export const getVersion = query({
  args: {
    documentId: v.id("canvasDocuments"),
    version: v.number(),
  },
  handler: async (ctx, { documentId, version }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const doc = await ctx.db.get(documentId);
    if (!doc || doc.userId !== user._id) return null;

    return await ctx.db
      .query("canvasHistory")
      .withIndex("by_document_version", (q) =>
        q.eq("documentId", documentId).eq("version", version)
      )
      .first();
  },
});
```

### 3. Canvas Context Provider

Create `src/contexts/CanvasContext.tsx`:

**NOTE:** Following the simple pattern from `ConversationContext.tsx` - minimal state, no complex logic:

```typescript
"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { createContext, useContext, useState, type ReactNode } from "react";

// Simple context following ConversationContext pattern
interface CanvasContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  documentId: Id<"canvasDocuments"> | null;
  setDocumentId: (id: Id<"canvasDocuments"> | null) => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [documentId, setDocumentId] = useState<Id<"canvasDocuments"> | null>(null);

  return (
    <CanvasContext.Provider
      value={{ isOpen, setIsOpen, documentId, setDocumentId }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider");
  }
  return context;
}
```

**Note:** Queries and mutations are called directly in components using `useQuery` and `useMutation` from Convex React, not wrapped in the context. This matches the existing pattern in the codebase where contexts only hold minimal state.

### 4. Split-Screen Layout Component

Create `src/components/canvas/CanvasPanel.tsx`:

**NOTE:** Following TaskDetailPanel pattern - fixed 400px width, conditional render:

```typescript
"use client";

import { useCanvas } from "@/contexts/CanvasContext";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CanvasPanel() {
  const { isOpen, setIsOpen, documentId } = useCanvas();

  // Query document directly in component (not in context)
  const document = useQuery(
    api.canvas.documents.get,
    documentId ? { documentId } : "skip"
  );

  if (!isOpen) return null;

  return (
    <div className="w-[400px] border-l border-border flex flex-col bg-background">
      {/* Header - matches TaskDetailPanel pattern */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">
            {document?.title ?? "Untitled"}
          </span>
          {document?.language && (
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {document.language}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Monaco editor placeholder - Phase 2 */}
          <pre className="text-sm font-mono whitespace-pre-wrap text-muted-foreground">
            {document?.content || "No content yet."}
          </pre>
        </div>
      </ScrollArea>
    </div>
  );
}
```

### 5. Integration with Chat Page

Update the chat page layout to include CanvasProvider and CanvasPanel:

```typescript
// In src/app/(main)/chat/[conversationId]/page.tsx

import { CanvasProvider } from "@/contexts/CanvasContext";
import { CanvasPanel } from "@/components/canvas/CanvasPanel";

// Wrap content and add panel (following TaskDetailPanel pattern):
export default function ChatPage({ params }: { params: { conversationId: string } }) {
  return (
    <CanvasProvider>
      <div className="flex h-full">
        {/* Existing chat content */}
        <div className="flex-1 min-w-0">
          {/* ... existing chat implementation ... */}
        </div>

        {/* Canvas panel - conditionally rendered inside */}
        <CanvasPanel />
      </div>
    </CanvasProvider>
  );
}
```

---

## File Structure

After this phase, new files:

```
convex/
├── canvas/
│   ├── documents.ts      # Document CRUD mutations/queries
│   └── history.ts        # Version history queries
├── schema.ts             # Updated with canvasDocuments, canvasHistory

src/
├── contexts/
│   └── CanvasContext.tsx # Canvas state management (simple useState wrapper)
├── components/
│   └── canvas/
│       └── CanvasPanel.tsx # Fixed-width panel (400px)
```

---

## Testing Checklist

- [ ] Schema deploys without errors (`bunx convex dev`)
- [ ] Can create a canvas document via Convex dashboard
- [ ] Document persists across page refresh
- [ ] CanvasProvider renders without errors
- [ ] `useCanvas()` hook returns expected values
- [ ] Split-screen layout appears when `isOpen` is true
- [ ] Canvas closes when close button clicked
- [ ] Document history entries created on content updates
- [ ] Multiple documents for same conversation: old one archived

---

## Dependencies

No new npm dependencies in this phase.

---

## Notes

- **Fixed width panel**: Following TaskDetailPanel pattern, canvas uses fixed 400px width (not percentage-based)
- **Simple context**: CanvasContext follows ConversationContext pattern - just useState wrappers, no complex logic
- **Version history**: Simple append-only log, not git-style branching
- **One active document per conversation**: Archives old when new created
- **Normalized schema**: Junction pattern avoided; direct FK relationship

---

## References

- ChatGPT Canvas: https://openai.com/index/introducing-canvas/
- Claude Artifacts: https://support.claude.com/en/articles/9487310
- Existing Tasks split-screen: `src/app/(main)/tasks/_components/`
