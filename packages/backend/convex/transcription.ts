import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { logger } from "./lib/logger";

/**
 * Wrap promise with timeout to prevent infinite hangs
 * Pattern from videoAnalysis.ts lines 110-137
 */
async function _withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => {
      reject(
        new Error(
          `${operation} timed out after ${timeoutMs / 1000}s. Try a shorter audio clip or different format.`,
        ),
      );
    }, timeoutMs),
  );

  return Promise.race([promise, timeoutPromise]);
}

const TRANSCRIPTION_TIMEOUT_MS = 90_000; // 90s (Whisper typically 30-60s)

export const transcribeAudio = action({
  args: {
    storageId: v.id("_storage"),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    logger.info("Starting transcription", {
      tag: "Transcription",
      storageId: args.storageId,
      mimeType: args.mimeType,
    });

    // Get current user
    const user = await (
      ctx.runQuery as (ref: any, args: any) => Promise<Doc<"users"> | null>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getCurrentUser,
      {},
    );
    if (!user) {
      logger.error("Unauthorized - no user found", { tag: "Transcription" });
      throw new Error("Unauthorized");
    }

    logger.info("User authorized", { tag: "Transcription", userId: user._id });

    // Phase 4: Get STT enabled preference from user
    const sttEnabled = await (
      ctx.runQuery as (ref: any, args: any) => Promise<boolean | null>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.users.getUserPreference as any,
      { key: "sttEnabled" },
    );

    // Check if STT is enabled
    if (sttEnabled === false) {
      logger.error("STT disabled in settings", { tag: "Transcription" });
      throw new Error("Voice input disabled in settings");
    }

    // Get transcript provider from admin settings (global org setting)
    const adminSettings = await (
      ctx.runQuery as (ref: any, args: any) => Promise<any>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.adminSettings.get,
      {},
    );

    const provider = adminSettings?.transcriptProvider ?? "groq";
    const costPerMinute = adminSettings?.transcriptCostPerMinute ?? 0.0067;
    logger.info("Using admin provider", {
      tag: "Transcription",
      provider,
      costPerMinute,
    });

    // Fetch audio from Convex storage
    logger.info("Fetching audio from storage", { tag: "Transcription" });
    const audioBlob = await ctx.storage.get(args.storageId);
    if (!audioBlob) {
      logger.error("Audio file not found in storage", { tag: "Transcription" });
      throw new Error("Audio file not found in storage");
    }
    logger.info("Audio blob retrieved", {
      tag: "Transcription",
      size: audioBlob.size,
    });

    // Convert blob to array buffer then Uint8Array
    logger.info("Converting blob to array buffer", { tag: "Transcription" });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    logger.info("Conversion complete", {
      tag: "Transcription",
      bytesLength: bytes.length,
    });

    const audioFile = new File([bytes], "audio.webm", {
      type: args.mimeType,
    });

    // File size validation
    const fileSizeMB = bytes.length / (1024 * 1024);
    const MAX_FILE_SIZE_MB = 24; // Under Whisper's 25MB limit

    logger.info("File size check", {
      tag: "Transcription",
      fileSizeMB: fileSizeMB.toFixed(2),
    });

    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      logger.error("File too large", {
        tag: "Transcription",
        fileSizeMB: fileSizeMB.toFixed(1),
      });
      throw new Error(
        `Audio file too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB. Try compressing or splitting the file.`,
      );
    }

    // Log warning for large files
    if (fileSizeMB > 15) {
      logger.warn("Large audio file - may take 60-90s", {
        tag: "Transcription",
        fileSizeMB: fileSizeMB.toFixed(1),
      });
    }

    let text: string;
    let cost: number;
    let durationMinutes: number;

    // Estimate duration (rough approximation: buffer size / (16kHz * 60s * 2 bytes))
    durationMinutes = bytes.length / (16000 * 60 * 2);

    switch (provider) {
      case "openai": {
        logger.info("Using OpenAI Whisper", { tag: "Transcription" });
        // OpenAI Whisper via API with AbortController
        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("model", "whisper-1");
        logger.info("FormData prepared", { tag: "Transcription" });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          logger.error("Backend timeout reached (90s), aborting request", {
            tag: "Transcription",
          });
          controller.abort();
        }, TRANSCRIPTION_TIMEOUT_MS);
        logger.info("Timeout configured, starting API call", {
          tag: "Transcription",
        });

        try {
          const fetchStartTime = Date.now();
          const response = await fetch(
            "https://api.openai.com/v1/audio/transcriptions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              body: formData,
              signal: controller.signal,
            },
          );

          const fetchDuration = Date.now() - fetchStartTime;
          logger.info("API call completed", {
            tag: "Transcription",
            durationMs: fetchDuration,
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            const error = await response.text();
            logger.error("API returned error", {
              tag: "Transcription",
              status: response.status,
              error,
            });
            throw new Error(`OpenAI Whisper failed: ${error}`);
          }

          logger.info("Parsing response JSON", { tag: "Transcription" });
          const result = (await response.json()) as { text: string };
          text = result.text;
          cost = durationMinutes * costPerMinute;
          logger.info("Transcription successful", {
            tag: "Transcription",
            textLength: text.length,
          });
        } catch (err: any) {
          logger.error("Error in OpenAI call", {
            tag: "Transcription",
            error: String(err),
            errorName: err?.name,
            errorMessage: err?.message,
          });
          clearTimeout(timeoutId);

          if (err.name === "AbortError") {
            logger.error("Aborted due to timeout", { tag: "Transcription" });
            throw new Error(
              "Transcription timed out after 90 seconds. Try a shorter audio file or compress it.",
            );
          }
          throw err;
        }
        break;
      }

      case "deepgram":
        // TODO: Implement Deepgram Nova-3
        throw new Error("Deepgram not yet implemented");

      case "assemblyai":
        // TODO: Implement AssemblyAI
        throw new Error("AssemblyAI not yet implemented");

      case "groq": {
        // Groq Whisper via API (OpenAI-compatible) with AbortController
        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("model", "whisper-large-v3-turbo");

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          TRANSCRIPTION_TIMEOUT_MS,
        );

        try {
          const response = await fetch(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
              },
              body: formData,
              signal: controller.signal,
            },
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Groq Whisper failed: ${error}`);
          }

          const result = (await response.json()) as { text: string };
          text = result.text;
          cost = durationMinutes * costPerMinute;
        } catch (err: any) {
          clearTimeout(timeoutId);

          if (err.name === "AbortError") {
            throw new Error(
              "Transcription timed out after 90 seconds. Try a shorter audio file or compress it.",
            );
          }
          throw err;
        }
        break;
      }

      default:
        throw new Error(`Unknown STT provider: ${provider}`);
    }

    // Track cost
    logger.info("Recording usage", { tag: "Transcription" });
    await (ctx.runMutation as (ref: any, args: any) => Promise<void>)(
      internal.usage.mutations.recordTranscription,
      {
        userId: user._id,
        model: `${provider}:stt`,
        durationMinutes,
        cost,
        feature: "chat",
      },
    );

    logger.info("Transcription complete, returning text", {
      tag: "Transcription",
    });
    return text;
  },
});

/**
 * Internal version of transcribeAudio for background jobs
 * Doesn't require user auth since jobs are triggered by authenticated endpoints
 * Uses admin-configured transcript provider
 */
export const transcribeAudioInternal = internalAction({
  args: {
    storageId: v.id("_storage"),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    // Get transcript provider from admin settings
    const adminSettings = await (
      ctx.runQuery as (ref: any, args: any) => Promise<any>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.adminSettings.getInternal,
      {},
    );

    const provider = adminSettings?.transcriptProvider ?? "groq";

    // Fetch audio from Convex storage
    const audioBlob = await ctx.storage.get(args.storageId);
    if (!audioBlob) {
      throw new Error("Audio file not found in storage");
    }

    // Convert blob to array buffer then Uint8Array
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const audioFile = new File([bytes], "audio.webm", {
      type: args.mimeType,
    });

    // File size validation
    const fileSizeMB = bytes.length / (1024 * 1024);
    const MAX_FILE_SIZE_MB = 24;

    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      throw new Error(
        `Audio file too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
      let result: any;

      if (provider === "groq") {
        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("model", "whisper-large-v3-turbo");

        const response = await fetch(
          "https://api.groq.com/openai/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: formData,
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Groq Whisper failed: ${error}`);
        }

        result = await response.json();
      } else {
        // Fallback to OpenAI for other providers
        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("model", "whisper-1");

        const response = await fetch(
          "https://api.openai.com/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: formData,
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI Whisper failed: ${error}`);
        }

        result = await response.json();
      }

      return result.text;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === "AbortError") {
        throw new Error("Transcription timed out after 90 seconds.");
      }
      throw err;
    }
  },
});
