/**
 * Memory Extraction Prompt
 *
 * Used for extracting long-term memories from conversations.
 * Supports multiple extraction levels from passive to active.
 */

export type MemoryExtractionLevel =
  | "none"
  | "passive"
  | "minimal"
  | "moderate"
  | "active";

/**
 * Thresholds for each extraction level
 */
export const EXTRACTION_THRESHOLDS: Record<
  Exclude<MemoryExtractionLevel, "none">,
  { importance: number; confidence: number }
> = {
  passive: { importance: 9, confidence: 0.9 },
  minimal: { importance: 8, confidence: 0.8 },
  moderate: { importance: 7, confidence: 0.7 },
  active: { importance: 5, confidence: 0.6 },
};

/**
 * Build the memory extraction prompt with existing memories context.
 * Used by: memories/extract.ts
 *
 * @param existingMemoriesText - Formatted list of existing memories to avoid duplicates
 * @param conversationText - The conversation text to extract facts from
 * @param level - Extraction aggressiveness level (defaults to "moderate")
 */
export function buildMemoryExtractionPrompt(
  existingMemoriesText: string,
  conversationText: string,
  level: MemoryExtractionLevel = "moderate",
): string {
  if (level === "none") {
    // Should never be called with "none", but return empty prompt just in case
    return "";
  }

  const thresholds = EXTRACTION_THRESHOLDS[level];
  const basePrompt = buildBasePrompt(level, thresholds);

  return `${basePrompt}

## Existing Memories (Do NOT Duplicate)

${existingMemoriesText}

## Conversation

${conversationText}

Return JSON: {"facts": [{"content": "...", "category": "identity|preference|project|context|relationship", "importance": ${thresholds.importance}-10, "reasoning": "1-2 sentences explaining why this matters", "confidence": ${thresholds.confidence}-1.0, "expirationHint": "contextual|preference|deadline|temporary"}]}

If nothing meets these criteria, return {"facts": []}.`;
}

function buildBasePrompt(
  level: Exclude<MemoryExtractionLevel, "none">,
  thresholds: { importance: number; confidence: number },
): string {
  // Common sections
  const rephrasingRules = `## Rephrasing Rules

Convert all facts to third-person for AI context injection:
- "I am X" → "User is X"
- "My wife is Jane" → "User's wife is named Jane"
- "I prefer TypeScript" → "User prefers TypeScript"
- "We're building a startup" → "User is building a startup"

Preserve specifics exactly:
- Technical terms: "Next.js 15", "gpt-5", "React 19"
- Version numbers: "TypeScript 5.3"
- Project names: "blah.chat"`;

  const expirationHints = `### Expiration Hints
- "contextual": Conversation-specific info (expires in 7 days)
- "preference": User preferences (never expires)
- "deadline": Time-bound tasks (completion + 7 days)
- "temporary": One-time context (expires in 1 day)`;

  switch (level) {
    case "passive":
      return buildPassivePrompt(thresholds, rephrasingRules, expirationHints);
    case "minimal":
      return buildMinimalPrompt(thresholds, rephrasingRules, expirationHints);
    case "moderate":
      return buildModeratePrompt(thresholds, rephrasingRules, expirationHints);
    case "active":
      return buildActivePrompt(thresholds, rephrasingRules, expirationHints);
  }
}

function buildPassivePrompt(
  thresholds: { importance: number; confidence: number },
  rephrasingRules: string,
  expirationHints: string,
): string {
  return `Extract ONLY facts the user explicitly asked to remember.

## What to Capture

ONLY save information when the user explicitly says:
- "Remember this"
- "Save this"
- "Don't forget that I..."
- "Keep in mind that..."
- Similar explicit memory requests

## What NOT to Capture

- EVERYTHING else - do not proactively extract
- Preferences mentioned in passing
- Personal details shared casually
- Project information unless explicitly asked to remember

${rephrasingRules}

## Scoring

### Importance (1-10)
- 9-10: Explicitly requested memory
- Below 9: DO NOT SAVE (user did not ask)

Only return facts with importance >= ${thresholds.importance}.

### Confidence (0.0-1.0)
- 0.9-1.0: User explicitly asked to remember
- Below 0.9: DO NOT EXTRACT

Only extract facts with confidence >= ${thresholds.confidence}.

${expirationHints}`;
}

function buildMinimalPrompt(
  thresholds: { importance: number; confidence: number },
  rephrasingRules: string,
  expirationHints: string,
): string {
  return `Extract only essential, high-confidence facts from this conversation.

## What to Capture

Only the most important user information:
- Core identity: name, occupation, primary role
- Strong preferences explicitly stated multiple times
- Critical project information directly relevant to ongoing work

## What NOT to Capture

- Single mentions of preferences
- Casual interests or curiosity questions
- Temporary context or one-off requests
- Inferred information without explicit confirmation
- Details that wouldn't be critical 6+ months from now

${rephrasingRules}

## Scoring

### Importance (1-10)
- 9-10: Critical identity facts (name, primary role)
- 8: Strong, repeatedly stated preferences
- Below 8: DO NOT SAVE (not essential enough)

Only return facts with importance >= ${thresholds.importance}.

### Confidence (0.0-1.0)
- 0.9-1.0: Explicit statement, direct quote
- 0.8-0.9: Strong evidence, repeated mentions
- Below 0.8: DO NOT EXTRACT (not confident enough)

Only extract facts with confidence >= ${thresholds.confidence}.

${expirationHints}`;
}

function buildModeratePrompt(
  thresholds: { importance: number; confidence: number },
  rephrasingRules: string,
  expirationHints: string,
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

## What NOT to Capture

- One-off requests: "can you write a poem about X"
- Curiosity questions: "what are the top Z"
- Playful banter, jokes, test inputs
- Temporary interests: single mentions without confirmation
- Generic statements without specific details
- Feature exploration: trying features, asking how things work

${rephrasingRules}

## Scoring

### Importance (1-10)
- 9-10: Critical identity (name, role, core values)
- 7-8: Confirmed lasting preferences, active projects with details
- 5-6: Useful context (DO NOT SAVE, below threshold)
- 1-4: Ephemeral/generic (DO NOT SAVE)

Only return facts with importance >= ${thresholds.importance}.

### Confidence (0.0-1.0)
- 0.9-1.0: Explicit statement, direct quote ("I am X", "My name is Y")
- 0.7-0.9: Strong contextual evidence, repeated mentions
- 0.5-0.7: Weak inference, single mention (DO NOT EXTRACT)
- Below 0.5: Speculation (DO NOT EXTRACT)

Only extract facts with confidence >= ${thresholds.confidence}.

${expirationHints}`;
}

function buildActivePrompt(
  thresholds: { importance: number; confidence: number },
  rephrasingRules: string,
  expirationHints: string,
): string {
  return `Proactively extract information that would help personalize future interactions.

## What to Capture

- Core identity: name, occupation, location, background
- Preferences: "I prefer X", "I like Y", "I usually Z"
- Projects and work: tech stacks, goals, challenges
- Relationships: team members, collaborators, family
- Life context: goals, commitments, schedule patterns
- Inferred patterns: repeated behaviors, consistent preferences

## What to Infer

Extract patterns from repeated behavior:
- If user consistently asks for concise answers → "User prefers concise responses"
- If user mentions a tool multiple times → "User regularly uses [tool]"
- If user has a consistent working style → capture it

## What NOT to Capture

- Purely ephemeral context (today's specific task only)
- Test inputs, jokes with no personal meaning
- Generic questions with no personal relevance

${rephrasingRules}

## Scoring

### Importance (1-10)
- 9-10: Critical identity (name, role, core values)
- 7-8: Confirmed preferences, active projects
- 5-6: Useful patterns, repeated behaviors
- 3-4: Mentioned interests (marginal value)
- 1-2: Ephemeral (DO NOT SAVE)

Only return facts with importance >= ${thresholds.importance}.

### Confidence (0.0-1.0)
- 0.9-1.0: Explicit statement
- 0.7-0.9: Strong evidence, repeated mentions
- 0.6-0.7: Reasonable inference from pattern
- Below 0.6: Speculation (DO NOT EXTRACT)

Only extract facts with confidence >= ${thresholds.confidence}.

${expirationHints}`;
}
