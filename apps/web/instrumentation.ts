import * as Sentry from "@sentry/nextjs";
import { initEdgeSentry } from "./sentry.edge.config";
import { initServerSentry } from "./sentry.server.config";

export function register() {
  try {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      initServerSentry();
    }

    if (process.env.NEXT_RUNTIME === "edge") {
      initEdgeSentry();
    }
  } catch (error) {
    Sentry.captureException(error);
  }
}

export const onRequestError = Sentry.captureRequestError;
