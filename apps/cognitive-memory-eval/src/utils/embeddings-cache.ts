import { createHash } from "node:crypto";
import { EMBEDDING_MODEL } from "@blah-chat/ai/operational-models";
import { fileExists, readJson, writeJsonAtomic } from "./fs";
import { llmEmbedMany } from "./llm";
import { dataPath } from "./paths";

type Cache = Record<string, number[]>;

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function loadCache(path: string): Cache {
  if (!fileExists(path)) return {};
  return readJson<Cache>(path);
}

export async function embedCached(
  text: string,
  options: { dryRun?: boolean } = {},
): Promise<number[]> {
  const cachePath = dataPath("embeddings-cache.json");
  const cache = loadCache(cachePath);
  const key = sha256(text);
  const hit = cache[key];
  if (hit) return hit;
  if (options.dryRun) throw new Error("dry-run: missing embedding cache entry");

  const [embedding] = await embedManyCached([text], { dryRun: false });
  return embedding;
}

export async function embedManyCached(
  texts: string[],
  options: { dryRun?: boolean } = {},
): Promise<number[][]> {
  const cachePath = dataPath("embeddings-cache.json");
  const cache = loadCache(cachePath);

  const missing: Array<{ idx: number; text: string; key: string }> = [];
  const out: number[][] = new Array(texts.length);
  for (let i = 0; i < texts.length; i++) {
    const key = sha256(texts[i]);
    const hit = cache[key];
    if (hit) out[i] = hit;
    else missing.push({ idx: i, text: texts[i], key });
  }

  if (missing.length === 0) return out;
  if (options.dryRun)
    throw new Error("dry-run: missing embedding cache entries");

  const embeddings = await llmEmbedMany({
    model: EMBEDDING_MODEL,
    tag: "embeddings",
    values: missing.map((m) => m.text),
  });

  for (let i = 0; i < missing.length; i++) {
    const m = missing[i];
    const emb = embeddings[i];
    cache[m.key] = emb;
    out[m.idx] = emb;
  }

  await writeJsonAtomic(cachePath, cache);
  return out;
}
