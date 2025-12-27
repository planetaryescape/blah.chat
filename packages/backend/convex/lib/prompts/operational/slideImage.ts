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
  /** Format aspect ratio - affects style instructions */
  aspectRatio?: "16:9" | "1:1" | "9:16";
  /** If true, extra emphasis on following brand colors exactly (template-based) */
  isTemplateBased?: boolean;
  /** If true, a logo image is being provided as input */
  hasLogo?: boolean;
  /** Logo placement guidelines from template */
  logoGuidelines?: {
    position: string;
    size: string;
  };
  /** Sources from grounded web search for citations */
  sources?: Array<{ position: number; title: string; url: string }>;
  /** User-selected visual style (e.g., "photorealistic", "minimalist-line") */
  imageStyle?: string;
  /** AI-generated per-slide visual direction (mood, colors, imagery guidance) */
  visualDirection?: string;
}

const SLIDE_TYPE_REQUIREMENTS: Record<string, string> = {
  title:
    "TITLE SLIDE: Bold, impactful design. Large typography dominates. Establish visual foundation for entire deck. Minimal text - title only. Create memorable first impression.",
  section:
    "SECTION DIVIDER: Transitional slide marking new topic. Minimal text - section name only. Use geometric shapes, backgrounds, or visual elements. Clear visual break from content slides.",
  content:
    "CONTENT SLIDE: Clear hierarchy - title at top, then bullet points. Readable at distance (5-7 words per bullet max). Balance text with visual elements. Professional, clean layout.",
};

/**
 * Get format-aware style instructions
 * Social media (1:1, 9:16) has no "speaker" - the content IS the slide
 */
function getStyleInstructions(
  slideStyle: "wordy" | "illustrative",
  aspectRatio: "16:9" | "1:1" | "9:16" = "16:9",
): string {
  const isSocial = aspectRatio === "1:1" || aspectRatio === "9:16";

  if (slideStyle === "illustrative") {
    return isSocial
      ? `STYLE: VISUAL-FIRST (SOCIAL)
- Powerful visuals, icons, and imagery as backdrop
- Text is punchy, standalone - no presenter needed
- Each slide/frame tells its own part of the story
- Prioritize scroll-stopping visual impact
- The slide IS the content - users read it directly`
      : `STYLE: SPEAKER ASSIST (ILLUSTRATIVE)
- Minimal text on slides - focus on powerful visuals, icons, metaphors
- Use imagery, graphics, and visual metaphors to convey meaning
- Text should be headlines only - speaker provides context
- Prioritize visual impact over text density
- Create slides that support a speaker, not replace one`;
  }

  // wordy style
  return isSocial
    ? `STYLE: TEXT-RICH (SOCIAL)
- Full readable content on each slide
- Slides ARE the content - users read them directly
- Self-contained, no additional context needed
- Clear, scannable text hierarchy
- Every slide must make sense on its own`
    : `STYLE: SELF-CONTAINED (TEXT-HEAVY)
- Include ALL content as readable text on the slide
- Slides should be fully understandable without a speaker
- Use clear bullet points, readable font sizes
- Balance text with supporting visuals
- Create slides that can stand alone as a document`;
}

export function buildSlideImagePrompt(context: SlideImageContext): string {
  const {
    slideType,
    title,
    content,
    designSystem,
    contextSlides = [],
    slideStyle = "illustrative",
    aspectRatio = "16:9",
    isTemplateBased = false,
    hasLogo = false,
    logoGuidelines,
    sources = [],
    imageStyle,
    visualDirection,
  } = context;

  const typeRequirements = SLIDE_TYPE_REQUIREMENTS[slideType];
  const styleInstructions = getStyleInstructions(slideStyle, aspectRatio);

  // Visual style section - MUST go at the TOP of the prompt for priority
  const visualStyleSection = imageStyle
    ? getVisualStyleSection(imageStyle)
    : "";

  // Per-slide visual direction from AI outline analysis
  const visualDirectionSection = visualDirection
    ? `
SLIDE-SPECIFIC VISUAL DIRECTION:
${visualDirection}
`
    : "";

  const contextDescription =
    contextSlides.length > 0
      ? `
VISUAL CONTEXT (maintain consistency with these slides):
${contextSlides.map((s) => `- ${s.type} slide: "${s.title}"`).join("\n")}
`
      : "";

  // Sources section for grounded content with citations
  const sourcesSection =
    sources.length > 0
      ? `
SOURCES (for citation styling):
This slide may reference facts from these sources. If the content includes citation markers like [1], [2]:
- Display citations as small superscript numbers (e.g., ¹, ²)
- Keep citations subtle and professional - do not distract from content
- Consider adding a small "Sources" footer area if multiple citations
${sources.map((s) => `[${s.position}] ${s.title}`).join("\n")}
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

  // Logo integration instructions (when logo image is provided)
  const logoInstructions =
    hasLogo && logoGuidelines
      ? `
LOGO INTEGRATION (MANDATORY):
A logo image is provided as input. You MUST integrate this logo into the slide:
- Position: ${logoGuidelines.position} corner of the slide
- Size: ${logoGuidelines.size} (relative to slide dimensions)
- The logo should be rendered DIRECTLY on the slide image
- Do NOT leave empty space "for" the logo - actually draw it into the image
- Ensure the logo is clearly visible and not obscured by other elements
- Match the logo's visual style to the overall slide design
`
      : "";

  // Dimensions per format
  const dimensions = {
    "16:9": { ratio: "16:9", size: "1920x1080", name: "presentation slide" },
    "1:1": {
      ratio: "1:1",
      size: "1080x1080",
      name: "social media carousel slide",
    },
    "9:16": { ratio: "9:16", size: "1080x1920", name: "vertical story frame" },
  }[aspectRatio] || {
    ratio: "16:9",
    size: "1920x1080",
    name: "presentation slide",
  };

  return `Generate a professional ${dimensions.name} image (${dimensions.ratio} aspect ratio, ${dimensions.size}).
${visualStyleSection}${templateBrandingEmphasis}${logoInstructions}
DESIGN SYSTEM:
Theme: ${designSystem.theme}
Theme Rationale: ${designSystem.themeRationale}
Primary Color: ${designSystem.primaryColor}
Secondary Color: ${designSystem.secondaryColor}
Accent Color: ${designSystem.accentColor}
Background: ${designSystem.backgroundColor}
Fonts: ${designSystem.fontPairings.heading} (headings) + ${designSystem.fontPairings.body} (body)
Layout Principles: ${designSystem.layoutPrinciples.join(", ")}
Icon Style: ${designSystem.iconStyle}
Design Inspiration: ${designSystem.designInspiration}

IMAGE GUIDELINES:
${designSystem.imageGuidelines}
${visualDirectionSection}
SLIDE CONTENT:
Type: ${slideType.toUpperCase()}
Title: ${title}
${content ? `Content:\n${content}` : ""}
${contextDescription}${sourcesSection}
REQUIREMENTS:
${typeRequirements}

${styleInstructions}

CRITICAL RULES:
1. Follow the VISUAL STYLE instructions EXACTLY - this is the PRIMARY directive${isTemplateBased ? " (with MANDATORY brand colors)" : ""}
2. Follow design system colors and fonts${isTemplateBased ? " - these are MANDATORY brand guidelines" : ""}
3. Maintain visual consistency with context slides (if provided)
4. High contrast for readability
5. Professional, export-ready quality
6. ${dimensions.ratio} aspect ratio (${dimensions.size} or equivalent)

OUTPUT: Generate ONLY the slide image. No text explanation.`;
}

/**
 * Explicit visual style prompts with XML structure for unambiguous style enforcement.
 * Each style has clear rendering instructions, forbidden elements, and reference examples.
 */
export const VISUAL_STYLE_PROMPTS: Record<string, string> = {
  "minimalist-line": `<visual-style name="minimalist-line">
<rendering>
  Use ONLY clean line drawings with thin, elegant strokes.
  Monochromatic or very limited color palette (2-3 colors max).
  Geometric shapes, simple icons, whitespace-heavy.
</rendering>
<forbidden>
  NO photographs. NO gradients. NO complex textures. NO 3D renders.
  NO filled shapes. NO photorealistic elements.
</forbidden>
<references>
  Architectural blueprints, wireframe diagrams, elegant sketches.
  Apple-style minimalism, Scandinavian design principles.
</references>
</visual-style>`,

  "corporate-vector": `<visual-style name="corporate-vector">
<rendering>
  Flat vector graphics with solid colors, no gradients or shadows.
  Professional business-style illustrations (isometric offices, people at work).
  Clean geometric shapes, consistent line weights.
</rendering>
<forbidden>
  NO photographs. NO 3D renders. NO hand-drawn sketches. NO textures.
  NO photorealistic imagery. NO complex gradients.
</forbidden>
<references>
  Notion, Slack, Asana marketing illustrations.
  Modern SaaS/tech company aesthetic.
</references>
</visual-style>`,

  photorealistic: `<visual-style name="photorealistic" priority="HIGHEST">
<CRITICAL-INSTRUCTION>
  THIS IS A PHOTOREALISTIC SLIDE. Generate REAL PHOTOGRAPHY, not illustrations.
  If you generate ANY illustration, vector art, or stylized render, you have FAILED.
</CRITICAL-INSTRUCTION>
<rendering>
  Generate HIGH-RESOLUTION PHOTOGRAPHY. Real photos of real subjects.
  Full-bleed photos that fill the frame edge-to-edge with no borders.
  Professional lighting with natural depth of field and realistic textures.
  Cinematic composition using rule of thirds and dramatic lighting.
  Real skin textures, real materials, real environments.
  Think: Professional photographer with DSLR camera, not digital artist.
</rendering>
<forbidden>
  ABSOLUTELY NO: illustrations, line art, vector graphics, cartoons, anime.
  ABSOLUTELY NO: flat graphics, abstract shapes, hand-drawn elements.
  ABSOLUTELY NO: 3D renders with plastic/clay look, stylized characters.
  ABSOLUTELY NO: gradient backgrounds, geometric patterns, iconography.
  If it looks "designed" or "illustrated" - it is WRONG.
</forbidden>
<references>
  National Geographic photography, Apple product photography, Getty Images.
  High-end editorial photography, Vogue fashion shots, architectural photos.
  Stock photography from Unsplash, Pexels - REAL PHOTOGRAPHS.
</references>
</visual-style>`,

  "collage-art": `<visual-style name="collage-art">
<rendering>
  Cut-paper aesthetic, layered compositions, overlapping elements.
  Mix of photography fragments, textures, geometric shapes.
  Artistic, editorial, magazine-style layouts.
  Visible texture, torn edges, organic imperfections.
</rendering>
<forbidden>
  NOT clean corporate. NOT minimal. NOT simple.
  NO single-style uniformity. NO flat vector graphics.
</forbidden>
<references>
  Vogue editorial, museum exhibition graphics, zine aesthetic.
  Mixed-media art, scrapbook style, avant-garde design.
</references>
</visual-style>`,

  "3d-render": `<visual-style name="3d-render">
<rendering>
  Soft, rounded 3D shapes with gentle gradients and ambient occlusion.
  Pastel or muted color palette, subtle shadows.
  Clay-like or plastic material rendering.
  Friendly, approachable, modern tech aesthetic.
</rendering>
<forbidden>
  NO flat graphics. NO photography. NO line art.
  NO sharp edges. NO realistic textures. NO photorealism.
</forbidden>
<references>
  Blender soft-body renders, Apple Memoji style, IKEA assembly guides.
  Clay renders, inflatable 3D, smooth plastic objects.
</references>
</visual-style>`,

  cyberpunk: `<visual-style name="cyberpunk">
<rendering>
  High-contrast neon colors on dark backgrounds (cyan, magenta, electric blue).
  Glowing effects, light trails, holographic elements.
  Futuristic UI elements, tech grids, circuit patterns.
  Dark atmosphere with vibrant accent lighting.
</rendering>
<forbidden>
  NOT minimal. NOT corporate. NOT natural.
  NO soft colors. NO organic shapes. NO traditional aesthetics.
</forbidden>
<references>
  Blade Runner, Tron, Cyberpunk 2077 UI.
  Neon-lit cityscapes, holographic interfaces, sci-fi aesthetics.
</references>
</visual-style>`,
};

/**
 * Get the visual style section for the prompt.
 * This goes at the TOP of the prompt for maximum priority.
 */
function getVisualStyleSection(imageStyle: string): string {
  const stylePrompt = VISUAL_STYLE_PROMPTS[imageStyle];

  if (stylePrompt) {
    return `
═══════════════════════════════════════════════════════════════════════════════
MANDATORY VISUAL STYLE: ${imageStyle.toUpperCase().replace(/-/g, " ")}
THIS IS THE PRIMARY DIRECTIVE - ALL OTHER INSTRUCTIONS ARE SECONDARY.
═══════════════════════════════════════════════════════════════════════════════

${stylePrompt}

`;
  }

  // Fallback for custom/unknown styles
  return `
═══════════════════════════════════════════════════════════════════════════════
MANDATORY VISUAL STYLE: ${imageStyle.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════════

Generate this slide using the "${imageStyle}" visual style.
Ensure ALL visual elements strictly follow this aesthetic.
This is the PRIMARY visual directive for this slide.

`;
}
