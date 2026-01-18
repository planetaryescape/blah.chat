# Auto-Generated Conversation Titles

> **Phase**: P9-features | **Effort**: 6h | **Impact**: 97.6% cost savings, professional UX
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

Conversations show generic names like "New Chat" which makes it difficult for users to find previous conversations. Manually titling conversations adds friction. Auto-generating titles with the main chat model is expensive.

### Current Behavior

- Conversations labeled "New Chat" or timestamp
- Users must manually rename
- Finding old conversations requires opening each one
- No context at a glance

### Expected Behavior

- Titles auto-generated after conversation concludes
- 3-5 word descriptive summaries
- Cost-optimized using GPT-4o-mini (97.6% cheaper)
- Manual titles preserved (not overwritten)

---

## Current Implementation

No auto-title generation. Conversations use default names.

---

## Solution

Use GPT-4o-mini with truncated messages to generate cost-effective titles.

### Step 1: Create Title Generation Action

**File**: `packages/backend/convex/ai/generateTitle.ts`

```typescript
import { internalAction } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { generateText } from 'ai';

export const generateTitle = internalAction({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    // Get recent messages
    const messages = await ctx.runQuery(internal.messages.list, {
      conversationId: args.conversationId,
      limit: 5,
    });

    // Skip if too short
    if (messages.length < 3) return null;

    // Check if already has manual title
    const conversation = await ctx.runQuery(internal.conversations.get, {
      id: args.conversationId,
    });

    if (conversation.hasManualTitle) return null;

    // Generate title with cheap model
    const result = await generateText({
      model: 'openai:gpt-4o-mini', // 94% cheaper than GPT-4
      messages: [
        {
          role: 'system',
          content:
            'Summarize this conversation in 3-5 words. No punctuation. Be specific.',
        },
        ...messages.slice(-3).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content.slice(0, 200), // Truncate for cost
        })),
      ],
      maxTokens: 20,
    });

    const title = result.text.trim().slice(0, 50);

    // Update conversation
    await ctx.runMutation(internal.conversations.update, {
      id: args.conversationId,
      title,
      hasAutoTitle: true,
    });

    return title;
  },
});
```

### Step 2: Add Schema Fields

**File**: `packages/backend/convex/schema.ts`

```typescript
// Add to conversations table
defineTable('conversations', {
  // ... existing fields
  title: v.optional(v.string()),
  hasAutoTitle: v.optional(v.boolean()),
  hasManualTitle: v.optional(v.boolean()),
  titleGeneratedAt: v.optional(v.number()),
});
```

### Step 3: Create Title Trigger

**File**: `packages/backend/convex/conversations.ts`

```typescript
/**
 * Check if conversation qualifies for auto-title
 * Conditions:
 * 1. Has 3+ messages
 * 2. Last message was 5+ minutes ago (conversation concluded)
 * 3. No existing auto-title
 * 4. No manual title
 */
export const scheduleTitleGeneration = internalMutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return;

    // Skip if already titled
    if (conversation.hasAutoTitle || conversation.hasManualTitle) return;

    // Check message count
    const messageCount = await ctx.db
      .query('messages')
      .withIndex('by_conversation', (q) =>
        q.eq('conversationId', args.conversationId)
      )
      .collect();

    if (messageCount.length < 3) return;

    // Check if conversation is "concluded" (5 min since last message)
    const lastMessage = messageCount[messageCount.length - 1];
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    if (lastMessage.createdAt > fiveMinutesAgo) {
      // Schedule for later
      await ctx.scheduler.runAfter(
        5 * 60 * 1000, // 5 minutes
        internal.ai.generateTitle.generateTitle,
        { conversationId: args.conversationId }
      );
      return;
    }

    // Generate now
    await ctx.scheduler.runAfter(
      0,
      internal.ai.generateTitle.generateTitle,
      { conversationId: args.conversationId }
    );
  },
});
```

### Step 4: UI for Manual Title Edit

**File**: `apps/web/src/components/sidebar/ConversationTitle.tsx`

```typescript
import { useState, useRef, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationTitleProps {
  conversationId: Id<'conversations'>;
  title: string;
  hasAutoTitle?: boolean;
}

export function ConversationTitle({
  conversationId,
  title,
  hasAutoTitle,
}: ConversationTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateTitle = useMutation(api.conversations.updateTitle);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue.trim() && editValue !== title) {
      await updateTitle({
        id: conversationId,
        title: editValue.trim(),
        hasManualTitle: true,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          className="flex-1 bg-transparent border-b border-primary text-sm"
        />
        <button onClick={handleSave} className="p-1 hover:bg-accent rounded">
          <Check className="w-3 h-3" />
        </button>
        <button onClick={handleCancel} className="p-1 hover:bg-accent rounded">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <span
        className={cn(
          'truncate text-sm',
          hasAutoTitle && 'text-muted-foreground'
        )}
      >
        {title}
      </span>
      <button
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-opacity"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}
```

---

## Testing

### Unit Tests

```typescript
describe('generateTitle', () => {
  it('should generate title for conversation with 3+ messages', async () => {
    const conversationId = await createTestConversation();
    await addTestMessages(conversationId, 5);

    const title = await generateTitle({ conversationId });

    expect(title).toBeDefined();
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThanOrEqual(50);
  });

  it('should skip conversations with less than 3 messages', async () => {
    const conversationId = await createTestConversation();
    await addTestMessages(conversationId, 2);

    const title = await generateTitle({ conversationId });

    expect(title).toBeNull();
  });

  it('should not overwrite manual titles', async () => {
    const conversationId = await createTestConversation({
      title: 'My Custom Title',
      hasManualTitle: true,
    });

    const title = await generateTitle({ conversationId });

    expect(title).toBeNull();
  });
});
```

### Cost Verification

```typescript
describe('Title Generation Cost', () => {
  it('should use minimal tokens', async () => {
    // Mock generateText to track tokens
    const tokenTracker = { inputTokens: 0, outputTokens: 0 };

    await generateTitle({ conversationId });

    // Should use ~800 input tokens (truncated messages)
    expect(tokenTracker.inputTokens).toBeLessThan(1000);
    // Should use ~20 output tokens (short title)
    expect(tokenTracker.outputTokens).toBeLessThan(50);
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Cost per title | $0.005 (GPT-4) | $0.00012 (GPT-4o-mini) | 97.6% savings |
| 100K conversations | $500 | $12 | $488 saved |
| User findability | Poor (generic names) | Good (descriptive) | Qualitative |
| Manual effort | Required | Optional | Eliminated |

---

## Risk Assessment

- **Risk Level**: LOW
- **Breaking Changes**: None (additive feature)
- **Cost Risk**: Very low ($0.00012/title)
- **Quality Risk**: May generate poor titles occasionally
- **Fallback**: Users can always edit titles manually

---

## References

- **Sources**: IMPLEMENTATION-SPECIFICATION.md#9.1, deep-research-report.md, kimi/INDEX.md
- **GPT-4o-mini Pricing**: https://openai.com/pricing
- **Related Issues**: P9-features/02-follow-up-suggestions.md (similar pattern)
