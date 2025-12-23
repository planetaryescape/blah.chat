/**
 * AI Gateway/SDK exports
 *
 * Each export is a configured client for routing AI requests.
 * "vercel" is the default and routes through Vercel AI Gateway.
 */

export { anthropic } from "./anthropic";
export { cerebras } from "./cerebras";
export { vercel } from "./gateway";
export { google } from "./google";
export { groq } from "./groq";
export { openai } from "./openai";
export { openrouter } from "./openrouter";

/** Gateway/SDK for routing requests (Vercel AI Gateway, OpenRouter, or direct SDK) */
export type GatewayName =
  | "vercel"
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "cerebras"
  | "openrouter";
