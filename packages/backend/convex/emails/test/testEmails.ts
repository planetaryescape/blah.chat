import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

export const testBudgetEmail = internalAction({
  handler: async (ctx) => {
    // @ts-ignore
    await ctx.runAction(internal.emails.utils.send.sendBudgetAlert, {
      percentUsed: 85,
      spent: 8.5,
      budget: 10,
      isExceeded: false,
    });
  },
});

export const testCreditsEmail = internalAction({
  handler: async (ctx) => {
    await ctx.runAction(internal.emails.utils.send.sendApiCreditsAlert, {
      errorMessage: "Insufficient credits: your account balance is $0.00",
      modelId: "openai:gpt-oss-20b",
    });
  },
});
