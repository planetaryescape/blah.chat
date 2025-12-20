interface DesignSystem {
  theme: string;
  themeRationale: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontPairings: {
    heading: string;
    body: string;
  };
  visualStyle: string;
  layoutPrinciples: string[];
  iconStyle: string;
  imageGuidelines: string;
  designInspiration: string;
}

export interface SlideImageContext {
  slideType: "title" | "section" | "content";
  title: string;
  content: string;
  designSystem: DesignSystem;
  contextSlides?: Array<{ type: string; title: string }>;
  slideStyle?: "wordy" | "illustrative";
  /** If true, extra emphasis on following brand colors exactly (template-based) */
  isTemplateBased?: boolean;
}

const SLIDE_TYPE_REQUIREMENTS: Record<string, string> = {
  title:
    "TITLE SLIDE: Bold, impactful design. Large typography dominates. Establish visual foundation for entire deck. Minimal text - title only. Create memorable first impression.",
  section:
    "SECTION DIVIDER: Transitional slide marking new topic. Minimal text - section name only. Use geometric shapes, backgrounds, or visual elements. Clear visual break from content slides.",
  content:
    "CONTENT SLIDE: Clear hierarchy - title at top, then bullet points. Readable at distance (5-7 words per bullet max). Balance text with visual elements. Professional, clean layout.",
};

const STYLE_INSTRUCTIONS: Record<string, string> = {
  illustrative: `STYLE: SPEAKER ASSIST (ILLUSTRATIVE)
- Minimal text on slides - focus on powerful visuals, icons, metaphors
- Use imagery, graphics, and visual metaphors to convey meaning
- Text should be headlines only - speaker provides context
- Prioritize visual impact over text density
- Create slides that support a speaker, not replace one`,
  wordy: `STYLE: SELF-CONTAINED (TEXT-HEAVY)
- Include ALL content as readable text on the slide
- Slides should be fully understandable without a speaker
- Use clear bullet points, readable font sizes
- Balance text with supporting visuals
- Create slides that can stand alone as a document`,
};

export function buildSlideImagePrompt(context: SlideImageContext): string {
  const {
    slideType,
    title,
    content,
    designSystem,
    contextSlides = [],
    slideStyle = "illustrative",
    isTemplateBased = false,
  } = context;

  const typeRequirements = SLIDE_TYPE_REQUIREMENTS[slideType];
  const styleInstructions = STYLE_INSTRUCTIONS[slideStyle];

  const contextDescription =
    contextSlides.length > 0
      ? `
VISUAL CONTEXT (maintain consistency with these slides):
${contextSlides.map((s) => `- ${s.type} slide: "${s.title}"`).join("\n")}
`
      : "";

  const templateBrandingEmphasis = isTemplateBased
    ? `
ORGANIZATION BRAND TEMPLATE:
This presentation uses an ORGANIZATION BRAND TEMPLATE. The colors and fonts are NOT creative suggestions - they are mandatory brand guidelines.
- Primary: ${designSystem.primaryColor} (EXACT - do not modify)
- Secondary: ${designSystem.secondaryColor} (EXACT - do not modify)
- Background: ${designSystem.backgroundColor} (EXACT - do not modify)
- Fonts: ${designSystem.fontPairings.heading} / ${designSystem.fontPairings.body} (EXACT - do not modify)

The slide MUST look like it belongs to this organization's official materials.
`
    : "";

  return `Generate a professional presentation slide image (16:9 aspect ratio, 1920x1080).
${templateBrandingEmphasis}
DESIGN SYSTEM:
Theme: ${designSystem.theme}
Theme Rationale: ${designSystem.themeRationale}
Primary Color: ${designSystem.primaryColor}
Secondary Color: ${designSystem.secondaryColor}
Accent Color: ${designSystem.accentColor}
Background: ${designSystem.backgroundColor}
Fonts: ${designSystem.fontPairings.heading} (headings) + ${designSystem.fontPairings.body} (body)
Visual Style: ${designSystem.visualStyle}
Layout Principles: ${designSystem.layoutPrinciples.join(", ")}
Icon Style: ${designSystem.iconStyle}
Design Inspiration: ${designSystem.designInspiration}

IMAGE GUIDELINES:
${designSystem.imageGuidelines}

SLIDE CONTENT:
Type: ${slideType.toUpperCase()}
Title: ${title}
${content ? `Content:\n${content}` : ""}
${contextDescription}
REQUIREMENTS:
${typeRequirements}

${styleInstructions}

CRITICAL RULES:
1. Follow design system colors, fonts, and visual style EXACTLY${isTemplateBased ? " - these are MANDATORY brand guidelines" : ""}
2. Maintain visual consistency with context slides (if provided)
3. High contrast for readability
4. Professional, export-ready quality
5. 16:9 aspect ratio (1920x1080 or equivalent)
6. Include visual elements (shapes, graphics, icons) per design system

OUTPUT: Generate ONLY the slide image. No text explanation.`;
}
