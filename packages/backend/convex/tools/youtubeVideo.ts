"use node";

import { generateText } from "ai";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { getModel } from "@/lib/ai/registry";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

const YOUTUBE_URL_REGEX =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;

export const analyzeVideo = internalAction({
  args: {
    userId: v.id("users"),
    url: v.string(),
    question: v.string(),
  },
  handler: async (ctx, { userId, url, question }) => {
    const match = url.match(YOUTUBE_URL_REGEX);
    if (!match) {
      return {
        success: false,
        error: "Invalid YouTube URL",
      };
    }

    const videoId = match[1];
    const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      const result = await generateText({
        model: getModel("google:gemini-2.5-flash"),
        providerOptions: getGatewayOptions(
          "google:gemini-2.5-flash",
          undefined,
          ["youtube-video"],
        ),
        messages: [
          {
            role: "user",
            content: [
              { type: "file", data: normalizedUrl, mediaType: "video/mp4" },
              { type: "text", text: question },
            ],
          },
        ],
      });

      // Track usage
      if (result.usage) {
        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit
          internal.usage.mutations.recordTextGeneration,
          {
            userId,
            model: "google:gemini-2.5-flash",
            inputTokens: result.usage.inputTokens ?? 0,
            outputTokens: result.usage.outputTokens ?? 0,
            cost: 0,
            feature: "youtube-video-analysis",
          },
        );
      }

      return {
        success: true,
        videoId,
        url: normalizedUrl,
        answer: result.text,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to analyze video",
        videoId,
      };
    }
  },
});
