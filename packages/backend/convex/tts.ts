"use node";

import { v } from "convex/values";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { decryptByokKey } from "./byok/helpers";
import {
  audioCacheHash,
  estimateSpeechCost,
  MAX_AUDIO_BYTES,
  synthesize,
  validateSynthesis,
} from "./lib/speech/synthesis";

/** Both authenticated HTTP methods and legacy Convex callers use this policy boundary. */
export const generateSpeech = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()),
    speed: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    audioBase64: string;
    provider: "deepgram";
    mimeType: string;
    cost: number;
    characterCount: number;
  }> => {
    if (!(await ctx.auth.getUserIdentity())) throw new Error("Unauthorized");
    const user: Doc<"users"> | null = await ctx.runQuery(
      internal.lib.helpers.getCurrentUser,
      {},
    );
    if (!user) throw new Error("Unauthorized");
    if (
      !(await ctx.runQuery(api.users.getUserPreference, { key: "ttsEnabled" }))
    )
      throw new Error("TTS is disabled in user preferences");
    const preferredVoice = await ctx.runQuery(api.users.getUserPreference, {
      key: "ttsVoice",
    });
    const preferredSpeed = await ctx.runQuery(api.users.getUserPreference, {
      key: "ttsSpeed",
    });
    const voice =
      args.voice ?? z.string().catch("aura-asteria-en").parse(preferredVoice);
    const speed = args.speed ?? z.number().catch(1).parse(preferredSpeed);
    validateSynthesis(args.text, voice, speed);
    const config = await ctx.runQuery(
      internal.byok.credentials.getConfigByAuth,
      {},
    );
    const byok = config?.byokEnabled === true;
    const apiKey =
      byok && config
        ? await decryptByokKey(config, "deepgram")
        : process.env.DEEPGRAM_API_KEY;
    if (!apiKey)
      throw new Error(
        byok
          ? "BYOK Deepgram key required for speech; server credentials were not used"
          : "Speech provider is not configured",
      );
    const hash = await audioCacheHash(
      user._id,
      args.text,
      voice,
      speed,
      byok ? `byok:${config?.updatedAt}` : "server",
    );
    const cached = await ctx.runQuery(internal.ttsCache.getCache, { hash });
    if (cached) {
      const blob = await ctx.storage.get(cached.storageId);
      if (blob && blob.size > 0 && blob.size <= MAX_AUDIO_BYTES)
        return {
          audioBase64: Buffer.from(await blob.arrayBuffer()).toString("base64"),
          provider: "deepgram",
          mimeType: "audio/mpeg",
          cost: 0,
          characterCount: args.text.length,
        };
    }
    if (!byok) {
      const budget = await ctx.runQuery(api.usage.checkBudget.checkBudget, {
        userId: user._id,
      });
      if (!budget.allowed) throw new Error("Speech usage budget exhausted");
    }
    const audio = await synthesize(args.text, voice, speed, apiKey);
    const cost = estimateSpeechCost(args.text.length, voice);
    await ctx.runMutation(internal.usage.mutations.recordTTS, {
      userId: user._id,
      model: "deepgram:tts",
      characterCount: args.text.length,
      cost,
      feature: "chat",
      isByok: byok,
    });
    const storageId = await ctx.storage.store(
      new Blob([audio], { type: "audio/mpeg" }),
    );
    try {
      await ctx.runMutation(internal.ttsCache.saveCache, {
        hash,
        storageId,
        text: "",
        voice,
        speed,
        format: "mp3",
      });
    } catch {
      await ctx.storage.delete(storageId);
      // Cache persistence is optional; synthesis itself already succeeded and was charged.
    }
    return {
      audioBase64: Buffer.from(audio).toString("base64"),
      provider: "deepgram",
      mimeType: "audio/mpeg",
      cost,
      characterCount: args.text.length,
    };
  },
});
