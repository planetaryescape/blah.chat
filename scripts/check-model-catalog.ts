import { CURRENT_MODELS } from "../packages/ai/src/models-current";

// Public metadata only. Never sends provider credentials or makes inference calls.
const response = await fetch("https://openrouter.ai/api/v1/models", {
  signal: AbortSignal.timeout(30000),
});
if (!response.ok)
  throw new Error(`Model catalog returned HTTP ${response.status}`);
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function perMillion(value: unknown): number {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Number(value)) ||
    Number(value) < 0
  )
    throw new Error("Invalid public price");
  return Number(value) * 1000000;
}
const payload: unknown = await response.json();
if (
  !isRecord(payload) ||
  !Array.isArray(payload.data) ||
  !payload.data.every(isRecord)
)
  throw new Error("Invalid public catalog");
const listed = new Map(payload.data.map((model) => [model.id, model]));
const differences: string[] = [];
for (const config of Object.values(CURRENT_MODELS)) {
  const live = listed.get(config.actualModelId);
  if (!live) {
    differences.push(
      `${config.id}: API model ${config.actualModelId} is not listed`,
    );
    continue;
  }
  if (
    !isRecord(live.pricing) ||
    !isRecord(live.architecture) ||
    !Array.isArray(live.architecture.input_modalities) ||
    !Array.isArray(live.supported_parameters)
  )
    throw new Error(`Invalid metadata for ${config.id}`);
  if (config.contextWindow !== live.context_length)
    differences.push(`${config.id}: context window changed`);
  for (const [key, value] of Object.entries({
    input: perMillion(live.pricing.prompt),
    output: perMillion(live.pricing.completion),
    cached:
      live.pricing.input_cache_read === undefined
        ? undefined
        : perMillion(live.pricing.input_cache_read),
  })) {
    const configured = config.pricing[key as "input" | "output" | "cached"];
    if (
      value === undefined
        ? configured !== undefined
        : configured === undefined || Math.abs(configured - value) > 1e-10
    ) {
      differences.push(
        `${config.id}: ${key} price changed (${configured} -> ${value})`,
      );
    }
  }
  if (
    config.capabilities.includes("vision") !==
    live.architecture.input_modalities.includes("image")
  )
    differences.push(`${config.id}: vision support changed`);
  if (
    config.capabilities.includes("function-calling") !==
    live.supported_parameters.includes("tools")
  )
    differences.push(`${config.id}: tool support changed`);
  const listedTiers = Array.isArray(live.pricing.overrides)
    ? live.pricing.overrides
        .filter(isRecord)
        .filter((tier) => typeof tier.min_prompt_tokens === "number")
    : [];
  if (listedTiers.length !== (config.pricing.tiers?.length ?? 0))
    differences.push(`${config.id}: context price tiers changed`);
  for (const tier of config.pricing.tiers ?? []) {
    const listedTier = listedTiers.find(
      (entry) => entry.min_prompt_tokens === tier.minInputTokens,
    );
    if (
      !listedTier ||
      Math.abs(perMillion(listedTier.prompt) - tier.input) > 1e-10 ||
      Math.abs(perMillion(listedTier.completion) - tier.output) > 1e-10 ||
      (tier.cached !== undefined &&
        Math.abs(perMillion(listedTier.input_cache_read) - tier.cached) > 1e-10)
    )
      differences.push(
        `${config.id}: rates for ${tier.minInputTokens}+ input tokens changed`,
      );
  }
}
if (differences.length) {
  console.error(differences.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Verified ${Object.keys(CURRENT_MODELS).length} current API IDs, prices, context tiers, context windows, vision and tool capabilities.`,
  );
}
