#!/usr/bin/env node
import { program } from "commander";
import { runChatCommand } from "./commands/chat.js";
import { runConfigCommand } from "./commands/config.js";
import { runDebugCommand } from "./commands/debug.js";
import { runLoginCommand } from "./commands/login.js";
import { runLogoutCommand } from "./commands/logout.js";
import { runWhoamiCommand } from "./commands/whoami.js";
import { getCredentials } from "./lib/auth.js";
import { symbols } from "./lib/terminal.js";

program
  .name("blah")
  .description("Terminal UI client for blah.chat")
  .version("0.1.0");

program
  .command("login")
  .description("Authenticate with blah.chat")
  .option("-k, --api-key <key>", "Login with API key instead of browser")
  .action(runLoginCommand);

program
  .command("logout")
  .description("Clear stored credentials")
  .action(runLogoutCommand);

program
  .command("whoami")
  .description("Show current user")
  .action(runWhoamiCommand);

program
  .command("chat")
  .description("View conversations and messages")
  .action(runChatCommand);

const configCmd = program
  .command("config")
  .description("Manage CLI configuration");

configCmd
  .command("show", { isDefault: true })
  .description("Show current configuration")
  .action(() => runConfigCommand("show"));

configCmd
  .command("set <key> <value>")
  .description(
    "Set a configuration value (appUrl, convexUrl for BYOD/custom deployment, environment)",
  )
  .action((key: string, value: string) => runConfigCommand("set", key, value));

configCmd
  .command("reset")
  .description("Reset configuration to production defaults")
  .action(() => runConfigCommand("reset"));

configCmd
  .command("path")
  .description("Show configuration file path")
  .action(() => runConfigCommand("path"));

program
  .command("debug")
  .description("Debug CLI connectivity and configuration")
  .action(runDebugCommand);

// Default command - show status
program.action(() => {
  const credentials = getCredentials();

  if (!credentials) {
    console.log(`${symbols.info} blah.chat CLI v0.1.0`);
    console.log();
    console.log(`${symbols.warning} Not logged in`);
    console.log();
    console.log("Commands:");
    console.log(
      `  ${symbols.chevronRight} blah login   - Authenticate with blah.chat`,
    );
    console.log(`  ${symbols.chevronRight} blah logout  - Clear credentials`);
    console.log(`  ${symbols.chevronRight} blah whoami  - Show current user`);
    console.log(`  ${symbols.chevronRight} blah chat    - View conversations`);
    console.log(
      `  ${symbols.chevronRight} blah config  - Manage configuration`,
    );
    return;
  }

  console.log(`${symbols.info} blah.chat CLI v0.1.0`);
  console.log();
  console.log(`${symbols.success} Logged in as ${credentials.name}`);
  console.log();
  console.log("Commands:");
  console.log(`  ${symbols.chevronRight} blah chat    - View conversations`);
  console.log(`  ${symbols.chevronRight} blah login   - Re-authenticate`);
  console.log(`  ${symbols.chevronRight} blah logout  - Clear credentials`);
  console.log(`  ${symbols.chevronRight} blah whoami  - Show current user`);
  console.log(`  ${symbols.chevronRight} blah config  - Manage configuration`);
});

program.parseAsync();
