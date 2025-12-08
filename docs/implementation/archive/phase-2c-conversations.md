# Phase 2C: Conversation Management

**Goal**: Organize chats - sidebar, list, rename, delete, archive, search.

**Status**: Ready after Phase 2B
**Dependencies**: Phase 2B (chat UX)
**Estimated Effort**: ~1-2 days

---

## Overview

Functional sidebar for managing conversations. Create, switch, rename, delete, search.

---

## Tasks

### 1. Sidebar Component

**Update layout**:

```typescript
// app/(main)/layout.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { UserButton } from '@clerk/nextjs';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
```

**Sidebar component**:

```typescript
// components/sidebar/Sidebar.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ConversationList } from './ConversationList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const conversations = useQuery(api.conversations.list);
  const createConversation = useMutation(api.conversations.create);
  const router = useRouter();

  const handleNewChat = async () => {
    const conversationId = await createConversation({
      model: 'openai:gpt-4o-mini',
    });
    router.push(`/chat/${conversationId}`);
  };

  const filteredConversations = conversations?.filter((conv) =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-64 border-r bg-muted/10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">blah.chat</h1>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>

        <Button onClick={handleNewChat} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        <ConversationList conversations={filteredConversations || []} />
      </div>

      {/* Footer */}
      <div className="p-2 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
          <Link href="/settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </Button>
      </div>
    </aside>
  );
}
```

---

### 2. Conversation List

```typescript
// components/sidebar/ConversationList.tsx
'use client';

import { ConversationItem } from './ConversationItem';
import type { Doc } from '@/convex/_generated/dataModel';

interface ConversationListProps {
  conversations: Doc<'conversations'>[];
}

export function ConversationList({ conversations }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  // Separate pinned and unpinned
  const pinned = conversations.filter((c) => c.pinned);
  const unpinned = conversations.filter((c) => !c.pinned);

  return (
    <div className="py-2">
      {pinned.length > 0 && (
        <div className="mb-4">
          <div className="px-4 py-1 text-xs font-medium text-muted-foreground uppercase">
            Pinned
          </div>
          {pinned.map((conversation) => (
            <ConversationItem key={conversation._id} conversation={conversation} />
          ))}
        </div>
      )}

      {unpinned.map((conversation) => (
        <ConversationItem key={conversation._id} conversation={conversation} />
      ))}
    </div>
  );
}
```

---

### 3. Conversation Item

```typescript
// components/sidebar/ConversationItem.tsx
'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Edit, Archive, Pin, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RenameDialog } from './RenameDialog';

interface ConversationItemProps {
  conversation: Doc<'conversations'>;
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showRename, setShowRename] = useState(false);

  const deleteConversation = useMutation(api.conversations.deleteConversation);
  const togglePin = useMutation(api.conversations.togglePin);
  const toggleStar = useMutation(api.conversations.toggleStar);
  const archiveConversation = useMutation(api.conversations.archive);

  const isActive = pathname === `/chat/${conversation._id}`;

  const handleClick = () => {
    router.push(`/chat/${conversation._id}`);
  };

  const handleDelete = async () => {
    await deleteConversation({ conversationId: conversation._id });
    if (isActive) {
      router.push('/chat');
    }
  };

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-2 px-2 mx-2 py-2 rounded cursor-pointer hover:bg-accent transition-colors',
          isActive && 'bg-accent'
        )}
        onClick={handleClick}
      >
        <div className="flex-1 truncate">
          <p className="text-sm truncate">
            {conversation.title || 'New conversation'}
          </p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {conversation.starred && (
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          )}
          {conversation.pinned && <Pin className="w-3 h-3 text-primary" />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowRename(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => togglePin({ conversationId: conversation._id })}
              >
                <Pin className="w-4 h-4 mr-2" />
                {conversation.pinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleStar({ conversationId: conversation._id })}
              >
                <Star className="w-4 h-4 mr-2" />
                {conversation.starred ? 'Unstar' : 'Star'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => archiveConversation({ conversationId: conversation._id })}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <RenameDialog
        conversation={conversation}
        open={showRename}
        onOpenChange={setShowRename}
      />
    </>
  );
}
```

---

### 4. Rename Dialog

```typescript
// components/sidebar/RenameDialog.tsx
'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface RenameDialogProps {
  conversation: Doc<'conversations'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameDialog({
  conversation,
  open,
  onOpenChange,
}: RenameDialogProps) {
  const [title, setTitle] = useState(conversation.title || '');
  const renameConversation = useMutation(api.conversations.rename);

  const handleSave = async () => {
    await renameConversation({
      conversationId: conversation._id,
      title,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename conversation</DialogTitle>
        </DialogHeader>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter title..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 5. Convex Mutations

```typescript
// convex/conversations.ts - add to existing file
export const rename = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const deleteConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Delete all messages in conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete conversation
    await ctx.db.delete(args.conversationId);
  },
});

export const archive = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.conversationId, {
      archived: true,
      updatedAt: Date.now(),
    });
  },
});

export const togglePin = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    await ctx.db.patch(args.conversationId, {
      pinned: !conversation.pinned,
      updatedAt: Date.now(),
    });
  },
});

export const toggleStar = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    await ctx.db.patch(args.conversationId, {
      starred: !conversation.starred,
      updatedAt: Date.now(),
    });
  },
});
```

---

### 6. Auto-Generate Titles

**Add to generation action**:

```typescript
// convex/generation.ts - add after completing message
// Check if conversation needs title
const conversation = await ctx.runQuery(internal.conversations.get, {
  conversationId: args.conversationId,
});

if (!conversation.title) {
  // Generate title from first message
  const firstMessage = historyMessages[0];
  if (firstMessage) {
    const titleResult = await generateText({
      model: registry.languageModel('openai:gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: 'Generate a short, concise title (3-6 words) for this conversation based on the first message. Only return the title, nothing else.',
        },
        {
          role: 'user',
          content: firstMessage.content,
        },
      ],
      maxTokens: 20,
    });

    await ctx.runMutation(internal.conversations.setTitle, {
      conversationId: args.conversationId,
      title: titleResult.text.trim(),
    });
  }
}
```

**Internal mutation**:

```typescript
// convex/conversations.ts
export const setTitle = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title,
    });
  },
});
```

---

### 7. Keyboard Shortcuts

**New chat (Cmd+N)**:

```typescript
// components/sidebar/Sidebar.tsx - add useEffect
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      handleNewChat();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## Deliverables

1. Functional sidebar with conversation list
2. Create new conversation (Cmd+N)
3. Rename conversation
4. Delete conversation (with confirmation)
5. Archive conversation
6. Pin/Star conversations
7. Search conversations by title
8. Auto-generate titles
9. Active conversation highlighting

---

## Acceptance Criteria

- [ ] Sidebar shows all conversations
- [ ] Can create new conversation (Cmd+N)
- [ ] Can rename conversations
- [ ] Can delete conversations
- [ ] Can pin/star conversations
- [ ] Pinned conversations appear at top
- [ ] Search filters conversations
- [ ] Auto-generated titles appear after first exchange
- [ ] Active conversation highlighted
- [ ] Actions (rename/delete/etc) work from dropdown

---

## Next Steps

Phase 3: Multi-model support (OpenAI, Anthropic, Google, Ollama)
