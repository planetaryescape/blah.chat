import { aiGateway } from "./gateway";
import { getModelConfig } from "./utils";

export function getModel(modelId: string, useResponsesAPI = false) {
  const [provider, model] = modelId.split(":");
  const config = getModelConfig(modelId);
  const actualModel = config?.actualModelId || model;

  // All models route through Vercel AI Gateway
  // Format: provider/actualModelId (e.g., "openai/gpt-5", "cerebras/qwen-3-32b")
  const gatewayModel = `${provider}/${actualModel}`;

  return aiGateway(gatewayModel);
}

export const DEFAULT_MODEL = "cerebras:qwen-3-32b"; // Fast (2600 tok/s), affordable, 131K context
