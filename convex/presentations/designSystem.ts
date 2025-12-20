import { streamText } from "ai";
import { v } from "convex/values";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { DESIGN_SYSTEM_GENERATION_MODEL } from "../../src/lib/ai/operational-models";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import {
  buildDesignSystemPrompt,
  type TemplateConstraints,
} from "../lib/prompts/operational/designSystem";

interface SlideData {
  title: string;
  content: string;
  slideType: "title" | "section" | "content";
  speakerNotes?: string;
}

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

const REQUIRED_FIELDS = [
  "theme",
  "themeRationale",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "fontPairings",
  "visualStyle",
  "layoutPrinciples",
  "iconStyle",
  "imageGuidelines",
  "designInspiration",
] as const;

function buildOutlineContent(slides: SlideData[]): string {
  return slides
    .map((slide) => {
      const typeLabel =
        slide.slideType === "title"
          ? "TITLE SLIDE"
          : slide.slideType === "section"
            ? "SECTION"
            : "CONTENT SLIDE";

      let content = `# ${typeLabel}: ${slide.title}\n${slide.content}`;
      if (slide.speakerNotes) {
        content += `\nSpeaker Notes: ${slide.speakerNotes}`;
      }
      return content;
    })
    .join("\n\n");
}

// Handles markdown ```json``` blocks from LLM responses
function parseDesignSystemResponse(responseText: string): DesignSystem {
  const trimmed = responseText.trim();

  // Try to extract JSON from markdown code blocks
  const jsonMatch = trimmed.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  const jsonText = jsonMatch ? jsonMatch[1].trim() : trimmed;

  return JSON.parse(jsonText);
}

// Type guard - throws on invalid structure
function validateDesignSystem(
  designSystem: unknown,
): designSystem is DesignSystem {
  if (!designSystem || typeof designSystem !== "object") {
    return false;
  }

  const ds = designSystem as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (!ds[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate fontPairings structure
  const fp = ds.fontPairings as Record<string, unknown> | undefined;
  if (!fp || !fp.heading || !fp.body) {
    throw new Error("fontPairings must have heading and body");
  }

  // Validate layoutPrinciples is array
  if (!Array.isArray(ds.layoutPrinciples)) {
    throw new Error("layoutPrinciples must be an array");
  }

  return true;
}

export const generateDesignSystem = internalAction({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    try {
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateStatusInternal,
        {
          presentationId: args.presentationId,
          status: "design_generating",
        },
      );

      const slides = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.getSlidesInternal,
        { presentationId: args.presentationId },
      )) as SlideData[];

      if (slides.length === 0) {
        throw new Error("No slides found for presentation");
      }

      // Check if presentation has a template
      const presentation = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.getPresentationInternal,
        { presentationId: args.presentationId },
      )) as { templateId?: string } | null;

      let templateConstraints: TemplateConstraints | undefined;
      if (presentation?.templateId) {
        const template = (await (ctx.runQuery as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.designTemplates.getInternal,
          { templateId: presentation.templateId },
        )) as { extractedDesign?: TemplateConstraints } | null;

        if (template?.extractedDesign) {
          templateConstraints = template.extractedDesign;
        }
      }

      const outlineContent = buildOutlineContent(slides);
      const prompt = buildDesignSystemPrompt(outlineContent, templateConstraints);

      const result = streamText({
        model: getModel(DESIGN_SYSTEM_GENERATION_MODEL.id),
        prompt,
        providerOptions: getGatewayOptions(
          DESIGN_SYSTEM_GENERATION_MODEL.id,
          undefined,
          ["design-system-generation"],
        ),
      });

      let responseText = "";
      for await (const chunk of result.textStream) {
        responseText += chunk;
      }

      let designSystem: DesignSystem;
      try {
        designSystem = parseDesignSystemResponse(responseText);
      } catch {
        console.error(
          "Failed to parse design system JSON:",
          responseText.substring(0, 500),
        );
        throw new Error("Invalid design system format from AI");
      }

      validateDesignSystem(designSystem);

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateDesignSystemInternal,
        {
          presentationId: args.presentationId,
          designSystem,
        },
      );

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateStatusInternal,
        {
          presentationId: args.presentationId,
          status: "design_complete",
        },
      );

      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      await (ctx.scheduler.runAfter as any)(
        0,
        internal.presentations.generateSlides.generateSlides,
        { presentationId: args.presentationId },
      );

      return { success: true, theme: designSystem.theme };
    } catch (error) {
      console.error("Design system generation failed:", error);

      try {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.presentations.updateStatusInternal,
          {
            presentationId: args.presentationId,
            status: "error",
          },
        );
      } catch (e) {
        console.error("Failed to update error status:", e);
      }

      return { success: false, error: String(error) };
    }
  },
});
