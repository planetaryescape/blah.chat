import * as Sentry from "@sentry/nextjs";

function captureRegisterError(error: unknown) {
  Sentry.captureException(error);
}

function loadSentryConfig(config: Promise<unknown>) {
  return config.then(() => undefined, captureRegisterError);
}

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    return loadSentryConfig(import("./sentry.server.config"));
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    return loadSentryConfig(import("./sentry.edge.config"));
  }
}

export const onRequestError = Sentry.captureRequestError;
