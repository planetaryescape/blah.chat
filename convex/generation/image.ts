import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { v } from "convex/values";
import { buildReasoningOptions } from "@/lib/ai/reasoning";
import { calculateCost, getModelConfig } from "@/lib/ai/utils";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { IMAGE_GENERATION_SYSTEM_PROMPT } from "../lib/prompts/operational/imageGeneration";

export const generateImage = internalAction({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    prompt: v.string(),
    model: v.optional(v.string()),
    referenceImageStorageId: v.optional(v.string()),
    thinkingEffort: v.optional(
      v.union(
        v.literal("none"),
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const model = args.model || "gemini-3-pro-image";

    // Get model config
    const modelConfig = getModelConfig(model);
    if (!modelConfig) {
      throw new Error(`Model ${model} not found in config`);
    }

    // Build reasoning options if thinking effort specified
    const reasoningResult =
      args.thinkingEffort && modelConfig.reasoning
        ? buildReasoningOptions(modelConfig, args.thinkingEffort)
        : null;

    // Check if user wants reasoning displayed (not "none")
    const wantsReasoning =
      args.thinkingEffort && args.thinkingEffort !== "none";

    // Mark thinking started when user wants reasoning
    if (wantsReasoning) {
      await ctx.runMutation(internal.messages.markThinkingStarted, {
        messageId: args.messageId,
      });
    }

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

      const result = streamText({
        model: google(geminiModel),
        system: IMAGE_GENERATION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            // biome-ignore lint/suspicious/noExplicitAny: Complex message content types
            content: messagesContent as any,
          },
        ],
        ...(reasoningResult?.providerOptions || {}), // Apply thinking config
      });

      // Stream processing
      let accumulated = "";
      let reasoningBuffer = "";
      let lastUpdate = Date.now();
      let lastReasoningUpdate = Date.now();
      const UPDATE_INTERVAL = 200; // Throttle DB updates

      for await (const chunk of result.fullStream) {
        const now = Date.now();

        // Handle reasoning chunks (only when user wants reasoning displayed)
        if (chunk.type === "reasoning-delta" && wantsReasoning) {
          reasoningBuffer += chunk.text;

          if (now - lastReasoningUpdate >= UPDATE_INTERVAL) {
            await ctx.runMutation(internal.messages.updatePartialReasoning, {
              messageId: args.messageId,
              partialReasoning: reasoningBuffer,
            });
            lastReasoningUpdate = now;
          }
        }

        // Handle text chunks
        if (chunk.type === "text-delta") {
          accumulated += chunk.text;

          if (now - lastUpdate >= UPDATE_INTERVAL) {
            await ctx.runMutation(internal.messages.updatePartialContent, {
              messageId: args.messageId,
              partialContent: accumulated,
            });
            lastUpdate = now;
          }
        }
      }

      const generationTime = Date.now() - generationStart;

      // Get token usage
      const usage = await result.usage;

      // Extract final thinking (only if user wants reasoning)
      const reasoningOutputs = await result.reasoning;
      const finalReasoning =
        wantsReasoning && reasoningOutputs && reasoningOutputs.length > 0
          ? reasoningOutputs.map((r) => r.text).join("\n")
          : undefined;

      // Complete thinking if reasoning was requested and content present
      if (
        wantsReasoning &&
        finalReasoning &&
        finalReasoning.trim().length > 0
      ) {
        await ctx.runMutation(internal.messages.completeThinking, {
          messageId: args.messageId,
          reasoning: finalReasoning,
          reasoningTokens: usage.reasoningTokens || 0,
        });
      }

      // Extract image (KEY: streamText returns files after stream!)
      const files = await result.files;
      let imageBuffer: Buffer;

      if (files && files.length > 0) {
        const file = files[0];

        // Handle Uint8Array format
        // biome-ignore lint/suspicious/noExplicitAny: File object type variations
        if ((file as any).uint8Array) {
          // biome-ignore lint/suspicious/noExplicitAny: File object type variations
          imageBuffer = Buffer.from((file as any).uint8Array);
        }
        // Handle base64Data format
        // biome-ignore lint/suspicious/noExplicitAny: File object type variations
        else if ((file as any).base64Data) {
          // biome-ignore lint/suspicious/noExplicitAny: File object type variations
          imageBuffer = Buffer.from((file as any).base64Data, "base64");
        } else {
          throw new Error("No image data in file response");
        }
      } else {
        // Fallback to text parsing
        const text = await result.text;
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

      // Store in Convex file storage
      const storageId = await ctx.storage.store(
        new Blob([new Uint8Array(imageBuffer)], { type: "image/png" }),
      );

      const totalTime = Date.now() - startTime;

      // Calculate cost (includes reasoning tokens!)
      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;
      const reasoningTokens = usage.reasoningTokens ?? 0;

      const cost = calculateCost(model, {
        inputTokens,
        outputTokens,
        cachedTokens: undefined,
        reasoningTokens,
      });

      // Update message with image attachment
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
            totalTime,
            cost,
          },
        },
      });

      // Complete message with content + tokens
      // Store reasoning if present - models may return it natively
      const finalContent = accumulated || `Generated image: ${args.prompt}`;
      await ctx.runMutation(internal.messages.completeMessage, {
        messageId: args.messageId,
        content: finalContent,
        reasoning: finalReasoning,
        inputTokens,
        outputTokens,
        reasoningTokens,
        cost,
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

      // Use markError to properly set status="error" and clear state
      await ctx.runMutation(internal.messages.markError, {
        messageId: args.messageId,
        error: `Image generation failed: ${error instanceof Error ? error.message : String(error)}`,
      });

      throw error;
    }
  },
});
