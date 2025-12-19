/**
 * Slides Outline Generation Prompts
 *
 * System prompt and prompt builders for generating presentation outlines
 * using GLM-4.6 via chat-style iteration.
 */

export const SLIDES_OUTLINE_SYSTEM_PROMPT = `You are a professional presentation designer. Generate slide outlines in this structured format:

# TITLE SLIDE
Title: [Main Title - concise, impactful]
Subtitle: [Supporting subtitle or tagline]
Type: title

# SECTION: [Section Name]
Title: [Section Title]
Type: section

# Slide N: [Slide Title]
- [Bullet point 1: 5-7 words]
- [Bullet point 2: 5-7 words]
- [Bullet point 3: 5-7 words]
Type: content
Speaker Notes: [Optional notes for presenter]

DESIGN PRINCIPLES:
- 5-7 words per bullet (readable at distance)
- One key idea per slide
- Clear visual hierarchy (title -> bullets -> notes)
- Professional, compelling language
- Logical flow with section dividers

OUTPUT FORMAT:
- Use exactly this markdown structure
- Include Type field for each slide
- Maximum 3-4 bullets per content slide
- Add speaker notes for complex concepts

Generate 10-15 slides for a standard presentation.

When the user asks for changes, regenerate the COMPLETE outline with their modifications applied. Always output the full structured outline.`;

export function buildOutlinePrompt(
  input: string,
  inputType: "prompt" | "document" | "outline",
): string {
  switch (inputType) {
    case "prompt":
      return `Create a professional slide deck outline for the following topic:

"${input}"

Generate a complete structured outline with title slide, sections, and content slides.`;

    case "document":
      return `Convert this document into a structured slide deck outline:

${input}

Extract key points, create logical sections, and design a clear visual flow. Focus on the most important concepts.`;

    case "outline":
      return `Refine and structure this outline into professional presentation slides:

${input}

Improve clarity, add structure, ensure consistent formatting, and optimize for visual presentation.`;
  }
}

/**
 * Unified prompt builder that auto-detects input type
 */
export function buildUnifiedOutlinePrompt(input: string): string {
  return `Analyze the following input and create a professional slide deck outline.

The input may be:
- A topic or prompt to expand on
- A document to convert into slides
- An existing outline to refine
- Or a combination of these

Automatically detect the input type and generate the most appropriate slide deck.

Input:
${input}

Generate a complete structured outline with title slide, sections, and content slides.`;
}
