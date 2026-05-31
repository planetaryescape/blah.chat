import * as Sentry from "@sentry/nextjs";

function captureRegisterError(error: unknown): never {
  Sentry.captureException(error);
  throw error;
}

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    return import("./sentry.server.config")
      .then(() => undefined)
      .catch(captureRegisterError);
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    return import("./sentry.edge.config")
      .then(() => undefined)
      .catch(captureRegisterError);
  }
}

export const onRequestError = Sentry.captureRequestError;
