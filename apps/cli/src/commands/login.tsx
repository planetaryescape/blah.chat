import {
  type Credentials,
  getCredentials,
  saveCredentials,
  startOAuthFlow,
} from "../lib/auth.js";
import { symbols } from "../lib/terminal.js";

interface LoginOptions {
  apiKey?: string;
}

export async function runLoginCommand(options: LoginOptions = {}) {
  // Handle --api-key option
  if (options.apiKey) {
    return handleApiKeyLogin(options.apiKey);
  }

  // Check if already logged in
  const existing = getCredentials();
  if (existing) {
    console.log(`${symbols.success} Already logged in as ${existing.name}`);
    return;
  }

  console.log(`${symbols.info} Opening browser for authentication...`);
  console.log("  Complete login in your browser. Times out in 5 minutes.");

  try {
    const credentials = await startOAuthFlow();
    saveCredentials(credentials);
    console.log(`${symbols.success} Logged in as ${credentials.name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`${symbols.error} Login failed: ${message}`);
    console.log("  Try again with: blah login");
    process.exit(1);
  }
}

async function handleApiKeyLogin(apiKey: string) {
  // Validate API key format
  if (!apiKey.startsWith("blah_")) {
    console.error(`${symbols.error} Invalid API key format`);
    console.log("  API keys start with 'blah_'");
    process.exit(1);
  }

  // Create credentials from API key
  const credentials: Credentials = {
    apiKey,
    keyPrefix: `${apiKey.substring(0, 12)}...`,
    email: "api-key-user",
    name: "API Key User",
    createdAt: Date.now(),
  };

  saveCredentials(credentials);
  console.log(
    `${symbols.success} Logged in with API key (${credentials.keyPrefix})`,
  );
  console.log(`${symbols.info} Run 'blah whoami' to verify your identity`);
}
