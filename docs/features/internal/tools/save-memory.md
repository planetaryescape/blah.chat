# Save Memory Tool

## Overview

Save important information about the user to their memory bank for future recall. Uses automatic embedding generation and duplicate detection.

---

## Priority

**🟢 INTERNAL** - Core memory system feature, already implemented and working.

---

## Use Cases

✅ **CALL THIS TOOL WHEN:**
- User explicitly asks: "remember this", "save this", "don't forget that I...", "keep in mind that..."
- User shares critical identity info: name, role, job title, location, family members
- User states clear preferences: "I prefer X", "I always Y", "I never Z"
- User mentions ongoing projects with specific details
- User shares important relationships: team members, collaborators with context

❌ **DO NOT CALL THIS TOOL FOR:**
- Temporary context or one-off requests ("can you write a poem about X")
- Information already known (check system prompt first)
- Vague or uncertain statements ("I might try X someday")
- Questions or curiosity without stated preference
- Generic facts without personal relevance
- Conversation flow details (use conversation context instead)

---

## Important: Third-Person Rephrasing

**ALWAYS rephrase content to third-person before saving:**

| User Says | ❌ Wrong | ✅ Correct |
|-----------|---------|----------|
| "I am a software engineer" | "I am a software engineer" | "User is a software engineer" |
| "My wife is Jane" | "My wife is Jane" | "User's wife is named Jane" |
| "I prefer TypeScript" | "I prefer TypeScript" | "User prefers TypeScript" |
| "I'm based in London" | "I'm based in London" | "User is based in London" |

**Why?** Memories are retrieved as factual statements, not first-person quotes.

---

## Tool Schema

```typescript
inputSchema: z.object({
  content: z.string().min(10).max(500).describe(
    "The fact to remember, rephrased in third person (e.g., 'User prefers dark mode')"
  ),
  category: z.enum([
    "identity",      // Who they are (name, role, location)
    "preference",    // Likes/dislikes, settings
    "project",       // Work details, ongoing tasks
    "context",       // Situational info, discussions
    "relationship"   // People they know
  ]).describe(
    "Memory category for better organization and retrieval"
  ),
  reasoning: z.string().min(10).max(200).describe(
    "Brief explanation of why this is worth remembering long-term (1-2 sentences)"
  ),
})
```

---

## Response Format

### Success

```json
{
  "success": true,
  "message": "Memory saved successfully",
  "memoryId": "k57abc123...",
  "content": "User prefers TypeScript over JavaScript",
  "category": "preference"
}
```

### Duplicate Detected

```json
{
  "success": false,
  "duplicate": true,
  "message": "Similar memory already exists",
  "existingContent": "User prefers TypeScript"
}
```

### Error

```json
{
  "success": false,
  "error": "Content too short (minimum 10 characters)"
}
```

---

## Backend Implementation

**File:** `convex/memories/save.ts`

**Process:**
1. **Validate input**: Check length, category
2. **Rephrase check**: Ensure third-person format
3. **Generate embedding**: Convert to vector (OpenAI embeddings)
4. **Duplicate detection**: Cosine similarity > 0.95 threshold
5. **Calculate importance**: Based on category + explicit markers
6. **Save to DB**: Insert into `memories` table
7. **Return result**: Success or duplicate message

---

## Memory Categories

| Category | Importance Score | Examples | Retrieval Strategy |
|----------|-----------------|----------|-------------------|
| **identity** | 10 | Name, role, location | Always pre-loaded |
| **preference** | 9 | Likes, dislikes, settings | Pre-loaded |
| **relationship** | 8 | Family, colleagues | Pre-loaded |
| **project** | 7 | Work details, tasks | On-demand search |
| **context** | 5 | Discussions, situational | On-demand search |

**Note:** High-importance categories (identity, preference, relationship) are automatically included in every conversation's system prompt.

---

## Duplicate Detection

**Algorithm:** Vector similarity search with threshold

```typescript
// 1. Generate embedding for new content
const newEmbedding = await embed(content);

// 2. Search existing memories
const similar = await ctx.db
  .query("memories")
  .withSearchIndex("embedding", q =>
    q.search("embedding", newEmbedding)
  )
  .filter(q => q.eq(q.field("userId"), userId))
  .take(1);

// 3. Calculate cosine similarity
if (similar.length > 0) {
  const similarity = cosineSimilarity(newEmbedding, similar[0].embedding);

  // 4. Reject if too similar (>95%)
  if (similarity > 0.95) {
    return { success: false, duplicate: true };
  }
}
```

---

## Importance Calculation

**Base scores** (by category):
- identity: 10
- preference: 9
- relationship: 8
- project: 7
- context: 5

**Boosted by:**
- Explicit user request ("remember this", "important"): +2
- Specific details (names, numbers, dates): +1
- Long-term goals: +1

**Reduced by:**
- Vague statements: -2
- Temporary context: -2

---

## UI Display

- **Icon:** `BookmarkPlus` (lucide-react)
- **Running:** "Saving to memory..."
- **Success:** "Saved to memory"
- **Duplicate:** "Already saved"
- **Error:** "Failed to save"
- **Expanded:** Shows content + category badge + success message

**Implementation:** `src/components/chat/ToolCallDisplay.tsx` lines 49, 75-80, 264-302

---

## Example Scenarios

### Scenario 1: Clear Preference

```
User: "I prefer using TypeScript for all my projects"
Assistant: [Calls saveMemory]
  content: "User prefers using TypeScript for all projects"
  category: "preference"
  reasoning: "Core tech stack preference that affects future recommendations"

Response: ✅ "Saved to memory"
```

### Scenario 2: Project Detail

```
User: "I'm building a chat app called blah.chat using Next.js 15"
Assistant: [Calls saveMemory]
  content: "User is building a chat application named blah.chat using Next.js 15"
  category: "project"
  reasoning: "Active project with specific tech stack details for context"

Response: ✅ "Saved to memory"
```

### Scenario 3: Duplicate Attempt

```
User: "Remember that I like TypeScript"
Assistant: [Calls saveMemory]
  content: "User likes TypeScript"
  category: "preference"
  reasoning: "Programming language preference"

Response: ❌ "Similar memory already exists: User prefers using TypeScript"
```

### Scenario 4: Invalid - Too Vague

```
User: "I might try Python someday"
Assistant: [Does NOT call saveMemory]

Reasoning: Uncertain statement, not a clear preference or commitment
```

---

## Testing Checklist

- [ ] "Remember that I prefer dark mode"
- [ ] "My name is John" (identity category)
- [ ] "I work with Sarah on the backend" (relationship)
- [ ] "Save this: I'm building a SaaS product" (project)
- [ ] Test duplicate detection (try saving same fact twice)
- [ ] Test third-person rephrasing
- [ ] Test with too-short content (<10 chars)
- [ ] Test with too-long content (>500 chars)
- [ ] Verify high-importance memories appear in system prompt
- [ ] Test memory retrieval after saving

---

## Cost Optimization

**Embedding generation:**
- Model: `text-embedding-3-small` (OpenAI)
- Cost: ~$0.00002 per memory
- Batching: Memories generated async, not blocking conversation

**Total cost per user:** ~$0.02 for 1000 memories saved

---

## Related Tools

- **searchMemories** - Retrieve saved memories
- **projectContext** - Get project-specific context from workspace

---

## Future Enhancements

1. **Memory consolidation**: Merge similar memories weekly
2. **Importance decay**: Reduce old memory importance over time
3. **User editing**: Allow users to manually edit/delete memories
4. **Memory categories UI**: Let users browse memories by category
5. **Export**: Download all memories as JSON/Markdown
6. **Conflict resolution**: When new info contradicts old memory
7. **Automatic extraction**: Background job to extract from conversations
