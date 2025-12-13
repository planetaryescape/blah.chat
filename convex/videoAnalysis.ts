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
      // Pre-upload validation
      if (!args.videoBase64.match(/^[A-Za-z0-9+/=]+$/)) {
        throw new Error("Invalid base64 format provided for video data");
      }

      if (!args.mimeType?.startsWith("video/")) {
        throw new Error(`Invalid video MIME type: ${args.mimeType}`);
      }

      const estimatedSize = (args.videoBase64.length * 3) / 4;
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (estimatedSize > maxSize) {
        throw new Error(
          `Video size (${Math.round(estimatedSize / 1024 / 1024)}MB) exceeds maximum (100MB)`,
        );
      }

      const fileManager = new GoogleAIFileManager(apiKey);

      // Convert base64 to buffer with error handling
      let buffer: Buffer;
      try {
        buffer = Buffer.from(args.videoBase64, "base64");
        if (buffer.length === 0) {
          throw new Error("Base64 decoding resulted in empty buffer");
        }
      } catch (bufferError) {
        throw new Error(
          `Failed to decode base64 video data: ${bufferError instanceof Error ? bufferError.message : "Unknown error"}`,
        );
      }

      // Create temp file in Node.js environment
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const tempDir = os.tmpdir();
      const tempPath = path.join(tempDir, args.filename);

      let tempFileCreated = false;

      try {
        // Write to temp file with error handling
        try {
          fs.writeFileSync(tempPath, buffer);
          tempFileCreated = true;
        } catch (fsError) {
          throw new Error(
            `Failed to write video to temp file: ${fsError instanceof Error ? fsError.message : "Disk write error"}`,
          );
        }

        // Upload to Google File API with timeout
        try {
          const uploadPromise = fileManager.uploadFile(tempPath, {
            mimeType: args.mimeType,
            displayName: args.filename,
          });

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Upload timeout")), 60000),
          );

          const uploadResponse = await Promise.race([
            uploadPromise,
            timeoutPromise,
          ]);

          // Validate response
          if (!uploadResponse?.file?.uri) {
            throw new Error(
              "Google File API returned invalid response (missing file.uri)",
            );
          }

          fileUri = uploadResponse.file.uri;
        } catch (uploadError) {
          if (uploadError instanceof Error) {
            if (uploadError.message.includes("timeout")) {
              throw new Error(
                "Video upload timed out after 60 seconds. Try a smaller file.",
              );
            }
            if (uploadError.message.includes("quota")) {
              throw new Error(
                "Google File API quota exceeded. Please try again later.",
              );
            }
            throw new Error(
              `Google File API upload failed: ${uploadError.message}`,
            );
          }
          throw new Error("Unknown error during Google File API upload");
        }
      } finally {
        // Clean up temp file with error suppression
        if (tempFileCreated) {
          try {
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath);
            }
          } catch (cleanupError) {
            console.error(
              `Warning: Failed to cleanup temp file ${tempPath}:`,
              cleanupError instanceof Error
                ? cleanupError.message
                : "Unknown error",
            );
          }
        }
      }
    }

    if (!fileUri) {
      throw new Error(
        "Video upload failed: No file URI obtained. Ensure either videoBase64 or videoFileUri is provided.",
      );
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
