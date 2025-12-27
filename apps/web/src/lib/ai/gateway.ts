import { getModelConfig } from "./utils";

/**
 * Get the host order (inference provider fallback) for a model.
 * This tells Vercel AI Gateway which hosts to try in order (e.g., Cerebras → Groq).
 */
export const getHostOrder = (modelId: string) => {
  const config = getModelConfig(modelId);

  // Use hostOrder from config if defined
  if (config?.hostOrder) {
    return config.hostOrder;
  }

  // For all other models, let Vercel AI Gateway decide
  return undefined;
};

/**
 * Build providerOptions for Vercel AI Gateway.
 * Note: The key "gateway" in the return object is SDK-required.
 */
export const getGatewayOptions = (
  modelId?: string,
  userId?: string,
  tags?: string[],
) => {
  const order = getHostOrder(modelId || "");
  const options: any = {
    ...(userId && { user: userId }),
    tags: tags || ["chat"],
  };

  // Only add order if it's defined (for models with host fallback)
  if (order) {
    options.order = order;
  }

  // Note: "gateway" key is SDK-required for Vercel AI Gateway
  return { gateway: options };
};

// Helper function to generate with fallback
export const generateWithGateway = async (params: {
  model: string;
  messages: any[];
  userId?: string;
  tags?: string[];
  temperature?: number;
  maxTokens?: number;
  tools?: any;
  providerOptions?: any;
}) => {
  const {
    model,
    messages,
    userId,
    tags,
    temperature,
    maxTokens,
    tools,
    providerOptions,
  } = params;

  const options: any = {
    model,
    messages,
    ...(temperature && { temperature }),
    ...(maxTokens && { maxTokens }),
    ...(tools && { tools }),
    providerOptions: {
      ...getGatewayOptions(model, userId, tags),
      ...providerOptions,
    },
  };

  return options;
};
