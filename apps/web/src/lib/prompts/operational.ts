export const CONVERSATION_COMPACTION_PROMPT = `Summarize this conversation for context continuity. Your summary will be used as the starting point for a new conversation, so preserve all important context.

Include:
- Key topics discussed and their outcomes
- Important decisions made or conclusions reached
- Unresolved questions or pending items
- Critical facts, names, and entities mentioned
- User preferences or requirements expressed

Format as a clear, organized recap. Be comprehensive but concise.`;

export function buildCompactionPrompt(transcript: string): string {
  return `Summarize this conversation:\n\n${transcript}`;
}

export const CONVERSATION_ACK_PROMPT = `You are the first responder for blah.chat. The user just sent a message. Reply with ONE short sentence (under 15 words) acknowledging it before the main model begins working.

Tone:
- Conversational, human. Not robotic.
- Match the seriousness of the input — playful prompts get playful acks.
- React honestly. If the prompt seems off, say so ("hm, I have doubts but let me think").
- Don't repeat the user's words back.
- Don't try to answer — another model handles that.

Examples (do NOT copy verbatim — generate fresh):
- "Got it, let me think."
- "Interesting. Working on it."
- "Hm, I have doubts but let me work through it."
- "Makes sense. Looking into it."
- "Need to dig into that one."

Reply with ONLY the ack sentence. No quotes, no preamble, no markdown, no trailing punctuation other than a period or question mark.`;

export const CONVERSATION_TITLE_PROMPT = `Generate a 3-6 word title capturing the main topic of this conversation.

Rules:
- Focus on the core subject, not the request type
- Use natural language, avoid technical jargon unless central to the topic
- No quotes, periods, or special punctuation
- Title case (capitalize first letter of major words)

Return only the title text.`;

export const NOTE_TITLE_PROMPT = `Generate a 3-8 word title capturing the main topic or purpose of this note.

Rules:
- Focus on what the note is about, not how it's written
- Use natural language
- No quotes, periods, or markdown formatting
- Title case

Return only the title text.`;

export function buildAutoTagPrompt(
  content: string,
  existingTags: Array<{ displayName: string; usageCount: number }>,
): string {
  const tagsContext =
    existingTags.length > 0
      ? `YOUR EXISTING TAGS (${existingTags.length} total):
${existingTags.map((t) => `- ${t.displayName} (${t.usageCount}×)`).join("\n")}`
      : "No existing tags yet - create appropriate ones.";

  return `Auto-tag this content with 1-3 tags.

${tagsContext}

DECISION PROCESS:
1. First, check if ANY existing tag fits the content well
2. Prefer existing tags even if not a perfect match (80%+ fit = use it)
3. Only create a NEW tag when:
   - Content covers a genuinely new topic not in your tags
   - Existing tags would be misleading or too vague
   - The new tag would likely be reused for similar future content

RULES:
- 1-3 tags based on relevance (not always 3)
- Lowercase, kebab-case for multi-word (e.g., "machine-learning")
- Skip generic: "help", "code", "general", "note", "misc", "other"

CONTENT:
${content}

Return JSON: {"tags": ["tag1", "tag2"]}`;
}
