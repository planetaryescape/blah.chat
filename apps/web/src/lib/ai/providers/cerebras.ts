import { createCerebras } from "@ai-sdk/cerebras";

export const cerebras = createCerebras({
  apiKey: process.env.CEREBRAS_API_KEY ?? "",
});
