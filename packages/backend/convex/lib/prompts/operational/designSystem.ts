/**
 * Template constraints extracted from organization templates
 */
export interface TemplateConstraints {
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
    fallbackHeading?: string;
    fallbackBody?: string;
  };
  logoGuidelines?: {
    position: string;
    size: string;
    description?: string;
  };
  layoutPatterns: string[];
  visualStyle: string;
  iconStyle?: string;
  analysisNotes: string;
}

export const DESIGN_SYSTEM_PROMPT = `You are a professional design system architect. Analyze this presentation outline and create a comprehensive visual design system.

OUTLINE:
{OUTLINE_CONTENT}

YOUR TASK:
1. Extract the CORE THEME from the content (what is this presentation fundamentally about?)
2. Design a visual language that reflects the content's essence
3. Be CREATIVE and DISTINCTIVE - avoid generic corporate templates
4. Match the content tone (technical/business/academic/creative/scientific)
5. Use colors, fonts, and visual style that reinforce the message

EXAMPLES OF GOOD THEME EXTRACTION:
- Peptides in medicine → "peptides-biotech" (molecular, scientific, precise)
- Climate change solutions → "climate-action" (earth tones, urgent, hopeful)
- Startup funding pitch → "startup-pitch-bold" (confident, energetic, modern)
- Academic research → "academic-rigorous" (clean, authoritative, scholarly)

VISUAL STYLE GUIDELINES:
- Technical/Scientific → Clean layouts, data viz style, blue/teal palette, geometric
- Business/Professional → Confident colors, asymmetric layouts, bold typography
- Creative/Artistic → Unexpected color combos, organic shapes, artistic elements
- Academic → Scholarly palette, traditional hierarchy, serif fonts

OUTPUT FORMAT (JSON):
{
  "theme": "Concise theme extracted from content (e.g., 'peptides-biotech')",
  "themeRationale": "1-2 sentences explaining why this theme matches the content",
  "primaryColor": "#HEX (dominant color)",
  "secondaryColor": "#HEX (supporting color)",
  "accentColor": "#HEX (highlight color)",
  "backgroundColor": "#HEX (slide background)",
  "fontPairings": {
    "heading": "Font name for titles (creative choice that fits theme)",
    "body": "Font name for content (readable, complements heading)"
  },
  "visualStyle": "geometric|organic|minimal|illustrative|data-driven|artistic",
  "layoutPrinciples": ["Array of 2-4 principles: 'asymmetric', 'bold-typography', 'high-contrast', 'whitespace-driven', 'scientific-precision', 'dynamic-diagonals'"],
  "iconStyle": "line|solid|duotone|abstract",
  "imageGuidelines": "Detailed visual direction: mood, style, elements to include/avoid, color usage, composition guidelines. Be specific and actionable for image generation.",
  "designInspiration": "Reference design styles or movements (e.g., 'Swiss modernism', 'Memphis design', 'Brutalism', 'Bauhaus', 'Y Combinator pitch style', 'Scientific data visualization')"
}

CRITICAL REQUIREMENTS:
- BE BOLD AND CREATIVE
- Avoid generic corporate blue/gray templates
- Color choices must have rationale (not arbitrary)
- Font pairings must complement each other
- Image guidelines must be detailed enough to guide AI image generation
- Design inspiration should reference real design movements/styles

Think deeply about what makes this presentation unique. What visual language will make it memorable and effective?`;

/**
 * Prompt for when a template is provided - AI must follow brand constraints
 */
export const DESIGN_SYSTEM_WITH_TEMPLATE_PROMPT = `You are a professional design system architect. Create a design system for this presentation that STRICTLY follows the organization's brand guidelines.

OUTLINE:
{OUTLINE_CONTENT}

ORGANIZATION BRAND GUIDELINES (MUST FOLLOW):
{TEMPLATE_CONSTRAINTS}

YOUR TASK:
1. Create a design system that STRICTLY adheres to the brand colors, fonts, and visual style above
2. Use the EXACT hex colors provided - do not modify them
3. Use the EXACT font names provided
4. Follow the layout patterns and visual style from the brand
5. Adapt the theme to match the content while staying within brand constraints

OUTPUT FORMAT (JSON):
{
  "theme": "Theme that fits content while respecting brand (e.g., 'acme-corp-quarterly-review')",
  "themeRationale": "How this theme connects the content to the brand identity",
  "primaryColor": "{USE BRAND PRIMARY COLOR EXACTLY}",
  "secondaryColor": "{USE BRAND SECONDARY COLOR EXACTLY}",
  "accentColor": "{USE BRAND ACCENT COLOR OR DERIVE FROM BRAND}",
  "backgroundColor": "{USE BRAND BACKGROUND COLOR EXACTLY}",
  "fontPairings": {
    "heading": "{USE BRAND HEADING FONT EXACTLY}",
    "body": "{USE BRAND BODY FONT EXACTLY}"
  },
  "visualStyle": "{USE BRAND VISUAL STYLE}",
  "layoutPrinciples": ["Principles from brand guidelines"],
  "iconStyle": "{USE BRAND ICON STYLE}",
  "imageGuidelines": "Visual direction that matches both the content AND the brand aesthetic. Reference brand notes.",
  "designInspiration": "How this design extends the brand identity for this specific content"
}

CRITICAL: You MUST use the exact brand colors and fonts provided. This is a corporate presentation that must be on-brand.`;

/**
 * Build template constraints string for prompt injection
 */
function formatTemplateConstraints(template: TemplateConstraints): string {
  const lines: string[] = [];

  lines.push("BRAND COLORS:");
  lines.push(`- Primary: ${template.colors.primary}`);
  lines.push(`- Secondary: ${template.colors.secondary}`);
  if (template.colors.accent) {
    lines.push(`- Accent: ${template.colors.accent}`);
  }
  lines.push(`- Background: ${template.colors.background}`);
  lines.push(`- Text: ${template.colors.text}`);
  lines.push("");

  lines.push("BRAND FONTS:");
  lines.push(`- Headings: ${template.fonts.heading}`);
  lines.push(`- Body: ${template.fonts.body}`);
  if (template.fonts.fallbackHeading) {
    lines.push(`- Fallback Heading: ${template.fonts.fallbackHeading}`);
  }
  if (template.fonts.fallbackBody) {
    lines.push(`- Fallback Body: ${template.fonts.fallbackBody}`);
  }
  lines.push("");

  if (template.logoGuidelines) {
    lines.push("LOGO GUIDELINES:");
    lines.push(`- Position: ${template.logoGuidelines.position}`);
    lines.push(`- Size: ${template.logoGuidelines.size}`);
    if (template.logoGuidelines.description) {
      lines.push(`- Notes: ${template.logoGuidelines.description}`);
    }
    lines.push("");
  }

  lines.push(`VISUAL STYLE: ${template.visualStyle}`);
  if (template.iconStyle) {
    lines.push(`ICON STYLE: ${template.iconStyle}`);
  }
  lines.push("");

  if (template.layoutPatterns.length > 0) {
    lines.push("LAYOUT PATTERNS:");
    template.layoutPatterns.forEach((p) => lines.push(`- ${p}`));
    lines.push("");
  }

  lines.push("ADDITIONAL BRAND NOTES:");
  lines.push(template.analysisNotes);

  return lines.join("\n");
}

/**
 * Get image style guidance for the design system prompt
 */
function getImageStyleGuidance(imageStyle: string): string {
  const styleGuidance: Record<string, string> = {
    "minimalist-line": `USER SELECTED IMAGE STYLE: Minimalist Line Art
- imageGuidelines MUST specify: clean line drawings, thin elegant strokes, monochromatic or 2-3 colors max
- visualStyle should be: "minimal" or compatible with line art
- Avoid: gradients, complex textures, photorealistic elements
- Reference: architectural blueprints, wireframes, Apple-style minimalism`,

    "corporate-vector": `USER SELECTED IMAGE STYLE: Corporate Vector
- imageGuidelines MUST specify: flat vector graphics, solid colors, professional business illustrations
- visualStyle should be: "illustrative" or compatible with vector art
- Avoid: photographs, 3D renders, hand-drawn sketches
- Reference: Notion, Slack, modern SaaS company aesthetic`,

    photorealistic: `USER SELECTED IMAGE STYLE: Photorealistic
- imageGuidelines MUST specify: HIGH-RESOLUTION PHOTOGRAPHY, real photos of real subjects
- visualStyle should be: "photorealistic" - this is NON-NEGOTIABLE
- The design system must assume ALL images will be real photographs
- Avoid: any mention of illustrations, vectors, or stylized graphics
- Reference: National Geographic, Apple product photography, Getty Images editorial`,

    "collage-art": `USER SELECTED IMAGE STYLE: Collage Art
- imageGuidelines MUST specify: cut-paper aesthetic, layered compositions, mixed media
- visualStyle should be: "artistic" or "collage"
- Include: photography fragments, textures, geometric overlays, torn edges
- Reference: Vogue editorial, museum graphics, zine aesthetic`,

    "3d-render": `USER SELECTED IMAGE STYLE: 3D Render
- imageGuidelines MUST specify: soft rounded 3D shapes, clay-like materials, gentle gradients
- visualStyle should be: "3d-render" or "illustrative"
- Include: ambient occlusion, pastel colors, plastic/clay textures
- Reference: Blender soft-body renders, Apple Memoji style`,

    cyberpunk: `USER SELECTED IMAGE STYLE: Cyberpunk
- imageGuidelines MUST specify: neon colors on dark backgrounds, glowing effects, futuristic UI
- visualStyle should be: "cyberpunk" or "futuristic"
- Include: cyan, magenta, electric blue accents; holographic elements; tech grids
- Reference: Blade Runner, Tron, Cyberpunk 2077 UI`,
  };

  return (
    styleGuidance[imageStyle] ||
    `USER SELECTED IMAGE STYLE: ${imageStyle}
- imageGuidelines should align with this visual style
- Ensure all visual recommendations are compatible with "${imageStyle}" rendering`
  );
}

/**
 * Build design system prompt, optionally with template constraints and image style
 */
export function buildDesignSystemPrompt(
  outlineContent: string,
  template?: TemplateConstraints,
  imageStyle?: string,
): string {
  let prompt: string;

  if (template) {
    prompt = DESIGN_SYSTEM_WITH_TEMPLATE_PROMPT.replace(
      "{OUTLINE_CONTENT}",
      outlineContent,
    ).replace("{TEMPLATE_CONSTRAINTS}", formatTemplateConstraints(template));
  } else {
    prompt = DESIGN_SYSTEM_PROMPT.replace("{OUTLINE_CONTENT}", outlineContent);
  }

  // Inject image style guidance if provided
  if (imageStyle) {
    const styleGuidance = getImageStyleGuidance(imageStyle);
    prompt += `\n\n═══════════════════════════════════════════════════════════════════════════════
MANDATORY IMAGE STYLE CONSTRAINT
═══════════════════════════════════════════════════════════════════════════════

${styleGuidance}

CRITICAL: Your imageGuidelines and visualStyle MUST be compatible with this user-selected style.
The user has explicitly chosen this visual approach - do not override it with incompatible suggestions.`;
  }

  return prompt;
}
