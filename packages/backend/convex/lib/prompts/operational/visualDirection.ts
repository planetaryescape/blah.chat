/**
 * Prompt for generating visual directions for multiple slides in batch
 */

interface SlideInfo {
  position: number;
  title: string;
  content: string;
  slideType: string;
}

interface DesignSystemInfo {
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  visualStyle: string;
  imageGuidelines: string;
}

export const VISUAL_DIRECTION_BATCH_PROMPT = `You are a visual director creating image generation prompts for a presentation.

DESIGN SYSTEM:
Theme: {THEME}
Primary Color: {PRIMARY_COLOR}
Secondary Color: {SECONDARY_COLOR}
Accent Color: {ACCENT_COLOR}
Visual Style: {VISUAL_STYLE}
Image Guidelines: {IMAGE_GUIDELINES}

SLIDES TO CREATE VISUAL DIRECTIONS FOR:
{SLIDES}

For each slide, create a detailed visual direction that:
1. Describes the mood, atmosphere, and visual tone
2. Specifies key visual elements, imagery, and composition
3. References the design system colors (use hex values)
4. Aligns with the slide content and type
5. Is specific enough for an AI image generator to produce consistent results

SLIDE TYPE GUIDANCE:
- title: Hero image, impactful, sets the tone for entire presentation
- section: Transition visual, introduces new topic area
- content: Supporting imagery that reinforces the specific content points
- hook: Attention-grabbing opener, bold and intriguing
- cta: Action-oriented, energetic, motivational

OUTPUT FORMAT (JSON array):
[
  {
    "position": 1,
    "visualDirection": "Detailed description for image generation. Include: color palette ({PRIMARY_COLOR} dominant, {SECONDARY_COLOR} accents), mood, specific elements, composition style, and what to avoid. Be very specific."
  },
  ...
]

IMPORTANT:
- Return ONLY valid JSON array
- Include entries for ALL slides provided
- Each visualDirection should be 2-4 sentences
- Reference specific hex colors from the design system
- Match the visual style specified (${"{VISUAL_STYLE}"})
- Maintain visual consistency across slides while varying composition`;

/**
 * Build visual direction batch prompt with injected data
 */
export function buildVisualDirectionPrompt(
  slides: SlideInfo[],
  designSystem: DesignSystemInfo,
): string {
  const slidesText = slides
    .map(
      (s) =>
        `Slide ${s.position} (${s.slideType}): "${s.title}"\nContent: ${s.content.substring(0, 200)}`,
    )
    .join("\n\n");

  return VISUAL_DIRECTION_BATCH_PROMPT.replace("{THEME}", designSystem.theme)
    .replace(/{PRIMARY_COLOR}/g, designSystem.primaryColor)
    .replace(/{SECONDARY_COLOR}/g, designSystem.secondaryColor)
    .replace(/{ACCENT_COLOR}/g, designSystem.accentColor)
    .replace(/{VISUAL_STYLE}/g, designSystem.visualStyle)
    .replace("{IMAGE_GUIDELINES}", designSystem.imageGuidelines)
    .replace("{SLIDES}", slidesText);
}
