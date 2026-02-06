/**
 * Debug command to test CLI connectivity and configuration
 */

import { getCredentials } from "../lib/auth.js";
import { getApiKey, getClient, validateApiKey } from "../lib/client.js";
import { getConfig, getStoredConfig } from "../lib/config.js";
import { symbols } from "../lib/terminal.js";

export async function runDebugCommand() {
  console.log(`${symbols.info} blah.chat CLI Debug Info\n`);

  // 1. Show configuration
  console.log("Configuration:");
  const config = getConfig();
  const storedConfig = getStoredConfig();

  console.log(`  App URL: ${config.appUrl}`);
  console.log(`  Convex URL: ${config.convexUrl}`);
  console.log(`  Environment: ${config.environment}`);
  if (storedConfig.convexUrl) {
    console.log(`  ${symbols.info} Using custom Convex URL override`);
  }

  // Check for env overrides
  if (process.env.BLAH_APP_URL) {
    console.log(
      `  ${symbols.warning} App URL from env: ${process.env.BLAH_APP_URL}`,
    );
  }
  if (Object.keys(storedConfig).length > 0) {
    console.log(
      `  ${symbols.info} User overrides: ${JSON.stringify(storedConfig)}`,
    );
  }
  console.log();

  // 2. Check credentials
  console.log("Credentials:");
  const credentials = getCredentials();
  if (!credentials) {
    console.log(`  ${symbols.error} Not logged in`);
    return;
  }

  console.log(`  Name: ${credentials.name}`);
  console.log(`  Email: ${credentials.email}`);
  console.log(`  Key: ${credentials.keyPrefix}`);
  console.log(`  Created: ${new Date(credentials.createdAt).toLocaleString()}`);
  console.log();

  // 3. Test Convex connection
  console.log("Testing Convex connection...");
  const client = getClient();
  const apiKey = getApiKey();

  if (!client || !apiKey) {
    console.log(`  ${symbols.error} Failed to create client`);
    return;
  }

  try {
    console.log(`  Validating API key...`);
    const user = await validateApiKey();
    if (user) {
      console.log(`  ${symbols.success} Connection successful!`);
      console.log(`  User ID: ${user.userId}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
    } else {
      console.log(`  ${symbols.error} API key invalid or revoked`);
      console.log("  Run: blah login");
    }
  } catch (err) {
    console.log(`  ${symbols.error} Connection failed!`);
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  Error: ${message}`);

    // Provide troubleshooting hints
    console.log();
    console.log("Troubleshooting:");
    console.log("  1. Check your internet connection");
    console.log("  2. Verify the Convex URL is correct");
    console.log("  3. Try: blah config reset (if using custom config)");
    console.log("  4. Try: blah login (to refresh credentials)");
  }
}
