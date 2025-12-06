// Thinking effort levels
export type ThinkingEffort = "low" | "medium" | "high";

// Discriminated union - one type per provider
// TypeScript enforces which fields are valid for each type
export type ReasoningConfig =
	| {
			// OpenAI GPT-5 models (gpt-5.1, gpt-5-pro, gpt-5)
			type: "openai-reasoning-effort";
			effortMapping: Record<ThinkingEffort, string>;
			summaryLevel?: "brief" | "detailed";
			useResponsesAPI: boolean;
		}
	| {
			// Anthropic Claude models with extended thinking
			type: "anthropic-extended-thinking";
			budgetMapping: Record<ThinkingEffort, number>; // Token budgets
			betaHeader: string; // e.g., "interleaved-thinking-2025-05-14"
		}
	| {
			// Google Gemini 3 models (thinking level)
			type: "google-thinking-level";
			levelMapping: Record<ThinkingEffort, "low" | "medium" | "high">;
			includeThoughts: boolean;
		}
	| {
			// Google Gemini 2.5 models (thinking budget)
			type: "google-thinking-budget";
			budgetMapping: Record<ThinkingEffort, number>;
		}
	| {
			// DeepSeek models (tag extraction)
			type: "deepseek-tag-extraction";
			tagName: string; // e.g., "think"
			applyMiddleware: true; // Flag to apply wrapLanguageModel
		}
	| {
			// Generic provider (xAI, Perplexity, Groq, etc.)
			// Handles simple reasoning-effort parameters
			type: "generic-reasoning-effort";
			parameterName: string; // e.g., "reasoningEffort", "thinkingLevel"
		};

// Provider options output (type-safe)
// Used by handlers to construct API request options
export type ProviderOptions = {
	openai?: {
		reasoningEffort?: string;
		reasoningSummary?: "brief" | "detailed";
	};
	anthropic?: {
		thinking?: {
			type: "enabled";
			budgetTokens: number;
		};
	};
	google?: {
		thinkingConfig?: {
			thinkingLevel?: "low" | "medium" | "high";
			thinkingBudget?: number;
			includeThoughts?: boolean;
		};
	};
	xai?: {
		reasoningEffort?: string;
	};
	perplexity?: {
		reasoningMode?: string;
	};
	groq?: {
		reasoningLevel?: string;
	};
};

// Handler function signature
// Takes config + effort level, returns provider options + metadata
export type ReasoningHandler = (
	config: ReasoningConfig,
	effort: ThinkingEffort,
) => {
	providerOptions?: ProviderOptions;
	headers?: Record<string, string>;
	useResponsesAPI?: boolean;
	applyMiddleware?: (model: any) => any;
};
