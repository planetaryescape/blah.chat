import { speechHash } from "./prepare";

export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
export const TTS_TIMEOUT_MS = 30_000;

export async function readSpeechBody(
  response: Pick<Response, "headers" | "body">,
  maxBytes: number,
  timeoutMs: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(response.headers.get("content-length")) > maxBytes)
    throw new Error("Speech body too large");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing speech body");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Speech body timed out"));
      void reader.cancel();
    }, timeoutMs);
  });
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("Speech body too large");
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes;
  } finally {
    clearTimeout(timer);
    await reader.cancel();
  }
}

export function validateSynthesis(
  text: string,
  voice: string,
  speed: number,
): void {
  if (
    !text.trim() ||
    text.length > 2000 ||
    !/^aura-[a-z0-9-]{1,60}$/.test(voice) ||
    !Number.isFinite(speed) ||
    speed < 0.5 ||
    speed > 2
  )
    throw new Error("Invalid TTS text, voice or speed");
}

export function audioCacheHash(
  owner: string,
  text: string,
  voice: string,
  speed: number,
  credentialPolicy: string,
): Promise<string> {
  return speechHash(
    JSON.stringify([
      "speech-audio-v1",
      owner,
      text,
      voice,
      speed,
      "mp3",
      credentialPolicy,
    ]),
  );
}

export async function synthesize(
  text: string,
  voice: string,
  speed: number,
  apiKey: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const deadline = Date.now() + TTS_TIMEOUT_MS;
  validateSynthesis(text, voice, speed);
  const url = new URL("https://api.deepgram.com/v1/speak");
  url.searchParams.set("model", voice);
  url.searchParams.set("encoding", "mp3");
  if (speed !== 1) url.searchParams.set("tempo", String(speed));
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(`Speech provider request failed (${response.status})`);
  if (
    !(response.headers.get("content-type") ?? "")
      .toLowerCase()
      .startsWith("audio/")
  )
    throw new Error("Speech provider returned invalid audio");
  const bytes = await readSpeechBody(
    response,
    MAX_AUDIO_BYTES,
    Math.max(1, deadline - Date.now()),
  );
  if (!bytes.length) throw new Error("Speech provider returned empty audio");
  return bytes;
}
