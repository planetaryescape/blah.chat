"use node";

/**
 * Routing Seed Migration
 *
 * One-time action to populate routingExamples table from pre-computed embeddings.
 */

import { createOpenAI } from "@ai-sdk/openai";
import { SEED_EXAMPLES } from "@blah-chat/auto-router";
import { embedMany } from "ai";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { logger } from "../lib/logger";

/**
 * Seed routing examples into the database.
 * Computes embeddings on the fly if not pre-computed.
 */
export const seedRoutingExamples = internalAction({
  args: {},
  handler: async (ctx) => {
    logger.info("Starting routing examples seed", {
      tag: "RoutingSeed",
      exampleCount: SEED_EXAMPLES.length,
    });

    const openai = createOpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL:
        "https://gateway.ai.cloudflare.com/v1/planetaryescape/blah-chat-dev-gateway/openai",
    });

    const model = openai.textEmbeddingModel("text-embedding-3-small");
    const texts = SEED_EXAMPLES.map((e) => e.text);

    // Batch embed all examples
    const { embeddings } = await embedMany({
      model,
      values: texts,
    });

    // Insert into database
    let inserted = 0;
    for (let i = 0; i < SEED_EXAMPLES.length; i++) {
      const example = SEED_EXAMPLES[i];
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.routing.mutations.insertRoutingExample,
        {
          text: example.text,
          embedding: embeddings[i],
          routeLabel: example.routeLabel,
          complexity: example.complexity,
          source: "seed",
        },
      );
      inserted++;
    }

    logger.info("Routing examples seed complete", {
      tag: "RoutingSeed",
      inserted,
    });

    return { inserted };
  },
});
