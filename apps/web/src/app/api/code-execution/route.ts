import {
  buildCodeExecutionObjectKey,
  uploadObject,
} from "@blah-chat/persistence-postgres";
import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import {
  getPersistenceEnv,
  getPersistenceR2Client,
} from "@/lib/persistence/storage";

// Types for E2B execution results
interface E2BResult {
  png?: string; // Base64 PNG data
  jpeg?: string;
  svg?: string;
  text?: string;
  [key: string]: any;
}

function buildFileAccessUrl(storageId: string) {
  return `/api/v1/files/${storageId
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function getImagePayload(result: E2BResult) {
  if (result.png) {
    return {
      bytes: Buffer.from(result.png, "base64"),
      contentType: "image/png",
      fileName: "plot.png",
    };
  }

  if (result.jpeg) {
    return {
      bytes: Buffer.from(result.jpeg, "base64"),
      contentType: "image/jpeg",
      fileName: "plot.jpg",
    };
  }

  if (result.svg) {
    return {
      bytes: Buffer.from(result.svg),
      contentType: "image/svg+xml",
      fileName: "plot.svg",
    };
  }

  return null;
}

/**
 * API Route for code execution using E2B
 * Standalone route to avoid ESM/CommonJS bundling conflicts
 */
export async function POST(request: NextRequest) {
  // Check for internal call header or verify user authentication
  const isInternalCall = request.headers.get("X-Internal-Call") === "true";
  let authenticatedUserId: string | null = null;

  if (!isInternalCall) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    authenticatedUserId = userId;
  }

  try {
    const {
      code,
      language,
      timeout = 30,
      userId: requestUserId,
      conversationId,
    } = await request.json();

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

    const effectiveUserId = isInternalCall
      ? requestUserId
      : authenticatedUserId;
    const persistenceEnv = getPersistenceEnv();
    const r2 = getPersistenceR2Client();

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
          const imagePayload = getImagePayload(result);
          if (imagePayload && effectiveUserId && conversationId) {
            try {
              const storageId = buildCodeExecutionObjectKey({
                userId: effectiveUserId,
                conversationId,
                fileName: imagePayload.fileName,
              });

              await uploadObject({
                client: r2,
                bucket: persistenceEnv.r2.bucket,
                key: storageId,
                body: new Uint8Array(imagePayload.bytes),
                contentType: imagePayload.contentType,
                cacheControl: "private, max-age=31536000, immutable",
              });

              images.push({
                storageId,
                url: buildFileAccessUrl(storageId),
              });
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
