# Phase 13: Production Polish

**Goal**: Complete critical production features - import system, message editing, code splitting

**Status**: Ready for implementation
**Dependencies**: Phase 0-12 (all core features complete)
**Estimated Effort**: ~7-11 hours total

> **⚠️ Implementation Status (2025-12-12)**
>
> **PHASE 13: 0% IMPLEMENTED** - All three features remain incomplete despite detailed specifications.
>
> **Current Reality:**
> - ❌ Import System: Parser (`src/lib/import/chatgpt.ts`), mutation (`convex/import.ts`), UI (`src/app/(main)/settings/import/page.tsx`) - all missing
> - ❌ Message Edit Mutation: `convex/chat.ts:editMessage` - missing (UI exists but calls non-existent mutation)
> - ❌ Code Splitting: Zero `next/dynamic` usage found in codebase - all components statically bundled
> - ✅ Export System: Fully working (`src/lib/export/chatgpt.ts`) - provides reference for import implementation
>
> **Next Step:** Implement import system first (highest user value - ChatGPT migration)

---

## Overview

Final polish for production readiness. Three distinct features:

1. **Import System** (~4-6h) - **HIGHEST PRIORITY** - ChatGPT data migration
2. **Message Edit Mutation** (~1-2h) - Backend for edit functionality (UI exists)
3. **Code Splitting** (~2-3h) - Lazy load heavy components

**Why these three**: Import enables user migration, editing fixes UX gap, code splitting improves performance.

**Current state**: Export ✅ implemented (JSON, Markdown, ChatGPT), message edit UI ✅ exists, large components statically bundled.

---

## Feature 1: Import System ❌ NOT IMPLEMENTED

### Current State Analysis

**Export System (Reference Implementation):**
- ✅ File: `src/lib/export/chatgpt.ts` (193 lines)
- ✅ Converts blah.chat → ChatGPT format
- ✅ Handles conversation metadata, message mapping, parent/child links
- ✅ UI: `src/app/(main)/settings/export/page.tsx` with format selection

**Import System (Missing):**
- ❌ Parser: `src/lib/import/chatgpt.ts` - DOES NOT EXIST
- ❌ Backend: `convex/import.ts` - DOES NOT EXIST
- ❌ UI: `src/app/(main)/settings/import/page.tsx` - DOES NOT EXIST
- ❌ No import functionality anywhere in codebase

**Verified via:**
- `glob("**/import/**")` - No import directory exists
- `grep("import.*chatgpt")` - Only export references found
- Settings page has Export tab, no Import tab

### Problem Statement

Users can export data but can't import from ChatGPT. Blocks migration from ChatGPT to blah.chat.

**Current**: Export fully implemented (`src/lib/export/chatgpt.ts`)
**Missing**: Parser + validation + bulk insert + UI

### ChatGPT Format Reference

```typescript
interface ChatGPTConversation {
  title: string;
  create_time: number; // Unix timestamp (seconds)
  update_time: number;
  mapping: Record<string, ChatGPTMessage>; // Key = message ID
  current_node: string; // Last message ID
  moderation_results: []; // Ignore
}

interface ChatGPTMessage {
  id: string;
  author: { role: "user" | "assistant" | "system" };
  content: {
    content_type: "text";
    parts: string[]; // Array of text chunks
  };
  create_time: number; // Unix timestamp (seconds)
  parent: string; // Parent message ID (for threading)
  children: string[]; // Child message IDs
}
```

**Key characteristics**:
- Messages stored as graph (parent/children links)
- Multiple conversation branches possible
- Timestamps in seconds (blah.chat uses milliseconds)
- Content split into `parts` array (usually 1 element)

---

### Implementation: Parser

**File**: `src/lib/import/chatgpt.ts`

```typescript
import type { Id } from "@/convex/_generated/dataModel";

export interface ParsedConversation {
  title: string;
  messages: ParsedMessage[];
  createdAt: number; // milliseconds
  updatedAt: number; // milliseconds
}

export interface ParsedMessage {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number; // milliseconds
  originalId: string; // ChatGPT message ID (for debugging)
}

/**
 * Parse ChatGPT conversations.json export
 * Flattens message graph into linear conversation
 * Follows main branch (current_node path)
 */
export function parseChatGPTExport(
  data: any
): { conversations: ParsedConversation[]; errors: string[] } {
  const conversations: ParsedConversation[] = [];
  const errors: string[] = [];

  // Handle both single conversation and array
  const convArray = Array.isArray(data) ? data : [data];

  for (const conv of convArray) {
    try {
      // Validate required fields
      if (!conv.title || !conv.mapping || !conv.current_node) {
        errors.push(`Skipping conversation: missing required fields`);
        continue;
      }

      // Build message chain by following parent links from current_node
      const messageChain: ParsedMessage[] = [];
      let currentId = conv.current_node;
      const visited = new Set<string>(); // Prevent cycles

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const msg = conv.mapping[currentId];

        if (!msg) {
          errors.push(
            `Warning: Message ${currentId} not found in mapping for "${conv.title}"`
          );
          break;
        }

        // Skip system/metadata messages
        if (
          !msg.content ||
          !msg.content.parts ||
          msg.content.parts.length === 0
        ) {
          currentId = msg.parent;
          continue;
        }

        // Extract text content (join parts array)
        const content = msg.content.parts.join("\n").trim();

        if (content) {
          messageChain.unshift({
            // Prepend (we're walking backwards)
            role: msg.author.role,
            content,
            createdAt: (msg.create_time || 0) * 1000, // Convert seconds → milliseconds
            originalId: msg.id,
          });
        }

        currentId = msg.parent;
      }

      // Skip empty conversations
      if (messageChain.length === 0) {
        errors.push(`Skipping empty conversation: "${conv.title}"`);
        continue;
      }

      conversations.push({
        title: conv.title,
        messages: messageChain,
        createdAt: (conv.create_time || Date.now() / 1000) * 1000,
        updatedAt: (conv.update_time || Date.now() / 1000) * 1000,
      });
    } catch (error) {
      errors.push(
        `Error parsing conversation "${conv.title || "Unknown"}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return { conversations, errors };
}

/**
 * Validate parsed conversations before import
 * Returns validation errors (empty array = valid)
 */
export function validateImport(
  conversations: ParsedConversation[]
): string[] {
  const errors: string[] = [];

  if (conversations.length === 0) {
    errors.push("No valid conversations found in import file");
    return errors;
  }

  if (conversations.length > 1000) {
    errors.push(
      `Too many conversations (${conversations.length}). Maximum 1000 per import.`
    );
  }

  for (const conv of conversations) {
    // Title validation
    if (!conv.title || conv.title.length > 200) {
      errors.push(
        `Invalid title: "${conv.title?.slice(0, 50)}..." (max 200 chars)`
      );
    }

    // Message count validation
    if (conv.messages.length === 0) {
      errors.push(`Conversation "${conv.title}" has no messages`);
    }

    if (conv.messages.length > 1000) {
      errors.push(
        `Conversation "${conv.title}" has too many messages (${conv.messages.length}). Max 1000.`
      );
    }

    // Message content validation
    for (const msg of conv.messages) {
      if (!msg.content || msg.content.length === 0) {
        errors.push(
          `Empty message in conversation "${conv.title}" (${msg.originalId})`
        );
      }

      if (msg.content.length > 100000) {
        errors.push(
          `Message too long in "${conv.title}" (${msg.content.length} chars). Max 100K.`
        );
      }

      if (!["user", "assistant", "system"].includes(msg.role)) {
        errors.push(`Invalid role "${msg.role}" in "${conv.title}"`);
      }
    }
  }

  return errors;
}
```

---

### Implementation: Backend Import

**File**: `convex/import.ts`

```typescript
import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Import multiple conversations with messages
 * Client-facing mutation that validates user access
 */
export const importConversations = mutation({
  args: {
    conversations: v.array(
      v.object({
        title: v.string(),
        messages: v.array(
          v.object({
            role: v.union(
              v.literal("user"),
              v.literal("assistant"),
              v.literal("system")
            ),
            content: v.string(),
            createdAt: v.number(),
          })
        ),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user) throw new Error("User not found");

    // Import conversations sequentially (avoid overwhelming DB)
    const importedIds: Id<"conversations">[] = [];

    for (const conv of args.conversations) {
      try {
        const conversationId = await ctx.db.insert("conversations", {
          userId: user._id,
          title: conv.title,
          model: user.preferences.defaultModel || "openai:gpt-4o",
          pinned: false,
          archived: false,
          starred: false,
          messageCount: conv.messages.length,
          lastMessageAt: conv.updatedAt,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        });

        // Insert messages in chronological order
        for (const msg of conv.messages) {
          await ctx.db.insert("messages", {
            conversationId,
            userId: user._id,
            role: msg.role,
            content: msg.content,
            status: "complete", // Imported messages are complete
            createdAt: msg.createdAt,
            updatedAt: msg.createdAt,
          });
        }

        importedIds.push(conversationId);
      } catch (error) {
        console.error(`Failed to import "${conv.title}":`, error);
        // Continue with next conversation
      }
    }

    return {
      success: true,
      importedCount: importedIds.length,
      conversationIds: importedIds,
    };
  },
});
```

---

### Implementation: UI

**File**: `src/app/(main)/settings/import/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { parseChatGPTExport, validateImport } from "@/lib/import/chatgpt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    count?: number;
    errors?: string[];
  } | null>(null);

  const importMutation = useMutation(api.import.importConversations);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/json") {
        setResult({ errors: ["Please select a JSON file"] });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setParsing(true);
    setResult(null);

    try {
      // Read file
      const text = await file.text();
      const data = JSON.parse(text);

      // Parse ChatGPT format
      const { conversations, errors: parseErrors } = parseChatGPTExport(data);

      if (parseErrors.length > 0) {
        console.warn("Parse warnings:", parseErrors);
      }

      // Validate
      const validationErrors = validateImport(conversations);

      if (validationErrors.length > 0) {
        setResult({ errors: validationErrors });
        setParsing(false);
        return;
      }

      // Import to backend
      setParsing(false);
      setImporting(true);

      const importResult = await importMutation({ conversations });

      setResult({
        success: true,
        count: importResult.importedCount,
        errors: parseErrors.length > 0 ? parseErrors : undefined,
      });
    } catch (error) {
      setResult({
        errors: [
          error instanceof Error
            ? error.message
            : "Failed to import. Invalid file format.",
        ],
      });
    } finally {
      setParsing(false);
      setImporting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-3xl font-bold mb-6">Import Conversations</h1>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">ChatGPT Import</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Import your ChatGPT conversations. Export from ChatGPT via Settings
            → Data Controls → Export Data.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="flex-1 file:mr-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-4 file:py-2"
              />

              <Button
                onClick={handleImport}
                disabled={!file || parsing || importing}
              >
                {parsing ? (
                  <>Parsing...</>
                ) : importing ? (
                  <>Importing...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </>
                )}
              </Button>
            </div>

            {file && !result && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>

        {result && (
          <div className="space-y-2">
            {result.success && (
              <Alert className="border-green-500">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  Successfully imported {result.count} conversations!
                </AlertDescription>
              </Alert>
            )}

            {result.errors && result.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Import Errors:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {result.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>...and {result.errors.length - 10} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {result.success && result.errors && result.errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Imported with warnings (some conversations skipped)
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </Card>

      <div className="mt-8 text-sm text-muted-foreground">
        <h3 className="font-medium mb-2">Supported Formats:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>ChatGPT conversations.json export</li>
          <li>Single conversation or batch export</li>
          <li>Max 1000 conversations, 1000 messages each</li>
        </ul>
      </div>
    </div>
  );
}
```

---

### Testing Checklist

- [ ] Export sample conversation from ChatGPT
- [ ] Parse exported JSON, verify all messages extracted
- [ ] Import parsed data, verify conversations created
- [ ] Check message order (chronological)
- [ ] Verify timestamps converted (seconds → milliseconds)
- [ ] Test error handling (malformed JSON, missing fields)
- [ ] Import large file (100+ conversations)
- [ ] Verify UI shows progress and errors
- [ ] Check imported conversations appear in sidebar
- [ ] Open imported conversation, verify messages render correctly

---

## Feature 2: Message Edit Mutation ❌ NOT IMPLEMENTED

### Current State Analysis

**Frontend UI (Partial):**
- ✅ File: `src/components/chat/MessageActionsMenu.tsx`
- ✅ Delete message button exists and works
- ❌ Edit button: May exist in UI but no backend mutation to call
- ❌ Edit dialog/input: Implementation unclear without working backend

**Backend (Missing):**
- ❌ `convex/chat.ts` - No `editMessage` mutation found
- ✅ `convex/chat.ts` - Has `deleteMessage` mutation (reference pattern)
- ✅ Schema supports editing (messages have `updatedAt` field)

**Verified via:**
- Searched `convex/chat.ts` for `editMessage` - not found
- Checked `convex/messages.ts` - no edit mutation there either
- Pattern exists in `deleteMessage` (lines 150-180) - can be adapted

### Problem Statement

UI has edit button (`MessageActionsMenu.tsx`) but backend mutation missing. Clicking edit does nothing.

**Current**: Edit button renders, opens edit dialog
**Missing**: `editMessage` mutation in `convex/chat.ts`

### Implementation

**File**: `convex/chat.ts` (add mutation)

```typescript
/**
 * Edit a user message and regenerate from that point
 * Deletes all messages after edited message, creates new branch
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    newContent: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get original message
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // 2. Verify it's a user message
    if (message.role !== "user") {
      throw new Error("Can only edit user messages");
    }

    // 3. Verify user owns this conversation
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user._id !== conversation.userId) {
      throw new Error("Unauthorized");
    }

    // 4. Delete all messages after this one (they'll be regenerated)
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", message.conversationId)
      )
      .collect();

    // Sort chronologically
    const sortedMessages = allMessages.sort((a, b) => a.createdAt - b.createdAt);

    // Find position of edited message
    const editedIndex = sortedMessages.findIndex((m) => m._id === args.messageId);

    // Delete messages after edited message
    for (let i = editedIndex + 1; i < sortedMessages.length; i++) {
      await ctx.db.delete(sortedMessages[i]._id);
    }

    // 5. Update the edited message
    await ctx.db.patch(args.messageId, {
      content: args.newContent,
      updatedAt: Date.now(),
    });

    // 6. Create new pending assistant message
    const assistantMessageId = await ctx.db.insert("messages", {
      conversationId: message.conversationId,
      userId: user._id,
      role: "assistant",
      content: "",
      status: "pending",
      model: conversation.model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 7. Schedule generation
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      conversationId: message.conversationId,
      assistantMessageId,
      modelId: conversation.model,
      userId: user._id,
    });

    return { success: true, assistantMessageId };
  },
});
```

### Frontend Integration

**File**: `src/components/chat/MessageActionsMenu.tsx` (update to call mutation)

```typescript
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function MessageActionsMenu({ message }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const editMutation = useMutation(api.chat.editMessage);

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    try {
      await editMutation({
        messageId: message._id,
        newContent: editContent,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to edit message:", error);
      // Show error toast
    }
  };

  // ... rest of component
}
```

### Testing Checklist

- [ ] Edit user message, verify content updates
- [ ] Verify subsequent messages deleted
- [ ] Verify new assistant message generated
- [ ] Test edit during generation (should fail or queue)
- [ ] Test editing non-user message (should fail)
- [ ] Test editing message in shared conversation (permission check)
- [ ] Edit with empty content (validation)
- [ ] Edit multiple times in sequence

---

## Feature 3: Code Splitting ❌ NOT IMPLEMENTED

### Current State Analysis

**Current Bundle (Static Loading):**
- ❌ No `next/dynamic` imports found in codebase
- ❌ All components statically bundled
- ❌ Large components load on initial page paint

**Components That Should Be Code Split:**
- `src/components/CommandPalette.tsx` (~500 lines, keyboard-activated)
- `src/components/chat/VirtualizedMessageList.tsx` (only for 50+ messages)
- `src/components/settings/*Settings.tsx` (lazy load per tab)
- `src/components/modals/*Dialog.tsx` (user-triggered)

**Verified via:**
- `grep("next/dynamic")` - No matches found
- `grep("React.lazy")` - No matches found
- All imports are synchronous `import` statements

**Build Output (Estimated):**
- Main bundle: ~275 kB (includes all components)
- Target after code splitting: ~205 kB (-25%)

### Problem Statement

Large components loaded on initial page load → slow FCP (First Contentful Paint).

**Current**: Zero `next/dynamic` usage, all components statically bundled
**Target**: Lazy load heavy components (CommandPalette, VirtualizedMessageList, settings modals)

### Implementation: CommandPalette

**File**: `src/app/(main)/chat/[conversationId]/page.tsx`

```typescript
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Lazy load CommandPalette (uses cmdk, virtualization, ~500 lines)
const CommandPalette = dynamic(
  () => import("@/components/CommandPalette").then((mod) => mod.CommandPalette),
  {
    ssr: false, // Command palette is client-only
    loading: () => null, // No loader needed (keyboard-activated)
  }
);

export default function ChatPage({ params }: Props) {
  return (
    <div>
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
      {/* ... rest of page */}
    </div>
  );
}
```

### Implementation: VirtualizedMessageList

**File**: `src/components/chat/MessageList.tsx`

```typescript
import dynamic from "next/dynamic";
import { MessageItem } from "./MessageItem";

// Lazy load virtualized list (only needed for 50+ messages)
const VirtualizedMessageList = dynamic(
  () =>
    import("./VirtualizedMessageList").then((mod) => mod.VirtualizedMessageList),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    ),
  }
);

export function MessageList({ messages }: Props) {
  const shouldVirtualize = messages.length > 50;

  if (shouldVirtualize) {
    return <VirtualizedMessageList messages={messages} />;
  }

  // Regular list for <50 messages
  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <MessageItem key={msg._id} message={msg} />
      ))}
    </div>
  );
}
```

### Implementation: Settings Modals

**File**: `src/app/(main)/settings/page.tsx`

```typescript
import dynamic from "next/dynamic";

// Lazy load heavy settings sections
const ModelSettings = dynamic(() => import("@/components/settings/ModelSettings"), {
  loading: () => <SettingsSkeleton />,
});

const BudgetSettings = dynamic(() => import("@/components/settings/BudgetSettings"), {
  loading: () => <SettingsSkeleton />,
});

const ExportSettings = dynamic(() => import("@/components/settings/ExportSettings"), {
  loading: () => <SettingsSkeleton />,
});
```

### Bundle Analysis

**Before** (no code splitting):
```
Page                                  Size     First Load JS
┌ ○ /chat/[id]                       45 kB          275 kB
├ ○ /settings                        38 kB          268 kB
└ ○ /                                 12 kB          242 kB
```

**After** (with code splitting):
```
Page                                  Size     First Load JS
┌ ○ /chat/[id]                       32 kB          220 kB  ↓ 55 kB
├ ○ /settings                        28 kB          215 kB  ↓ 53 kB
└ ○ /                                 12 kB          205 kB  ↓ 37 kB
```

**Result**: ~20-25% reduction in initial bundle size.

### Testing Checklist

- [ ] Run `bun run build`, verify bundle sizes reduced
- [ ] Test CommandPalette lazy loads (check Network tab)
- [ ] Verify keyboard shortcut (Cmd+K) still works
- [ ] Test virtualized list loads for large conversations
- [ ] Check settings modals lazy load
- [ ] Verify no flash of unstyled content (FOUC)
- [ ] Test on slow 3G connection (lazy loading visible)
- [ ] Lighthouse audit: FCP improved

---

## Acceptance Criteria

### Import System
- ✅ Parse ChatGPT conversations.json without errors
- ✅ Validate data before import (catch malformed files)
- ✅ Import 100+ conversations in <10 seconds
- ✅ UI shows progress and detailed errors
- ✅ Imported conversations appear in sidebar immediately

### Message Edit
- ✅ Edit user message, subsequent messages deleted
- ✅ New response generated from edited message
- ✅ Cannot edit assistant messages (validation)
- ✅ Cannot edit in conversations you don't own (auth)

### Code Splitting
- ✅ Bundle size reduced by >20%
- ✅ CommandPalette loads on first keyboard trigger
- ✅ VirtualizedMessageList loads for large conversations
- ✅ No regression in functionality

---

## Troubleshooting

### Import: "No valid conversations found"

**Cause**: ChatGPT export format changed or file corrupted
**Fix**: Check `mapping` structure in JSON, verify `current_node` exists

### Import: Conversations imported but empty

**Cause**: Message content in `parts` array not extracted
**Fix**: Check parser `msg.content.parts.join()` logic

### Message Edit: "Mutation failed"

**Cause**: Action still running for previous generation
**Fix**: Add status check before allowing edit (only allow when `status === "complete"`)

### Code Splitting: Components not loading

**Cause**: Missing `"use client"` directive in lazy-loaded component
**Fix**: Ensure all dynamic components have `"use client"` at top

### Code Splitting: Hydration mismatch

**Cause**: SSR enabled for client-only component
**Fix**: Set `ssr: false` in `dynamic()` options

---

## Related Features

- **Export System**: Phase 10 - Fully implemented (`src/lib/export/`)
- **Conversation Branching**: Phase 8 - Schema supports branches, edit creates new branch
- **Virtualization**: Phase 11 - Implemented (`VirtualizedMessageList.tsx`)

---

## Next Steps After Phase 13

1. **Test import with real ChatGPT exports** (get test data from users)
2. **Monitor bundle sizes in production** (setup Lighthouse CI)
3. **Phase 14**: Infrastructure refinements (API envelopes, scheduled prompts UI)
4. **Phase 15**: Provider extensions (DeepGram STT, OpenAI TTS)

---

## Notes

- Import system is HIGHEST PRIORITY - enables ChatGPT migration
- Message edit leverages existing branching schema (no schema changes)
- Code splitting is incremental - start with largest components first
- All three features production-ready after implementation + testing
