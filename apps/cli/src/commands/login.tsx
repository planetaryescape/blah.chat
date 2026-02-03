import {
  getCredentials,
  saveCredentials,
  startOAuthFlow,
} from "../lib/auth.js";
import { symbols } from "../lib/terminal.js";

export async function runLoginCommand() {
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
