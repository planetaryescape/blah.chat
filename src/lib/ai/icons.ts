import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Brain,
  Cpu,
  Eye,
  Globe,
  Sparkles,
  Stars,
  Wind,
  Zap,
} from "lucide-react";
import { getModelConfig } from "./utils";

/**
 * Get appropriate icon for a model based on its capabilities
 * - Vision models: Eye icon
 * - Thinking/reasoning models: Sparkles icon
 * - Default (fast models): Zap icon
 */
export function getModelIcon(modelId: string): LucideIcon {
  const config = getModelConfig(modelId);
  if (!config) return Sparkles;

  if (config.capabilities.includes("vision")) return Eye;
  if (
    config.capabilities.includes("thinking") ||
    config.capabilities.includes("extended-thinking")
  )
    return Sparkles;

  return Zap; // Default for fast models
}

/**
 * Get icon for a provider
 * Returns appropriate Lucide icon based on provider name
 */
export function getProviderIcon(
  provider: string,
): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    openai: Sparkles, // OpenAI brand
    anthropic: Zap, // Claude lightning
    google: Stars, // Google Gemini
    xai: Brain, // Grok/xAI thinking
    perplexity: Globe, // Web search
    groq: Cpu, // Hardware acceleration
    cerebras: Cpu, // Hardware acceleration
    minimax: Bot, // Generic AI
    deepseek: Brain, // Deep reasoning
    kimi: Bot, // Generic AI
    zai: Brain, // AI thinking
    meta: Bot, // Meta AI (Llama)
    mistral: Wind, // Mistral (wind brand)
    alibaba: Bot, // Generic AI
    zhipu: Bot, // Generic AI
  };

  return icons[provider] || Sparkles; // Default fallback
}
