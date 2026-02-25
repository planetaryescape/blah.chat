# Humanizer

Rewrite AI-generated prose to read like it was written by a real human. Combines detection of 24 known AI writing patterns with personality injection and anti-AI auditing.

## When to Use

- Blog posts, articles, documentation, marketing copy
- Any prose that reads "too AI" - bland, formulaic, over-structured
- After generating a first draft with an LLM

## 24 AI Writing Patterns to Eliminate

### Structural Tells
1. **Sycophantic openers** - "Great question!", "That's a really interesting point"
2. **Resumptive openers** - Restating the question before answering
3. **Numbered lists for everything** - Turning prose into bullet points unnecessarily
4. **Artificial parallelism** - Every list item forced into identical grammatical structure
5. **Generic conclusions restating the intro** - "In conclusion, as we've seen..."
6. **Overly balanced both-sides** - "On one hand... on the other hand..." for everything

### Word-Level Tells
7. **Filler hedging** - "It's important to note that", "It's worth mentioning"
8. **Unnecessary adverbs** - "Essentially", "Fundamentally", "Basically", "Ultimately"
9. **Corporate buzzwords** - "Leverage", "Utilize", "Optimize", "Streamline", "Robust"
10. **Formulaic transitions** - "Moreover", "Furthermore", "Additionally", "In addition"
11. **Empty superlatives** - "Incredibly powerful", "Truly remarkable", "Game-changing"
12. **Fake enthusiasm** - "Exciting!", "Fascinating!", "Amazing!"
13. **Weasel words** - "Some experts say", "Studies suggest", "It is widely believed"
14. **"When it comes to..."** - Weak paragraph opener used constantly by LLMs

### Tone Tells
15. **Excessive disclaimers** - "I'm not an expert, but...", "This is just my opinion, but..."
16. **Robotic meta-commentary** - "Let me break this down", "Let me explain"
17. **"Let's dive in" / "Let's explore"** - Classic AI opener
18. **Gratuitous jargon with immediate simplification** - "The API (Application Programming Interface)..."
19. **Explaining obvious things** - Over-explaining what the audience already knows
20. **Generic metaphors** - "Think of it like a...", "It's similar to..."

### Mechanical Tells
21. **Perfect grammar with zero personality** - Too clean, no voice
22. **Passive voice overuse** - "It was determined that..." instead of "We found..."
23. **Hedging with false humility** - "While I may not have all the answers..."
24. **Emoji/exclamation abuse** - Forced enthusiasm through punctuation

## Process

### Pass 1: Pattern Removal & Voice Injection

Read the full text. Rewrite removing all 24 patterns above. Simultaneously inject:

- **Real opinions** - State positions directly. "X is better than Y" not "X might be considered preferable to Y"
- **Specific details** - Replace vague claims with concrete examples, numbers, dates
- **Conversational rhythm** - Vary sentence length. Use fragments. Ask rhetorical questions. Start sentences with "And" or "But"
- **Imperfection** - Leave in minor informalities. Use contractions. Skip the "to be sure" qualifiers
- **First person** - Use "I" and "we" naturally. Share actual experience, not hypothetical scenarios
- **Active voice** - "We built X" not "X was built"
- **Humor where natural** - Dry observations, self-deprecation, wry commentary. Never forced jokes

### Pass 2: Anti-AI Audit

Review every paragraph against this checklist:

- [ ] Could this paragraph appear in any article on this topic? If yes, make it specific to THIS story
- [ ] Does this paragraph contain any of the 24 patterns? Remove them
- [ ] Would a human actually write this sentence? If not, rewrite or cut
- [ ] Is any sentence doing nothing but connecting two other sentences? Cut it
- [ ] Are there any "throat-clearing" sentences that delay the point? Cut them
- [ ] Does the opening paragraph actually say something, or is it generic setup? Make it say something

### Voice Guidelines

- Write like you're explaining to a smart friend over coffee
- If a sentence sounds like it could be in a press release, rewrite it
- Prefer short Anglo-Saxon words over long Latinate ones ("use" not "utilize", "start" not "commence")
- Don't announce what you're about to say - just say it
- End sections with a thought, not a summary

## Output

Return the rewritten text only. No commentary, no "here's the humanized version", no before/after comparison unless asked.
