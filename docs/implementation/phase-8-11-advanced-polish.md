# Phases 8-11: Advanced Features & Polish

Consolidated guide for branching, enhancements, data portability, automation, and production readiness.

---

## Phase 8: Advanced Features Part 1

### Context Window Visibility

**Token counting**:
```bash
npm install tiktoken
```

```typescript
// lib/ai/tokens.ts
import { encoding_for_model } from 'tiktoken';

export function countTokens(text: string, model: string): number {
  const encoder = encoding_for_model(model as any);
  const tokens = encoder.encode(text);
  encoder.free();
  return tokens.length;
}

export function countMessageTokens(messages: any[], model: string): number {
  let total = 0;
  messages.forEach((msg) => {
    total += countTokens(msg.content, model);
    total += 4; // Format overhead
  });
  return total;
}
```

**Display**:
```typescript
// components/chat/ContextWindowIndicator.tsx
export function ContextWindowIndicator({ conversationId, model }: Props) {
  const messages = useQuery(api.messages.listByConversation, { conversationId });
  const config = getModelConfig(model);

  const usedTokens = useMemo(() => {
    if (!messages) return 0;
    return countMessageTokens(messages, model);
  }, [messages, model]);

  const pct = (usedTokens / config.contextWindow) * 100;

  return (
    <div className="flex items-center gap-2">
      <Progress value={pct} className={cn(
        pct > 80 && 'bg-yellow-500',
        pct > 95 && 'bg-red-500'
      )} />
      <span className="text-sm text-muted-foreground">
        {usedTokens.toLocaleString()} / {config.contextWindow.toLocaleString()}
      </span>
    </div>
  );
}
```

### Conversation Branching

**Schema** (already supports via `parentMessageId`):

```typescript
messages: {
  // ... existing
  parentMessageId: v.optional(v.id("messages")),
  branchLabel: v.optional(v.string()),
}
```

**Branch on edit**:
```typescript
// Instead of deleting following messages, create branch
export const editMessageWithBranch = mutation({
  args: {
    messageId: v.id("messages"),
    newContent: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    // Create new user message as branch
    const branchMessageId = await ctx.db.insert("messages", {
      conversationId: message.conversationId,
      role: "user",
      content: args.newContent,
      status: "complete",
      parentMessageId: args.messageId,
      branchLabel: "Edited",
      createdAt: Date.now(),
    });

    // Generate from branch
    // ... schedule action
  },
});
```

**UI**: Show branch indicator, switch between branches.

---

## Phase 9: Advanced Features Part 2

### Message Bookmarks

**Schema**:
```typescript
bookmarks: defineTable({
  userId: v.id("users"),
  messageId: v.id("messages"),
  note: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  highlightedText: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_message", ["messageId"])
```

**CRUD**: Standard mutations.

**UI**: Bookmark button on messages, dedicated bookmarks page.

### Response Comparison

**Send to multiple models**:
```typescript
export const compareModels = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    models: v.array(v.string()), // 2-4 models
  },
  handler: async (ctx, args) => {
    const comparisonGroupId = generateId();

    // Add user message
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      content: args.content,
      status: "complete",
      createdAt: Date.now(),
    });

    // Create pending messages for each model
    for (const model of args.models) {
      const messageId = await ctx.db.insert("messages", {
        conversationId: args.conversationId,
        role: "assistant",
        content: "",
        model,
        status: "pending",
        comparisonGroupId, // Link them
        createdAt: Date.now(),
      });

      // Schedule parallel generations
      await ctx.scheduler.runAfter(0, internal.generation.generateResponse, {
        messageId,
        conversationId: args.conversationId,
        model,
      });
    }
  },
});
```

**Schema addition**:
```typescript
messages: {
  // ... add
  comparisonGroupId: v.optional(v.string()),
}
```

**UI**: Side-by-side display, synced scrolling, pick winner.

### Image Generation

**Google Imagen** (via Vertex AI):
```bash
npm install @google-cloud/aiplatform
```

```typescript
// lib/ai/imagen.ts
import { PredictionServiceClient } from '@google-cloud/aiplatform';

const client = new PredictionServiceClient({
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
});

export async function generateImage(prompt: string): Promise<string> {
  const [response] = await client.predict({
    endpoint: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/us-central1/publishers/google/models/imagegeneration`,
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
    },
  });

  const image = response.predictions[0].bytesBase64Encoded;
  return `data:image/png;base64,${image}`;
}
```

**Trigger**: Detect "generate image" or explicit button.

### Text-to-Speech

**Browser API**:
```typescript
// components/chat/TTSControls.tsx
export function TTSControls({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);

  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const stop = () => {
    speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <Button onClick={speaking ? stop : speak} size="sm">
      {speaking ? 'Stop' : 'Play'}
    </Button>
  );
}
```

---

## Phase 10: Data Portability & Automation

### Export/Import

**Export formats**:
```typescript
// lib/export/json.ts
export async function exportToJSON(userId: string) {
  // Fetch all data
  const conversations = await fetchUserConversations(userId);
  const messages = await fetchAllMessages(userId);
  const memories = await fetchMemories(userId);
  const projects = await fetchProjects(userId);

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    user: { userId },
    conversations,
    messages,
    memories,
    projects,
  };
}

// lib/export/markdown.ts
export function exportToMarkdown(conversation: any, messages: any[]) {
  let md = `# ${conversation.title}\n\n`;
  md += `**Created**: ${new Date(conversation.createdAt).toLocaleString()}\n\n`;
  md += `---\n\n`;

  messages.forEach((msg) => {
    md += `## ${msg.role === 'user' ? 'You' : 'Assistant'}\n\n`;
    md += `${msg.content}\n\n`;
  });

  return md;
}
```

**ChatGPT import**:
```typescript
// lib/import/chatgpt.ts
export function parseChatGPTExport(data: any) {
  // Parse ChatGPT conversations.json format
  // Map to our schema
  return data.map((conv: any) => ({
    title: conv.title,
    messages: conv.mapping ? parseMapping(conv.mapping) : [],
    createdAt: conv.create_time * 1000,
  }));
}
```

**API routes**:
```typescript
// app/api/export/route.ts
export async function POST(req: Request) {
  const { format } = await req.json();

  const data = await exportToJSON(userId);

  if (format === 'json') {
    return new Response(JSON.stringify(data, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (format === 'markdown') {
    // Convert to markdown...
  }
}
```

### Shareable Conversations

**Schema**:
```typescript
shares: defineTable({
  conversationId: v.id("conversations"),
  userId: v.id("users"),
  shareId: v.string(), // URL-safe unique ID
  accessType: v.union(
    v.literal("public"),
    v.literal("password"),
    v.literal("private")
  ),
  passwordHash: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
  includeSystemPrompt: v.boolean(),
  anonymized: v.boolean(),
  viewCount: v.number(),
  createdAt: v.number(),
})
  .index("by_share_id", ["shareId"])
  .index("by_user", ["userId"])
```

**Public view page**:
```typescript
// app/share/[shareId]/page.tsx
export default async function SharePage({ params }) {
  const share = await getShare(params.shareId);
  const messages = await getSharedMessages(share.conversationId);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1>{share.conversation.title}</h1>
      <MessageList messages={messages} readOnly />
    </div>
  );
}
```

### Scheduled Prompts

**Schema**:
```typescript
scheduledPrompts: defineTable({
  userId: v.id("users"),
  name: v.string(),
  prompt: v.string(),
  model: v.string(),
  schedule: v.string(), // Cron expression
  enabled: v.boolean(),
  lastRunAt: v.optional(v.number()),
  createdAt: v.number(),
}).index("by_enabled", ["enabled"])
```

**Convex cron**:
```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check-scheduled-prompts",
  { minutes: 15 },
  internal.scheduled.checkAndRun
);

export default crons;

// convex/scheduled.ts
export const checkAndRun = internalAction({
  handler: async (ctx) => {
    const prompts = await ctx.runQuery(internal.scheduled.getEnabled);

    for (const prompt of prompts) {
      // Check if should run based on cron
      if (shouldRun(prompt.schedule, prompt.lastRunAt)) {
        await ctx.runMutation(internal.scheduled.execute, {
          promptId: prompt._id,
        });
      }
    }
  },
});
```

---

## Phase 11: Polish & Production

### Command Palette

```bash
npm install cmdk
```

```typescript
// components/CommandPalette.tsx
import { Command } from 'cmdk';

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Input placeholder="Type a command..." />
      <Command.List>
        <Command.Group heading="Actions">
          <Command.Item onSelect={() => router.push('/chat')}>
            New Chat
          </Command.Item>
          <Command.Item onSelect={() => router.push('/settings')}>
            Settings
          </Command.Item>
          {/* ... more commands */}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

### Keyboard Shortcuts

**Global listener**:
```typescript
// hooks/useKeyboardShortcuts.ts
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+N - New chat
      if (isMod && e.key === 'n') {
        e.preventDefault();
        router.push('/chat');
      }

      // Cmd+/ - Toggle sidebar
      if (isMod && e.key === '/') {
        e.preventDefault();
        toggleSidebar();
      }

      // Cmd+, - Settings
      if (isMod && e.key === ',') {
        e.preventDefault();
        router.push('/settings');
      }

      // ... more shortcuts
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
```

### PostHog Integration

```bash
npm install posthog-js
```

```typescript
// lib/analytics.ts
import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  });
}

export function trackEvent(event: string, properties?: any) {
  posthog.capture(event, properties);
}

// Usage
trackEvent('conversation_started', { model: 'gpt-4o' });
trackEvent('message_sent', { model, tokens: 1234 });
trackEvent('model_switched', { from: 'gpt-4o', to: 'claude-4' });
```

### UI Polish

**Animations**:
```typescript
// Message appear
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
>
  {message}
</motion.div>
```

**Loading states**:
- Skeleton screens for conversations list
- Streaming indicators for messages
- Progress bars for file uploads

**Error boundaries**:
```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error({ error, errorInfo }, 'React error boundary caught error');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2>Something went wrong</h2>
            <Button onClick={() => this.setState({ hasError: false })}>
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Performance

**Virtualized lists** (for long conversations):
```bash
npm install @tanstack/react-virtual
```

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualizedMessageList({ messages }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${item.start}px)`,
            }}
          >
            <MessageItem message={messages[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Code splitting**:
```typescript
const SettingsPage = dynamic(() => import('@/components/SettingsPage'), {
  loading: () => <LoadingSpinner />,
});
```

### Testing & Reliability

**Error handling patterns**:
- Try/catch in all mutations/actions
- Retry logic for transient API failures
- Graceful degradation (offline, API down)
- Rate limit handling

**Logging**:
- Use Pino throughout
- Log all LLM calls (model, tokens, latency, cost)
- Log errors with full context
- Dashboard for monitoring

---

## Summary

**Phase 8**: Context window visibility, conversation branching
**Phase 9**: Bookmarks, response comparison, image generation, TTS
**Phase 10**: Export/import (JSON/Markdown/ChatGPT), shareable links, scheduled prompts
**Phase 11**: Command palette, keyboard shortcuts, PostHog, animations, error boundaries, performance, testing

**Production Checklist**:
- [ ] All features working
- [ ] Error boundaries in place
- [ ] Logging comprehensive
- [ ] Performance optimized (virtualization, code splitting)
- [ ] Responsive design works
- [ ] Keyboard navigation complete
- [ ] Analytics tracking
- [ ] Security audit (XSS, injection, auth)
- [ ] Cost tracking accurate
- [ ] Backup/export working

**Ready to ship**: After Phase 11, app is production-ready for personal daily use.
