import { createGateway } from "@ai-sdk/gateway";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
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

export interface ByokKeys {
  /** Vercel AI Gateway key — used for any model that resolves to gateway "vercel". */
  gatewayKey?: string;
  /** OpenRouter key — used for any model that resolves to gateway "openrouter". */
  openRouterKey?: string;
}

/**
 * Get a model instance with per-call apiKey overrides for BYOK. Dispatches
 * to whichever gateway the model is configured for so BYOK works for
 * direct-OpenRouter models in addition to Vercel gateway models.
 *
 * Falls back to the env-backed module-level client when no matching key
 * is supplied, matching the default getModel() behaviour.
 */
export function getModelWithApiKey(modelId: string, keys: ByokKeys) {
  const [modelProvider, model] = modelId.split(":");
  const config = getModelConfig(modelId);
  const actualModel = config?.actualModelId || model;
  const selectedGateway = config?.gateway || "vercel";

  if (selectedGateway === "vercel" && keys.gatewayKey) {
    const userGateway = createGateway({ apiKey: keys.gatewayKey });
    return userGateway(`${modelProvider}/${actualModel}`);
  }

  if (selectedGateway === "openrouter" && keys.openRouterKey) {
    const userOpenRouter = createOpenRouter({ apiKey: keys.openRouterKey });
    return userOpenRouter(actualModel);
  }

  // No BYOK key matches this gateway — fall back to the default routing
  // so the request still goes through with server-side keys. The caller
  // is responsible for refusing the request earlier if it knows BYOK is
  // required and no relevant key is configured.
  return getModel(modelId);
}

export { DEFAULT_MODEL_ID as DEFAULT_MODEL } from "./operational-models";
