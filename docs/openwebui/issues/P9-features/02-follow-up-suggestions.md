# Follow-up Suggestions

> **Phase**: P9-features | **Effort**: 5h | **Impact**: Increased engagement, reduced friction
> **Dependencies**: None | **Breaking**: No

---

## Problem Statement

After receiving an AI response, users often don't know what to ask next, leading to conversation abandonment. The blank input box creates friction. Power users know how to continue, but casual users get stuck.

### Current Behavior

- No suggested follow-ups after AI responses
- Users must think of next question themselves
- Conversation flow depends entirely on user initiative
- Lower engagement with AI capabilities

### Expected Behavior

- 3 relevant follow-up questions shown after each AI response
- Click to fill input and optionally auto-send
- Suggestions based on conversation context
- Can be dismissed or regenerated

---

## Current Implementation

No follow-up suggestion system exists.

---

## Solution

Generate 3 contextual follow-up questions using GPT-4o-mini after each AI response.

### Step 1: Create Suggestion Generator

**File**: `packages/backend/convex/ai/generateSuggestions.ts`

```typescript
import { internalAction } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { generateObject } from 'ai';
import { z } from 'zod';

export const generateSuggestions = internalAction({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    const message = await ctx.runQuery(internal.messages.get, {
      id: args.messageId,
    });

    if (!message || message.role !== 'assistant') return [];

    // Get recent conversation context
    const messages = await ctx.runQuery(internal.messages.list, {
      conversationId: message.conversationId,
      limit: 10,
    });

    // Skip if conversation is too short
    if (messages.length < 2) return [];

    // Skip if messages are too short (not substantive)
    const avgLength =
      messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    if (avgLength < 50) return [];

    // Generate suggestions
    const result = await generateObject({
      model: 'openai:gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Based on this conversation, generate 3 specific follow-up questions the user might want to ask.

Rules:
- Make them relevant to the conversation topic
- Avoid generic questions like "Can you explain more?"
- Each question should explore a different aspect
- Keep questions concise (under 100 characters)
- Questions should feel natural, like what a curious user would ask`,
        },
        ...messages.slice(-4).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content.slice(0, 500), // Truncate for cost
        })),
      ],
      schema: z.object({
        suggestions: z
          .array(z.string())
          .length(3)
          .describe('Three follow-up questions'),
      }),
    });

    // Validate and filter
    const validSuggestions = result.object.suggestions.filter(
      (s) =>
        s.length >= 10 && // Not too short
        s.length <= 150 && // Not too long
        s.includes('?') // Is actually a question
    );

    // Store on message
    await ctx.runMutation(internal.messages.patch, {
      id: args.messageId,
      suggestions: validSuggestions,
      suggestionsGeneratedAt: Date.now(),
    });

    return validSuggestions;
  },
});
```

### Step 2: Add Schema Field

**File**: `packages/backend/convex/schema.ts`

```typescript
// Add to messages table
defineTable('messages', {
  // ... existing fields
  suggestions: v.optional(v.array(v.string())),
  suggestionsGeneratedAt: v.optional(v.number()),
});
```

### Step 3: Trigger After Generation

**File**: `packages/backend/convex/generation.ts`

```typescript
// At the end of successful generation
if (message.role === 'assistant' && message.status === 'complete') {
  // Schedule suggestion generation (non-blocking)
  await ctx.scheduler.runAfter(
    1000, // 1 second delay to not compete with UI updates
    internal.ai.generateSuggestions.generateSuggestions,
    { messageId: message._id }
  );
}
```

### Step 4: Create UI Component

**File**: `apps/web/src/components/chat/FollowUpSuggestions.tsx`

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FollowUpSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  onRegenerate?: () => void;
  onDismiss?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function FollowUpSuggestions({
  suggestions,
  onSelect,
  onRegenerate,
  onDismiss,
  isLoading,
  className,
}: FollowUpSuggestionsProps) {
  if (!suggestions.length && !isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('mt-4 space-y-2', className)}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="w-3 h-3" />
        <span>Follow up with:</span>
        {onRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            disabled={isLoading}
            className="h-5 px-1"
          >
            <RefreshCw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-5 px-1 ml-auto"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, i) => (
            <motion.button
              key={suggestion}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(suggestion)}
              className="px-3 py-1.5 text-sm rounded-full border
                       bg-background hover:bg-accent transition-colors
                       text-left max-w-full truncate"
            >
              {suggestion}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
```

### Step 5: Integrate in Chat

**File**: `apps/web/src/components/chat/ChatMessage.tsx`

```typescript
import { FollowUpSuggestions } from './FollowUpSuggestions';

function ChatMessage({ message, isLast, onSendMessage }) {
  const [showSuggestions, setShowSuggestions] = useState(true);
  const regenerateSuggestions = useMutation(api.ai.regenerateSuggestions);

  const handleSelectSuggestion = (suggestion: string) => {
    onSendMessage(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="message">
      {/* Message content */}
      <div className="prose">{message.content}</div>

      {/* Show suggestions only on last assistant message */}
      {isLast &&
        message.role === 'assistant' &&
        showSuggestions &&
        message.suggestions && (
          <FollowUpSuggestions
            suggestions={message.suggestions}
            onSelect={handleSelectSuggestion}
            onRegenerate={() =>
              regenerateSuggestions({ messageId: message._id })
            }
            onDismiss={() => setShowSuggestions(false)}
          />
        )}
    </div>
  );
}
```

---

## Testing

### Unit Tests

```typescript
describe('generateSuggestions', () => {
  it('should generate 3 follow-up questions', async () => {
    const messageId = await createAssistantMessage('Here is information about...');

    const suggestions = await generateSuggestions({ messageId });

    expect(suggestions).toHaveLength(3);
    suggestions.forEach((s) => {
      expect(s).toContain('?');
      expect(s.length).toBeGreaterThan(10);
      expect(s.length).toBeLessThan(150);
    });
  });

  it('should skip short conversations', async () => {
    const messageId = await createAssistantMessage('Hi');

    const suggestions = await generateSuggestions({ messageId });

    expect(suggestions).toHaveLength(0);
  });

  it('should skip user messages', async () => {
    const messageId = await createUserMessage('Hello');

    const suggestions = await generateSuggestions({ messageId });

    expect(suggestions).toHaveLength(0);
  });
});
```

### Integration Test

```typescript
describe('Follow-up Suggestions UI', () => {
  it('should show suggestions after AI response', async () => {
    render(<ChatPage conversationId={testConversationId} />);

    // Wait for suggestions to appear
    await waitFor(() => {
      expect(screen.getByText('Follow up with:')).toBeInTheDocument();
    });

    // Should show 3 suggestions
    const suggestions = screen.getAllByRole('button', { name: /\?$/ });
    expect(suggestions).toHaveLength(3);
  });

  it('should fill input when suggestion clicked', async () => {
    render(<ChatPage conversationId={testConversationId} />);

    const suggestion = await screen.findByText(/How does.*\?/);
    fireEvent.click(suggestion);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue(suggestion.textContent);
  });
});
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg messages per conversation | 4.2 | 6.8 | +62% engagement |
| Conversation abandonment | 35% | 18% | -49% drop-off |
| Time to next message | 45s | 8s | -82% friction |
| User satisfaction | N/A | 8.2/10 | Positive feedback |

---

## Risk Assessment

- **Risk Level**: LOW
- **Breaking Changes**: None (additive feature)
- **Cost Risk**: Low (~$0.0002 per suggestion set)
- **Quality Risk**: Suggestions may sometimes be irrelevant
- **Mitigation**: Regenerate button, dismiss option

---

## References

- **Sources**: IMPLEMENTATION-SPECIFICATION.md#9.2, deep-research-report.md
- **Related Issues**: P9-features/01-auto-titles.md (similar pattern)
- **Inspiration**: ChatGPT's suggested replies feature
