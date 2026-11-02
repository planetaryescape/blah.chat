import { tool } from "ai";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";

export function createYoutubeVideoTool(ctx: ActionCtx, userId: Id<"users">) {
  return tool({
    description: `Analyze YouTube videos using AI vision.

✅ USE FOR:
- ANY YouTube URL (youtube.com, youtu.be, youtube.com/embed/*)
- Questions about video content
- Summarizing videos
- Extracting timestamps, topics, key info
- Understanding visual content (not just transcript)

Provide YouTube URL and question. Supports all YouTube URL formats including shortened youtu.be links.`,
    inputSchema: z.object({
      url: z.string().describe("YouTube video URL"),
      question: z.string().describe("Question about the video"),
    }),
    execute: async ({ url, question }) => {
      return await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit
        internal.tools.youtubeVideo.analyzeVideo,
        { userId, url, question },
      );
    },
  });
}
