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
    let credentials: Credentials | null = null;

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost:${CALLBACK_PORT}`);

      // Serve fragment extractor page - credentials are in the URL fragment
      // (fragments are never sent to server, so we serve JS to extract them)
      if (url.pathname === CALLBACK_PATH && req.method === "GET") {
        sendFragmentExtractorPage(res);
        return;
      }

      // Receive credentials via POST (from fragment extractor page)
      if (
        url.pathname === `${CALLBACK_PATH}/complete` &&
        req.method === "POST"
      ) {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const data = JSON.parse(body);
            const { api_key, key_prefix, email, name, error } = data;

            if (error) {
              sendErrorPage(res, error);
              server.close();
              reject(new Error(error));
              return;
            }

            if (!api_key || !key_prefix || !email) {
              sendErrorPage(res, "Missing required parameters");
              server.close();
              reject(new Error("Missing required parameters from callback"));
              return;
            }

            credentials = {
              apiKey: api_key,
              keyPrefix: key_prefix,
              email,
              name: name || email.split("@")[0],
              createdAt: Date.now(),
            };

            sendSuccessPage(res, credentials.name);
            server.close();
            resolve(credentials);
          } catch {
            sendErrorPage(res, "Invalid callback data");
            server.close();
            reject(new Error("Invalid callback data"));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end("Not found");
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

function sendFragmentExtractorPage(res: http.ServerResponse): void {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>blah.chat CLI - Authenticating</title>
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
          .container { text-align: center; padding: 40px; }
          h1 { color: #F4E0DC; margin-bottom: 16px; }
          p { color: #a1a1aa; margin: 8px 0; }
          .error h1 { color: #ef4444; }
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #333;
            border-top-color: #F4E0DC;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          .hidden { display: none; }
        </style>
      </head>
      <body>
        <div class="container" id="loading">
          <div class="spinner"></div>
          <h1>Completing authentication...</h1>
          <p>Please wait while we verify your credentials.</p>
        </div>
        <div class="container hidden" id="success">
          <h1>&#10003; Authentication Successful</h1>
          <p>Welcome, <span id="userName"></span>!</p>
          <p>You can close this window and return to the terminal.</p>
        </div>
        <div class="container error hidden" id="error">
          <h1>&#10007; Error</h1>
          <p id="errorMsg"></p>
        </div>
        <script>
          (function() {
            var loading = document.getElementById('loading');
            var success = document.getElementById('success');
            var error = document.getElementById('error');

            function showSuccess(name) {
              loading.classList.add('hidden');
              document.getElementById('userName').textContent = name;
              success.classList.remove('hidden');
              setTimeout(function() { window.close(); }, 3000);
            }

            function showError(msg) {
              loading.classList.add('hidden');
              document.getElementById('errorMsg').textContent = msg;
              error.classList.remove('hidden');
            }

            // Extract credentials from URL fragment (safer than query params)
            var fragment = window.location.hash.substring(1);
            var params = new URLSearchParams(fragment);
            var data = {
              api_key: params.get('api_key'),
              key_prefix: params.get('key_prefix'),
              email: params.get('email'),
              name: params.get('name')
            };

            // POST to complete endpoint
            fetch('/oauth/callback/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            }).then(function(response) {
              if (response.ok) {
                showSuccess(data.name || data.email || 'User');
              } else {
                throw new Error('Authentication failed');
              }
            }).catch(function(err) {
              showError(err.message);
            });
          })();
        </script>
      </body>
    </html>
  `);
}

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
