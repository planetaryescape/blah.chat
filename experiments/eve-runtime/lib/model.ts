import { MODEL_CONFIG } from "../../../packages/ai/src/models.ts";

export function trialModel() {
  const selected = process.env.EVE_SPIKE_MODEL;
  const model = selected
    ? MODEL_CONFIG[selected]
    : Object.values(MODEL_CONFIG)
        .filter(
          (candidate) =>
            candidate.provider === "openai" &&
            candidate.id.startsWith("openai:") &&
            candidate.capabilities.includes("function-calling") &&
            !candidate.isDeprecated &&
            candidate.pricing.input > 0,
        )
        .sort(
          (a, b) =>
            a.pricing.input +
            a.pricing.output -
            b.pricing.input -
            b.pricing.output,
        )[0];
  if (!model || model.id === "auto" || model.pricing.input <= 0) {
    throw new Error("Select a priced tool-capable model from MODEL_CONFIG");
  }
  return model;
}
