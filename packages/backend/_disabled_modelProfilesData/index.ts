/**
 * Model Profiles Index
 *
 * Exports all model profiles for the auto-router.
 * Each profile contains task category scores, strengths, weaknesses,
 * and routing recommendations.
 */

// Types
export {
	TASK_CATEGORIES,
	type CostTier,
	type ModelProfile,
	type RouterPreferences,
	type RouterResult,
	type SpeedTier,
	type TaskCategoryId,
	type TaskCategoryScores,
	type TaskClassification,
} from "./types";

// OpenAI profiles
import { openaiGpt5Profile } from "./openai-gpt-5";
import { openaiGpt5MiniProfile } from "./openai-gpt-5-mini";
import { openaiGpt5NanoProfile } from "./openai-gpt-5-nano";
import { openaiGpt51Profile } from "./openai-gpt-5-1";
import { openaiGpt51CodexProfile } from "./openai-gpt-5-1-codex";
import { openaiGpt51InstantProfile } from "./openai-gpt-5-1-instant";
import { openaiGpt52Profile } from "./openai-gpt-5-2";
import { openaiGpt52ChatProfile } from "./openai-gpt-5-2-chat";
import { openaiGptOss20bProfile } from "./openai-gpt-oss-20b";
import { openaiGptOss120bProfile } from "./openai-gpt-oss-120b";

// Anthropic profiles
import { anthropicClaudeOpus45Profile } from "./anthropic-claude-opus-4-5";
import { anthropicClaudeSonnet45Profile } from "./anthropic-claude-sonnet-4-5";
import { anthropicClaudeHaiku45Profile } from "./anthropic-claude-haiku-4-5";

// Google profiles
import { googleGemini25FlashProfile } from "./google-gemini-2-5-flash";
import { googleGemini25ProProfile } from "./google-gemini-2-5-pro";
import { googleGemini3FlashProfile } from "./google-gemini-3-flash";
import { googleGemini20FlashProfile } from "./google-gemini-2-0-flash";
import { googleGemini20FlashLiteProfile } from "./google-gemini-2-0-flash-lite";
import { googleGemini3ProPreviewProfile } from "./google-gemini-3-pro-preview";
import { googleGemini3ProImagePreviewProfile } from "./google-gemini-3-pro-image-preview";
import { googleGemini25FlashImageProfile } from "./google-gemini-2-5-flash-image";

// xAI profiles
import { xaiGrok4FastProfile } from "./xai-grok-4-fast";
import { xaiGrok41FastProfile } from "./xai-grok-4-1-fast";
import { xaiGrok41FastReasoningProfile } from "./xai-grok-4-1-fast-reasoning";
import { xaiGrokCodeFast1Profile } from "./xai-grok-code-fast-1";

// Perplexity profiles
import { perplexitySonarReasoningProProfile } from "./perplexity-sonar-reasoning-pro";
import { perplexitySonarProProfile } from "./perplexity-sonar-pro";
import { perplexitySonarReasoningProfile } from "./perplexity-sonar-reasoning";
import { perplexitySonarProfile } from "./perplexity-sonar";

// Meta profiles
import { metaLlama3370bProfile } from "./meta-llama-3-3-70b";
import { metaLlama4MaverickProfile } from "./meta-llama-4-maverick";
import { metaLlama4ScoutProfile } from "./meta-llama-4-scout";

// Mistral profiles
import { mistralMistralLarge3Profile } from "./mistral-mistral-large-3";
import { mistralDevstralSmallProfile } from "./mistral-devstral-small";

// Alibaba profiles
import { alibabaQwen3MaxProfile } from "./alibaba-qwen3-max";
import { alibabaQwen3Coder480bProfile } from "./alibaba-qwen3-coder-480b";

// Moonshot/Kimi profiles
import { moonshotaiKimiK2Profile } from "./moonshotai-kimi-k2";
import { moonshotaiKimiK2ThinkingProfile } from "./moonshotai-kimi-k2-thinking";

// MiniMax profiles
import { minimaxMinimaxM2Profile } from "./minimax-minimax-m2";
import { minimaxMinimaxM21Profile } from "./minimax-minimax-m2-1";
import { minimaxMinimaxM21LightningProfile } from "./minimax-minimax-m2-1-lightning";

// Z.ai/GLM profiles
import { zaiGlm46Profile } from "./zai-glm-4-6";
import { zaiGlm47Profile } from "./zai-glm-4-7";
import { zaiGlm46vFlashProfile } from "./zai-glm-4-6v-flash";
import { zaiGlm45AirProfile } from "./zai-glm-4-5-air";

// DeepSeek profiles
import { deepseekDeepseekR1Profile } from "./deepseek-deepseek-r1";
import { deepseekDeepseekV32Profile } from "./deepseek-deepseek-v3-2";
import { deepseekDeepseekV32ThinkingProfile } from "./deepseek-deepseek-v3-2-thinking";

// OpenRouter Free profiles
import { openrouterDeepseekR10528Profile } from "./openrouter-deepseek-r1-0528";
import { openrouterDevstral2512Profile } from "./openrouter-devstral-2512";
import { openrouterGlm45AirProfile } from "./openrouter-glm-4-5-air";
import { openrouterQwen3CoderProfile } from "./openrouter-qwen3-coder";
import { openrouterKimiK2Profile } from "./openrouter-kimi-k2";
import { openrouterLlama3370bProfile } from "./openrouter-llama-3-3-70b";
import { openrouterGemini20FlashExpProfile } from "./openrouter-gemini-2-0-flash-exp";

import type { ModelProfile } from "./types";

/**
 * All model profiles indexed by model ID
 */
export const MODEL_PROFILES: Record<string, ModelProfile> = {
	// OpenAI
	"openai:gpt-5": openaiGpt5Profile,
	"openai:gpt-5-mini": openaiGpt5MiniProfile,
	"openai:gpt-5-nano": openaiGpt5NanoProfile,
	"openai:gpt-5.1": openaiGpt51Profile,
	"openai:gpt-5.1-codex": openaiGpt51CodexProfile,
	"openai:gpt-5.1-instant": openaiGpt51InstantProfile,
	"openai:gpt-5.2": openaiGpt52Profile,
	"openai:gpt-5.2-chat": openaiGpt52ChatProfile,
	"openai:gpt-oss-20b": openaiGptOss20bProfile,
	"openai:gpt-oss-120b": openaiGptOss120bProfile,

	// Anthropic
	"anthropic:claude-opus-4.5": anthropicClaudeOpus45Profile,
	"anthropic:claude-sonnet-4.5": anthropicClaudeSonnet45Profile,
	"anthropic:claude-haiku-4.5": anthropicClaudeHaiku45Profile,

	// Google
	"google:gemini-2.5-flash": googleGemini25FlashProfile,
	"google:gemini-2.5-pro": googleGemini25ProProfile,
	"google:gemini-3-flash": googleGemini3FlashProfile,
	"google:gemini-2.0-flash": googleGemini20FlashProfile,
	"google:gemini-2.0-flash-lite": googleGemini20FlashLiteProfile,
	"google:gemini-3-pro-preview": googleGemini3ProPreviewProfile,
	"google:gemini-3-pro-image-preview": googleGemini3ProImagePreviewProfile,
	"google:gemini-2.5-flash-image": googleGemini25FlashImageProfile,

	// xAI
	"xai:grok-4-fast": xaiGrok4FastProfile,
	"xai:grok-4.1-fast": xaiGrok41FastProfile,
	"xai:grok-4.1-fast-reasoning": xaiGrok41FastReasoningProfile,
	"xai:grok-code-fast-1": xaiGrokCodeFast1Profile,

	// Perplexity
	"perplexity:sonar-reasoning-pro": perplexitySonarReasoningProProfile,
	"perplexity:sonar-pro": perplexitySonarProProfile,
	"perplexity:sonar-reasoning": perplexitySonarReasoningProfile,
	"perplexity:sonar": perplexitySonarProfile,

	// Meta
	"meta:llama-3.3-70b": metaLlama3370bProfile,
	"meta:llama-4-maverick": metaLlama4MaverickProfile,
	"meta:llama-4-scout": metaLlama4ScoutProfile,

	// Mistral
	"mistral:mistral-large-3": mistralMistralLarge3Profile,
	"mistral:devstral-small": mistralDevstralSmallProfile,

	// Alibaba
	"alibaba:qwen3-max": alibabaQwen3MaxProfile,
	"alibaba:qwen3-coder-480b": alibabaQwen3Coder480bProfile,

	// Moonshot/Kimi
	"moonshotai:kimi-k2": moonshotaiKimiK2Profile,
	"moonshotai:kimi-k2-thinking": moonshotaiKimiK2ThinkingProfile,

	// MiniMax
	"minimax:minimax-m2": minimaxMinimaxM2Profile,
	"minimax:minimax-m2.1": minimaxMinimaxM21Profile,
	"minimax:minimax-m2.1-lightning": minimaxMinimaxM21LightningProfile,

	// Z.ai/GLM
	"zai:glm-4.6": zaiGlm46Profile,
	"zai:glm-4.7": zaiGlm47Profile,
	"zai:glm-4.6v-flash": zaiGlm46vFlashProfile,
	"zai:glm-4.5-air": zaiGlm45AirProfile,

	// DeepSeek
	"deepseek:deepseek-r1": deepseekDeepseekR1Profile,
	"deepseek:deepseek-v3.2": deepseekDeepseekV32Profile,
	"deepseek:deepseek-v3.2-thinking": deepseekDeepseekV32ThinkingProfile,

	// OpenRouter Free
	"openrouter:deepseek-r1-0528": openrouterDeepseekR10528Profile,
	"openrouter:devstral-2512": openrouterDevstral2512Profile,
	"openrouter:glm-4.5-air": openrouterGlm45AirProfile,
	"openrouter:qwen3-coder": openrouterQwen3CoderProfile,
	"openrouter:kimi-k2": openrouterKimiK2Profile,
	"openrouter:llama-3.3-70b": openrouterLlama3370bProfile,
	"openrouter:gemini-2.0-flash-exp": openrouterGemini20FlashExpProfile,
};

/**
 * Get a model profile by ID
 */
export function getModelProfile(modelId: string): ModelProfile | undefined {
	return MODEL_PROFILES[modelId];
}

/**
 * Get all model IDs that have profiles
 */
export function getProfiledModelIds(): string[] {
	return Object.keys(MODEL_PROFILES);
}

/**
 * Check if a model has a profile
 */
export function hasModelProfile(modelId: string): boolean {
	return modelId in MODEL_PROFILES;
}
