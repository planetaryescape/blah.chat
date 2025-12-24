"use node";

import { generateText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { getModel } from "@/lib/ai/registry";
import { calculateCost } from "@/lib/ai/utils";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { buildSlideImagePrompt } from "../lib/prompts/operational/slideImage";

interface SlideData {
  _id: string;
  presentationId: string;
  userId: string;
  title: string;
  content: string;
  slideType: "title" | "section" | "content";
  imageStorageId?: Id<"_storage">;
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

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelayMs * 2 ** attempt;
      console.warn(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
        error,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

export const generateSlideImage = internalAction({
  args: {
    slideId: v.id("slides"),
    modelId: v.string(),
    designSystem: v.any(),
    contextSlides: v.optional(
      v.array(
        v.object({
          type: v.string(),
          title: v.string(),
        }),
      ),
    ),
    customPrompt: v.optional(v.string()),
    slideStyle: v.optional(
      v.union(v.literal("wordy"), v.literal("illustrative")),
    ),
    isTemplateBased: v.optional(v.boolean()),
    referenceImageStorageId: v.optional(v.id("_storage")),
    // Logo integration
    logoStorageId: v.optional(v.id("_storage")),
    logoGuidelines: v.optional(
      v.object({
        position: v.string(),
        size: v.string(),
      }),
    ),
    // New fields
    aspectRatio: v.optional(
      v.union(v.literal("16:9"), v.literal("1:1"), v.literal("9:16")),
    ),
    imageStyle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      const slide = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.getSlideInternal,
        { slideId: args.slideId },
      )) as SlideData | null;

      if (!slide) {
        throw new Error("Slide not found");
      }

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateSlideImageInternal,
        { slideId: args.slideId, imageStatus: "generating" },
      );

      const slideStyle = args.slideStyle ?? "illustrative";
      const isTemplateBased = args.isTemplateBased ?? false;
      const aspectRatio = args.aspectRatio ?? "16:9";

      // Check if we have a reference image to use
      const referenceStorageId =
        args.referenceImageStorageId || slide.imageStorageId;
      let referenceImageBase64: string | null = null;

      if (referenceStorageId && args.customPrompt) {
        // Only fetch reference image when there's a custom prompt (regeneration with instructions)
        try {
          const imageBlob = await ctx.storage.get(referenceStorageId);
          if (imageBlob) {
            const arrayBuffer = await imageBlob.arrayBuffer();
            referenceImageBase64 = Buffer.from(arrayBuffer).toString("base64");
            console.log("Loaded reference image for regeneration");
          }
        } catch (e) {
          console.warn("Failed to load reference image:", e);
        }
      }

      // Fetch logo if provided
      let logoImageBase64: string | null = null;
      if (args.logoStorageId) {
        try {
          const logoBlob = await ctx.storage.get(args.logoStorageId);
          if (logoBlob) {
            const arrayBuffer = await logoBlob.arrayBuffer();
            logoImageBase64 = Buffer.from(arrayBuffer).toString("base64");
            console.log("Loaded logo image for slide generation");
          }
        } catch (e) {
          console.warn("Failed to load logo image:", e);
        }
      }

      let prompt = buildSlideImagePrompt({
        slideType: slide.slideType,
        title: slide.title,
        content: slide.content,
        designSystem: args.designSystem as DesignSystem,
        contextSlides: args.contextSlides,
        slideStyle,
        isTemplateBased,
        hasLogo: !!logoImageBase64,
        logoGuidelines: args.logoGuidelines,
      });

      // Inject Image Style if provided
      if (args.imageStyle) {
        prompt += `\n\nVISUAL STYLE:\nGenerate this slide in the following style: "${args.imageStyle}".\nEnsure all visual elements align with this aesthetic.`;
      }

      // Inject Aspect Ratio context
      if (aspectRatio !== "16:9") {
        prompt += `\n\nFORMAT:\nRequired Aspect Ratio: ${aspectRatio}. Ensure layout fits within this vertical/square frame.`;
      }

      // Merge custom prompt if provided
      if (args.customPrompt) {
        if (referenceImageBase64) {
          prompt += `\n\nREFERENCE IMAGE PROVIDED:
The attached image shows the CURRENT slide design. Use this as your starting point.
Apply the following modifications while preserving what works well:

USER REQUESTED CHANGES:
${args.customPrompt}

IMPORTANT: Make ONLY the changes requested above. Preserve all other aspects of the current design (layout, colors, typography, visual elements) unless the user specifically asked to change them.`;
        } else {
          prompt += `\n\nADDITIONAL USER INSTRUCTIONS:\n${args.customPrompt}`;
        }
      }

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateSlideImageInternal,
        {
          slideId: args.slideId,
          imageStatus: "generating",
          imagePrompt: prompt,
        },
      );

      // Build messages - use multimodal if we have images (reference or logo)
      let result: Awaited<ReturnType<typeof generateText>>;
      const hasMultimodalContent = referenceImageBase64 || logoImageBase64;

      if (hasMultimodalContent) {
        // Build content parts array
        const contentParts: Array<
          { type: "text"; text: string } | { type: "image"; image: string }
        > = [{ type: "text", text: prompt }];

        // Add logo image first (so model sees it before reference)
        if (logoImageBase64) {
          console.log("Including logo image in generation");
          contentParts.push({
            type: "image",
            image: `data:image/png;base64,${logoImageBase64}`,
          });
          contentParts.push({
            type: "text",
            text: "The above image is the LOGO that must be integrated into the slide.",
          });
        }

        // Add reference image if present
        if (referenceImageBase64) {
          console.log("Including reference image for regeneration");
          contentParts.push({
            type: "image",
            image: `data:image/png;base64,${referenceImageBase64}`,
          });
        }

        result = await generateText({
          model: getModel(args.modelId),
          messages: [
            {
              role: "user",
              content: contentParts,
            },
          ],
          providerOptions: {
            ...getGatewayOptions(args.modelId, slide.userId, ["slide-image"]),
            google: {
              imageConfig: {
                aspectRatio: aspectRatio,
              },
            },
          },
        });
      } else {
        result = await generateText({
          model: getModel(args.modelId),
          prompt,
          providerOptions: {
            ...getGatewayOptions(args.modelId, slide.userId, ["slide-image"]),
            google: {
              imageConfig: {
                aspectRatio: aspectRatio,
              },
            },
          },
        });
      }

      const generationTime = Date.now() - startTime;
      const usage = result.usage;
      const files = result.files;
      let imageBuffer: Buffer;

      if (files && files.length > 0) {
        const file = files[0];
        if ((file as any).uint8Array) {
          imageBuffer = Buffer.from((file as any).uint8Array);
        } else if ((file as any).base64Data) {
          imageBuffer = Buffer.from((file as any).base64Data, "base64");
        } else {
          throw new Error("No image data in file response");
        }
      } else {
        // Fallback to text parsing (base64)
        const text = result.text;
        let cleanText = text
          .replace(/```/g, "")
          .replace(/^base64\n/, "")
          .replace(/\n/g, "")
          .trim();

        if (cleanText.includes(" ")) {
          const base64Match = cleanText.match(/([A-Za-z0-9+/]{100,}={0,2})/);
          if (base64Match) {
            cleanText = base64Match[0];
          }
        }

        if (cleanText.length > 100 && !cleanText.includes(" ")) {
          imageBuffer = Buffer.from(cleanText, "base64");
        } else {
          throw new Error("Invalid base64 response from model");
        }
      }

      const storageId = await withRetry(
        () =>
          ctx.storage.store(
            new Blob([new Uint8Array(imageBuffer)], { type: "image/png" }),
          ),
        3,
        1000,
      );

      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;
      const cost = calculateCost(args.modelId, {
        inputTokens,
        outputTokens,
        cachedTokens: undefined,
        reasoningTokens: 0,
      });

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateSlideImageInternal,
        {
          slideId: args.slideId,
          imageStatus: "complete",
          imageStorageId: storageId,
          hasEmbeddedText: slideStyle === "illustrative",
        },
      );

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateSlideCostInternal,
        {
          slideId: args.slideId,
          generationCost: cost,
          inputTokens,
          outputTokens,
        },
      );

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.usage.mutations.recordSlideImageGeneration,
        {
          userId: slide.userId,
          presentationId: slide.presentationId,
          model: args.modelId,
          cost,
          inputTokens,
          outputTokens,
        },
      );

      // Check if all slides are now complete → update presentation status
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.checkAndCompletePresentation,
        { presentationId: slide.presentationId as Id<"presentations"> },
      );

      return {
        success: true,
        storageId,
        cost,
        generationTime,
      };
    } catch (error) {
      console.error("Slide image generation error:", error);

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateSlideImageInternal,
        {
          slideId: args.slideId,
          imageStatus: "error",
          imageError: error instanceof Error ? error.message : String(error),
        },
      );

      throw error;
    }
  },
});
