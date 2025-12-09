/**
 * AI Provider exports
 *
 * Each provider is a configured client for a specific AI service.
 * The gateway provider is the default and routes through Vercel AI Gateway.
 */

export { anthropic } from "./anthropic";
export { cerebras } from "./cerebras";
export { gateway } from "./gateway";
export { google } from "./google";
export { groq } from "./groq";
export { openai } from "./openai";
export { openrouter } from "./openrouter";

export type ProviderName =
  | "gateway"
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "cerebras"
  | "openrouter";
