import { clearCredentials, getCredentials } from "../lib/auth.js";
import { clearClient } from "../lib/client.js";
import { symbols } from "../lib/terminal.js";

export function runLogoutCommand() {
  const existing = getCredentials();

  if (existing) {
    clearCredentials();
    clearClient();
    console.log(`${symbols.success} Logged out successfully`);
  } else {
    console.log("Not logged in");
  }
}
