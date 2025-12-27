import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

// Types for E2B execution results
interface E2BResult {
  png?: string; // Base64 PNG data
  jpeg?: string;
  svg?: string;
  text?: string;
  [key: string]: any;
}

/**
 * API Route for code execution using E2B
 * This is outside Convex to avoid ESM/CommonJS bundling conflicts
 */
export async function POST(request: NextRequest) {
  // Check for internal Convex call header or verify user authentication
  const isInternalCall = request.headers.get("X-Convex-Internal") === "true";

  if (!isInternalCall) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { code, language, timeout = 30 } = await request.json();

    if (!code || !language) {
      return NextResponse.json(
        { error: "Missing required fields: code, language" },
        { status: 400 },
      );
    }

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
      const execution = await sandbox.runCode(code);
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

              console.log(
                "[CodeExecution] Uploading image, size:",
                uint8Array.length,
                "bytes",
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
                  },
                  body: uint8Array,
                },
              );

              if (storeResponse.ok) {
                const { url, storageId } = await storeResponse.json();
                console.log("[CodeExecution] Image stored successfully:", url);
                images.push({ url, storageId });
              } else {
                console.error(
                  "[CodeExecution] Failed to store image:",
                  await storeResponse.text(),
                );
              }
            } catch (imgError) {
              console.error("[CodeExecution] Image storage error:", imgError);
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
    console.error("[CodeExecution API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Execution failed",
      },
      { status: 500 },
    );
  }
}
