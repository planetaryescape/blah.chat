# Phases 4-7: Rich Features & Memory

Consolidated implementation guide for file uploads, voice input, memory system, search, and organization.

---

## Phase 4: Rich Input

### File Uploads

**Install**:
```bash
npm install react-dropzone
```

**Convex file storage** (built-in):
- Upload via `mutation` returning `storageId`
- Store reference in `files` table
- Attach to messages

**Schema**:
```typescript
files: defineTable({
  userId: v.id("users"),
  conversationId: v.id("conversations"),
  storageId: v.id("_storage"),
  name: v.string(),
  mimeType: v.string(),
  size: v.number(),
  createdAt: v.number(),
}).index("by_conversation", ["conversationId"])

messages: {
  // ... add
  attachments: v.optional(v.array(v.object({
    fileId: v.id("files"),
    type: v.string(),
    url: v.string(),
    name: v.string(),
  }))),
}
```

**Upload flow**:
1. Client: Select files
2. Mutation: `generateUploadUrl`
3. Client: POST file to URL
4. Mutation: Store reference with `storageId`
5. Include in message send

**Vision models**: Attach image URLs to message content for gpt-4o, gemini, claude.

### Voice Input

**Browser Speech Recognition**:
```typescript
const recognition = new (window as any).webkitSpeechRecognition();
recognition.onresult = (e: any) => {
  const transcript = e.results[0][0].transcript;
  setInput(transcript);
};
recognition.start();
```

**OR OpenAI Whisper**:
```typescript
const formData = new FormData();
formData.append('file', audioBlob);
formData.append('model', 'whisper-1');

const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: formData,
});
```

---

## Phase 5: Memory System

### Part A: Extraction

**End-of-conversation trigger**:
```typescript
// convex/memories.ts
export const extractMemories = internalAction({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.runQuery(/*...*/);

    const result = await generateText({
      model: registry.languageModel('openai:gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: `Extract facts from conversation. Categories: identity, preference, project, context, relationship. Format as JSON array: [{category, content, confidence}]`,
        },
        { role: 'user', content: JSON.stringify(messages) },
      ],
    });

    const memories = JSON.parse(result.text);

    for (const memory of memories) {
      const embedding = await generateEmbedding(memory.content);
      await ctx.runMutation(internal.memories.create, {
        ...memory,
        embedding,
        conversationId: args.conversationId,
      });
    }
  },
});
```

**Schema**:
```typescript
memories: defineTable({
  userId: v.id("users"),
  projectId: v.optional(v.id("projects")),
  content: v.string(),
  category: v.string(), // identity, preference, project, context, relationship
  embedding: v.array(v.float64()),
  sourceConversationId: v.optional(v.id("conversations")),
  confidence: v.number(),
  accessCount: v.number(),
  status: v.union(v.literal("active"), v.literal("archived")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["userId", "projectId", "status"],
  })
```

### Part B: Retrieval & Injection

**Before generation**:
```typescript
// Retrieve top 5-10 memories
const embedding = await generateEmbedding(currentMessage);

const memories = await ctx.db
  .query("memories")
  .withVectorIndex("by_embedding", (q) =>
    q
      .eq("userId", userId)
      .eq("status", "active")
      .nearestTo("embedding", embedding)
  )
  .take(10);

// Inject into system prompt
const systemPrompt = `
# What I know about you:

${memories.map(m => `- ${m.content}`).join('\n')}

Use this context naturally. Don't repeat unless relevant.
`;

// Add to messages
historyMessages.unshift({
  role: 'system',
  content: systemPrompt,
});
```

**UI**: Memory management page to view/edit/delete.

---

## Phase 6: Search & Organization

### Part A: Hybrid Search

**Schema updates** (add vector indexes):
```typescript
messages: defineTable({
  // ... existing
  embedding: v.optional(v.array(v.float64())),
})
  .searchIndex("search_content", {
    searchField: "content",
    filterFields: ["conversationId"],
  })
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536,
    filterFields: ["conversationId"],
  })
```

**Hybrid search query**:
```typescript
export const hybridSearch = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const embedding = await generateEmbedding(args.query);

    // Full-text
    const textResults = await ctx.db
      .query("messages")
      .withSearchIndex("search_content", (q) => q.search("content", args.query))
      .take(40);

    // Vector
    const vectorResults = await ctx.db
      .query("messages")
      .withVectorIndex("by_embedding", (q) => q.nearestTo("embedding", embedding))
      .take(40);

    // Merge with RRF
    return mergeWithRRF(textResults, vectorResults, args.limit || 20);
  },
});
```

**RRF merge** (Reciprocal Rank Fusion):
```typescript
function mergeWithRRF<T extends { _id: any }>(
  textResults: T[],
  vectorResults: T[],
  limit: number,
  k = 60
): T[] {
  const scores = new Map<string, { score: number; item: T }>();

  textResults.forEach((item, idx) => {
    const id = item._id.toString();
    scores.set(id, { score: 1 / (k + idx + 1), item });
  });

  vectorResults.forEach((item, idx) => {
    const id = item._id.toString();
    const score = 1 / (k + idx + 1);
    const existing = scores.get(id);

    if (existing) {
      existing.score += score;
    } else {
      scores.set(id, { score, item });
    }
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.item);
}
```

### Part B: Projects

**Schema**:
```typescript
projects: defineTable({
  userId: v.id("users"),
  name: v.string(),
  description: v.optional(v.string()),
  systemPrompt: v.optional(v.string()),
  defaultModel: v.optional(v.string()),
  archived: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_user", ["userId"])

// Update conversations
conversations: {
  // ... add
  projectId: v.optional(v.id("projects")),
}

// Update memories
memories: {
  // ... add
  projectId: v.optional(v.id("projects")),
}
```

**Project CRUD**: Standard mutations (create, update, delete, archive).

**Project context**: When generating, include project system prompt + project-scoped memories.

### Part C: Templates & Organization

**System Prompt Templates**:
```typescript
systemPromptTemplates: defineTable({
  userId: v.id("users"),
  name: v.string(),
  description: v.optional(v.string()),
  content: v.string(),
  recommendedModel: v.optional(v.string()),
  isBuiltIn: v.optional(v.boolean()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_user", ["userId"])
```

**Template picker**: Dropdown to select template, injects system prompt.

**Built-in templates**:
- Coding Assistant
- Writing Editor
- Research Mode
- Brainstorm Mode
- Socratic Mode

**Pin/Star**: Already in schema from Phase 2C, just add UI filters.

---

## Phase 7: Cost Tracking & Analytics

### Schema

**Usage aggregation**:
```typescript
usageRecords: defineTable({
  userId: v.id("users"),
  date: v.string(), // YYYY-MM-DD
  model: v.string(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  cachedTokens: v.number(),
  reasoningTokens: v.number(),
  cost: v.number(),
  messageCount: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user_date", ["userId", "date"])
  .index("by_user_model", ["userId", "model"])
```

### Aggregation

**After each message**:
```typescript
// convex/usage.ts
export const recordUsage = internalMutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cachedTokens: v.number(),
    reasoningTokens: v.number(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0];

    // Find or create daily record
    const existing = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", today)
      )
      .filter((q) => q.eq(q.field("model"), args.model))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        inputTokens: existing.inputTokens + args.inputTokens,
        outputTokens: existing.outputTokens + args.outputTokens,
        cachedTokens: existing.cachedTokens + (args.cachedTokens || 0),
        reasoningTokens: existing.reasoningTokens + (args.reasoningTokens || 0),
        cost: existing.cost + args.cost,
        messageCount: existing.messageCount + 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("usageRecords", {
        userId: args.userId,
        date: today,
        model: args.model,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        cachedTokens: args.cachedTokens || 0,
        reasoningTokens: args.reasoningTokens || 0,
        cost: args.cost,
        messageCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});
```

### Dashboard Queries

```typescript
// Daily spend
export const getDailySpend = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db.query("users")...;

    const records = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.gte(q.field("date"), args.startDate) &&
        q.lte(q.field("date"), args.endDate)
      )
      .collect();

    // Group by date
    const grouped = records.reduce((acc, r) => {
      acc[r.date] = (acc[r.date] || 0) + r.cost;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([date, cost]) => ({ date, cost }));
  },
});

// Spend by model
export const getSpendByModel = query({
  args: {},
  handler: async (ctx) => {
    // ... similar logic, group by model
  },
});

// Cost per conversation
export const getConversationCosts = query({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations")...;

    const costs = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .collect();

        const totalCost = messages.reduce((sum, m) => sum + (m.cost || 0), 0);

        return {
          conversationId: conv._id,
          title: conv.title,
          cost: totalCost,
        };
      })
    );

    return costs.sort((a, b) => b.cost - a.cost);
  },
});
```

### Budget System

**User settings**:
```typescript
// In users table, add:
users: {
  // ... existing
  monthlyBudget: v.optional(v.number()),
  budgetAlertThresholds: v.optional(v.array(v.number())), // [0.5, 0.8, 1.0]
}
```

**Pre-flight check**:
```typescript
export const checkBudget = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user?.monthlyBudget) return { allowed: true };

    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const monthRecords = await ctx.db
      .query("usageRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("date"), `${thisMonth}-01`))
      .collect();

    const monthSpend = monthRecords.reduce((sum, r) => sum + r.cost, 0);
    const pctUsed = monthSpend / user.monthlyBudget;

    return {
      allowed: monthSpend < user.monthlyBudget,
      pctUsed,
      monthSpend,
      budget: user.monthlyBudget,
    };
  },
});
```

**UI**: Dashboard with charts (Recharts), budget settings, alerts.

---

## Summary

**Phase 4**: File uploads + voice input
**Phase 5**: Memory extraction + retrieval + injection
**Phase 6**: Hybrid search + projects + templates + organization
**Phase 7**: Usage tracking + dashboard + budgets

All phases build on previous work. Test each before moving forward.

**Key Technologies**:
- Convex file storage (built-in)
- OpenAI embeddings (text-embedding-3-small)
- Browser Speech Recognition OR Whisper API
- RRF merge for hybrid search
- Daily aggregation for usage analytics
