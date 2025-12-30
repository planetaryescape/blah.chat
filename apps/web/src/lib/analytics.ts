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
    autocapture: {
      // Enable autocapture for heatmaps & click tracking
      dom_event_allowlist: ["click", "change", "submit"],
      url_allowlist: ["/chat", "/search", "/settings"],
      element_allowlist: ["button", "a", "input"],
      css_selector_allowlist: ["[data-track]"], // Track elements with data-track attribute
    },
    session_recording: {
      maskAllInputs: true, // Mask sensitive input fields
      // @ts-ignore - PostHog types may be incomplete for session recording options
      recordCanvas: false, // Skip canvas (performance)
      // @ts-ignore - PostHog types may be incomplete for session recording options
      recordCrossOriginIframes: false, // Security
      sampleRate: 0.5, // 50% base rate (high-value sessions)
      minimumDuration: 5000, // Skip < 5s sessions (avoid noise)
      // NOTE: Adaptive sampling (100% new users, 50% regulars) can be implemented
      // via conditional startRecording() calls based on user.createdAt
      // Call analytics.startRecording() after user identification for 100% capture
    },
    capture_performance: true, // Track web vitals
    capture_pageleave: true, // Track exit points
  });
}

interface AnalyticsEvent {
  // === CHAT INTERFACE (20 events) ===
  conversation_started: {
    model: string;
    projectId?: string;
  };
  message_sent: {
    model: string;
    isComparisonMode?: boolean;
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
    hasAttachments?: boolean;
    attachmentCount?: number;
    attachmentTypes?: string;
    inputLength?: number;
    hasQuote?: boolean;
    thinkingEffort?: "none" | "low" | "medium" | "high";
    voiceUsed?: boolean;
  };
  message_streaming_started: {
    model: string;
    messageId: string;
    conversationId: string;
  };
  message_streaming_completed: {
    model: string;
    messageId: string;
    tokensPerSecond?: number;
    generationTimeMs?: number;
    firstTokenLatencyMs?: number;
  };
  message_regenerated: {
    model: string;
    messageId: string;
    previousStatus: string;
  };
  generation_stopped: {
    model: string;
    messageId?: string;
    source?: string;
    timeElapsedMs?: number;
    partialContentLength?: number;
  };
  generation_resumed_after_refresh: {
    model: string;
    messageId: string;
    timeSinceInitiation?: number;
  };
  partial_content_viewed: {
    messageId: string;
    contentLength: number;
  };
  message_copied: {
    messageId: string;
    contentLength: number;
  };

  // === MODEL MANAGEMENT (18 events) ===
  model_switched: {
    fromModel: string;
    toModel: string;
  };
  model_selected: {
    model: string;
    previousModel?: string;
    source: "dropdown" | "quickswitcher" | "settings" | "quick_switcher";
    wasMidConversation?: boolean;
  };
  quick_switcher_opened: {
    mode?: "single" | "multiple";
    currentModel?: string;
  };
  quick_switcher_closed: {
    selectionMade: boolean;
    timeToSelectMs?: number;
  };
  category_filter_changed: {
    category: string;
    mode?: "single" | "multiple";
  };
  comparison_started: {
    modelCount: number;
    models: string[] | string;
  };
  comparison_panel_opened: {
    modelCount: number;
  };
  comparison_exited: {
    durationMs?: number;
    hadActiveComparison?: boolean;
  };
  comparison_voted: {
    rating: "left_better" | "right_better" | "tie" | "both_bad";
    winnerModel?: string;
    modelCount?: number;
    comparisonGroupId?: string;
    modelsCompared?: string[];
  };
  consolidation_created: {
    mode: "same_chat" | "new_chat" | "same-chat" | "new-chat";
    model?: string;
    modelCount?: number;
    consolidationModel?: string;
    originalModelCount?: number;
  };
  thinking_effort_selected: {
    effort: "none" | "low" | "medium" | "high";
    model?: string;
    previousEffort?: "none" | "low" | "medium" | "high";
  };
  reasoning_viewed: {
    messageId: string;
    reasoningTokens?: number;
    thinkingTimeMs?: number;
  };
  default_model_changed: {
    newModel: string;
  };
  model_preference_updated: {
    event: string;
    modelId: string;
  };
  favorite_models_updated: {
    modelsCount: number;
  };
  model_names_toggled: {
    state: boolean;
  };

  // === MODEL RECOMMENDATIONS (12 events) ===
  // Backend events
  recommendation_analysis_started: {
    conversationId: string;
    currentModel: string;
    userMessageLength: number;
    avgCost: number;
    timestamp?: number;
  };
  recommendation_generated: {
    conversationId: string;
    currentModel: string;
    suggestedModel: string;
    percentSaved: number;
    reasoning: string;
    analysisTimeMs: number;
    timestamp?: number;
  };
  recommendation_skipped_complex_task: {
    conversationId: string;
    currentModel: string;
    reasoning: string;
    timestamp?: number;
  };
  // Frontend events
  recommendation_shown: {
    conversationId: string;
    currentModel: string;
    suggestedModel: string;
    percentSaved: number;
    timeAfterMessageComplete?: number;
    timestamp?: number;
  };
  recommendation_preview_clicked: {
    conversationId: string;
    currentModel: string;
    suggestedModel: string;
    secondsSinceBannerShown?: number;
    timestamp?: number;
  };
  recommendation_preview_completed: {
    conversationId: string;
    currentModel: string;
    suggestedModel: string;
    generationTimeMs: number;
    responseLength: number;
    timestamp?: number;
  };
  recommendation_preview_compared: {
    conversationId: string;
    currentModel: string;
    suggestedModel: string;
    userSpentTimeComparingMs: number;
    timestamp?: number;
  };
  recommendation_accepted: {
    conversationId: string;
    from: string;
    to: string;
    savings: number;
    viaPreview: boolean;
    secondsUntilDecision?: number;
    userSpentTimeComparingMs?: number;
    timestamp?: number;
  };
  recommendation_dismissed: {
    conversationId: string;
    currentModel: string;
    suggestedModel: string;
    dismissalReason?: string;
    secondsVisible: number;
    timestamp?: number;
  };
  set_default_prompt_shown: {
    conversationId: string;
    modelId: string;
    afterAcceptingRecommendation: boolean;
    timestamp?: number;
  };
  set_default_accepted: {
    conversationId: string;
    modelId: string;
    timestamp?: number;
  };
  set_default_dismissed: {
    conversationId: string;
    modelId: string;
    secondsVisible?: number;
    timestamp?: number;
  };

  // === MEMORY SYSTEM (12 events) ===
  memory_extraction_triggered: {
    source: "manual" | "auto";
    conversationId?: string;
    conversationMessageCount?: number;
  };
  auto_extraction_run: {
    memoriesExtractedCount: number;
    extractionTimeMs?: number;
  };
  memory_search_triggered: {
    query: string;
    resultsCount?: number;
  };
  memories_page_viewed: Record<string, never>;
  memory_deleted: {
    memoryId: string;
    category: string;
    ageDays?: number;
  };
  auto_extraction_toggled: {
    newState: boolean;
  };
  memory_filter_applied: {
    filterType: string;
  };

  // === CONVERSATIONS (15 events) ===
  conversation_created: {
    initialModel: string;
    reusedEmpty: boolean;
  };
  conversation_switched: {
    direction?: "prev" | "next";
    conversationIndex?: number;
  };
  conversation_deleted: {
    reason?: string;
    cascadeDeleteCount?: number;
  };
  message_deleted: {
    messageId: string;
    conversationId?: string;
  };
  conversation_archived: Record<string, never>;
  conversation_renamed: {
    titleLength: number;
    titleWordCount: number;
  };
  conversation_pinned: {
    toggleState: boolean;
  };
  conversation_starred: {
    toggleState: boolean;
  };
  conversation_reused: {
    conversationId: string;
  };
  bulk_operation_performed: {
    operationType: string;
    count: number;
    selectionMethod?: string;
  };
  conversation_exported: {
    format: string;
  };
  conversation_copied: {
    conversationId: string;
    messageCount: number;
  };
  conversation_imported: {
    format: string;
    conversationsCount: number;
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

  // === PROJECTS (8 events) ===
  project_created: {
    hasDescription: boolean;
    hasSystemPrompt: boolean;
    isTemplate: boolean;
  };
  project_updated: {
    hasDescription?: boolean;
    hasSystemPrompt?: boolean;
    fieldsModified?: string[];
    systemPromptUpdated?: boolean;
  };
  project_deleted: {
    conversationCount?: number;
    conversationCountAffected?: number;
  };
  conversation_assigned_to_project: {
    projectId: string;
  };
  projects_page_viewed: Record<string, never>;
  conversations_filtered_by_project: {
    projectId: string;
    resultsCount: number;
  };

  // === BOOKMARKS & NOTES (12 events) ===
  bookmark_created: {
    source?: string;
    hasNote: boolean;
    tagCount: number;
    messageType?: "user" | "assistant";
  };
  bookmark_updated: {
    hasNote?: boolean;
    tagCount?: number;
    fieldsModified?: string[];
  };
  bookmark_deleted: {
    source?: string;
  };
  comparison_models_selected: {
    modelCount: number;
    models: string;
  };
  bookmarks_page_viewed: Record<string, never>;
  bookmark_filter_applied: {
    filterType: string;
  };
  note_created: {
    source: "message_selection" | "standalone";
    contentLength: number;
  };
  note_edited: {
    contentLengthBefore: number;
    contentLengthAfter: number;
  };
  note_deleted: {
    ageDays?: number;
  };
  notes_page_viewed: Record<string, never>;
  note_tagged: {
    tagApplied: string;
    tagHierarchyDepth?: number;
  };
  tag_tree_navigated: Record<string, never>;

  // === TEMPLATES & PROMPTS (6 events) ===
  templates_page_viewed: Record<string, never>;
  template_applied: {
    templateId: string;
    category: string;
    usageCountIncremented: number;
  };
  template_created: {
    promptLength: number;
    category: string;
    isPublic: boolean;
  };
  template_category_filtered: {
    category: string;
  };
  template_switcher_opened: {
    mode: "navigate" | "insert";
  };
  template_selected: {
    templateId: string;
    templateName: string;
    mode: "navigate" | "insert";
  };
  template_used: {
    templateId: string;
    templateName: string;
    conversationId: string;
  };

  // === SEARCH & DISCOVERY (8 events) ===
  conversation_searched: {
    queryText: string;
    resultsCount: number;
    resultSelected?: boolean;
  };
  global_search_performed: {
    queryText: string;
    searchType: "hybrid" | "fulltext" | "vector";
    resultsCount: number;
    filterApplied?: string;
  };
  search_type_changed: {
    newType: "hybrid" | "fulltext" | "vector";
  };
  search_result_clicked: {
    resultPosition: number;
  };
  search_filter_applied: {
    filterType: string;
  };
  memory_searched: {
    queryText: string;
    resultsCount: number;
  };
  search_performed: {
    type: "keyword" | "semantic" | "hybrid";
    resultCount: number;
  };

  // === FILES & VOICE (10 events) ===
  attachment_uploaded: {
    type: string;
    size: number;
    mimeType: string;
    countPerMessage: number;
  };
  image_generated: {
    promptLength: number;
    modelUsed: string;
    generationTimeMs?: number;
  };
  image_viewed: {
    imageId: string;
  };
  image_lightbox_opened: {
    imageId: string;
  };
  voice_recording_started: Record<string, never>;
  voice_recording_stopped: {
    durationMs: number;
  };
  transcription_completed: {
    transcriptionTimeMs?: number;
    autoSendUsed: boolean;
    transcriptionLanguage?: string;
  };
  tts_initiated: {
    messageLength: number;
    voiceUsed: string;
  };
  tts_playback_completed: {
    playbackDurationMs?: number;
  };

  // === SETTINGS (12 events) ===
  theme_toggled: {
    newTheme: string;
  };
  chat_width_changed: {
    newWidth: string;
  };
  stt_settings_changed: {
    provider: string;
    language: string;
  };
  tts_settings_changed: {
    provider: string;
    voice: string;
  };
  tts_speed_changed: {
    newSpeed: number;
  };
  ui_preference_changed: {
    setting: string;
    value: boolean;
    source?: "settings_page" | "header_menu";
  };
  reasoning_display_changed: {
    setting: string;
    value: boolean;
  };
  maintenance_action_performed: {
    actionType: string;
    dataClearedCount?: number;
  };

  // === AUTH & ONBOARDING (8 events) ===
  signup_completed: {
    signupMethod: string;
    emailConfirmed: boolean;
  };
  signin_completed: {
    signinMethod: string;
    redirectTimeMs?: number;
  };
  auth_redirect: {
    fromPage: string;
  };
  onboarding_started: Record<string, never>;
  onboarding_step_viewed: {
    stepNumber: number;
  };
  onboarding_completed: Record<string, never>;
  onboarding_skipped: Record<string, never>;

  // === SHARING & COLLABORATION (6 events) ===
  conversation_shared: {
    hasPassword?: boolean;
    hasExpiry: boolean;
    expiresIn?: number;
    anonymizeEnabled: boolean;
  };
  note_shared: {
    hasPassword?: boolean;
    expiresIn?: number;
  };
  shared_conversation_viewed: {
    shareId: string;
    passwordProtected: boolean;
    anonymized: boolean;
    ageDays?: number;
  };
  share_deleted: Record<string, never>;

  // === USAGE & COST (6 events) ===
  message_cost_tracked: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    costUsd: number;
  };
  usage_page_viewed: Record<string, never>;
  budget_limit_hit: {
    limitType: "daily" | "monthly";
    budgetAmount: number;
    spendingAmount: number;
  };
  date_range_selected: {
    range: string;
  };
  model_usage_filtered: {
    model: string;
  };
  embedding_generated: {
    feature: string;
    tokenCount: number;
    costUsd: number;
  };
  ai_operation_completed: {
    operationType: "text" | "embedding" | "image" | "tts" | "stt";
    model: string;
    feature: string;
    costUsd: number;
    durationMs?: number;
  };

  // === FEEDBACK (4 events) ===
  feedback_submitted: {
    type: string;
    hasScreenshot: boolean;
    contextProvided: boolean;
  };
  feedback_status_updated: {
    newStatus: string;
    feedbackType: string;
  };

  // === ADVANCED FEATURES (8 events) ===
  branch_created: {
    fromMessageIndex: number;
    parentMessageRole: string;
  };
  branches_viewed: {
    branchCount: number;
  };
  branch_selected: {
    branchIndex: number;
  };
  context_window_indicator_viewed: {
    tokenCount: number;
    contextLimit: number;
    utilizationPercent: number;
  };
  feature_hint_displayed: {
    feature: string;
    model: string;
  };
  tool_call_displayed: {
    toolType: string;
  };
  code_copied: {
    language: string;
    codeLength: number;
    lineCount: number;
  };
  code_executed: {
    language: string;
    executionTimeMs?: number;
    success: boolean;
  };

  // === EXISTING EVENTS (for backward compatibility) ===
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

  // Error tracking with PostHog
  captureException(
    error: Error,
    context?: {
      severity?: "fatal" | "error" | "warning" | "info";
      userId?: string;
      conversationId?: string;
      messageId?: string;
      model?: string;
      errorType?: string;
      componentStack?: string;
      [key: string]: unknown;
    },
  ): void {
    if (typeof window === "undefined") return;
    try {
      posthog.capture("$exception", {
        $exception_type: error.name,
        $exception_message: error.message,
        $exception_stack_trace_raw: error.stack,
        $exception_level: context?.severity || "error",
        $exception_source: "client",
        ...context,
      });
    } catch (captureError) {
      console.error("Failed to capture exception:", captureError);
    }
  },

  // Set user properties (for context enrichment)
  setUser(properties: Record<string, unknown>): void {
    if (typeof window === "undefined") return;
    try {
      posthog.setPersonProperties(properties);
    } catch (error) {
      console.error("Analytics setUser error:", error);
    }
  },

  // Feature flags
  isFeatureEnabled(flagKey: string): boolean {
    if (typeof window === "undefined") return false;
    try {
      return posthog.isFeatureEnabled(flagKey) ?? false;
    } catch (error) {
      console.error("Feature flag check error:", error);
      return false;
    }
  },

  // Get feature flag payload
  getFeatureFlagPayload(flagKey: string): unknown {
    if (typeof window === "undefined") return null;
    try {
      return posthog.getFeatureFlagPayload(flagKey);
    } catch (error) {
      console.error("Feature flag payload error:", error);
      return null;
    }
  },

  // Session replay control
  startRecording(): void {
    if (typeof window === "undefined") return;
    try {
      posthog.startSessionRecording();
    } catch (error) {
      console.error("Start recording error:", error);
    }
  },

  stopRecording(): void {
    if (typeof window === "undefined") return;
    try {
      posthog.stopSessionRecording();
    } catch (error) {
      console.error("Stop recording error:", error);
    }
  },

  // Adaptive sampling: Enable 100% recording for new users or beta features
  enableAdaptiveRecording(options?: {
    isNewUser?: boolean; // Created < 7 days ago
    isBetaFeature?: boolean;
    userCreatedAt?: number;
  }): void {
    if (typeof window === "undefined") return;

    const { isNewUser, isBetaFeature, userCreatedAt } = options || {};

    // Check if user is new (< 7 days)
    const isNewUserByDate = userCreatedAt
      ? Date.now() - userCreatedAt < 7 * 24 * 60 * 60 * 1000
      : false;

    // Enable 100% recording for new users or beta features
    if (isNewUser || isNewUserByDate || isBetaFeature) {
      this.startRecording();
    }
    // Otherwise, rely on base 50% sample rate from config
  },

  // Funnel tracking helpers
  /**
   * Track funnel step completion
   * Use this to manually track progress through key user journeys
   *
   * Example funnels:
   * - Onboarding: signup → first_message → second_conversation → memory_enabled
   * - Comparison adoption: first_comparison → voted → consolidation
   * - Feature discovery: hint_displayed → feature_used → repeat_usage
   */
  trackFunnelStep(
    funnelName: string,
    stepName: string,
    properties?: Record<string, unknown>,
  ): void {
    this.track(
      `funnel_${funnelName}_${stepName}` as EventName,
      {
        funnel: funnelName,
        step: stepName,
        ...properties,
      } as AnalyticsEvent[EventName],
    );
  },

  // Cohort helpers
  /**
   * Identify user cohorts for segmentation
   * Call this after user traits are known
   *
   * Example cohorts:
   * - Power users: >10 conversations/week
   * - Model switchers: >5 model changes/week
   * - Memory users: auto-extraction enabled
   * - Comparison users: voted on comparison
   */
  identifyUserCohort(
    cohorts: Array<
      | "power_user"
      | "model_switcher"
      | "memory_user"
      | "comparison_user"
      | "beta_tester"
      | string
    >,
  ): void {
    this.setUser({
      cohorts: cohorts,
      cohort_primary: cohorts[0], // Primary cohort for filtering
    });
  },

  // A/B testing helpers
  /**
   * Get variant for an experiment
   * Returns variant key (e.g., 'control', 'variant_a', 'variant_b')
   */
  getExperimentVariant(experimentKey: string): string | null {
    if (typeof window === "undefined") return null;
    try {
      const payload = posthog.getFeatureFlagPayload(experimentKey);
      return payload as string | null;
    } catch (error) {
      console.error("Experiment variant error:", error);
      return null;
    }
  },

  /**
   * Track experiment exposure (user saw the experiment)
   * Call this when user is exposed to the experiment variant
   */
  trackExperimentExposure(
    experimentKey: string,
    variant: string,
    properties?: Record<string, unknown>,
  ): void {
    this.track(
      "experiment_exposed" as EventName,
      {
        experiment: experimentKey,
        variant,
        ...properties,
      } as AnalyticsEvent[EventName],
    );
  },
};
