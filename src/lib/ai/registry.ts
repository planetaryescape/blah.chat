import {
  anthropic,
  cerebras,
  type GatewayName,
  google,
  groq,
  openai,
  openrouter,
  vercel,
} from "./providers";
import { getModelConfig } from "./utils";

/**
 * Gateway registry mapping gateway names to their SDK clients.
 *
 * Terminology:
 * - Provider: Model creator (OpenAI, Anthropic, Meta)
 * - Gateway: Routing layer (Vercel AI Gateway, OpenRouter, or direct SDK)
 * - Host: Inference provider within Vercel gateway (Cerebras, Groq, etc.)
 */
const gateways: Record<GatewayName, any> = {
  vercel,
  openai,
  anthropic,
  google,
  groq,
  cerebras,
  openrouter,
};

/**
 * Get a model instance using the appropriate gateway.
 *
 * Priority for gateway selection:
 * 1. Explicit gatewayOverride parameter
 * 2. Model config's gateway field
 * 3. Default: "vercel" (Vercel AI Gateway)
 *
 * @param modelId - Model ID in format "provider:model" (e.g., "openai:gpt-5.1")
 * @param gatewayOverride - Optional gateway to use instead of default
 */
export function getModel(modelId: string, gatewayOverride?: GatewayName) {
  const [modelProvider, model] = modelId.split(":");
  const config = getModelConfig(modelId);
  const actualModel = config?.actualModelId || model;

  // Determine which gateway/SDK to use
  const selectedGateway = gatewayOverride || config?.gateway || "vercel";

  // Get the gateway client
  const gatewayClient = gateways[selectedGateway];
  if (!gatewayClient) {
    throw new Error(`Unknown gateway: ${selectedGateway}`);
  }

  // For Vercel gateway, use format: provider/model (e.g., "openai/gpt-5.1")
  // For direct SDKs, just use the model name
  if (selectedGateway === "vercel") {
    const gatewayModel = `${modelProvider}/${actualModel}`;
    return gatewayClient(gatewayModel);
  }

  // Direct SDK access uses just the model name
  return gatewayClient(actualModel);
}

/**
 * Get a model instance, always using a specific gateway.
 * Useful when you need guaranteed direct access to a gateway/SDK.
 */
export function getModelWithGateway(modelId: string, gateway: GatewayName) {
  return getModel(modelId, gateway);
}

export { DEFAULT_MODEL_ID as DEFAULT_MODEL } from "./operational-models";
