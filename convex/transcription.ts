import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action } from "./_generated/server";

export const transcribeAudio = action({
  args: {
    audioBase64: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current user
    const user = await (
      ctx.runQuery as (ref: any, args: any) => Promise<Doc<"users"> | null>
    )(internal.lib.helpers.getCurrentUser, {});
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Phase 4: Get STT preferences from new system
    const sttEnabled = await (
      ctx.runQuery as (ref: any, args: any) => Promise<boolean | null>
    )(api.users.getUserPreference as any, { key: "sttEnabled" });
    const sttProvider = await (
      ctx.runQuery as (ref: any, args: any) => Promise<string | null>
    )(api.users.getUserPreference as any, { key: "sttProvider" });

    // Check if STT is enabled
    if (sttEnabled === false) {
      throw new Error("Voice input disabled in settings");
    }

    const provider = sttProvider ?? "openai";

    // Convert base64 to Uint8Array (browser-compatible)
    const binaryString = atob(args.audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioFile = new File([bytes], "audio.webm", {
      type: args.mimeType,
    });

    let text: string;
    let cost: number;
    let durationMinutes: number;

    // Estimate duration (rough approximation: buffer size / (16kHz * 60s * 2 bytes))
    durationMinutes = bytes.length / (16000 * 60 * 2);

    switch (provider) {
      case "openai": {
        // OpenAI Whisper via API
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
          },
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OpenAI Whisper failed: ${error}`);
        }

        const result = await response.json();
        text = result.text;
        cost = durationMinutes * 0.006;
        break;
      }

      case "deepgram":
        // TODO: Implement Deepgram Nova-3
        throw new Error("Deepgram not yet implemented");

      case "assemblyai":
        // TODO: Implement AssemblyAI
        throw new Error("AssemblyAI not yet implemented");

      case "groq": {
        // Groq Whisper via API (OpenAI-compatible)
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
          },
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Groq Whisper failed: ${error}`);
        }

        const result = await response.json();
        text = result.text;
        cost = (durationMinutes / 60) * 0.04; // $0.04/hour
        break;
      }

      default:
        throw new Error(`Unknown STT provider: ${provider}`);
    }

    // Track cost
    await (ctx.runMutation as (ref: any, args: any) => Promise<void>)(
      internal.usage.mutations.recordTranscription,
      {
        userId: user._id,
        model: `${provider}:stt`,
        durationMinutes,
        cost,
      },
    );

    return text;
  },
});
