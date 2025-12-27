/**
 * Outline Feedback Prompts
 *
 * Builds prompts for regenerating outlines based on user feedback.
 */

import type { Doc } from "../../../_generated/dataModel";

/**
 * Format an outline item for display in the prompt
 */
function formatOutlineItem(item: Doc<"outlineItems">): string {
  const lines: string[] = [];

  // Slide header based on type
  switch (item.slideType) {
    case "title":
      lines.push("# TITLE SLIDE");
      break;
    case "section":
      lines.push(`# SECTION: ${item.title}`);
      break;
    case "content":
      lines.push(`# Slide ${item.position}: ${item.title}`);
      break;
  }

  // Title (for title slides)
  if (item.slideType === "title") {
    lines.push(`Title: ${item.title}`);
  }

  // Content
  if (item.content) {
    lines.push(item.content);
  }

  // Type
  lines.push(`Type: ${item.slideType}`);

  // Speaker notes
  if (item.speakerNotes) {
    lines.push(`Speaker Notes: ${item.speakerNotes}`);
  }

  return lines.join("\n");
}

/**
 * Build feedback prompt for AI regeneration
 */
export function buildFeedbackPrompt(
  items: Doc<"outlineItems">[],
  overallFeedback: string | undefined,
): string {
  // Collect per-slide feedback
  const slideFeedback = items
    .filter((item) => item.feedback)
    .map(
      (item) =>
        `Slide ${item.position} "${item.title}" (${item.slideType}): ${item.feedback}`,
    )
    .join("\n");

  // Format current outline
  const currentOutline = items.map(formatOutlineItem).join("\n\n");

  return `Please regenerate the presentation outline incorporating the following feedback.

${
  overallFeedback
    ? `OVERALL FEEDBACK:
${overallFeedback}`
    : "OVERALL FEEDBACK: None provided"
}

${
  slideFeedback
    ? `PER-SLIDE FEEDBACK:
${slideFeedback}`
    : "PER-SLIDE FEEDBACK: None provided"
}

CURRENT OUTLINE:
${currentOutline}

INSTRUCTIONS:
1. Carefully consider all feedback provided above
2. Regenerate the COMPLETE outline with the requested changes
3. Maintain the same structured format (# TITLE SLIDE, # SECTION:, # Slide N:)
4. Include Type: field for each slide
5. Preserve any slides that don't have feedback unless the overall feedback suggests otherwise
6. Keep the professional quality and concise bullet points (5-7 words each)

Output the complete revised outline:`;
}

/**
 * System prompt for outline feedback regeneration
 */
export const OUTLINE_FEEDBACK_SYSTEM_PROMPT = `You are a professional presentation designer helping to refine a slide deck outline.

When regenerating an outline based on feedback:
- Apply all feedback carefully and thoughtfully
- Maintain consistent formatting (# TITLE SLIDE, # SECTION:, # Slide N:)
- Keep bullet points concise (5-7 words)
- Preserve the professional tone
- Include Type: field for each slide
- Add Speaker Notes where helpful

Always output the COMPLETE revised outline, not just the changes.`;
