import { getGatewayOptions } from "@blah-chat/ai/gateway";
import { getModel } from "@blah-chat/ai/registry";
import { embed, embedMany, generateObject, generateText } from "ai";
import type { z } from "zod";
import { appendJsonl, ensureDir } from "./fs";
import { log as logLine } from "./log";
import { resultsPath } from "./paths";
import { withRetry } from "./retry";

type LogRow = {
  at: number;
  kind: "generateObject" | "generateText" | "embed" | "embedMany";
  model?: string;
  tag: string;
  ok: boolean;
  error?: string;
};

async function log(row: LogRow) {
  await ensureDir(resultsPath());
  await appendJsonl(resultsPath("debug.log"), row);
}

function assertGatewayKey() {
  if (!process.env.AI_GATEWAY_API_KEY) {
    throw new Error("Missing AI_GATEWAY_API_KEY");
  }
}

export async function llmGenerateObject<T>(options: {
  modelId: string;
  tag: string;
  schema: z.ZodType<T>;
  prompt: string;
  temperature?: number;
  dryRun?: boolean;
}): Promise<T> {
  if (options.dryRun) throw new Error("dry-run: llmGenerateObject blocked");
  assertGatewayKey();
  logLine(`llm generateObject ${options.tag} model=${options.modelId}`);
  return withRetry(async () => {
    try {
      const res = await generateObject({
        model: getModel(options.modelId),
        schema: options.schema as any,
        temperature: options.temperature,
        providerOptions: getGatewayOptions(options.modelId, undefined, [
          options.tag,
        ]),
        prompt: options.prompt,
      });
      await log({
        at: Date.now(),
        kind: "generateObject",
        model: options.modelId,
        tag: options.tag,
        ok: true,
      });
      return res.object as T;
    } catch (err) {
      await log({
        at: Date.now(),
        kind: "generateObject",
        model: options.modelId,
        tag: options.tag,
        ok: false,
        error: String(err),
      });
      throw err;
    }
  });
}

export async function llmGenerateText(options: {
  modelId: string;
  tag: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  dryRun?: boolean;
}): Promise<string> {
  if (options.dryRun) throw new Error("dry-run: llmGenerateText blocked");
  assertGatewayKey();
  logLine(`llm generateText ${options.tag} model=${options.modelId}`);
  return withRetry(async () => {
    try {
      const res = await generateText({
        model: getModel(options.modelId),
        temperature: options.temperature,
        maxOutputTokens: options.maxOutputTokens,
        providerOptions: getGatewayOptions(options.modelId, undefined, [
          options.tag,
        ]),
        prompt: options.prompt,
      });
      await log({
        at: Date.now(),
        kind: "generateText",
        model: options.modelId,
        tag: options.tag,
        ok: true,
      });
      return res.text ?? "";
    } catch (err) {
      await log({
        at: Date.now(),
        kind: "generateText",
        model: options.modelId,
        tag: options.tag,
        ok: false,
        error: String(err),
      });
      throw err;
    }
  });
}

export async function llmEmbed(options: {
  model: any;
  tag: string;
  value: string;
  dryRun?: boolean;
}): Promise<number[]> {
  if (options.dryRun) throw new Error("dry-run: llmEmbed blocked");
  assertGatewayKey();
  return withRetry(async () => {
    try {
      const res = await embed({ model: options.model, value: options.value });
      await log({
        at: Date.now(),
        kind: "embed",
        tag: options.tag,
        ok: true,
      });
      return res.embedding;
    } catch (err) {
      await log({
        at: Date.now(),
        kind: "embed",
        tag: options.tag,
        ok: false,
        error: String(err),
      });
      throw err;
    }
  });
}

export async function llmEmbedMany(options: {
  model: any;
  tag: string;
  values: string[];
  dryRun?: boolean;
}): Promise<number[][]> {
  if (options.dryRun) throw new Error("dry-run: llmEmbedMany blocked");
  assertGatewayKey();
  return withRetry(async () => {
    try {
      const res = await embedMany({
        model: options.model,
        values: options.values,
      });
      await log({
        at: Date.now(),
        kind: "embedMany",
        tag: options.tag,
        ok: true,
      });
      return res.embeddings;
    } catch (err) {
      await log({
        at: Date.now(),
        kind: "embedMany",
        tag: options.tag,
        ok: false,
        error: String(err),
      });
      throw err;
    }
  });
}
