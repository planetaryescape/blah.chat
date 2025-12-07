import posthog from "posthog-js";

// Initialize PostHog
export function initAnalytics() {
  if (typeof window === "undefined") return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  if (!apiKey) {
    console.warn("PostHog API key not configured");
    return;
  }

  posthog.init(apiKey, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: false, // We'll manually capture pageviews
    autocapture: false, // Disable autocapture for privacy
  });
}

interface AnalyticsEvent {
  conversation_started: {
    model: string;
    projectId?: string;
  };
  message_sent: {
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
    hasAttachments?: boolean;
  };
  model_switched: {
    fromModel: string;
    toModel: string;
  };
  feature_used: {
    feature:
      | "bookmarks"
      | "comparison"
      | "image_gen"
      | "export"
      | "scheduled"
      | "search"
      | "branching";
  };
  conversation_shared: {
    hasPassword?: boolean;
    expiresIn?: number;
  };
  note_shared: {
    hasPassword?: boolean;
    expiresIn?: number;
  };
  search_performed: {
    type: "keyword" | "semantic" | "hybrid";
    resultCount: number;
  };
  conversation_action: {
    action:
      | "delete"
      | "archive"
      | "pin"
      | "unpin"
      | "star"
      | "unstar"
      | "auto_rename";
    source: "command_palette" | "header_menu" | "sidebar";
    conversationId: string;
  };
  error_occurred: {
    error: string;
    context?: string;
  };
  math_rendered: {
    displayMode: boolean;
    equationLength: number;
    renderTimeMs?: number;
    isStreaming: boolean;
  };
  math_error: {
    error: string;
    latexSnippet: string; // First 100 chars
    isStreaming: boolean;
  };
  math_copied: {
    format: "latex" | "html" | "both";
    equationLength: number;
  };
}

type EventName = keyof AnalyticsEvent;

export const analytics = {
  track<T extends EventName>(event: T, properties?: AnalyticsEvent[T]): void {
    if (typeof window === "undefined") return;
    try {
      posthog.capture(event, properties);
    } catch (error) {
      console.error("Analytics error:", error);
    }
  },

  identify(userId: string, traits?: Record<string, unknown>): void {
    if (typeof window === "undefined") return;
    try {
      posthog.identify(userId, traits);
    } catch (error) {
      console.error("Analytics identify error:", error);
    }
  },

  reset(): void {
    if (typeof window === "undefined") return;
    try {
      posthog.reset();
    } catch (error) {
      console.error("Analytics reset error:", error);
    }
  },

  pageview(path?: string): void {
    if (typeof window === "undefined") return;
    try {
      posthog.capture("$pageview", {
        $current_url: path || window.location.pathname,
      });
    } catch (error) {
      console.error("Analytics pageview error:", error);
    }
  },

  // Check if analytics is enabled (for opt-out)
  isEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return !posthog.has_opted_out_capturing();
  },

  // Opt out of analytics
  optOut(): void {
    if (typeof window === "undefined") return;
    try {
      posthog.opt_out_capturing();
    } catch (error) {
      console.error("Analytics opt-out error:", error);
    }
  },

  // Opt in to analytics
  optIn(): void {
    if (typeof window === "undefined") return;
    try {
      posthog.opt_in_capturing();
    } catch (error) {
      console.error("Analytics opt-in error:", error);
    }
  },
};
