#!/usr/bin/env bun
/**
 * Model CLI - Manage AI models in the database
 *
 * Usage:
 *   bun run model:add --json '{"modelId": "..."}'
 *   bun run model:list [--provider openai] [--status active]
 *   bun run model:update --id "openai:gpt-5" --json '{"inputCost": 2.0}'
 *   bun run model:deprecate --id "openai:gpt-4" [--reason "..."]
 *   bun run model:get --id "openai:gpt-5"
 */
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    json: { type: "string", short: "j" },
    id: { type: "string" },
    provider: { type: "string", short: "p" },
    status: { type: "string", short: "s" },
    reason: { type: "string", short: "r" },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

const command = positionals[0];

function runConvex(fn: string, args: Record<string, unknown>): string {
  try {
    const result = execFileSync(
      "bunx",
      ["convex", "run", `models/cli:${fn}`, JSON.stringify(args)],
      {
        encoding: "utf-8",
        cwd: process.cwd(),
      },
    );
    return result.trim();
  } catch (error: unknown) {
    if (error instanceof Error && "stderr" in error) {
      console.error("Error:", (error as { stderr: string }).stderr);
    } else if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Model CLI - Manage AI models in the database

Commands:
  add         Add a new model (requires --json)
  list        List models (optional: --provider, --status)
  update      Update a model (requires --id and --json)
  deprecate   Deprecate a model (requires --id, optional: --reason)
  get         Get a single model (requires --id)

Options:
  --json, -j     JSON model data
  --id           Model ID (e.g., "openai:gpt-5")
  --provider, -p Filter by provider
  --status, -s   Filter by status (active, deprecated, beta)
  --reason, -r   Reason for change
  --help, -h     Show this help

Required fields for add:
  modelId        Unique ID like "provider:model-name"
  provider       openai, anthropic, google, xai, perplexity, groq, cerebras,
                 minimax, deepseek, kimi, zai, meta, mistral, alibaba, zhipu
  name           Display name
  contextWindow  Max tokens
  inputCost      Cost per 1M input tokens (USD)
  outputCost     Cost per 1M output tokens (USD)
  capabilities   Array: vision, function-calling, thinking, extended-thinking, image-generation
  status         active, deprecated, beta

Examples:
  # Add a new model
  bun run model:add --json '{
    "modelId": "openai:gpt-6",
    "provider": "openai",
    "name": "GPT-6",
    "contextWindow": 200000,
    "inputCost": 2.5,
    "outputCost": 10,
    "capabilities": ["vision", "function-calling"],
    "status": "active"
  }'

  # List all models
  bun run model:list

  # List by provider
  bun run model:list --provider openai

  # List by status
  bun run model:list --status deprecated

  # Get a single model
  bun run model:get --id "openai:gpt-5"

  # Update model pricing
  bun run model:update --id "openai:gpt-5" --json '{"inputCost": 2.0, "outputCost": 8.0}'

  # Deprecate a model
  bun run model:deprecate --id "openai:gpt-4" --reason "Replaced by GPT-5"
`);
}

if (values.help || !command) {
  showHelp();
  process.exit(0);
}

switch (command) {
  case "add": {
    if (!values.json) {
      console.error("Error: --json required for add command");
      console.error("Run with --help for usage information");
      process.exit(1);
    }
    let model: Record<string, unknown>;
    try {
      model = JSON.parse(values.json);
    } catch {
      console.error("Error: Invalid JSON provided");
      process.exit(1);
    }
    const result = runConvex("createModel", model);
    console.log(result);
    console.log(`✓ Added model: ${model.modelId}`);
    break;
  }

  case "list": {
    const filters: Record<string, string> = {};
    if (values.provider) filters.provider = values.provider;
    if (values.status) filters.status = values.status;
    const result = runConvex("listModels", filters);
    console.log(result);
    break;
  }

  case "get": {
    if (!values.id) {
      console.error("Error: --id required for get command");
      process.exit(1);
    }
    const result = runConvex("getModel", { modelId: values.id });
    console.log(result);
    break;
  }

  case "update": {
    if (!values.id) {
      console.error("Error: --id required for update command");
      process.exit(1);
    }
    if (!values.json) {
      console.error("Error: --json required for update command");
      process.exit(1);
    }
    let updates: Record<string, unknown>;
    try {
      updates = JSON.parse(values.json);
    } catch {
      console.error("Error: Invalid JSON provided");
      process.exit(1);
    }
    const result = runConvex("updateModel", {
      modelId: values.id,
      updates,
      reason: values.reason,
    });
    console.log(result);
    console.log(`✓ Updated model: ${values.id}`);
    break;
  }

  case "deprecate": {
    if (!values.id) {
      console.error("Error: --id required for deprecate command");
      process.exit(1);
    }
    const result = runConvex("deprecateModel", {
      modelId: values.id,
      reason: values.reason,
    });
    console.log(result);
    console.log(`✓ Deprecated model: ${values.id}`);
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
