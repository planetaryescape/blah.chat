"use node";

import { ConvexError, v } from "convex/values";
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

interface SpeechResult {
  audioBase64: string;
  provider: "deepgram";
  mimeType: string;
  cost: number;
  characterCount: number;
}

/** Both authenticated HTTP methods and legacy Convex callers use this policy boundary. */
export const generateSpeech = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()),
    speed: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SpeechResult> => {
    if (!(await ctx.auth.getUserIdentity()))
      throw new ConvexError({ code: "TTS_AUTH", message: "Unauthorized" });
    const user: Doc<"users"> | null = await ctx.runQuery(
      internal.lib.helpers.getCurrentUser,
      {},
    );
    if (!user)
      throw new ConvexError({ code: "TTS_AUTH", message: "Unauthorized" });
    if (
      !(await ctx.runQuery(api.users.getUserPreference, { key: "ttsEnabled" }))
    )
      throw new ConvexError({
        code: "TTS_DISABLED",
        message: "TTS is disabled in user preferences",
      });
    const preferredVoice = await ctx.runQuery(api.users.getUserPreference, {
      key: "ttsVoice",
    });
    const preferredSpeed = await ctx.runQuery(api.users.getUserPreference, {
      key: "ttsSpeed",
    });
    const voice =
      args.voice ?? z.string().catch("aura-asteria-en").parse(preferredVoice);
    const speed = args.speed ?? z.number().catch(1).parse(preferredSpeed);
    try {
      validateSynthesis(args.text, voice, speed);
    } catch {
      throw new ConvexError({
        code: "TTS_INPUT",
        message: "Invalid TTS text, voice or speed",
      });
    }
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
      throw new ConvexError({
        code: byok ? "TTS_BYOK_KEY" : "TTS_CONFIGURATION",
        message: byok
          ? "BYOK Deepgram key required for speech; server credentials were not used"
          : "Speech provider is not configured",
      });
    const hash = await audioCacheHash(
      user._id,
      args.text,
      voice,
      speed,
      byok ? `byok:${config?.updatedAt}` : "server",
    );
    const readCache = async (): Promise<SpeechResult | null> => {
      const cached = await ctx.runQuery(internal.ttsCache.getCache, { hash });
      if (!cached) return null;
      const blob = await ctx.storage.get(cached.storageId);
      if (blob && blob.size > 0 && blob.size <= MAX_AUDIO_BYTES)
        return {
          audioBase64: Buffer.from(await blob.arrayBuffer()).toString("base64"),
          provider: "deepgram",
          mimeType: "audio/mpeg",
          cost: 0,
          characterCount: args.text.length,
        };
      return null;
    };
    const cached = await readCache();
    if (cached) return cached;
    const claim = { userId: user._id, hash, claimToken: crypto.randomUUID() };
    if (!(await ctx.runMutation(internal.ttsCache.claimSynthesis, claim))) {
      const waitDeadline = Date.now() + 4000;
      // Only the claim winner calls the provider. A duplicate waits for its cache,
      // never takes over an unexpired claim or starts another paid request.
      for (let poll = 0; poll < 16 && Date.now() < waitDeadline; poll++) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const completed = await readCache();
        if (completed) return completed;
      }
      throw new ConvexError({
        code: "TTS_BUSY",
        message: "Speech is already being generated. Retry shortly.",
      });
    }
    try {
      // A previous winner can finish between our initial lookup and acquisition.
      const completed = await readCache();
      if (completed) return completed;
      const cost = estimateSpeechCost(args.text.length, voice);
      if (!byok) {
        const budget = await ctx.runQuery(api.usage.checkBudget.checkBudget, {
          userId: user._id,
        });
        if (!budget.allowed || (budget.budget > 0 && cost > budget.remaining))
          throw new ConvexError({
            code: "TTS_BUDGET",
            message: "Speech usage budget exhausted",
          });
      }
      const audio = await synthesize(args.text, voice, speed, apiKey);
      // Record incurred usage even when the claim expires before cache persistence.
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
          ...claim,
          storageId,
          text: "",
          voice,
          speed,
          format: "mp3",
        });
      } catch {
        await ctx.storage.delete(storageId);
        // The caller still receives its audio; an expired claim cannot commit cache.
      }
      return {
        audioBase64: Buffer.from(audio).toString("base64"),
        provider: "deepgram",
        mimeType: "audio/mpeg",
        cost,
        characterCount: args.text.length,
      };
    } finally {
      await ctx.runMutation(internal.ttsCache.releaseSynthesis, claim);
    }
  },
});
