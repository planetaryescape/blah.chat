/**
 * CLI Authentication - credential storage and browser OAuth flow
 *
 * Flow:
 * 1. CLI starts local HTTP server on port 9876
 * 2. CLI opens browser to web app's /cli-login page
 * 3. User authenticates via Clerk
 * 4. Web app creates API key and redirects to CLI callback
 * 5. CLI stores API key for future use (keys never expire until revoked)
 */

import http from "node:http";
import { URL } from "node:url";
import Conf from "conf";
import open from "open";
import { getConfig } from "./config.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Credentials {
  apiKey: string; // The API key (blah_xxx...)
  keyPrefix: string; // First 12 chars for display (blah_abc1...)
  email: string;
  name: string;
  createdAt: number; // When the key was created
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const config = new Conf<{ credentials?: Credentials }>({
  projectName: "blah-chat",
  projectVersion: "1.0.0",
});

// Web app URL - resolved via config (env > user config > bundled default)
function getAppUrl(): string {
  return getConfig().appUrl;
}

// Local server config
const CALLBACK_PORT = 9876;
const CALLBACK_PATH = "/oauth/callback";

// ─────────────────────────────────────────────────────────────────────────────
// Credential Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get stored credentials.
 * Returns null if not logged in.
 * API keys don't expire - revocation is checked at validation time.
 */
export function getCredentials(): Credentials | null {
  const creds = config.get("credentials");
  if (!creds) return null;
  return creds;
}

/**
 * Save credentials to local storage.
 */
export function saveCredentials(credentials: Credentials): void {
  config.set("credentials", credentials);
}

/**
 * Clear stored credentials.
 */
export function clearCredentials(): void {
  config.delete("credentials");
}

/**
 * Get the path to the config file.
 */
export function getConfigPath(): string {
  return config.path;
}

/**
 * Check if user is logged in with valid credentials.
 */
export function isLoggedIn(): boolean {
  return getCredentials() !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth Flow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start browser OAuth flow.
 *
 * Opens browser to web app's /cli-login page, which:
 * 1. Authenticates user via Clerk
 * 2. Creates an API key
 * 3. Redirects to our local callback with the key
 */
export async function startOAuthFlow(): Promise<Credentials> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost:${CALLBACK_PORT}`);

      if (url.pathname !== CALLBACK_PATH) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      // Handle OAuth callback
      const apiKey = url.searchParams.get("api_key");
      const keyPrefix = url.searchParams.get("key_prefix");
      const email = url.searchParams.get("email");
      const name = url.searchParams.get("name");
      const error = url.searchParams.get("error");

      if (error) {
        sendErrorPage(res, error);
        server.close();
        reject(new Error(error));
        return;
      }

      if (!apiKey || !keyPrefix || !email) {
        sendErrorPage(res, "Missing required parameters");
        server.close();
        reject(new Error("Missing required parameters from callback"));
        return;
      }

      const credentials: Credentials = {
        apiKey,
        keyPrefix,
        email,
        name: name || email.split("@")[0],
        createdAt: Date.now(),
      };

      sendSuccessPage(res, credentials.name);
      server.close();
      resolve(credentials);
    });

    server.on("error", (err) => {
      reject(new Error(`Failed to start callback server: ${err.message}`));
    });

    server.listen(CALLBACK_PORT, () => {
      // Open browser to web app's CLI login page
      const callbackUrl = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;
      const loginUrl = `${getAppUrl()}/cli-login?callback=${encodeURIComponent(callbackUrl)}`;
      open(loginUrl);
    });

    // Timeout after 5 minutes
    const timeout = setTimeout(
      () => {
        server.close();
        reject(new Error("Authentication timed out after 5 minutes"));
      },
      5 * 60 * 1000,
    );

    // Clear timeout when done
    server.on("close", () => clearTimeout(timeout));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML Responses
// ─────────────────────────────────────────────────────────────────────────────

function sendSuccessPage(res: http.ServerResponse, name: string): void {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>blah.chat CLI - Authenticated</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #1a1625;
            color: #fafafa;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
          }
          .container {
            text-align: center;
            padding: 40px;
          }
          h1 { color: #F4E0DC; margin-bottom: 16px; }
          p { color: #a1a1aa; margin: 8px 0; }
          .name { color: #F4E0DC; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✓ Authentication Successful</h1>
          <p>Welcome, <span class="name">${escapeHtml(name)}</span>!</p>
          <p>You can close this window and return to the terminal.</p>
        </div>
        <script>setTimeout(() => window.close(), 3000);</script>
      </body>
    </html>
  `);
}

function sendErrorPage(res: http.ServerResponse, error: string): void {
  res.writeHead(400, { "Content-Type": "text/html" });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>blah.chat CLI - Error</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #1a1625;
            color: #fafafa;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
          }
          .container {
            text-align: center;
            padding: 40px;
          }
          h1 { color: #ef4444; margin-bottom: 16px; }
          p { color: #a1a1aa; margin: 8px 0; }
          .error { color: #ef4444; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✗ Authentication Failed</h1>
          <p class="error">${escapeHtml(error)}</p>
          <p>Please try again or contact support.</p>
        </div>
      </body>
    </html>
  `);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
