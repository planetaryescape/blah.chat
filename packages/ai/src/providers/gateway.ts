import { createGateway } from "@ai-sdk/gateway";

/** Vercel AI Gateway - routes to multiple inference hosts (Cerebras, Groq, etc.) */
export const vercel = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});
