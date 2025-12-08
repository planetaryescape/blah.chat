# Phase 2B: Chat UX Polish

**Goal**: Make chat feel great - markdown, code blocks, actions.

**Status**: Ready after Phase 2A
**Dependencies**: Phase 2A (core chat)
**Estimated Effort**: ~1-2 days

---

## Overview

Transform basic text display into polished chat experience. Markdown rendering, syntax-highlighted code, message actions.

---

## Tasks

### 1. Markdown Rendering

**Install**:
```bash
npm install react-markdown remark-gfm rehype-highlight
```

**Update MessageItem**:

```typescript
// components/chat/MessageItem.tsx
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css'; // or theme matching design

import { cn } from '@/lib/utils';
import type { Doc } from '@/convex/_generated/dataModel';
import { Loader2 } from 'lucide-react';
import { MessageActions } from './MessageActions';

interface MessageItemProps {
  message: Doc<'messages'>;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isGenerating = message.status === 'generating' || message.status === 'pending';
  const isError = message.status === 'error';

  const displayContent = message.partialContent || message.content;

  return (
    <div
      className={cn(
        'flex',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        {isError ? (
          <div className="text-destructive">
            <p className="font-medium">Error</p>
            <p className="text-sm">{message.error}</p>
          </div>
        ) : (
          <>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  // Custom code block styling
                  code: ({ node, inline, className, children, ...props }) => {
                    if (inline) {
                      return (
                        <code
                          className="bg-background/50 px-1 py-0.5 rounded text-sm"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={cn('block', className)} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Custom table styling
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table className="border-collapse border">{children}</table>
                    </div>
                  ),
                }}
              >
                {displayContent}
              </ReactMarkdown>
            </div>

            {isGenerating && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Generating...</span>
              </div>
            )}

            {!isGenerating && !isUser && (
              <MessageActions message={message} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

**Customize prose styles** (match theme):

```css
/* globals.css */
.prose {
  --tw-prose-body: hsl(var(--foreground));
  --tw-prose-headings: hsl(var(--foreground));
  --tw-prose-links: hsl(var(--primary));
  --tw-prose-code: hsl(var(--accent));
  --tw-prose-pre-bg: hsl(var(--muted));
}
```

---

### 2. Code Block Actions

**Enhanced code block component**:

```typescript
// components/chat/CodeBlock.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  inline?: boolean;
}

export function CodeBlock({ code, language, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
        {code}
      </code>
    );
  }

  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-t border-b">
        <span className="text-xs text-muted-foreground font-mono">
          {language || 'code'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </Button>
      </div>
      <pre className="bg-muted p-4 rounded-b overflow-x-auto">
        <code className={cn('text-sm font-mono', language && `language-${language}`)}>
          {code}
        </code>
      </pre>
    </div>
  );
}
```

---

### 3. Message Actions

**Actions component**:

```typescript
// components/chat/MessageActions.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, RotateCcw } from 'lucide-react';
import type { Doc } from '@/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface MessageActionsProps {
  message: Doc<'messages'>;
}

export function MessageActions({ message }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const regenerate = useMutation(api.chat.regenerateMessage);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    await regenerate({
      messageId: message._id,
    });
  };

  return (
    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 mr-1" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </>
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={handleRegenerate}
      >
        <RotateCcw className="w-3 h-3 mr-1" />
        Regenerate
      </Button>
    </div>
  );
}
```

**Regenerate mutation**:

```typescript
// convex/chat.ts - add to existing file
export const regenerateMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Delete old message
    await ctx.db.delete(args.messageId);

    // Create new pending message
    const newMessageId = await ctx.db.insert("messages", {
      conversationId: message.conversationId,
      role: "assistant",
      content: "",
      model: message.model!,
      status: "pending",
      generationStartedAt: Date.now(),
      createdAt: Date.now(),
    });

    // Schedule generation
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      messageId: newMessageId,
      conversationId: message.conversationId,
      model: message.model!,
    });

    return newMessageId;
  },
});
```

---

### 4. Stop Generation

**Add stop button to generating messages**:

```typescript
// components/chat/MessageItem.tsx - update generating section
{isGenerating && (
  <div className="flex items-center justify-between mt-2">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="w-3 h-3 animate-spin" />
      <span>Generating...</span>
    </div>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleStop(message._id)}
      className="h-7 text-xs"
    >
      <Square className="w-3 h-3 mr-1" />
      Stop
    </Button>
  </div>
)}
```

**Stop mutation**:

```typescript
// convex/chat.ts
export const stopGeneration = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    // Mark as complete with partial content
    await ctx.db.patch(args.messageId, {
      content: message.partialContent || "",
      partialContent: undefined,
      status: "complete",
      generationCompletedAt: Date.now(),
    });

    // Note: Action will continue on server but we ignore further updates
  },
});
```

---

### 5. Edit User Messages

**Add edit action**:

```typescript
// components/chat/MessageItem.tsx - for user messages
{isUser && (
  <Button
    variant="ghost"
    size="sm"
    className="h-7 text-xs opacity-0 group-hover:opacity-100"
    onClick={() => setEditing(true)}
  >
    <Edit className="w-3 h-3 mr-1" />
    Edit
  </Button>
)}
```

**Edit dialog**:

```typescript
// components/chat/EditMessageDialog.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';

interface EditMessageDialogProps {
  message: Doc<'messages'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMessageDialog({
  message,
  open,
  onOpenChange,
}: EditMessageDialogProps) {
  const [content, setContent] = useState(message.content);
  const editMessage = useMutation(api.chat.editMessage);

  const handleSave = async () => {
    await editMessage({
      messageId: message._id,
      newContent: content,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit message</DialogTitle>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="resize-none"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save & Regenerate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Edit mutation** (deletes following messages, regenerates from edit point):

```typescript
// convex/chat.ts
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    newContent: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Update user message
    await ctx.db.patch(args.messageId, {
      content: args.newContent,
    });

    // Get all messages after this one
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", message.conversationId)
      )
      .order("asc")
      .collect();

    const messageIndex = allMessages.findIndex((m) => m._id === args.messageId);
    const messagesToDelete = allMessages.slice(messageIndex + 1);

    // Delete following messages
    for (const msg of messagesToDelete) {
      await ctx.db.delete(msg._id);
    }

    // Create new assistant message
    const newMessageId = await ctx.db.insert("messages", {
      conversationId: message.conversationId,
      role: "assistant",
      content: "",
      model: message.model || "openai:gpt-4o-mini",
      status: "pending",
      generationStartedAt: Date.now(),
      createdAt: Date.now(),
    });

    // Schedule generation
    await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
      messageId: newMessageId,
      conversationId: message.conversationId,
      model: message.model || "openai:gpt-4o-mini",
    });
  },
});
```

---

### 6. Delete Messages

**Delete action + mutation**:

```typescript
// convex/chat.ts
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete(args.messageId);
  },
});
```

---

### 7. Auto-scroll & Scroll Behavior

**Improved scroll handling**:

```typescript
// components/chat/MessageList.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageItem } from './MessageItem';
import type { Doc } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

interface MessageListProps {
  messages: Doc<'messages'>[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Auto-scroll on new messages if user is near bottom
    const container = containerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    // Show scroll button if not at bottom
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      setShowScrollButton(!isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p>No messages yet. Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4 relative">
      {messages.map((message) => (
        <MessageItem key={message._id} message={message} />
      ))}
      <div ref={bottomRef} />

      {showScrollButton && (
        <Button
          className="fixed bottom-24 right-8 rounded-full shadow-lg"
          size="icon"
          onClick={scrollToBottom}
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
```

---

### 8. Keyboard Shortcuts (Input)

**Enhanced ChatInput**:

```typescript
// components/chat/ChatInput.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;

    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl+Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }

    // Enter to send (if setting enabled)
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [input]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="border-t p-4 bg-background">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          className="resize-none min-h-[60px]"
          rows={1}
          disabled={disabled}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || disabled}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Press Cmd+Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
```

---

## Deliverables

1. Markdown rendering with GFM support
2. Syntax-highlighted code blocks
3. Code block copy buttons
4. Message actions: copy, regenerate, edit, delete
5. Stop generation button
6. Auto-scroll with manual override
7. Enhanced keyboard shortcuts
8. Auto-resizing input

---

## Acceptance Criteria

- [ ] Markdown renders correctly (headers, lists, links, tables)
- [ ] Code blocks have syntax highlighting
- [ ] Can copy code blocks and messages
- [ ] Can regenerate responses
- [ ] Can edit user messages → regenerates from edit point
- [ ] Can delete messages
- [ ] Can stop generation mid-stream
- [ ] Auto-scroll works but doesn't interrupt manual scrolling
- [ ] Textarea auto-resizes
- [ ] Keyboard shortcuts work (Enter/Cmd+Enter)

---

## Next Steps

Phase 2C: Conversation management (sidebar, CRUD)
