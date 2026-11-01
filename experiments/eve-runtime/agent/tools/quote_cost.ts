import { defineTool } from "eve/tools";
import { z } from "zod";
import { calculateCost } from "../../../../packages/ai/src/utils.ts";
import { trialModel } from "../../lib/model.ts";

export default defineTool({
  description:
    "Quote model token cost using blah.chat's existing pricing code.",
  inputSchema: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  }),
  execute(input) {
    const model = trialModel();
    return { modelId: model.id, costUsd: calculateCost(model.id, input) };
  },
});
