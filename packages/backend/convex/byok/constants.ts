/**
 * Shared constants for BYOK (Bring Your Own Key) functionality
 */

export type KeyType = "vercelGateway" | "openRouter" | "groq" | "deepgram";

/** Gateway type uses lowercase names (used in runtime gateway selection) */
export type GatewayType = "vercel" | "openrouter" | "groq" | "deepgram";

/** Number of supported key types */
export const KEY_TYPE_COUNT = 4;

/** Minimum length for API keys */
export const MIN_API_KEY_LENGTH = 10;

/** Maps key type to array index for IV/authTag storage */
export const KEY_INDEX: Record<KeyType, number> = {
  vercelGateway: 0,
  openRouter: 1,
  groq: 2,
  deepgram: 3,
};

/** Maps gateway type to array index (lowercase variant) */
export const GATEWAY_INDEX: Record<GatewayType, number> = {
  vercel: 0,
  openrouter: 1,
  groq: 2,
  deepgram: 3,
};

/** Maps key type to encrypted field name in database */
export const FIELD_MAP: Record<
  KeyType,
  | "encryptedVercelGatewayKey"
  | "encryptedOpenRouterKey"
  | "encryptedGroqKey"
  | "encryptedDeepgramKey"
> = {
  vercelGateway: "encryptedVercelGatewayKey",
  openRouter: "encryptedOpenRouterKey",
  groq: "encryptedGroqKey",
  deepgram: "encryptedDeepgramKey",
};

/** Maps gateway type to encrypted field name (lowercase variant) */
export const GATEWAY_FIELD_MAP: Record<
  GatewayType,
  | "encryptedVercelGatewayKey"
  | "encryptedOpenRouterKey"
  | "encryptedGroqKey"
  | "encryptedDeepgramKey"
> = {
  vercel: "encryptedVercelGatewayKey",
  openrouter: "encryptedOpenRouterKey",
  groq: "encryptedGroqKey",
  deepgram: "encryptedDeepgramKey",
};

/** Human-readable provider names for error messages */
export const PROVIDER_NAMES: Record<KeyType, string> = {
  vercelGateway: "Vercel AI Gateway",
  openRouter: "OpenRouter",
  groq: "Groq",
  deepgram: "Deepgram",
};

/** Creates empty IV/authTag parts array */
export const createEmptyParts = (): string[] => Array(KEY_TYPE_COUNT).fill("");

/** Parse colon-separated parts or return empty array */
export const parseParts = (str: string | undefined): string[] =>
  str?.split(":") || createEmptyParts();
