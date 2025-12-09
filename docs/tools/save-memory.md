# Memory Save Tool

## Overview

Save important information about the user to the memory bank for future reference. This enables the AI to learn and adapt to the user over time.

---

## Priority

**🔴 HIGH PRIORITY** - Essential for learning and personalization.

---

## Use Cases

- Explicit requests: "Remember that I like Python"
- Implicit facts: User mentions their job title or location
- Decisions: "We decided to use PostgreSQL"
- Relationships: "My co-founder is Alice"

---

## Implementation Complexity

**⚡ ALREADY IMPLEMENTED**

- Backend action: `memories.save.saveFromTool`
- Tool wrapper: `convex/ai/tools/memories.ts`

---

## Tool Schema

```typescript
inputSchema: z.object({
  content: z
    .string()
    .min(10)
    .max(500)
    .describe(
      "The fact to remember, rephrased in third person (e.g., 'User prefers dark mode')"
    ),
  category: z
    .enum(["identity", "preference", "project", "context", "relationship"])
    .describe(
      "Category: identity, preference, project, context, relationship"
    ),
  reasoning: z
    .string()
    .min(10)
    .max(200)
    .describe(
      "Brief explanation of why this is worth remembering long-term"
    ),
})
```

---

## Example Responses

```json
{
  "success": true,
  "memoryId": "mem_123...",
  "content": "User prefers dark mode",
  "category": "preference"
}
```

---

## Tool Description

```
Save important information about the user to memory for future reference.

✅ CALL THIS TOOL WHEN:
- User explicitly asks to remember something
- User shares critical identity info (role, location)
- User states clear preferences
- User shares important relationships

❌ DO NOT CALL THIS TOOL FOR:
- Temporary context or one-off requests
- Information already known
- Vague statements
- Generic facts

IMPORTANT: Rephrase content to third-person before saving.
```

---

## Testing Checklist

- [ ] "Remember that I live in San Francisco"
- [ ] "I always want code examples in TypeScript"
- [ ] "My favorite framework is Svelte"
