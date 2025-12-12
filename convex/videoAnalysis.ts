"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { internal } from "./_generated/api";
import { GoogleAIFileManager } from "@google/generative-ai/server";

/**
 * Analyze video content using Gemini 2.0 Flash
 * Supports both inline base64 (small files) and File API URIs (large files)
 */
export const analyzeVideo = action({
  args: {
    videoBase64: v.optional(v.string()), // For small files (<20MB)
    videoFileUri: v.optional(v.string()), // For large files (Google File API)
    mimeType: v.string(),
    filename: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    // Get current user for cost tracking
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user from database
    const user = (await (ctx.runQuery as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.users.getCurrentUser,
      {},
    )) as any;

    if (!user) {
      throw new Error("User not found");
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("Google AI API key not configured");
    }

    let fileUri = args.videoFileUri;

    // If base64 provided and no file URI, upload to Google File API
    if (args.videoBase64 && !fileUri) {
      const fileManager = new GoogleAIFileManager(apiKey);

      // Convert base64 to buffer
      const buffer = Buffer.from(args.videoBase64, "base64");

      // Create temp file in Node.js environment
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const tempDir = os.tmpdir();
      const tempPath = path.join(tempDir, args.filename);

      try {
        fs.writeFileSync(tempPath, buffer);

        // Upload to Google File API
        const uploadResponse = await fileManager.uploadFile(tempPath, {
          mimeType: args.mimeType,
          displayName: args.filename,
        });

        fileUri = uploadResponse.file.uri;
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    }

    if (!fileUri) {
      throw new Error("No video data provided");
    }

    // Analyze video with Gemini 2.0 Flash
    const result = await generateObject({
      model: google("gemini-2.0-flash-exp"),
      schema: z.object({
        transcript: z.string().describe("Full transcript of audio from video"),
        summary: z.string().describe("Brief summary of video content"),
        keyTopics: z.array(z.string()).describe("Main topics discussed"),
        actionItems: z
          .array(z.string())
          .describe("Detected action items or tasks"),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this video and provide a transcript, summary, key topics, and any action items or tasks mentioned.",
            },
            {
              type: "file",
              data: fileUri,
              mediaType: args.mimeType,
            },
          ],
        },
      ],
      maxRetries: 2,
    });

    // Estimate duration (rough: 1 second per 100KB for cost tracking)
    const durationMinutes = args.sizeBytes / (100 * 1024) / 60;

    // Track usage - Gemini video pricing: ~$0.075/min
    const cost = durationMinutes * 0.075;

    (await (ctx.runMutation as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.usage.mutations.recordVideoAnalysis,
      {
        userId: user._id,
        model: "google:gemini-2.0-flash-exp",
        durationMinutes,
        cost,
      },
    )) as Promise<void>;

    return {
      transcript: result.object.transcript,
      summary: result.object.summary,
      keyTopics: result.object.keyTopics,
      actionItems: result.object.actionItems,
    };
  },
});
