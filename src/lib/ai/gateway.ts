import { createGateway } from "@ai-sdk/gateway";

// Vercel AI Gateway configuration
export const aiGateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});

// Cerebras models (from https://inference-docs.cerebras.ai/models/overview)
const CEREBRAS_MODELS = [
  "llama3.1-8b",
  "llama-3.3-70b",
  "gpt-oss-120b",
  "qwen-3-32b",
  "qwen-3-235b-a22b-instruct-2507",
  "qwen-3-235b-a22b-thinking-2507",
  "zai-glm-4.6",
];

// Groq models (from https://console.groq.com/docs/models)
const GROQ_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "meta-llama/llama-guard-4-12b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "whisper-large-v3",
  "whisper-large-v3-turbo",
  "groq/compound",
  "groq/compound-mini",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-prompt-guard-2-22m",
  "meta-llama/llama-prompt-guard-2-86m",
  "moonshotai/kimi-k2-instruct-0905",
  "openai/gpt-oss-safeguard-20b",
  "playai-tts",
  "playai-tts-arabic",
  "qwen/qwen3-32b",
];

// Models available on both Cerebras and Groq - prefer Cerebras for these
const OVERLAP_MODELS = [
  "llama3.1-8b", // Cerebras: llama3.1-8b, Groq: llama-3.1-8b-instant
  "llama-3.3-70b", // Cerebras: llama-3.3-70b, Groq: llama-3.3-70b-versatile
  "gpt-oss-120b", // Both have gpt-oss-120b
  "qwen-3-32b", // Cerebras: qwen-3-32b, Groq: qwen/qwen3-32b
];

// Dynamic provider ordering based on model
export const getProviderOrder = (modelId: string) => {
  const [provider, model] = modelId.split(":");

  // Normalize model names for comparison (remove provider prefixes)
  const normalizedModel = model.replace(
    /^(openai\/|meta-llama\/|qwen\/|moonshotai\/)/,
    "",
  );

  // For overlap models, prefer Cerebras first, then Groq
  if (OVERLAP_MODELS.includes(normalizedModel)) {
    return ["cerebras", "groq"];
  }

  // For Groq-exclusive models, prefer Groq first
  if (
    GROQ_MODELS.includes(model) &&
    !OVERLAP_MODELS.includes(normalizedModel)
  ) {
    return ["groq", "cerebras"];
  }

  // For Cerebras-exclusive models, prefer Cerebras first
  if (
    CEREBRAS_MODELS.includes(model) &&
    !OVERLAP_MODELS.includes(normalizedModel)
  ) {
    return ["cerebras", "groq"];
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
