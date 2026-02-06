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
      source: stored.convexUrl ? "user" : "default",
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

  if (key === "convexUrl") {
    validateConvexUrl(value);
  }

  setConfig({ [key]: value } as Partial<CLIConfig>);
  console.log(`${symbols.success} Set ${key} = ${value}`);
}

function validateConvexUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    console.error(
      `${symbols.error} Invalid convexUrl: must be a valid URL (for BYOD/custom deployments).`,
    );
    process.exit(1);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    console.error(
      `${symbols.error} Invalid convexUrl: protocol must be http or https.`,
    );
    process.exit(1);
  }

  if (!url.hostname.endsWith(".convex.cloud")) {
    console.error(
      `${symbols.error} Invalid convexUrl: must end with .convex.cloud (BYOD/custom deployment URL).`,
    );
    process.exit(1);
  }
}

function doResetConfig() {
  resetConfig();
  console.log(`${symbols.success} Configuration reset to production defaults`);
}
