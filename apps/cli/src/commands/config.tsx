/**
 * Config Command - View and manage CLI configuration
 *
 * Usage:
 *   blah config              - Show current config
 *   blah config set <k> <v>  - Set a config value
 *   blah config reset        - Reset to production defaults
 *   blah config path         - Show config file path
 */

import { Box, Text, useApp } from "ink";
import React, { useEffect } from "react";
import {
  type CLIConfig,
  type Environment,
  getConfig,
  getConfigFilePath,
  getStoredConfig,
  isConfigCustomized,
  resetConfig,
  setConfig,
} from "../lib/config.js";
import { symbols } from "../lib/terminal.js";

// ─────────────────────────────────────────────────────────────────────────────
// Show Config Command
// ─────────────────────────────────────────────────────────────────────────────

export function ConfigShowCommand() {
  const { exit } = useApp();
  const config = getConfig();
  const stored = getStoredConfig();
  const customized = isConfigCustomized();

  useEffect(() => {
    setTimeout(() => exit(), 100);
  }, [exit]);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box marginBottom={1}>
        <Text bold>CLI Configuration</Text>
      </Box>

      <Box flexDirection="column">
        <ConfigRow
          label="appUrl"
          value={config.appUrl}
          isCustom={!!stored.appUrl}
          source={
            stored.appUrl
              ? "user"
              : process.env.BLAH_APP_URL
                ? "env"
                : "default"
          }
        />
        <ConfigRow
          label="convexUrl"
          value={config.convexUrl}
          isCustom={!!stored.convexUrl}
          source={
            stored.convexUrl
              ? "user"
              : process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL
                ? "env"
                : "default"
          }
        />
        <ConfigRow
          label="environment"
          value={config.environment}
          isCustom={!!stored.environment}
          source={stored.environment ? "user" : "auto"}
        />
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Config: {getConfigFilePath()}</Text>
      </Box>

      {!customized && (
        <Box marginTop={1}>
          <Text dimColor>
            {symbols.info} Using production defaults. Run{" "}
            <Text color="cyan">blah config set</Text> to customize.
          </Text>
        </Box>
      )}
    </Box>
  );
}

function ConfigRow({
  label,
  value,
  isCustom,
  source,
}: {
  label: string;
  value: string;
  isCustom: boolean;
  source: "user" | "env" | "default" | "auto";
}) {
  const sourceColors: Record<typeof source, string> = {
    user: "green",
    env: "yellow",
    default: "gray",
    auto: "magenta",
  };

  return (
    <Box>
      <Box width={14}>
        <Text dimColor>{label}:</Text>
      </Box>
      <Box flexGrow={1}>
        <Text>{value}</Text>
      </Box>
      <Box marginLeft={1}>
        <Text color={sourceColors[source]} dimColor>
          [{source}]
        </Text>
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Set Config Command
// ─────────────────────────────────────────────────────────────────────────────

interface ConfigSetProps {
  configKey: string;
  value: string;
}

export function ConfigSetCommand({ configKey, value }: ConfigSetProps) {
  const { exit } = useApp();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  useEffect(() => {
    // Validate key
    const validKeys: (keyof CLIConfig)[] = [
      "appUrl",
      "convexUrl",
      "environment",
    ];
    if (!validKeys.includes(configKey as keyof CLIConfig)) {
      setError(
        `Invalid key: ${configKey}. Valid keys: ${validKeys.join(", ")}`,
      );
      setTimeout(() => exit(), 100);
      return;
    }

    // Validate environment value
    if (configKey === "environment") {
      const validEnvs: Environment[] = ["production", "staging", "development"];
      if (!validEnvs.includes(value as Environment)) {
        setError(
          `Invalid environment: ${value}. Valid: ${validEnvs.join(", ")}`,
        );
        setTimeout(() => exit(), 100);
        return;
      }
    }

    // Set the value
    setConfig({ [configKey]: value } as Partial<CLIConfig>);
    setSuccess(true);
    setTimeout(() => exit(), 100);
  }, [configKey, value, exit]);

  if (error) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color="red">{symbols.error}</Text>
        <Text color="red"> {error}</Text>
      </Box>
    );
  }

  if (success) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text color="green">{symbols.success}</Text>
        <Text> Set </Text>
        <Text color="cyan">{configKey}</Text>
        <Text> = </Text>
        <Text bold>{value}</Text>
      </Box>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset Config Command
// ─────────────────────────────────────────────────────────────────────────────

export function ConfigResetCommand() {
  const { exit } = useApp();
  const [done, setDone] = React.useState(false);

  useEffect(() => {
    resetConfig();
    setDone(true);
    setTimeout(() => exit(), 100);
  }, [exit]);

  if (!done) return null;

  return (
    <Box paddingX={1} paddingY={1}>
      <Text color="green">{symbols.success}</Text>
      <Text> Configuration reset to production defaults</Text>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Show Path Command
// ─────────────────────────────────────────────────────────────────────────────

export function ConfigPathCommand() {
  const { exit } = useApp();

  useEffect(() => {
    setTimeout(() => exit(), 100);
  }, [exit]);

  return (
    <Box paddingX={1} paddingY={1}>
      <Text>{getConfigFilePath()}</Text>
    </Box>
  );
}
