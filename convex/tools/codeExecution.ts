"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

/**
 * Code execution via Next.js API route
 * We proxy through Next.js because Convex's bundling has ESM/CommonJS conflicts with chalk
 */
export const executeCode = internalAction({
  args: {
    code: v.string(),
    language: v.union(v.literal("python"), v.literal("javascript")),
    timeout: v.optional(v.number()),
  },
  handler: async (_ctx, { code, language, timeout = 30 }) => {
    try {
      // Get the app URL from environment
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.CONVEX_SITE_URL;

      if (!appUrl) {
        throw new Error(
          "App URL not configured. Set NEXT_PUBLIC_APP_URL or CONVEX_SITE_URL environment variable."
        );
      }

      // Call the Next.js API route
      const response = await fetch(`${appUrl}/api/code-execution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Pass auth context - in production you'd want a service token
          "X-Convex-Internal": "true",
        },
        body: JSON.stringify({
          code,
          language,
          timeout: Math.min(timeout, 60),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API returned ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[CodeExecution] Error:", error);
      return {
        success: false,
        language,
        code,
        error:
          error instanceof Error
            ? error.message
            : "Failed to execute code",
      };
    }
  },
});
