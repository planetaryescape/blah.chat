/**
 * Compute Routing Embeddings
 *
 * One-time script to generate embeddings for seed routing examples.
 * Run: bun run scripts/compute-routing-embeddings.ts
 *
 * Requires AI_GATEWAY_API_KEY environment variable.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { SEED_EXAMPLES } from "../packages/auto-router/src/examples";

async function main() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    console.error("Missing AI_GATEWAY_API_KEY environment variable");
    process.exit(1);
  }

  const openai = createOpenAI({
    apiKey,
    baseURL:
      "https://gateway.ai.cloudflare.com/v1/planetaryescape/blah-chat-dev-gateway/openai",
  });

  const model = openai.textEmbeddingModel("text-embedding-3-small");

  console.log(`Computing embeddings for ${SEED_EXAMPLES.length} examples...`);

  const { embeddings } = await embedMany({
    model,
    values: SEED_EXAMPLES.map((e) => e.text),
  });

  console.log(
    `Got ${embeddings.length} embeddings (${embeddings[0].length} dimensions)`,
  );

  const output = SEED_EXAMPLES.map((example, i) => ({
    text: example.text,
    routeLabel: example.routeLabel,
    complexity: example.complexity,
    embedding: embeddings[i],
  }));

  const outputDir = "packages/auto-router/data";
  mkdirSync(outputDir, { recursive: true });

  const outputPath = `${outputDir}/examples.embeddings.json`;
  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`Written to ${outputPath}`);
  console.log(
    `File size: ${(JSON.stringify(output).length / 1024).toFixed(1)}KB`,
  );
}

main().catch(console.error);
