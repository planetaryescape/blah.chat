import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

export default defineTool({
  description: "Record a trial decision in the session sandbox after approval.",
  inputSchema: z.object({
    operationId: z.string().regex(/^[a-z0-9-]+$/),
    decision: z.string().min(1).max(500),
  }),
  approval: always(),
  async execute(input, ctx) {
    const sandbox = await ctx.getSandbox();
    const path = `/workspace/${input.operationId}.json`;
    // Trial-only stable operation ID. Production needs a DB uniqueness constraint.
    if ((await sandbox.readTextFile({ path })) !== null) {
      return { recorded: false, duplicate: true, path };
    }
    await sandbox.writeTextFile({ path, content: JSON.stringify(input) });
    return { recorded: true, duplicate: false, path };
  },
});
