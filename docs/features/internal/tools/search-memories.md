# Search Memories Tool

## Overview

Retrieve past conversation facts and context from the user's memory bank using hybrid search (full-text + semantic vector search).

---

## Priority

**🟢 INTERNAL** - Core memory system feature, already implemented and working.

---

## Use Cases

✅ **CALL THIS TOOL WHEN user asks about:**
- Past discussions: "What did I say about X?", "the project I mentioned"
- Specific facts/events: "When did I...", "What was the result of..."
- Project/goal details: "What are the specs for...", "How did we decide to..."
- Previous decisions: "What did we agree on regarding..."

❌ **DO NOT call for:**
- User's identity, name, preferences, relationships (already in system prompt)
- General knowledge questions (use LLM training)
- Greetings, confirmations, simple chit-chat
- Real-time/current information (use web search tool)

---

## Implementation

### Tool Schema

```typescript
inputSchema: z.object({
  query: z.string().describe(
    "Search query (keywords or semantic meaning)"
  ),
  category: z.enum([
    "preference",  // User's likes/dislikes, settings
    "fact",        // Events, decisions, outcomes
    "relationship",// People user knows
    "goal",        // Objectives, targets
    "context"      // Discussions, situational info
  ]).optional(),
  limit: z.number().optional().default(5).describe(
    "Max results to return"
  ),
})
```

### Response Format

```json
{
  "found": 3,
  "memories": [
    {
      "content": "User prefers TypeScript over JavaScript",
      "category": "preference",
      "importance": 8
    },
    {
      "content": "User is building a chat app called blah.chat",
      "category": "project",
      "importance": 9
    }
  ]
}
```

### Empty Results (Graceful Degradation)

```json
{
  "found": 0,
  "memories": []
}
```

---

## Backend Implementation

**File:** `convex/memories/search.ts`

**Search Strategy:** Hybrid search combining:
1. **Full-text search** (Convex search index) - Keyword matching
2. **Vector search** (embeddings) - Semantic similarity
3. **RRF (Reciprocal Rank Fusion)** - Merge results

**Database:** Convex `memories` table with vector index on `embedding` field

---

## Search Algorithm

```typescript
// 1. Full-text search (keyword matching)
const textResults = await ctx.db
  .query("memories")
  .withSearchIndex("content", q => q.search("content", query))
  .filter(q => q.eq(q.field("userId"), userId))
  .take(10);

// 2. Vector search (semantic similarity)
const vectorResults = await ctx.db
  .query("memories")
  .withSearchIndex("embedding", q =>
    q.search("embedding", await embed(query))
  )
  .filter(q => q.eq(q.field("userId"), userId))
  .take(10);

// 3. Merge with Reciprocal Rank Fusion (RRF)
const mergedResults = reciprocalRankFusion([textResults, vectorResults]);

// 4. Filter by category (optional)
// 5. Sort by relevance + importance score
// 6. Return top N results
```

---

## Memory Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **preference** | User's likes, dislikes, settings | "User prefers dark mode" |
| **fact** | Events, decisions, outcomes | "User completed migration on Dec 1" |
| **relationship** | People user knows | "User's colleague is named Jane" |
| **goal** | Objectives, targets | "User wants to launch by Q1 2025" |
| **context** | Discussions, situational info | "User discussed API design patterns" |

---

## Multi-Turn Usage

The LLM can call this tool **multiple times** to refine/clarify results:

```
User: "What was that Python library I mentioned?"
Assistant: [Calls searchMemories with query "Python library"]
         [Gets: "User uses FastAPI for backend"]
Assistant: "You mentioned FastAPI"

User: "No, the one for data analysis"
Assistant: [Calls searchMemories with query "Python data analysis"]
         [Gets: "User prefers pandas over numpy"]
Assistant: "Ah, pandas!"
```

---

## UI Display

- **Icon:** `Search` (lucide-react)
- **Running:** "Searching memories..."
- **Complete:** `Memory search ({N} result{s})`
- **Expanded:** Shows memory content + category tags

**Implementation:** `src/components/chat/ToolCallDisplay.tsx` lines 52, 87-89, 307-344

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| **Latency** | ~200-500ms (hybrid search) |
| **Accuracy** | High (combines keyword + semantic) |
| **Scalability** | Handles 1000s of memories per user |
| **Cost** | Free (Convex vector search included) |

---

## Testing Checklist

- [ ] "What did I say about my project?"
- [ ] "When did I mention TypeScript?"
- [ ] "What are my preferences?"
- [ ] Test with typos: "prefernces" → still finds "preferences"
- [ ] Test semantic: "coding language" → finds "TypeScript", "Python"
- [ ] Test empty results (no memories found)
- [ ] Test category filter: `category: "preference"`
- [ ] Test multi-turn refinement

---

## Related Tools

- **saveMemory** - Save new facts to memory
- **projectContext** - Get project-specific context
- **webSearch** - Search the web for current information

---

## Future Enhancements

1. **Time-based search**: "memories from last week"
2. **Importance boosting**: Prioritize high-importance memories
3. **Conversation context**: "in that conversation about X"
4. **Memory clusters**: Group related memories
5. **Confidence scores**: Show search relevance
