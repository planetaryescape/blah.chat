"use node";

/**
 * YouTube Video Analyzer
 *
 * TODO: This file needs to be fixed - imports reference web app paths
 * that don't work in Convex backend. Stubbed for now.
 *
 * See: https://github.com/planetaryescape/blah.chat/issues/XXX
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { logger } from "../lib/logger";

export const analyzeVideo = internalAction({
  args: {
    userId: v.id("users"),
    url: v.string(),
    question: v.string(),
  },
  handler: async (_ctx, { url }) => {
    // TODO: Implement when @/lib/ai/* imports are fixed for Convex backend
    logger.warn("Tool not implemented - imports need to be fixed", {
      tag: "YouTubeVideo",
    });
    return {
      success: false,
      error:
        "YouTube video analysis temporarily unavailable. Please try again later.",
      videoId: url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      )?.[1],
    };
  },
});
