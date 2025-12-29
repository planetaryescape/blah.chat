import { streamText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { DESIGN_SYSTEM_GENERATION_MODEL } from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import { calculateCost } from "@/lib/ai/utils";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { internalAction } from "../_generated/server";
import {
  buildDesignSystemPrompt,
  type TemplateConstraints,
} from "../lib/prompts/operational/designSystem";
import { buildVisualDirectionPrompt } from "../lib/prompts/operational/visualDirection";

// Helper to track usage for slides feature
async function trackSlidesUsage(
  ctx: ActionCtx,
  userId: Id<"users">,
  presentationId: Id<"presentations">,
  modelId: string,
  usage: { inputTokens?: number; outputTokens?: number } | undefined,
) {
  if (!usage) return;

  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;

  const cost = calculateCost(modelId, {
    inputTokens,
    outputTokens,
  });

  await (ctx.runMutation as any)(
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    internal.usage.mutations.recordTextGeneration,
    {
      userId,
      presentationId,
      model: modelId,
      inputTokens,
      outputTokens,
      cost,
      feature: "slides",
    },
  );
}

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

      // Check if presentation has a template and get imageStyle
      const presentation = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.getPresentationInternal,
        { presentationId: args.presentationId },
      )) as { templateId?: string; imageStyle?: string } | null;

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
      const prompt = buildDesignSystemPrompt(
        outlineContent,
        templateConstraints,
        presentation?.imageStyle,
      );

      const result = streamText({
        model: getModel(DESIGN_SYSTEM_GENERATION_MODEL.id),
        prompt,
        providerOptions: getGatewayOptions(
          DESIGN_SYSTEM_GENERATION_MODEL.id,
          undefined,
          ["design-system-generation"],
        ),
      });

      // 5-minute timeout to prevent hanging forever (Convex action limit is 10 min)
      const TIMEOUT_MS = 5 * 60 * 1000;
      let responseText = "";

      const streamPromise = (async () => {
        for await (const chunk of result.textStream) {
          responseText += chunk;
        }
        return responseText;
      })();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error("Design system generation timeout after 5 minutes"),
            ),
          TIMEOUT_MS,
        );
      });

      await Promise.race([streamPromise, timeoutPromise]);

      // Get presentation to get userId for cost tracking
      const presentationForUserId = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.internal.getPresentationInternal,
        { presentationId: args.presentationId },
      )) as { userId: Id<"users"> } | null;

      // Track usage
      const usage = await result.usage;
      if (presentationForUserId && usage) {
        await trackSlidesUsage(
          ctx,
          presentationForUserId.userId,
          args.presentationId,
          DESIGN_SYSTEM_GENERATION_MODEL.id,
          usage,
        );
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

/**
 * Generate design system from outline items (before approval)
 * Called after outline parsing completes, generates design + visual directions
 * Does NOT trigger slide generation - that happens at approval
 */
export const generateDesignSystemFromOutline = internalAction({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    try {
      // Update status to design_generating
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateStatusInternal,
        {
          presentationId: args.presentationId,
          status: "design_generating",
        },
      );

      // Get outline items (not slides - they don't exist yet)
      const items = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.outlineItems.listByPresentationInternal,
        { presentationId: args.presentationId },
      )) as Doc<"outlineItems">[];

      if (items.length === 0) {
        throw new Error("No outline items found for presentation");
      }

      // Check if presentation has a template and get imageStyle
      const presentation = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.getPresentationInternal,
        { presentationId: args.presentationId },
      )) as { templateId?: string; imageStyle?: string } | null;

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

      // Build outline content from items
      const outlineContent = buildOutlineContent(
        items.map((item) => ({
          title: item.title,
          content: item.content,
          slideType: item.slideType as "title" | "section" | "content",
          speakerNotes: item.speakerNotes,
        })),
      );

      const prompt = buildDesignSystemPrompt(
        outlineContent,
        templateConstraints,
        presentation?.imageStyle,
      );

      // Generate design system
      const result = streamText({
        model: getModel(DESIGN_SYSTEM_GENERATION_MODEL.id),
        prompt,
        providerOptions: getGatewayOptions(
          DESIGN_SYSTEM_GENERATION_MODEL.id,
          undefined,
          ["design-system-from-outline"],
        ),
      });

      const TIMEOUT_MS = 5 * 60 * 1000;
      let responseText = "";

      const streamPromise = (async () => {
        for await (const chunk of result.textStream) {
          responseText += chunk;
        }
        return responseText;
      })();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error("Design system generation timeout after 5 minutes"),
            ),
          TIMEOUT_MS,
        );
      });

      await Promise.race([streamPromise, timeoutPromise]);

      // Get presentation to get userId for cost tracking
      const presentationForUserId = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.internal.getPresentationInternal,
        { presentationId: args.presentationId },
      )) as { userId: Id<"users"> } | null;

      // Track usage for design system generation
      const designUsage = await result.usage;
      if (presentationForUserId && designUsage) {
        await trackSlidesUsage(
          ctx,
          presentationForUserId.userId,
          args.presentationId,
          DESIGN_SYSTEM_GENERATION_MODEL.id,
          designUsage,
        );
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

      // Save design system
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateDesignSystemInternal,
        {
          presentationId: args.presentationId,
          designSystem,
        },
      );

      // Generate visual directions for items that don't have one
      const itemsNeedingVisuals = items.filter((i) => !i.visualDirection);

      if (itemsNeedingVisuals.length > 0) {
        const visualPrompt = buildVisualDirectionPrompt(
          itemsNeedingVisuals.map((item) => ({
            position: item.position,
            title: item.title,
            content: item.content,
            slideType: item.slideType,
          })),
          {
            theme: designSystem.theme,
            primaryColor: designSystem.primaryColor,
            secondaryColor: designSystem.secondaryColor,
            accentColor: designSystem.accentColor,
            visualStyle: designSystem.visualStyle,
            imageGuidelines: designSystem.imageGuidelines,
          },
        );

        const visualResult = streamText({
          model: getModel(DESIGN_SYSTEM_GENERATION_MODEL.id),
          prompt: visualPrompt,
          providerOptions: getGatewayOptions(
            DESIGN_SYSTEM_GENERATION_MODEL.id,
            undefined,
            ["visual-direction-batch"],
          ),
        });

        let visualText = "";
        const visualStreamPromise = (async () => {
          for await (const chunk of visualResult.textStream) {
            visualText += chunk;
          }
          return visualText;
        })();

        await Promise.race([visualStreamPromise, timeoutPromise]);

        // Track usage for visual directions generation
        const visualUsage = await visualResult.usage;
        if (presentationForUserId && visualUsage) {
          await trackSlidesUsage(
            ctx,
            presentationForUserId.userId,
            args.presentationId,
            DESIGN_SYSTEM_GENERATION_MODEL.id,
            visualUsage,
          );
        }

        // Parse visual directions
        try {
          const trimmed = visualText.trim();
          const jsonMatch = trimmed.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
          const jsonText = jsonMatch ? jsonMatch[1].trim() : trimmed;
          const visualDirections = JSON.parse(jsonText) as Array<{
            position: number;
            visualDirection: string;
          }>;

          // Map positions to item IDs
          const positionToId = new Map<number, Id<"outlineItems">>();
          for (const item of itemsNeedingVisuals) {
            positionToId.set(item.position, item._id);
          }

          const updates: Array<{
            itemId: Id<"outlineItems">;
            visualDirection: string;
          }> = [];

          for (const vd of visualDirections) {
            const itemId = positionToId.get(vd.position);
            if (itemId && vd.visualDirection) {
              updates.push({ itemId, visualDirection: vd.visualDirection });
            }
          }

          if (updates.length > 0) {
            await (ctx.runMutation as any)(
              // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
              internal.outlineItems.updateVisualDirections,
              { items: updates },
            );
          }
        } catch (e) {
          console.error("Failed to parse visual directions:", e);
          // Non-fatal - continue without visual directions
        }
      }

      // Update status to design_complete (NOT slides_generating)
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateStatusInternal,
        {
          presentationId: args.presentationId,
          status: "design_complete",
        },
      );

      return { success: true, theme: designSystem.theme };
    } catch (error) {
      console.error("Design system generation from outline failed:", error);

      try {
        // Revert to outline_complete so user can still approve
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.presentations.updateStatusInternal,
          {
            presentationId: args.presentationId,
            status: "outline_complete",
          },
        );
      } catch (e) {
        console.error("Failed to update status:", e);
      }

      return { success: false, error: String(error) };
    }
  },
});
