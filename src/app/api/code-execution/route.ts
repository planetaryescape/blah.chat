import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

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
        { status: 400 }
      );
    }

    // Check for E2B API key
    if (!process.env.E2B_API_KEY) {
      return NextResponse.json(
        { error: "E2B_API_KEY not configured" },
        { status: 500 }
      );
    }

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
      const resultValue = execution.text || execution.results;

      return NextResponse.json({
        success: true,
        language,
        code,
        stdout,
        stderr,
        result: resultValue,
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
      { status: 500 }
    );
  }
}
