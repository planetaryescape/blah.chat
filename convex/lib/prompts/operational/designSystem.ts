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

export function buildDesignSystemPrompt(outlineContent: string): string {
  return DESIGN_SYSTEM_PROMPT.replace("{OUTLINE_CONTENT}", outlineContent);
}
