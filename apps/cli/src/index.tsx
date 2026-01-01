#!/usr/bin/env node
/**
 * blah.chat CLI - Terminal UI client
 *
 * Usage:
 *   blah login    - Authenticate with blah.chat
 *   blah logout   - Clear credentials
 *   blah whoami   - Show current user
 *   blah config   - Manage CLI configuration
 *   blah chat     - View conversations and messages
 *   blah          - Show status
 */

import { program } from "commander";
import { render } from "ink";
import { ChatCommand } from "./commands/chat.js";
import {
  ConfigPathCommand,
  ConfigResetCommand,
  ConfigSetCommand,
  ConfigShowCommand,
} from "./commands/config.js";
import { LoginCommand } from "./commands/login.js";
import { LogoutCommand } from "./commands/logout.js";
import { WhoamiCommand } from "./commands/whoami.js";
import { getCredentials } from "./lib/auth.js";
import { symbols } from "./lib/terminal.js";

program
  .name("blah")
  .description("Terminal UI client for blah.chat")
  .version("0.1.0");

program
  .command("login")
  .description("Authenticate with blah.chat")
  .action(async () => {
    const { waitUntilExit } = render(<LoginCommand />);
    await waitUntilExit();
  });

program
  .command("logout")
  .description("Clear stored credentials")
  .action(async () => {
    const { waitUntilExit } = render(<LogoutCommand />);
    await waitUntilExit();
  });

program
  .command("whoami")
  .description("Show current user")
  .action(async () => {
    const { waitUntilExit } = render(<WhoamiCommand />);
    await waitUntilExit();
  });

program
  .command("chat")
  .description("View conversations and messages")
  .action(async () => {
    const { waitUntilExit } = render(<ChatCommand />);
    await waitUntilExit();
  });

// Config command with subcommands
const configCmd = program
  .command("config")
  .description("Manage CLI configuration");

configCmd
  .command("show", { isDefault: true })
  .description("Show current configuration")
  .action(async () => {
    const { waitUntilExit } = render(<ConfigShowCommand />);
    await waitUntilExit();
  });

configCmd
  .command("set <key> <value>")
  .description("Set a configuration value (appUrl, convexUrl, environment)")
  .action(async (key: string, value: string) => {
    const { waitUntilExit } = render(
      <ConfigSetCommand configKey={key} value={value} />,
    );
    await waitUntilExit();
  });

configCmd
  .command("reset")
  .description("Reset configuration to production defaults")
  .action(async () => {
    const { waitUntilExit } = render(<ConfigResetCommand />);
    await waitUntilExit();
  });

configCmd
  .command("path")
  .description("Show configuration file path")
  .action(async () => {
    const { waitUntilExit } = render(<ConfigPathCommand />);
    await waitUntilExit();
  });

// Default command (no subcommand) - show status or start chat
program.action(async () => {
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

program.parse();
