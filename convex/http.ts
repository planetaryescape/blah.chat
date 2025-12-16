import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

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
      const isInternal = request.headers.get("X-Convex-Internal") === "true";
      if (!isInternal) {
        return new Response("Unauthorized", { status: 401 });
      }

      const contentType = request.headers.get("Content-Type") || "image/png";
      const imageBuffer = await request.arrayBuffer();

      if (!imageBuffer || imageBuffer.byteLength === 0) {
        return new Response("Empty image data", { status: 400 });
      }

      // Store in Convex file storage
      const storageId = await ctx.storage.store(
        new Blob([imageBuffer], { type: contentType })
      );

      // Get the URL
      const url = await ctx.storage.getUrl(storageId);

      return new Response(
        JSON.stringify({ storageId, url }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (error) {
      console.error("[StoreCodeExecutionImage] Error:", error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Storage failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/tts",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const text = url.searchParams.get("text");
    const voice = url.searchParams.get("voice") || "aura-asteria-en";
    const speed = parseFloat(url.searchParams.get("speed") || "1.0");

    if (!text) {
      return new Response("Missing 'text' parameter", { status: 400 });
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
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

export default http;

