"use node";

import { calculateCost } from "@/lib/ai/utils";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { v } from "convex/values";
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
    slideStyle: v.optional(v.union(v.literal("wordy"), v.literal("illustrative"))),
    isTemplateBased: v.optional(v.boolean()),
    referenceImageStorageId: v.optional(v.id("_storage")),
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

      // Check if we have a reference image to use
      const referenceStorageId = args.referenceImageStorageId || slide.imageStorageId;
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

      let prompt = buildSlideImagePrompt({
        slideType: slide.slideType,
        title: slide.title,
        content: slide.content,
        designSystem: args.designSystem as DesignSystem,
        contextSlides: args.contextSlides,
        slideStyle,
        isTemplateBased,
      });

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

      const geminiModel = args.modelId.replace(/^google:/, "");

      // Build messages - use multimodal if we have a reference image
      let result;
      if (referenceImageBase64) {
        console.log("Using multimodal generation with reference image");
        result = await generateText({
          model: google(geminiModel),
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image",
                  image: `data:image/png;base64,${referenceImageBase64}`,
                },
              ],
            },
          ],
          providerOptions: {
            google: {
              imageConfig: {
                aspectRatio: "16:9",
              },
            },
          },
        });
      } else {
        result = await generateText({
          model: google(geminiModel),
          prompt,
          providerOptions: {
            google: {
              imageConfig: {
                aspectRatio: "16:9",
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
        // biome-ignore lint/suspicious/noExplicitAny: File object type variations
        if ((file as any).uint8Array) {
          // biome-ignore lint/suspicious/noExplicitAny: File object type variations
          imageBuffer = Buffer.from((file as any).uint8Array);
          // biome-ignore lint/suspicious/noExplicitAny: File object type variations
        } else if ((file as any).base64Data) {
          // biome-ignore lint/suspicious/noExplicitAny: File object type variations
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

      const storageId = await ctx.storage.store(
        new Blob([new Uint8Array(imageBuffer)], { type: "image/png" }),
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
