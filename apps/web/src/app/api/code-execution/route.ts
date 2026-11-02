import {
  hasInternalAuthorization,
  internalAuthorization,
} from "@blah-chat/backend/convex/lib/internalAuth";
import { readBoundedBody } from "@blah-chat/backend/convex/lib/ownedUploads";
import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import logger from "@/lib/logger";

const executionInput = z.object({
  code: z
    .string()
    .max(100_000)
    .refine((code) => code.trim().length > 0),
  language: z.enum(["python", "javascript"]),
  timeout: z.number().finite().min(1).max(60).default(30),
});

// Types for E2B execution results
interface E2BResult {
  png?: string; // Base64 PNG data
  jpeg?: string;
  svg?: string;
  text?: string;
}

/**
 * API Route for code execution using E2B
 * This is outside Convex to avoid ESM/CommonJS bundling conflicts
 */
export async function POST(request: NextRequest) {
  // A boolean internal-call header is never an authentication credential.
  const isInternalCall = await hasInternalAuthorization(request.headers);

  if (!isInternalCall) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    let input: unknown;
    try {
      input = JSON.parse(
        new TextDecoder().decode(await readBoundedBody(request, 128 * 1024)),
      );
    } catch {
      return NextResponse.json(
        { error: "Invalid or oversized JSON body" },
        { status: 400 },
      );
    }
    const parsed = executionInput.safeParse(input);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid code, language or timeout" },
        { status: 400 },
      );
    }
    const { code, language, timeout } = parsed.data;

    // Check for E2B API key
    if (!process.env.E2B_API_KEY) {
      return NextResponse.json(
        { error: "E2B_API_KEY not configured" },
        { status: 500 },
      );
    }

    // Get Convex site URL for storing images
    const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
      ".cloud",
      ".site",
    );

    // Dynamic import E2B (works correctly in Next.js runtime)
    const { Sandbox } = await import("@e2b/code-interpreter");

    // Create sandbox
    const sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: Math.min(timeout, 60) * 1000,
    });

    try {
      const startTime = Date.now();
      const execution = await sandbox.runCode(code, {
        language,
        timeoutMs: timeout * 1000,
      });
      const executionTime = Date.now() - startTime;

      const stdout = execution.logs.stdout.join("\n");
      const stderr = execution.logs.stderr.join("\n");

      // Process results and extract images
      const images: Array<{ url: string; storageId: string }> = [];
      let textResult = execution.text;

      // E2B returns results array with display outputs (including plots)
      if (execution.results && Array.isArray(execution.results)) {
        for (const result of execution.results as E2BResult[]) {
          // Check for PNG image (matplotlib plots)
          if (result.png && convexSiteUrl) {
            try {
              // Decode base64 to binary
              const imageBuffer = Buffer.from(result.png, "base64");

              // Convert to Uint8Array for proper fetch body handling
              const uint8Array = new Uint8Array(imageBuffer);

              logger.info(
                { bytes: uint8Array.length },
                "Uploading execution image",
              );

              // Store in Convex
              const storeResponse = await fetch(
                `${convexSiteUrl}/store-code-execution-image`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "image/png",
                    "Content-Length": uint8Array.length.toString(),
                    "X-Convex-Internal": "true",
                    Authorization: internalAuthorization(),
                  },
                  body: uint8Array,
                },
              );

              if (storeResponse.ok) {
                const { url, storageId } = await storeResponse.json();
                logger.info("Execution image stored");
                images.push({ url, storageId });
              } else {
                logger.error(
                  { status: storeResponse.status },
                  "Execution image storage failed",
                );
              }
            } catch (imgError) {
              logger.error({ err: imgError }, "Execution image storage failed");
            }
          }

          // Collect text results
          if (result.text && !textResult) {
            textResult = result.text;
          }
        }
      }

      return NextResponse.json({
        success: true,
        language,
        code,
        stdout,
        stderr,
        result: textResult,
        images, // Array of { url, storageId }
        executionTime,
      });
    } finally {
      await sandbox.kill();
    }
  } catch (error) {
    logger.error({ err: error }, "Code execution failed");
    return NextResponse.json(
      {
        success: false,
        error: "Execution failed",
      },
      { status: 500 },
    );
  }
}
