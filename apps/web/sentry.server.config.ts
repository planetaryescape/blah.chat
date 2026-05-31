import * as Sentry from "@sentry/nextjs";
import { parseSentryTraceSampleRate } from "./sentry.shared";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const tracesSampleRate = parseSentryTraceSampleRate(
  process.env.SENTRY_TRACES_SAMPLE_RATE,
  process.env.NODE_ENV === "production" ? 0.05 : 1,
);

export function initServerSentry() {
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate,
  });
}
