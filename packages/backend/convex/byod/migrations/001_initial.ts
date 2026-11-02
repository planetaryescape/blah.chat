/**
 * Migration 001: Initial BYOD Schema
 *
 * This migration marks the initial deployment of BYOD schema.
 * The actual schema is deployed in Phase 3 (deployment pipeline).
 * This migration verifies the deployment was successful.
 */

import { logger } from "../../lib/logger";
import type { Migration } from "./index";

export const migration001: Migration = {
  id: "001_initial",
  version: 1,
  name: "Initial Schema",
  description: "Deploy initial BYOD schema with all content tables",

  up: async (ctx) => {
    logger.info("Verifying initial schema for user", {
      tag: "Migration001",
      userId: ctx.userId,
    });

    // Verify deployment by pinging the user's instance
    const response = await fetch(`${ctx.deploymentUrl}/api/run_function`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Convex ${ctx.deployKey}`,
      },
      body: JSON.stringify({
        path: "functions:ping",
        args: {},
        format: "json",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to verify deployment: ${error}`);
    }

    const result = (await response.json()) as {
      status: string;
      version?: number;
    };
    if (result.status !== "ok") {
      throw new Error(`Unexpected ping response: ${JSON.stringify(result)}`);
    }

    logger.info("Verified schema for user", {
      tag: "Migration001",
      version: result.version,
      userId: ctx.userId,
    });
  },

  down: async (_ctx) => {
    // Cannot rollback initial migration - this would mean removing all data
    throw new Error("Cannot rollback initial BYOD schema - data would be lost");
  },
};
