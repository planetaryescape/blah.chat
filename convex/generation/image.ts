import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

export const generateImage = internalAction({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    prompt: v.string(),
    model: v.optional(v.string()),
    referenceImageStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const model = args.model || "gemini-2.0-flash-exp";

    try {
      // Build message content with text prompt
      const messagesContent: Array<{
        type: "text" | "image";
        text?: string;
        image?: string;
      }> = [
        {
          type: "text",
          text: `${args.prompt}\n\nIMPORTANT: Return the result as a Base64 encoded string of the image. Do not include any markdown formatting or prefixes. Just the raw base64 string.`,
        },
      ];

      // Add reference image if provided
      if (args.referenceImageStorageId) {
        const imageUrl = await ctx.storage.getUrl(args.referenceImageStorageId);
        if (imageUrl) {
          const imageResponse = await fetch(imageUrl);
          const imageBuffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(imageBuffer).toString("base64");
          messagesContent.push({
            type: "image",
            image: `data:image/png;base64,${base64}`,
          });
        }
      }

      const generationStart = Date.now();

      // Strip provider prefix for Google SDK
      const geminiModel = model.replace(/^google:/, "");

      const result = await generateText({
        model: google(geminiModel),
        system:
          "You are a precise image generation API. Your ONLY task is to generate the requested image based on the inputs. You MUST NOT output any conversational text, markdown, or explanations. Return ONLY the image file or the raw Base64 string.",
        messages: [
          {
            role: "user",
            content: messagesContent as any,
          },
        ],
      });

      const generationTime = Date.now() - generationStart;

      // Extract image from response - try files first, then text fallback
      let imageBuffer: Buffer;

      const files = result.files || (result as any).experimental_output?.files;

      if (files && files.length > 0) {
        const file = files[0];
        if ((file as any).base64Data) {
          imageBuffer = Buffer.from((file as any).base64Data, "base64");
        } else {
          throw new Error("No base64 data in file response");
        }
      } else if (result.text) {
        // Clean up potential markdown/formatting
        let cleanText = result.text
          .replace(/```/g, "")
          .replace(/^base64\n/, "")
          .replace(/\n/g, "")
          .trim();

        // Extract base64 pattern if text is chatty
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
      } else {
        throw new Error("No image generated in response");
      }

      // Store in Convex file storage
      const storageId = await ctx.storage.store(
        new Blob([new Uint8Array(imageBuffer)], { type: "image/png" }),
      );

      const totalTime = Date.now() - startTime;

      // Estimated cost (Gemini image generation - approximate)
      const cost = 0.0025; // $0.0025 per image (approximate)

      // Update message with image attachment
      // @ts-ignore
      await ctx.runMutation(internal.messages.addAttachment, {
        messageId: args.messageId,
        attachment: {
          type: "image",
          storageId,
          name: "generated-image.png",
          size: imageBuffer.byteLength,
          mimeType: "image/png",
          metadata: {
            prompt: args.prompt,
            model: args.model,
            generationTime,
            totalTime: Date.now() - startTime,
            cost,
          },
        },
      });

      // Track usage
      const conversation = await ctx.runQuery(
        internal.shares.getConversationInternal,
        {
          conversationId: args.conversationId,
        },
      );

      if (conversation) {
        await ctx.runMutation(internal.usage.mutations.recordImageGeneration, {
          userId: conversation.userId,
          conversationId: args.conversationId,
          model,
          cost,
        });
      }

      return {
        success: true,
        storageId,
        cost,
        generationTime: totalTime,
      };
    } catch (error) {
      console.error("Image generation error:", error);

      await ctx.runMutation(internal.messages.updatePartial, {
        messageId: args.messageId,
        updates: {
          error: `Image generation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      });

      throw error;
    }
  },
});
