import { createGateway } from "@ai-sdk/gateway";

export const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
});
