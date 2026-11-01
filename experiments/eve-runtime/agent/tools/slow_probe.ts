import { setTimeout } from "node:timers/promises";
import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Wait 30 seconds to exercise cancellation and crash recovery.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    await setTimeout(30_000, undefined, { signal: ctx.abortSignal });
    return { finished: true };
  },
});
