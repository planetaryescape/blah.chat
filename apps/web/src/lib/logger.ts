import pino from "pino";

const REDACTED_PATHS = [
  "*.gatewayKey",
  "*.openRouterKey",
  "*.groqKey",
  "*.deepgramKey",
  "*.byokGatewayKey",
  "*.connectionString",
  "*.encryptedConnectionString",
  "*.encryptedVercelGatewayKey",
  "*.encryptedOpenRouterKey",
  "*.encryptedGroqKey",
  "*.encryptedDeepgramKey",
  "*.apiKey",
  "*.secret",
  "*.authorization",
  "*.Authorization",
];

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: REDACTED_PATHS,
    censor: "[REDACTED]",
  },
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  }),
});

export default logger;
