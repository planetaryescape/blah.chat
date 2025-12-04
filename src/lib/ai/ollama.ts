import type { ModelConfig } from "./models";

export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000), // 2s timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function listOllamaModels(): Promise<string[]> {
  try {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return [];

    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  } catch {
    return [];
  }
}

// Generate dynamic model configs for Ollama
export async function getOllamaModelConfigs(): Promise<
  Record<string, ModelConfig>
> {
  const models = await listOllamaModels();
  const configs: Record<string, ModelConfig> = {};

  for (const modelName of models) {
    const id = `ollama:${modelName}`;
    configs[id] = {
      id,
      provider: "ollama",
      name: `${modelName} (local)`,
      description: "Local model via Ollama",
      contextWindow: 128000, // Default assumption
      pricing: { input: 0, output: 0 },
      capabilities: [],
      isLocal: true,
    };
  }

  return configs;
}
