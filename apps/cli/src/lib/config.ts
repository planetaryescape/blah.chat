/**
 * CLI Configuration Management
 *
 * Hierarchical config priority (highest wins):
 * 1. Environment variables (BLAH_APP_URL, CONVEX_URL)
 * 2. User config file (~/.config/blah-chat/config.json)
 * 3. Bundled production defaults
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import Conf from "conf";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Environment = "production" | "staging" | "development";

export interface CLIConfig {
  appUrl: string; // Web app URL for OAuth
  convexUrl: string; // Convex deployment URL
  environment: Environment;
}

// ─────────────────────────────────────────────────────────────────────────────
// Production Defaults (bundled at build time)
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTION_DEFAULTS: CLIConfig = {
  appUrl: "https://blah.chat",
  convexUrl: "https://intent-coyote-706.convex.cloud",
  environment: "production",
};

// ─────────────────────────────────────────────────────────────────────────────
// Config Store
// ─────────────────────────────────────────────────────────────────────────────

const configStore = new Conf<Partial<CLIConfig>>({
  projectName: "blah-chat",
  projectVersion: "1.0.0",
  configName: "config", // Uses ~/.config/blah-chat/config.json
  defaults: {},
});

// ─────────────────────────────────────────────────────────────────────────────
// Environment Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-detect if running in development mode.
 * Checks for monorepo markers (turbo.json) in current or parent dirs.
 */
function detectDevelopmentMode(): boolean {
  // Check current directory up to 5 levels for turbo.json
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "turbo.json"))) {
      return true;
    }
    const parent = join(dir, "..");
    if (parent === dir) break; // Hit root
    dir = parent;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get resolved configuration with priority:
 * 1. Env vars (highest)
 * 2. User config file
 * 3. Bundled defaults (lowest)
 */
export function getConfig(): CLIConfig {
  // Environment variables (highest priority)
  const envAppUrl = process.env.BLAH_APP_URL;
  const envConvexUrl =
    process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;

  // User config file
  const stored = configStore.store;

  // Auto-detect environment if not set
  const storedEnv = stored.environment;
  const autoEnv = detectDevelopmentMode() ? "development" : "production";
  const environment = storedEnv || autoEnv;

  // Merge with priority: env > stored > defaults
  return {
    appUrl: envAppUrl || stored.appUrl || PRODUCTION_DEFAULTS.appUrl,
    convexUrl:
      envConvexUrl || stored.convexUrl || PRODUCTION_DEFAULTS.convexUrl,
    environment,
  };
}

/**
 * Get a specific config value.
 */
export function getConfigValue<K extends keyof CLIConfig>(
  key: K,
): CLIConfig[K] {
  return getConfig()[key];
}

/**
 * Set one or more config values.
 * Only updates provided keys, preserves others.
 */
export function setConfig(updates: Partial<CLIConfig>): void {
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      configStore.set(key as keyof CLIConfig, value);
    }
  }
}

/**
 * Reset config to production defaults.
 * Clears all user-set values.
 */
export function resetConfig(): void {
  configStore.clear();
}

/**
 * Get path to the config file.
 */
export function getConfigFilePath(): string {
  return configStore.path;
}

/**
 * Check if config has been customized from defaults.
 */
export function isConfigCustomized(): boolean {
  return Object.keys(configStore.store).length > 0;
}

/**
 * Get raw stored config (without defaults or env).
 * Useful for showing what user has explicitly set.
 */
export function getStoredConfig(): Partial<CLIConfig> {
  return { ...configStore.store };
}
