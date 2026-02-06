import { getConfigPath, getCredentials } from "../lib/auth.js";
import { formatRelativeTime, symbols } from "../lib/terminal.js";

export function runWhoamiCommand() {
  const credentials = getCredentials();

  if (!credentials) {
    console.log(`${symbols.warning} Not logged in`);
    console.log("  Run: blah login");
    return;
  }

  const createdAt = formatRelativeTime(credentials.createdAt);

  console.log(`${symbols.success} Logged in`);
  console.log();
  console.log(`  User:    ${credentials.name}`);
  console.log(`  Email:   ${credentials.email}`);
  console.log(`  API Key: ${credentials.keyPrefix}`);
  console.log(`  Created: ${createdAt}`);
  console.log();
  console.log(`  Config:  ${getConfigPath()}`);
}
