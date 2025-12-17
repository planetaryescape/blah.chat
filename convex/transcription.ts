import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";

/**
 * Wrap promise with timeout to prevent infinite hangs
 * Pattern from videoAnalysis.ts lines 110-137
 */
async function withTimeout<T>(
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
    console.log(
      "[Transcription] Starting transcription, storageId:",
      args.storageId,
      "mimeType:",
      args.mimeType,
    );

    // Get current user
    const user = await (
      ctx.runQuery as (ref: any, args: any) => Promise<Doc<"users"> | null>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      internal.lib.helpers.getCurrentUser,
      {},
    );
    if (!user) {
      console.error("[Transcription] Unauthorized - no user found");
      throw new Error("Unauthorized");
    }

    console.log("[Transcription] User authorized:", user._id);

    // Phase 4: Get STT preferences from new system
    const sttEnabled = await (
      ctx.runQuery as (ref: any, args: any) => Promise<boolean | null>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.users.getUserPreference as any,
      { key: "sttEnabled" },
    );
    const sttProvider = await (
      ctx.runQuery as (ref: any, args: any) => Promise<string | null>
    )(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.users.getUserPreference as any,
      { key: "sttProvider" },
    );

    // Check if STT is enabled
    if (sttEnabled === false) {
      console.error("[Transcription] STT disabled in settings");
      throw new Error("Voice input disabled in settings");
    }

    const provider = sttProvider ?? "openai";
    console.log("[Transcription] Using provider:", provider);

    // Fetch audio from Convex storage
    console.log("[Transcription] Fetching audio from storage...");
    const audioBlob = await ctx.storage.get(args.storageId);
    if (!audioBlob) {
      console.error("[Transcription] Audio file not found in storage");
      throw new Error("Audio file not found in storage");
    }
    console.log(
      "[Transcription] Audio blob retrieved, size:",
      audioBlob.size,
      "bytes",
    );

    // Convert blob to array buffer then Uint8Array
    console.log("[Transcription] Converting blob to array buffer...");
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    console.log(
      "[Transcription] Conversion complete, bytes length:",
      bytes.length,
    );

    const audioFile = new File([bytes], "audio.webm", {
      type: args.mimeType,
    });

    // File size validation
    const fileSizeMB = bytes.length / (1024 * 1024);
    const MAX_FILE_SIZE_MB = 24; // Under Whisper's 25MB limit

    console.log("[Transcription] File size:", fileSizeMB.toFixed(2), "MB");

    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      console.error(
        "[Transcription] File too large:",
        fileSizeMB.toFixed(1),
        "MB",
      );
      throw new Error(
        `Audio file too large (${fileSizeMB.toFixed(1)}MB). Maximum size is ${MAX_FILE_SIZE_MB}MB. Try compressing or splitting the file.`,
      );
    }

    // Log warning for large files
    if (fileSizeMB > 15) {
      console.warn(
        `[Transcription] Large audio file: ${fileSizeMB.toFixed(1)}MB - may take 60-90s`,
      );
    }

    let text: string;
    let cost: number;
    let durationMinutes: number;

    // Estimate duration (rough approximation: buffer size / (16kHz * 60s * 2 bytes))
    durationMinutes = bytes.length / (16000 * 60 * 2);

    switch (provider) {
      case "openai": {
        console.log("[Transcription] Using OpenAI Whisper");
        // OpenAI Whisper via API with AbortController
        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("model", "whisper-1");
        console.log("[Transcription] FormData prepared");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error(
            "[Transcription] Backend timeout reached (90s), aborting request",
          );
          controller.abort();
        }, TRANSCRIPTION_TIMEOUT_MS);
        console.log("[Transcription] Timeout configured, starting API call...");

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
          console.log(
            "[Transcription] API call completed in",
            fetchDuration,
            "ms",
          );
          clearTimeout(timeoutId);

          if (!response.ok) {
            const error = await response.text();
            console.error(
              "[Transcription] API returned error:",
              response.status,
              error,
            );
            throw new Error(`OpenAI Whisper failed: ${error}`);
          }

          console.log("[Transcription] Parsing response JSON...");
          const result = await response.json();
          text = result.text;
          cost = durationMinutes * 0.006;
          console.log(
            "[Transcription] Transcription successful, text length:",
            text.length,
            "chars",
          );
        } catch (err: any) {
          console.error("[Transcription] Error in OpenAI call:", err);
          console.error("[Transcription] Error name:", err?.name);
          console.error("[Transcription] Error message:", err?.message);
          clearTimeout(timeoutId);

          if (err.name === "AbortError") {
            console.error("[Transcription] Aborted due to timeout");
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

          const result = await response.json();
          text = result.text;
          cost = (durationMinutes / 60) * 0.04; // $0.04/hour
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
    console.log("[Transcription] Recording usage...");
    await (ctx.runMutation as (ref: any, args: any) => Promise<void>)(
      internal.usage.mutations.recordTranscription,
      {
        userId: user._id,
        model: `${provider}:stt`,
        durationMinutes,
        cost,
      },
    );

    console.log("[Transcription] Transcription complete, returning text");
    return text;
  },
});

/**
 * Internal version of transcribeAudio for background jobs
 * Doesn't require user auth since jobs are triggered by authenticated endpoints
 */
export const transcribeAudioInternal = internalAction({
  args: {
    storageId: v.id("_storage"),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
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

    // Use OpenAI Whisper by default for internal jobs
    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
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

      const result = await response.json();
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
