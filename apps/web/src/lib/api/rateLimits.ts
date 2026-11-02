import type { ApiRateLimitOperation } from "@blah-chat/backend/convex/apiRateLimits";
import type { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { ApiError } from "./errors";

const consume = makeFunctionReference<
  "mutation",
  { operation: ApiRateLimitOperation },
  { allowed: boolean }
>("apiRateLimits:consume");

export async function consumeApiRateLimit(
  client: ConvexHttpClient,
  operation: ApiRateLimitOperation,
): Promise<void> {
  const result = await client.mutation(consume, { operation });
  if (!result.allowed) {
    throw new ApiError(429, "Rate limit exceeded", "RATE_LIMIT_EXCEEDED");
  }
}
