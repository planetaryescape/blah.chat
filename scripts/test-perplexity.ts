#!/usr/bin/env bun
/**
 * Test script to inspect Perplexity API response structure
 * Usage: bun run scripts/test-perplexity.ts
 */

import { generateText } from "ai";
import { createGateway } from "@ai-sdk/gateway";

// Load environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;

if (!AI_GATEWAY_API_KEY) {
  console.error("❌ Missing AI_GATEWAY_API_KEY environment variable");
  console.error("   Add to .env.local file");
  process.exit(1);
}

const gateway = createGateway({
  apiKey: AI_GATEWAY_API_KEY,
});

async function testPerplexity() {
  console.log("🚀 Testing Perplexity API response structure...\n");

  const prompt =
    "What are the latest developments in quantum computing? Include sources.";

  console.log(`📝 Prompt: "${prompt}"\n`);

  try {
    const startTime = Date.now();

    const result = await generateText({
      model: gateway("perplexity/sonar-pro"),
      prompt,
    });

    const duration = Date.now() - startTime;

    console.log("✅ Response received!\n");
    console.log("=" + "=".repeat(79));
    console.log("RESPONSE TEXT");
    console.log("=" + "=".repeat(79));
    console.log(result.text);
    console.log("\n");

    console.log("=" + "=".repeat(79));
    console.log("USAGE STATS");
    console.log("=" + "=".repeat(79));
    console.log(JSON.stringify(result.usage, null, 2));
    console.log("\n");

    console.log("=" + "=".repeat(79));
    console.log("PROVIDER METADATA (CRITICAL - CITATIONS SHOULD BE HERE)");
    console.log("=" + "=".repeat(79));
    console.log(JSON.stringify(result.providerMetadata, null, 2));
    console.log("\n");

    // Check for sources property
    console.log("=" + "=".repeat(79));
    console.log("SOURCES PROPERTY CHECK");
    console.log("=" + "=".repeat(79));
    if ("sources" in result) {
      console.log("✅ result.sources exists!");
      console.log(JSON.stringify((result as any).sources, null, 2));
    } else {
      console.log("❌ result.sources does NOT exist");
    }
    console.log("\n");

    // Inspect all result keys
    console.log("=" + "=".repeat(79));
    console.log("ALL RESULT KEYS");
    console.log("=" + "=".repeat(79));
    console.log(Object.keys(result));
    console.log("\n");

    // Check for citations in various places
    console.log("=" + "=".repeat(79));
    console.log("CITATION FIELD SEARCH");
    console.log("=" + "=".repeat(79));

    const metadata = result.providerMetadata as any;

    console.log("Checking providerMetadata.citations:", !!metadata?.citations);
    console.log(
      "Checking providerMetadata.perplexity:",
      !!metadata?.perplexity,
    );
    console.log(
      "Checking providerMetadata.perplexity?.citations:",
      !!metadata?.perplexity?.citations,
    );
    console.log(
      "Checking providerMetadata.perplexity?.cited_sources:",
      !!metadata?.perplexity?.cited_sources,
    );
    console.log(
      "Checking providerMetadata.sources:",
      !!metadata?.sources,
    );
    console.log(
      "Checking providerMetadata.search_results:",
      !!metadata?.search_results,
    );

    if (metadata?.citations) {
      console.log("\n✅ FOUND: providerMetadata.citations");
      console.log(JSON.stringify(metadata.citations, null, 2));
    }

    if (metadata?.perplexity?.citations) {
      console.log("\n✅ FOUND: providerMetadata.perplexity.citations");
      console.log(JSON.stringify(metadata.perplexity.citations, null, 2));
    }

    if (metadata?.perplexity?.cited_sources) {
      console.log("\n✅ FOUND: providerMetadata.perplexity.cited_sources");
      console.log(JSON.stringify(metadata.perplexity.cited_sources, null, 2));
    }

    console.log("\n");
    console.log("⏱️  Duration:", duration, "ms");
    console.log("💰 Estimated cost:", calculateCost(result.usage));
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

function calculateCost(usage: {
  inputTokens?: number;
  outputTokens?: number;
}) {
  // Perplexity sonar-pro pricing: $3/MTok input, $15/MTok output
  const inputTokens = usage.inputTokens || 0;
  const outputTokens = usage.outputTokens || 0;
  const inputCost = (inputTokens / 1_000_000) * 3.0;
  const outputCost = (outputTokens / 1_000_000) * 15.0;
  const total = inputCost + outputCost;
  return `$${total.toFixed(6)} (${inputTokens} in + ${outputTokens} out)`;
}

// Run test
testPerplexity();
