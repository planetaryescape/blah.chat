import {
  anthropic,
  cerebras,
  gateway,
  google,
  groq,
  openai,
  openrouter,
  type ProviderName,
} from "./providers";
import { getModelConfig } from "./utils";

/**
 * Provider registry mapping provider names to their SDK clients
 */
const providers: Record<ProviderName, any> = {
  gateway,
  openai,
  anthropic,
  google,
  groq,
  cerebras,
  openrouter,
};

/**
 * Get a model instance using the appropriate provider.
 *
 * Priority for provider selection:
 * 1. Explicit providerOverride parameter
 * 2. Model config's preferredProvider
 * 3. Default: "gateway" (Vercel AI Gateway)
 *
 * @param modelId - Model ID in format "provider:model" (e.g., "openai:gpt-5.1")
 * @param providerOverride - Optional provider to use instead of default
 */
export function getModel(modelId: string, providerOverride?: ProviderName) {
  const [modelProvider, model] = modelId.split(":");
  const config = getModelConfig(modelId);
  const actualModel = config?.actualModelId || model;

  // Determine which provider SDK to use
  const selectedProvider =
    providerOverride || config?.preferredProvider || "gateway";

  // Get the provider client
  const providerClient = providers[selectedProvider];
  if (!providerClient) {
    throw new Error(`Unknown provider: ${selectedProvider}`);
  }

  // For gateway, use format: provider/model (e.g., "openai/gpt-5.1")
  // For direct providers, just use the model name
  if (selectedProvider === "gateway") {
    const gatewayModel = `${modelProvider}/${actualModel}`;
    return providerClient(gatewayModel);
  }

  // Direct provider access uses just the model name
  return providerClient(actualModel);
}

/**
 * Get a model instance, always using a specific provider.
 * Useful when you need guaranteed direct access to a provider.
 */
export function getModelWithProvider(
  modelId: string,
  providerName: ProviderName,
) {
  return getModel(modelId, providerName);
}

export { DEFAULT_MODEL_ID as DEFAULT_MODEL } from "./operational-models";
