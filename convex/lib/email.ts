"use node";
import { Resend } from "@convex-dev/resend";
import { render } from "@react-email/render";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { ApiCreditsExhaustedEmail, BudgetWarningEmail } from "../emails";

export const resend = new Resend(components.resend, {
  testMode: false, // Set to true for testing with delivered@resend.dev
});

// Send budget warning email
export const sendBudgetAlert = internalAction({
  args: {
    percentUsed: v.number(),
    spent: v.number(),
    budget: v.number(),
    isExceeded: v.boolean(), // true = 100%, false = 80%
  },
  handler: async (ctx, args) => {
    const type = args.isExceeded ? "budget_exceeded" : "budget_80_percent";

    // Check rate limit
    const canSend = await ctx.runMutation(
      internal.lib.emailMutations.checkCanSend,
      { type },
    );
    if (!canSend) {
      console.log(`[Email] Skipping ${type} - sent within last hour`);
      return;
    }

    // Get admin email from settings
    const adminSettings = await ctx.runQuery(
      internal.adminSettings.getInternal,
      {},
    );
    const recipientEmail = adminSettings?.alertEmail || "blah.chat@bhekani.com";

    // Render email
    const html = await render(
      BudgetWarningEmail({
        percentUsed: args.percentUsed,
        spent: args.spent,
        budget: args.budget,
      }),
    );

    // Send via Resend
    await resend.sendEmail(ctx, {
      from: "blah.chat Alerts <alerts@blah.chat>",
      to: recipientEmail,
      subject: args.isExceeded
        ? "🚨 Budget Exceeded - Messages Blocked"
        : `⚠️ Budget Warning - ${args.percentUsed.toFixed(0)}% Used`,
      html,
    });

    // Record sent
    await ctx.runMutation(internal.lib.emailMutations.recordSent, {
      type,
      recipientEmail,
      metadata: {
        budgetAmount: args.budget,
        spentAmount: args.spent,
      },
    });

    console.log(`[Email] Sent ${type} to ${recipientEmail}`);
  },
});

// Send API credits exhausted email
export const sendApiCreditsAlert = internalAction({
  args: {
    errorMessage: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const type = "api_credits_exhausted";

    // Check rate limit
    const canSend = await ctx.runMutation(
      internal.lib.emailMutations.checkCanSend,
      { type },
    );
    if (!canSend) {
      console.log(`[Email] Skipping ${type} - sent within last hour`);
      return;
    }

    // Get admin email
    const adminSettings = await ctx.runQuery(
      internal.adminSettings.getInternal,
      {},
    );
    const recipientEmail = adminSettings?.alertEmail || "blah.chat@bhekani.com";

    // Render email
    const html = await render(
      ApiCreditsExhaustedEmail({
        errorMessage: args.errorMessage,
        modelId: args.modelId,
      }),
    );

    // Send via Resend
    await resend.sendEmail(ctx, {
      from: "blah.chat Alerts <alerts@blah.chat>",
      to: recipientEmail,
      subject: "🚨 API Credits Exhausted",
      html,
    });

    // Record sent
    await ctx.runMutation(internal.lib.emailMutations.recordSent, {
      type,
      recipientEmail,
      metadata: {
        errorMessage: args.errorMessage,
        modelId: args.modelId,
      },
    });

    console.log(`[Email] Sent ${type} to ${recipientEmail}`);
  },
});
