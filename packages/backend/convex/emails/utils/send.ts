"use node";
import { Resend } from "@convex-dev/resend";
import { render } from "@react-email/render";
import { v } from "convex/values";
import { components, internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { logger } from "../../lib/logger";
import {
  ApiCreditsExhaustedEmail,
  BudgetWarningEmail,
  BYODUpdateRequiredEmail,
  FeedbackNotificationEmail,
} from "../templates";

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
      internal.emails.utils.mutations.checkCanSend,
      { type },
    );
    if (!canSend) {
      logger.info("Skipping email - sent within last hour", {
        tag: "Email",
        type,
      });
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
    await ctx.runMutation(internal.emails.utils.mutations.recordSent, {
      type,
      recipientEmail,
      metadata: {
        budgetAmount: args.budget,
        spentAmount: args.spent,
      },
    });

    logger.info("Sent email", { tag: "Email", type, recipientEmail });
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
      internal.emails.utils.mutations.checkCanSend,
      { type },
    );
    if (!canSend) {
      logger.info("Skipping email - sent within last hour", {
        tag: "Email",
        type,
      });
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
    await ctx.runMutation(internal.emails.utils.mutations.recordSent, {
      type,
      recipientEmail,
      metadata: {
        errorMessage: args.errorMessage,
        modelId: args.modelId,
      },
    });

    logger.info("Sent email", { tag: "Email", type, recipientEmail });
  },
});

// Helper functions for feedback emails
function getPriorityEmoji(priority: string): string {
  const map: Record<string, string> = {
    critical: "🚨",
    high: "⚠️",
    medium: "📌",
    low: "💬",
    none: "📝",
  };
  return map[priority] || "📝";
}

function getTypeEmoji(type: string): string {
  const map: Record<string, string> = {
    bug: "🐛",
    feature: "💡",
    praise: "⭐",
    other: "💬",
  };
  return map[type] || "💬";
}

// Send feedback notification email
export const sendFeedbackNotification = internalAction({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, args) => {
    // Get feedback details
    const feedback = await (
      ctx.runQuery as (ref: any, args: any) => Promise<any>
    )(internal.lib.helpers.getFeedback, {
      feedbackId: args.feedbackId,
    });

    if (!feedback) {
      logger.error("Feedback not found", {
        tag: "Email",
        feedbackId: args.feedbackId,
      });
      return;
    }

    // Get screenshot URL if exists
    let screenshotUrl: string | null = null;
    if (feedback.screenshotStorageId) {
      try {
        screenshotUrl = await ctx.storage.getUrl(feedback.screenshotStorageId);
      } catch (error) {
        logger.warn("Screenshot URL fetch failed", {
          tag: "Email",
          feedbackId: args.feedbackId,
          error: String(error),
        });
        // Continue without screenshot
      }
    }

    // Get admin email from settings
    const adminSettings = await ctx.runQuery(
      internal.adminSettings.getInternal,
      {},
    );
    const recipientEmail = adminSettings?.alertEmail || "blah.chat@bhekani.com";

    // Generate email subject with priority and type emojis
    const priorityEmoji = getPriorityEmoji(
      feedback.aiTriage?.suggestedPriority || feedback.priority || "none",
    );
    const typeEmoji = getTypeEmoji(feedback.feedbackType);
    const subject = `${typeEmoji} ${priorityEmoji} New Feedback: ${feedback.feedbackType} - ${feedback.userName}`;

    // Render email
    const html = await render(
      FeedbackNotificationEmail({
        feedback,
        screenshotUrl,
      }),
    );

    try {
      // Send via Resend (NO rate limiting - send every time)
      await resend.sendEmail(ctx, {
        from: "blah.chat Feedback <feedback@blah.chat>",
        to: recipientEmail,
        subject,
        html,
      });

      logger.info("Sent feedback notification", {
        tag: "Email",
        feedbackId: args.feedbackId,
        recipientEmail,
      });
    } catch (error) {
      logger.error("Feedback notification failed", {
        tag: "Email",
        feedbackId: args.feedbackId,
        error: String(error),
      });
      // Don't throw - feedback is already saved, email is best-effort
    }
  },
});

// Send BYOD update required email
export const sendBYODUpdateNotification = internalAction({
  args: {
    userId: v.id("users"),
    userEmail: v.string(),
    currentVersion: v.number(),
    latestVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const type = `byod_update_${args.latestVersion}`;

    // Check rate limit - one email per version update per user
    const canSend = await ctx.runMutation(
      internal.emails.utils.mutations.checkCanSendToUser,
      { type, userId: args.userId },
    );
    if (!canSend) {
      logger.info("Skipping email - already sent", {
        tag: "Email",
        type,
        userId: args.userId,
      });
      return;
    }

    // Render email
    const html = await render(
      BYODUpdateRequiredEmail({
        currentVersion: args.currentVersion,
        latestVersion: args.latestVersion,
      }),
    );

    try {
      // Send via Resend
      await resend.sendEmail(ctx, {
        from: "blah.chat <updates@blah.chat>",
        to: args.userEmail,
        subject: `🔄 Database Update Available (v${args.latestVersion})`,
        html,
      });

      // Record sent
      await ctx.runMutation(internal.emails.utils.mutations.recordSent, {
        type,
        recipientEmail: args.userEmail,
        metadata: {
          userId: args.userId,
          currentVersion: args.currentVersion,
          latestVersion: args.latestVersion,
        },
      });

      logger.info("Sent BYOD update notification", {
        tag: "Email",
        userEmail: args.userEmail,
        currentVersion: args.currentVersion,
        latestVersion: args.latestVersion,
      });
    } catch (error) {
      logger.error("BYOD update notification failed", {
        tag: "Email",
        userId: args.userId,
        error: String(error),
      });
    }
  },
});
