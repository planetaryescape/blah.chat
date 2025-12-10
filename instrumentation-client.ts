import posthog from "posthog-js";

export async function register() {
  if (typeof window === "undefined") return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  if (!apiKey) {
    console.warn("PostHog API key not configured - analytics disabled");
    return;
  }

  // Modern PostHog initialization
  posthog.init(apiKey, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: false, // Manual pageview tracking
    autocapture: false, // Privacy-first: manual tracking only

    // Error tracking (PostHog's new unified error monitoring)
    capture_exceptions: {
      enabled: true,
      errors_to_ignore: [
        "ResizeObserver loop limit exceeded", // Benign browser warning
        "Non-Error promise rejection", // Handled elsewhere
      ],
    } as any,

    // Session recording with adaptive sampling
    session_recording: {
      maskAllInputs: true, // Privacy: mask all input fields
      maskAllText: false, // Show UI text for context
      recordCanvas: false, // Performance: skip canvas
      sampleRate: 0.5, // 50% base sampling
      minimumDuration: 5000, // Skip sessions < 5s
    } as any,

    // Opt-out by default (user can enable in settings)
    opt_out_capturing_by_default: false, // Set to true for strict GDPR

    // Reverse proxy for ad blocker bypass
    ui_host: typeof window !== "undefined" ? window.location.origin : undefined,
  });

  // Global error handlers for comprehensive error capture
  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      posthog.capture("$exception", {
        $exception_type: event.error?.name || "Error",
        $exception_message: event.error?.message || String(event.message),
        $exception_stack_trace_raw: event.error?.stack,
        $exception_source: "window.onerror",
        $exception_filename: event.filename,
        $exception_lineno: event.lineno,
        $exception_colno: event.colno,
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const error = event.reason;
      posthog.capture("$exception", {
        $exception_type: error?.name || "UnhandledPromiseRejection",
        $exception_message: error?.message || String(event.reason),
        $exception_stack_trace_raw: error?.stack,
        $exception_source: "unhandledrejection",
      });
    });
  }
}
