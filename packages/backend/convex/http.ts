import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { hasInternalAuthorization } from "./lib/internalAuth";
import { logger } from "./lib/logger";
import {
  MAX_UPLOAD_BYTES,
  readBoundedBody,
  verifyUploadToken,
} from "./lib/ownedUploads";

const http = httpRouter();

const uploadCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
http.route({
  path: "/owned-file-upload",
  method: "OPTIONS",
  handler: httpAction(
    async () => new Response(null, { status: 204, headers: uploadCors }),
  ),
});
http.route({
  path: "/owned-file-upload",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let storageId;
    try {
      const userId = await verifyUploadToken(
        new URL(request.url).searchParams.get("token") ?? "",
      );
      if (!userId)
        return new Response("Unauthorized", {
          status: 401,
          headers: uploadCors,
        });
      const bytes = await readBoundedBody(request, MAX_UPLOAD_BYTES);
      if (!bytes.length)
        return new Response("Empty file", { status: 400, headers: uploadCors });
      const mimeType =
        request.headers.get("content-type") || "application/octet-stream";
      storageId = await ctx.storage.store(
        new Blob([bytes], { type: mimeType }),
      );
      await ctx.runMutation(internal.files.registerUpload, {
        userId,
        storageId,
        mimeType,
        size: bytes.length,
      });
      return new Response(JSON.stringify({ storageId }), {
        headers: { ...uploadCors, "Content-Type": "application/json" },
      });
    } catch {
      if (storageId) await ctx.storage.delete(storageId);
      return new Response("Upload rejected", {
        status: 400,
        headers: uploadCors,
      });
    }
  }),
});

/**
 * Store code execution images from E2B
 * Called by the Next.js API route after running code
 */
http.route({
  path: "/store-code-execution-image",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Verify internal call header
      const isInternal = await hasInternalAuthorization(request.headers);
      if (!isInternal) {
        return new Response("Unauthorized", { status: 401 });
      }

      const contentType = request.headers.get("Content-Type") || "image/png";
      if (contentType !== "image/png")
        return new Response("Invalid image type", { status: 400 });
      const imageBuffer = await readBoundedBody(request, MAX_UPLOAD_BYTES);

      if (!imageBuffer || imageBuffer.byteLength === 0) {
        return new Response("Empty image data", { status: 400 });
      }

      // Store in Convex file storage
      const storageId = await ctx.storage.store(
        new Blob([imageBuffer], { type: contentType }),
      );

      // Get the URL
      const url = await ctx.storage.getUrl(storageId);

      return new Response(JSON.stringify({ storageId, url }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      logger.error("Store code execution image failed", {
        tag: "StoreCodeExecutionImage",
        error: String(error),
      });
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Storage failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

const ttsCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization",
};
http.route({
  path: "/tts",
  method: "OPTIONS",
  handler: httpAction(
    async () => new Response(null, { status: 204, headers: ttsCors }),
  ),
});

http.route({
  path: "/tts",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await ctx.auth.getUserIdentity()))
      return new Response("Unauthorized", { status: 401, headers: ttsCors });
    const user = await ctx.runQuery(internal.lib.helpers.getCurrentUser, {});
    if (!user)
      return new Response("Unauthorized", { status: 401, headers: ttsCors });
    const url = new URL(request.url);
    const text = url.searchParams.get("text");
    const voice = url.searchParams.get("voice") || "aura-asteria-en";
    const speed = Number(url.searchParams.get("speed") ?? "1.0");

    if (
      !text?.trim() ||
      text.length > 2000 ||
      !Number.isFinite(speed) ||
      speed < 0.5 ||
      speed > 2 ||
      !/^aura-[a-z0-9-]{1,60}$/.test(voice)
    ) {
      return new Response("Invalid text, voice or speed", {
        status: 400,
        headers: ttsCors,
      });
    }

    // Hash params for cache key
    const hashParams = `${text}:${voice}:${speed}`;
    // Simple hash (djb2 or similar is fine, or web crypto if available)
    // Using simple string replacement/encoding for now or web crypto if available
    const encoder = new TextEncoder();
    const data = encoder.encode(hashParams);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // 1. Check Cache
    // @ts-ignore - TypeScript recursion limit with 85+ Convex modules
    const cached = await ctx.runQuery(internal.ttsCache.getCache, { hash });

    if (cached) {
      const storageUrl = await ctx.storage.getUrl(cached.storageId);
      if (storageUrl) {
        // Redirect to storage URL (fastest)
        return new Response(null, {
          status: 302,
          headers: {
            Location: storageUrl,
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Cache-Control": "private, no-store",
          },
        });
      }
    }

    // 2. Not Cached: Proxy to Deepgram
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return new Response("Server misconfigured", {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const dgUrl = new URL("https://api.deepgram.com/v1/speak");
    dgUrl.searchParams.set("model", voice);
    dgUrl.searchParams.set("encoding", "mp3");

    // Deepgram speed: 0.5 to 2.0
    const clampedSpeed = Math.min(Math.max(speed, 0.5), 2.0);
    if (clampedSpeed !== 1.0) {
      dgUrl.searchParams.set("tempo", clampedSpeed.toString());
    }

    const dgResponse = await fetch(dgUrl, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!dgResponse.ok) {
      return new Response(dgResponse.body, {
        status: dgResponse.status,
        statusText: dgResponse.statusText,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // 3. Streaming Response AND Cache
    // ... (logic unchanged) ...

    const audioBuffer = await dgResponse.arrayBuffer();
    await ctx.runMutation(internal.usage.mutations.recordTTS, {
      userId: user._id,
      model: "deepgram:tts",
      characterCount: text.length,
      cost: text.length * 0.000003,
      feature: "chat",
    });

    // Store in background (async)
    // Yes, we must await.
    const storageId = await ctx.storage.store(
      new Blob([audioBuffer], { type: "audio/mpeg" }),
    );

    await ctx.runMutation(internal.ttsCache.saveCache, {
      hash,
      storageId,
      text,
      voice,
      speed: clampedSpeed,
      format: "mp3",
    });

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

/**
 * Return decrypted BYOD credentials for GHA deployment
 * Protected by shared secret header
 */
http.route({
  path: "/api/byod/credentials-for-deploy",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify deploy secret
    const deploySecret = request.headers.get("X-Deploy-Secret");
    if (!deploySecret || deploySecret !== process.env.BYOD_DEPLOY_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      // Get decrypted credentials via Node action
      const credentials = (await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.byod.deployCredentials.getDecryptedCredentials,
        {},
      )) as {
        configId: string;
        userId: string;
        deploymentUrl: string;
        deployKey: string;
      }[];

      return new Response(
        JSON.stringify({ credentials, count: credentials.length }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      logger.error("BYOD credentials fetch failed", {
        tag: "BYODCredentials",
        error: String(error),
      });
      return new Response(
        JSON.stringify({ error: "Failed to fetch credentials" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

export default http;
