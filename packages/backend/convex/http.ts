import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { logger } from "./lib/logger";

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

/**
 * Trigger.dev webhook: embed file
 * Authenticated via shared secret (TRIGGER_CONVEX_SECRET)
 */
http.route({
  path: "/trigger/embed-file",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.TRIGGER_CONVEX_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const { fileId } = (await request.json()) as { fileId: string };

      if (!fileId) {
        return new Response(JSON.stringify({ error: "fileId is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const result = await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.files.embeddings.generateFileEmbeddings,
        { fileId },
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("Trigger embed-file failed", {
        tag: "TriggerEmbedFile",
        error: String(error),
      });
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Embedding failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

/**
 * Trigger.dev webhook: transcribe audio
 * Authenticated via shared secret (TRIGGER_CONVEX_SECRET)
 */
http.route({
  path: "/trigger/transcribe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.TRIGGER_CONVEX_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const { storageId, mimeType } = (await request.json()) as {
        storageId: string;
        mimeType: string;
      };

      if (!storageId) {
        return new Response(
          JSON.stringify({ error: "storageId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const result = await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.transcription.transcribeAudioInternal,
        { storageId, mimeType: mimeType || "audio/webm" },
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("Trigger transcribe failed", {
        tag: "TriggerTranscribe",
        error: String(error),
      });
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Transcription failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

/**
 * Trigger.dev webhook: generate title
 */
http.route({
  path: "/trigger/generate-title",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.TRIGGER_CONVEX_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const { conversationId } = (await request.json()) as {
        conversationId: string;
      };

      if (!conversationId) {
        return new Response(
          JSON.stringify({ error: "conversationId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.ai.generateTitle.generateTitle,
        { conversationId },
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("Trigger generate-title failed", {
        tag: "TriggerGenerateTitle",
        error: String(error),
      });
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Title generation failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

/**
 * Trigger.dev webhook: analyze model fit
 */
http.route({
  path: "/trigger/analyze-model-fit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.TRIGGER_CONVEX_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const payload = (await request.json()) as {
        conversationId: string;
        userMessage: string;
        currentModelId: string;
        wasAutoSelected?: boolean;
      };

      if (!payload.conversationId) {
        return new Response(
          JSON.stringify({ error: "conversationId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.ai.modelTriage.analyzeModelFit,
        payload,
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("Trigger analyze-model-fit failed", {
        tag: "TriggerAnalyzeModelFit",
        error: String(error),
      });
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "Model fit analysis failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

/**
 * Trigger.dev webhook: auto-triage feedback
 */
http.route({
  path: "/trigger/auto-triage-feedback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.TRIGGER_CONVEX_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const { feedbackId } = (await request.json()) as {
        feedbackId: string;
      };

      if (!feedbackId) {
        return new Response(
          JSON.stringify({ error: "feedbackId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.feedback.triage.autoTriageFeedback,
        { feedbackId },
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("Trigger auto-triage-feedback failed", {
        tag: "TriggerAutoTriageFeedback",
        error: String(error),
      });
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Feedback triage failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

/**
 * Trigger.dev webhook: enrich source metadata
 */
http.route({
  path: "/trigger/enrich-source-metadata",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.TRIGGER_CONVEX_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const { messageId, sourceUrls } = (await request.json()) as {
        messageId: string;
        sourceUrls: string[];
      };

      if (!messageId || !sourceUrls) {
        return new Response(
          JSON.stringify({
            error: "messageId and sourceUrls are required",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.sources.enrichment_actions.enrichSourceMetadata,
        { messageId, sourceUrls },
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("Trigger enrich-source-metadata failed", {
        tag: "TriggerEnrichSourceMetadata",
        error: String(error),
      });
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Source enrichment failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

/**
 * Trigger.dev webhook: extract memories
 */
http.route({
  path: "/trigger/extract-memories",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.TRIGGER_CONVEX_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const { conversationId } = (await request.json()) as {
        conversationId: string;
      };

      if (!conversationId) {
        return new Response(
          JSON.stringify({ error: "conversationId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const result = await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.memories.extract.extractMemories,
        { conversationId },
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("Trigger extract-memories failed", {
        tag: "TriggerExtractMemories",
        error: String(error),
      });
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Memory extraction failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

/**
 * Trigger.dev webhook: process knowledge source
 */
http.route({
  path: "/trigger/process-source",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.TRIGGER_CONVEX_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const { sourceId } = (await request.json()) as {
        sourceId: string;
      };

      if (!sourceId) {
        return new Response(JSON.stringify({ error: "sourceId is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.knowledgeBank.process.processSource,
        { sourceId },
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("Trigger process-source failed", {
        tag: "TriggerProcessSource",
        error: String(error),
      });
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Source processing failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

/**
 * Trigger.dev webhook: extract text from attachment
 */
http.route({
  path: "/trigger/extract-text",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.TRIGGER_CONVEX_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const payload = (await request.json()) as {
        attachmentId: string;
        storageId: string;
        fileName: string;
        mimeType: string;
      };

      if (!payload.attachmentId) {
        return new Response(
          JSON.stringify({ error: "attachmentId is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.messages.attachments.extractText,
        payload,
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("Trigger extract-text failed", {
        tag: "TriggerExtractText",
        error: String(error),
      });
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Text extraction failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

/**
 * Trigger.dev webhook: check all BYOD health
 */
http.route({
  path: "/trigger/check-health",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.TRIGGER_CONVEX_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.byod.healthCheck.checkAllHealth,
        {},
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("Trigger check-health failed", {
        tag: "TriggerCheckHealth",
        error: String(error),
      });
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Health check failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

/**
 * Trigger.dev webhook: generate image
 */
http.route({
  path: "/trigger/generate-image",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.TRIGGER_CONVEX_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const payload = (await request.json()) as {
        conversationId: string;
        messageId: string;
        prompt: string;
        model?: string;
        referenceImageStorageId?: string;
        thinkingEffort?: string;
      };

      if (!payload.conversationId || !payload.messageId || !payload.prompt) {
        return new Response(
          JSON.stringify({
            error: "conversationId, messageId, and prompt are required",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Validate thinkingEffort at webhook boundary
      const validEfforts = ["none", "low", "medium", "high"] as const;
      const thinkingEffort = validEfforts.includes(
        payload.thinkingEffort as (typeof validEfforts)[number],
      )
        ? payload.thinkingEffort
        : undefined;

      await (ctx.runAction as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.generation.image.generateImage,
        { ...payload, thinkingEffort },
      );

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      logger.error("Trigger generate-image failed", {
        tag: "TriggerGenerateImage",
        error: String(error),
      });
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Image generation failed",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

export default http;
