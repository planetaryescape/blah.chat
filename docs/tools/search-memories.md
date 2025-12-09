# Memory Search Tool

## Overview

Retrieve past conversation facts, context, and user preferences from the memory bank. This gives the AI longterm memory capabilities, allowing it to recall information across conversations.

---

## Priority

**🔴 HIGH PRIORITY** - Essential for personalization and continuity.

---

## Use Cases

- Recall preferences: "What acts do I like?"
- Recall facts: "What is my dog's name?"
- Project context: "What were we working on last week?"
- Continuity: "Continue where we left off"

---

## Implementation Complexity

**⚡ ALREADY IMPLEMENTED**

- Backend action: `memories.search.hybridSearch`
- Tool wrapper: `convex/ai/tools/memories.ts`

---

## Tool Schema

```typescript
inputSchema: z.object({
  query: z.string().describe("Search query (keywords or semantic meaning)"),
  category: z
    .enum(["preference", "fact", "relationship", "goal", "context"])
    .optional()
    .describe("Memory category to filter by"),
  limit: z.number().optional().default(5).describe("Max results to return"),
})
```

---

## Example Responses

```json
{
  "found": 2,
  "memories": [
    {
      "content": "User prefers concise answers",
      "category": "preference",
      "importance": 8
    },
    {
      "content": "User is building a chat app with Next.js",
      "category": "project",
      "importance": 9
    }
  ]
}
```

---

## Tool Description

```
Retrieve past conversation facts and context from memory bank.

✅ USE FOR:
- Past discussions ("What did I say about X?")
- Specific facts/events ("When did I...")
- Project/goal details
- User preferences (if not in system prompt)

❌ DO NOT USE FOR:
- General knowledge questions
- Greetings/Chit-chat
- Identity info already in system prompt

Returns list of relevant memories with metadata.
```

---

## Testing Checklist

- [ ] "What is my favorite color?" (if stored)
- [ ] "What project am I working on?"
- [ ] "Remind me what we discussed about the database"
