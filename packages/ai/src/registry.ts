import { DEFAULT_MODEL_ID } from "./models";
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
  let selectedGateway = gatewayOverride || config?.gateway || "vercel";
  // Both providers host GPT-OSS 120B under different API model IDs.
  // A configured direct provider must not accidentally route via a paid gateway.
  if (
    !gatewayOverride &&
    selectedGateway === "groq" &&
    modelId === DEFAULT_MODEL_ID &&
    !process.env.GROQ_API_KEY &&
    process.env.CEREBRAS_API_KEY
  ) {
    selectedGateway = "cerebras";
  }

  // Get the gateway client
  const gatewayClient = gateways[selectedGateway];
  if (!gatewayClient) {
    throw new Error(`Unknown gateway: ${selectedGateway}`);
  }

  // For Vercel gateway, use format: provider/model (e.g., "openai/gpt-5.1")
  // For direct SDKs, just use the model name
  if (selectedGateway === "vercel") {
    const gatewayModel = actualModel.includes("/")
      ? actualModel
      : `${modelProvider}/${actualModel}`;
    return gatewayClient(gatewayModel);
  }

  if (
    selectedGateway === "openrouter" &&
    !process.env.OPENROUTER_API_KEY?.trim()
  ) {
    throw new Error(
      "OpenRouter authentication is not configured: OPENROUTER_API_KEY must be set in the generation backend.",
    );
  }

  if (selectedGateway === "cerebras" && modelId === DEFAULT_MODEL_ID) {
    return gatewayClient(model);
  }

  // Direct SDK access uses the provider's configured API model ID.
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
