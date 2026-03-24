import {
  buildTtsCacheObjectKey,
  createSignedReadUrl,
  createTtsCacheRepository,
  uploadObject,
} from "@blah-chat/persistence-postgres";
import { getPersistenceDb } from "@/lib/persistence/server";
import {
  getPersistenceEnv,
  getPersistenceR2Client,
} from "@/lib/persistence/storage";

const DEFAULT_VOICE = "aura-asteria-en";
const DEFAULT_SPEED = 1;
const DEFAULT_FORMAT = "mp3";

function clampSpeed(speed: number) {
  return Math.min(Math.max(speed, 0.5), 2);
}

function parseSpeed(rawSpeed: string | null) {
  if (!rawSpeed) {
    return DEFAULT_SPEED;
  }

  const parsed = Number.parseFloat(rawSpeed);
  return Number.isFinite(parsed) ? parsed : DEFAULT_SPEED;
}

async function hashTtsRequest(text: string, voice: string, speed: number) {
  const data = new TextEncoder().encode(`${text}:${voice}:${speed}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const text = url.searchParams.get("text");
  const voice = url.searchParams.get("voice") || DEFAULT_VOICE;
  const requestedSpeed = parseSpeed(url.searchParams.get("speed"));

  if (!text) {
    return new Response("Missing 'text' parameter", { status: 400 });
  }

  const hash = await hashTtsRequest(text, voice, requestedSpeed);
  const db = getPersistenceDb();
  const cache = createTtsCacheRepository(db);
  const env = getPersistenceEnv();
  const r2 = getPersistenceR2Client();

  const cached = await cache.getByHash(hash);
  if (cached) {
    const signedUrl = await createSignedReadUrl({
      client: r2,
      bucket: cached.bucket,
      key: cached.key,
    });

    return Response.redirect(signedUrl, 302);
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const clampedSpeed = clampSpeed(requestedSpeed);
  const deepgramUrl = new URL("https://api.deepgram.com/v1/speak");
  deepgramUrl.searchParams.set("model", voice);
  deepgramUrl.searchParams.set("encoding", DEFAULT_FORMAT);
  if (clampedSpeed !== DEFAULT_SPEED) {
    deepgramUrl.searchParams.set("tempo", clampedSpeed.toString());
  }

  const deepgramResponse = await fetch(deepgramUrl, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({ text }),
  });

  if (!deepgramResponse.ok) {
    return new Response(deepgramResponse.body, {
      status: deepgramResponse.status,
      statusText: deepgramResponse.statusText,
    });
  }

  const audioBuffer = await deepgramResponse.arrayBuffer();
  const key = buildTtsCacheObjectKey({
    hash,
    format: DEFAULT_FORMAT,
  });

  await uploadObject({
    client: r2,
    bucket: env.r2.bucket,
    key,
    body: new Uint8Array(audioBuffer),
    contentType: "audio/mpeg",
    cacheControl: "public, max-age=31536000, immutable",
  });

  await cache.upsert({
    hash,
    bucket: env.r2.bucket,
    key,
    text,
    voice,
    speed: clampedSpeed,
    format: DEFAULT_FORMAT,
  });

  return new Response(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export const dynamic = "force-dynamic";
