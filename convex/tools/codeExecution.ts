"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const executeCode = internalAction({
	args: {
		code: v.string(),
		language: v.union(v.literal("python"), v.literal("javascript")),
		timeout: v.optional(v.number()),
	},
	handler: async (ctx, { code, language, timeout = 30 }) => {
		try {
			// Ensure E2B API key is configured
			if (!process.env.E2B_API_KEY) {
				throw new Error(
					"E2B_API_KEY not configured. Please add it to your environment variables.",
				);
			}

			// Dynamic import for E2B
			const { Sandbox } = await import("@e2b/code-interpreter");

			// Create sandbox with timeout
			const sandbox = await Sandbox.create({
				apiKey: process.env.E2B_API_KEY,
				timeoutMs: timeout * 1000,
			});

			try {
				// Track execution start
				const startTime = Date.now();

				// Execute code (logs are collected automatically)
				const execution = await sandbox.runCode(code);

				const executionTime = Date.now() - startTime;

				// Extract results from execution object
				const stdout = execution.logs.stdout.join("\n");
				const stderr = execution.logs.stderr.join("\n");
				const resultValue = execution.text || execution.results;

				return {
					success: true,
					language,
					code,
					stdout,
					stderr,
					result: resultValue,
					executionTime,
				};
			} finally {
				// Always kill sandbox to prevent resource leaks
				await sandbox.kill();
			}
		} catch (error) {
			return {
				success: false,
				language,
				code,
				error:
					error instanceof Error
						? error.message
						: "Failed to execute code in sandbox",
			};
		}
	},
});
