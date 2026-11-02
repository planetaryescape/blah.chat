import { httpRouter } from "convex/server";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { hasInternalAuthorization } from "./lib/internalAuth";
import { logger } from "./lib/logger";
import {
  MAX_UPLOAD_BYTES,
  readBoundedBody,
  verifyUploadToken,
} from "./lib/ownedUploads";
import { readSpeechBody } from "./lib/speech/synthesis";

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
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Cache-Control": "private, no-store",
};
const ttsInput = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().optional(),
  speed: z.number().optional(),
});
http.route({
  path: "/tts",
  method: "OPTIONS",
  handler: httpAction(
    async () => new Response(null, { status: 204, headers: ttsCors }),
  ),
});

const ttsHandler = httpAction(async (ctx, request) => {
  if (!(await ctx.auth.getUserIdentity()))
    return new Response("Unauthorized", { status: 401, headers: ttsCors });
  let status = 400;
  try {
    let input: z.infer<typeof ttsInput>;
    if (request.method === "POST") {
      const bytes = await readSpeechBody(request, 16_000, 5000);
      input = ttsInput.parse(JSON.parse(new TextDecoder().decode(bytes)));
    } else {
      const params = new URL(request.url).searchParams;
      input = ttsInput.parse({
        text: params.get("text"),
        voice: params.get("voice") ?? undefined,
        speed: params.has("speed") ? Number(params.get("speed")) : undefined,
      });
    }
    status = 502;
    const audio = await ctx.runAction(api.tts.generateSpeech, input);
    const binary = atob(audio.audioBase64);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    return new Response(bytes, {
      headers: { ...ttsCors, "Content-Type": "audio/mpeg" },
    });
  } catch (error) {
    const failure = z
      .object({
        data: z.preprocess(
          (data) => {
            // Convex action boundaries can serialize application-error data.
            const serialized = z.string().safeParse(data);
            if (!serialized.success) return data;
            try {
              return JSON.parse(serialized.data);
            } catch {
              return null;
            }
          },
          z.object({ code: z.string() }),
        ),
      })
      .safeParse(error);
    if (failure.success) {
      const code = failure.data.data.code;
      if (["TTS_INPUT", "TTS_DISABLED"].includes(code)) status = 400;
      else if (code === "TTS_AUTH") status = 401;
      else if (code === "TTS_BYOK_KEY") status = 403;
      else if (code === "TTS_BUDGET") status = 429;
      else if (code === "TTS_CONFIGURATION") status = 503;
    }
    // Do not reflect private text, provider responses, credentials, or storage URLs.
    return new Response(
      "Speech request rejected. Check TTS preferences, credentials and usage budget.",
      { status, headers: ttsCors },
    );
  }
});
http.route({ path: "/tts", method: "GET", handler: ttsHandler });
http.route({ path: "/tts", method: "POST", handler: ttsHandler });

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
