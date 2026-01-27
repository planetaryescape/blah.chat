import { api } from "@blah-chat/backend/convex/_generated/api";
import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedConvexClient } from "@/lib/api/convex";
import { withAuth } from "@/lib/api/middleware/auth";
import { withErrorHandling } from "@/lib/api/middleware/errors";
import logger from "@/lib/logger";

type AuthContext = {
  params: Promise<Record<string, string | string[]>>;
  userId: string;
  sessionToken: string;
};

/**
 * Handle OAuth callback from Composio
 * GET /api/composio/callback?connectionId=xxx
 *
 * Called after user completes OAuth in popup window.
 * Verifies connection and returns HTML that posts message to opener.
 */
async function getHandler(req: NextRequest, context: AuthContext) {
  const { userId, sessionToken } = context;
  const { searchParams } = new URL(req.url);

  // Log all params for debugging
  const allParams = Object.fromEntries(searchParams.entries());
  logger.info({ userId, params: allParams }, "Composio callback received");

  // Composio may use different parameter names
  const connectionId =
    searchParams.get("connectionId") ||
    searchParams.get("connectedAccountId") ||
    searchParams.get("connected_account_id") ||
    searchParams.get("id");

  if (!connectionId) {
    logger.warn(
      { userId, params: allParams },
      "Composio callback missing connectionId",
    );
    return new NextResponse(
      getCallbackHtml({ success: false, error: "Missing connection ID" }),
      { headers: { "Content-Type": "text/html" } },
    );
  }

  logger.info({ userId, connectionId }, "Processing Composio OAuth callback");

  try {
    const convex = getAuthenticatedConvexClient(sessionToken);

    // Verify the connection with Composio
    const result = (await (convex.action as any)(
      // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
      api.composio.oauth.verifyConnection,
      { composioConnectionId: connectionId },
    )) as { status: string; error?: string };

    if (result.status === "active") {
      logger.info({ userId, connectionId }, "Composio connection verified");
      return new NextResponse(
        getCallbackHtml({ success: true, connectionId }),
        { headers: { "Content-Type": "text/html" } },
      );
    }

    // Connection pending or failed
    logger.warn(
      { userId, connectionId, status: result.status, error: result.error },
      "Composio connection not active",
    );
    return new NextResponse(
      getCallbackHtml({
        success: false,
        error: result.error || `Connection status: ${result.status}`,
      }),
      { headers: { "Content-Type": "text/html" } },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Verification failed";
    logger.error(
      { userId, connectionId, error: errorMessage },
      "Composio callback error",
    );
    return new NextResponse(
      getCallbackHtml({ success: false, error: errorMessage }),
      {
        headers: { "Content-Type": "text/html" },
      },
    );
  }
}

/**
 * Generate HTML that posts result to parent window (for popup OAuth flow)
 */
function getCallbackHtml(result: {
  success: boolean;
  connectionId?: string;
  error?: string;
}): string {
  const message = JSON.stringify({
    type: "composio-oauth-callback",
    ...result,
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Connecting...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #0a0a0a;
      color: #fff;
    }
    .container {
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #333;
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .success { color: #22c55e; }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner" id="spinner"></div>
    <p id="status">Verifying connection...</p>
  </div>
  <script>
    const result = ${message};

    // Update UI
    document.getElementById('spinner').style.display = 'none';
    const status = document.getElementById('status');
    if (result.success) {
      status.textContent = 'Connected successfully!';
      status.className = 'success';
    } else {
      status.textContent = result.error || 'Connection failed';
      status.className = 'error';
    }

    // Post message to opener (popup flow)
    if (window.opener) {
      window.opener.postMessage(result, window.location.origin);
      setTimeout(() => window.close(), 1500);
    } else {
      // Redirect flow - go back to settings
      setTimeout(() => {
        window.location.href = '/settings?tab=integrations&status=' +
          (result.success ? 'connected' : 'error');
      }, 1500);
    }
  </script>
</body>
</html>
  `.trim();
}

export const GET = withErrorHandling(withAuth(getHandler));
export const dynamic = "force-dynamic";
