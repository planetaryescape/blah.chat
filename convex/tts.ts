"use node";

import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

/**
 * Generate speech from text using Deepgram
 *
 * Note: Deepgram has a 2000 character limit per request.
 * For longer texts, the client should chunk the text and call this action multiple times.
 */
export const generateSpeech = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()),
    speed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Get user + check TTS enabled
    // @ts-ignore - Type instantiation depth issue with Convex types
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user?.preferences?.ttsEnabled) {
      throw new Error("TTS is disabled in user preferences");
    }
    if (!args.text.trim()) {
      throw new Error("No text provided for TTS");
    }

    const provider = "deepgram" as const;
    const charCount = args.text.length;
    const cost: number = charCount * 0.000003; // $0.000003/char

    // 2. Setup Deepgram config
    const voice: string =
      args.voice ?? user.preferences.ttsVoice ?? "aura-asteria-en";
    const tempo = args.speed ?? user.preferences.ttsSpeed ?? 1;
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY is not set");
    }

    // 3. Call Deepgram TTS
    const url = new URL("https://api.deepgram.com/v1/speak");
    url.searchParams.set("model", voice);
    url.searchParams.set("encoding", "mp3");
    if (tempo && tempo !== 1) {
      const clampedTempo = Math.min(Math.max(tempo, 0.5), 2);
      url.searchParams.set("tempo", clampedTempo.toString());
    }

    const response: Response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text: args.text }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const detail = errorText
        ? ` - ${errorText.slice(0, 300)}`
        : response.statusText;
      throw new Error(`Deepgram API error ${response.status}: ${detail}`);
    }

    const audioBuffer = await response.arrayBuffer();

    // 4. Track cost
    // @ts-ignore - Type instantiation depth issue with Convex types
    await ctx.runMutation(internal.usage.mutations.recordTTS, {
      userId: user._id,
      model: `${provider}:tts`,
      characterCount: charCount,
      cost,
    } satisfies {
      userId: Id<"users">;
      model: string;
      characterCount: number;
      cost: number;
    });

    // 5. Convert to base64 for storage/transfer
    const audioBase64: string = Buffer.from(new Uint8Array(audioBuffer)).toString(
      "base64",
    );

    return {
      audioBase64,
      provider,
      mimeType: "audio/mpeg",
      cost,
      characterCount: charCount,
    };
  },
});
