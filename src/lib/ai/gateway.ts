import { getModelConfig } from "./utils";

// Dynamic provider ordering based on model config
// This is now derived from MODEL_CONFIG.providerOrder instead of hardcoded lists
export const getProviderOrder = (modelId: string) => {
  const config = getModelConfig(modelId);

  // Use providerOrder from config if defined
  if (config?.providerOrder) {
    return config.providerOrder;
  }

  // For all other models, let AI SDK decide (no provider ordering)
  return undefined;
};

// Gateway options for different use cases
export const getGatewayOptions = (
  modelId?: string,
  userId?: string,
  tags?: string[],
) => {
  const order = getProviderOrder(modelId || "");
  const options: any = {
    ...(userId && { user: userId }),
    tags: tags || ["chat"],
  };

  // Only add order if it's defined (for Cerebras/Groq models)
  if (order) {
    options.order = order;
  }

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
