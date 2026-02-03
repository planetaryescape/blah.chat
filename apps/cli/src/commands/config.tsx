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

export function runConfigCommand(
  subcommand: "show" | "set" | "reset" | "path",
  key?: string,
  value?: string,
) {
  switch (subcommand) {
    case "show":
      showConfig();
      break;
    case "set":
      setConfigValue(key!, value!);
      break;
    case "reset":
      doResetConfig();
      break;
    case "path":
      console.log(getConfigFilePath());
      break;
  }
}

function showConfig() {
  const config = getConfig();
  const stored = getStoredConfig();
  const customized = isConfigCustomized();

  console.log("CLI Configuration");
  console.log();

  const rows = [
    {
      label: "appUrl",
      value: config.appUrl,
      source: stored.appUrl
        ? "user"
        : process.env.BLAH_APP_URL
          ? "env"
          : "default",
    },
    {
      label: "convexUrl",
      value: config.convexUrl,
      source: stored.convexUrl
        ? "user"
        : process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL
          ? "env"
          : "default",
    },
    {
      label: "environment",
      value: config.environment,
      source: stored.environment ? "user" : "auto",
    },
  ];

  for (const row of rows) {
    console.log(
      `  ${row.label.padEnd(14)} ${row.value.padEnd(40)} [${row.source}]`,
    );
  }

  console.log();
  console.log(`  Config: ${getConfigFilePath()}`);

  if (!customized) {
    console.log();
    console.log(
      `  ${symbols.info} Using production defaults. Run 'blah config set' to customize.`,
    );
  }
}

function setConfigValue(key: string, value: string) {
  const validKeys: (keyof CLIConfig)[] = ["appUrl", "convexUrl", "environment"];
  if (!validKeys.includes(key as keyof CLIConfig)) {
    console.error(
      `${symbols.error} Invalid key: ${key}. Valid keys: ${validKeys.join(", ")}`,
    );
    process.exit(1);
  }

  if (key === "environment") {
    const validEnvs: Environment[] = ["production", "staging", "development"];
    if (!validEnvs.includes(value as Environment)) {
      console.error(
        `${symbols.error} Invalid environment: ${value}. Valid: ${validEnvs.join(", ")}`,
      );
      process.exit(1);
    }
  }

  setConfig({ [key]: value } as Partial<CLIConfig>);
  console.log(`${symbols.success} Set ${key} = ${value}`);
}

function doResetConfig() {
  resetConfig();
  console.log(`${symbols.success} Configuration reset to production defaults`);
}
