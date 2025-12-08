/**
 * Memory Extraction Prompt
 *
 * Used for extracting long-term memories from conversations.
 * This is a conservative extraction system that only saves high-quality facts.
 */

/**
 * Build the memory extraction prompt with existing memories context.
 * Used by: memories/extract.ts
 *
 * @param existingMemoriesText - Formatted list of existing memories to avoid duplicates
 * @param conversationText - The conversation text to extract facts from
 */
export function buildMemoryExtractionPrompt(
  existingMemoriesText: string,
  conversationText: string,
): string {
  return `Extract facts from this conversation that pass ALL these tests:

1. **Usefulness test**: Would this fact be useful 6+ months from now?
2. **Persistence test**: Is this a lasting trait/preference, not a one-off interaction?
3. **Explicitness test**: Is this explicitly stated or repeatedly demonstrated?

## What to Capture

- Core identity: name, occupation, location, background
- Lasting preferences: "I prefer X", "I always Y", "I never Z"
- Active projects: concrete details, tech stacks, goals
- Important relationships: team members, collaborators with context
- Significant life context: major goals, challenges, commitments

## Rephrasing Rules

Convert all facts to third-person for AI context injection:
- "I am X" → "User is X"
- "My wife is Jane" → "User's wife is named Jane"
- "I prefer TypeScript" → "User prefers TypeScript"
- "We're building a startup" → "User is building a startup"

Preserve specifics exactly:
- Technical terms: "Next.js 15", "gpt-4o", "React 19"
- Version numbers: "TypeScript 5.3"
- Project names: "blah.chat"

## What NOT to Capture

- One-off requests: "can you write a poem about X"
- Curiosity questions: "what are the top Z"
- Playful banter, jokes, test inputs
- Temporary interests: single mentions without confirmation
- Generic statements without specific details
- Feature exploration: trying features, asking how things work

## Scoring

### Importance (1-10)
- 9-10: Critical identity (name, role, core values)
- 7-8: Confirmed lasting preferences, active projects with details
- 5-6: Useful context (DO NOT SAVE, below threshold)
- 1-4: Ephemeral/generic (DO NOT SAVE)

Only return facts with importance >= 7.

### Confidence (0.0-1.0)
- 0.9-1.0: Explicit statement, direct quote ("I am X", "My name is Y")
- 0.7-0.9: Strong contextual evidence, repeated mentions
- 0.5-0.7: Weak inference, single mention (DO NOT EXTRACT)
- Below 0.5: Speculation (DO NOT EXTRACT)

Only extract facts with confidence >= 0.7.

### Expiration Hints
- "contextual": Conversation-specific info (expires in 7 days)
- "preference": User preferences (never expires)
- "deadline": Time-bound tasks (completion + 7 days)
- "temporary": One-time context (expires in 1 day)

## Existing Memories (Do NOT Duplicate)

${existingMemoriesText}

## Conversation

${conversationText}

Return JSON: {"facts": [{"content": "...", "category": "identity|preference|project|context|relationship", "importance": 7-10, "reasoning": "1-2 sentences explaining why this matters", "confidence": 0.7-1.0, "expirationHint": "contextual|preference|deadline|temporary"}]}

If nothing meets these criteria, return {"facts": []}.`;
}
