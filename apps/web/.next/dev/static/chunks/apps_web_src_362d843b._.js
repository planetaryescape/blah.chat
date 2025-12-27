(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/apps/web/src/lib/analytics.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "analytics",
    ()=>analytics,
    "initAnalytics",
    ()=>initAnalytics
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/posthog-js@1.310.1/node_modules/posthog-js/dist/module.js [app-client] (ecmascript)");
;
function initAnalytics() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const apiKey = ("TURBOPACK compile-time value", "phc_nkbmjYVxkHGx9KdFjZibuUpAbLfEYsevUU7NKmBSKKH");
    const host = ("TURBOPACK compile-time value", "https://app.posthog.com") || "https://app.posthog.com";
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].init(apiKey, {
        api_host: host,
        person_profiles: "identified_only",
        capture_pageview: false,
        autocapture: {
            // Enable autocapture for heatmaps & click tracking
            dom_event_allowlist: [
                "click",
                "change",
                "submit"
            ],
            url_allowlist: [
                "/chat",
                "/search",
                "/settings"
            ],
            element_allowlist: [
                "button",
                "a",
                "input"
            ],
            css_selector_allowlist: [
                "[data-track]"
            ]
        },
        session_recording: {
            maskAllInputs: true,
            // @ts-ignore - PostHog types may be incomplete for session recording options
            recordCanvas: false,
            // @ts-ignore - PostHog types may be incomplete for session recording options
            recordCrossOriginIframes: false,
            sampleRate: 0.5,
            minimumDuration: 5000
        },
        capture_performance: true,
        capture_pageleave: true
    });
}
const analytics = {
    track (event, properties) {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].capture(event, properties);
        } catch (error) {
            console.error("Analytics error:", error);
        }
    },
    identify (userId, traits) {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].identify(userId, traits);
        } catch (error) {
            console.error("Analytics identify error:", error);
        }
    },
    reset () {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].reset();
        } catch (error) {
            console.error("Analytics reset error:", error);
        }
    },
    pageview (path) {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].capture("$pageview", {
                $current_url: path || window.location.pathname
            });
        } catch (error) {
            console.error("Analytics pageview error:", error);
        }
    },
    // Check if analytics is enabled (for opt-out)
    isEnabled () {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        return !__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].has_opted_out_capturing();
    },
    // Opt out of analytics
    optOut () {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].opt_out_capturing();
        } catch (error) {
            console.error("Analytics opt-out error:", error);
        }
    },
    // Opt in to analytics
    optIn () {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].opt_in_capturing();
        } catch (error) {
            console.error("Analytics opt-in error:", error);
        }
    },
    // Error tracking with PostHog
    captureException (error, context) {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].capture("$exception", {
                $exception_type: error.name,
                $exception_message: error.message,
                $exception_stack_trace_raw: error.stack,
                $exception_level: context?.severity || "error",
                $exception_source: "client",
                ...context
            });
        } catch (captureError) {
            console.error("Failed to capture exception:", captureError);
        }
    },
    // Set user properties (for context enrichment)
    setUser (properties) {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].setPersonProperties(properties);
        } catch (error) {
            console.error("Analytics setUser error:", error);
        }
    },
    // Feature flags
    isFeatureEnabled (flagKey) {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].isFeatureEnabled(flagKey) ?? false;
        } catch (error) {
            console.error("Feature flag check error:", error);
            return false;
        }
    },
    // Get feature flag payload
    getFeatureFlagPayload (flagKey) {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].getFeatureFlagPayload(flagKey);
        } catch (error) {
            console.error("Feature flag payload error:", error);
            return null;
        }
    },
    // Session replay control
    startRecording () {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].startSessionRecording();
        } catch (error) {
            console.error("Start recording error:", error);
        }
    },
    stopRecording () {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].stopSessionRecording();
        } catch (error) {
            console.error("Stop recording error:", error);
        }
    },
    // Adaptive sampling: Enable 100% recording for new users or beta features
    enableAdaptiveRecording (options) {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        const { isNewUser, isBetaFeature, userCreatedAt } = options || {};
        // Check if user is new (< 7 days)
        const isNewUserByDate = userCreatedAt ? Date.now() - userCreatedAt < 7 * 24 * 60 * 60 * 1000 : false;
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
   */ trackFunnelStep (funnelName, stepName, properties) {
        this.track(`funnel_${funnelName}_${stepName}`, {
            funnel: funnelName,
            step: stepName,
            ...properties
        });
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
   */ identifyUserCohort (cohorts) {
        this.setUser({
            cohorts: cohorts,
            cohort_primary: cohorts[0]
        });
    },
    // A/B testing helpers
    /**
   * Get variant for an experiment
   * Returns variant key (e.g., 'control', 'variant_a', 'variant_b')
   */ getExperimentVariant (experimentKey) {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            const payload = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$posthog$2d$js$40$1$2e$310$2e$1$2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].getFeatureFlagPayload(experimentKey);
            return payload;
        } catch (error) {
            console.error("Experiment variant error:", error);
            return null;
        }
    },
    /**
   * Track experiment exposure (user saw the experiment)
   * Call this when user is exposed to the experiment variant
   */ trackExperimentExposure (experimentKey, variant, properties) {
        this.track("experiment_exposed", {
            experiment: experimentKey,
            variant,
            ...properties
        });
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/components/providers/AnalyticsProvider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AnalyticsProvider",
    ()=>AnalyticsProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$react$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/react/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$analytics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/analytics.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function AnalyticsProvider({ children }) {
    _s();
    const { user, isLoaded } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$react$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useUser"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AnalyticsProvider.useEffect": ()=>{
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$analytics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initAnalytics"])();
        }
    }["AnalyticsProvider.useEffect"], []);
    // Identify user when authenticated
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AnalyticsProvider.useEffect": ()=>{
            if (isLoaded && user?.id) {
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$analytics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analytics"].identify(user.id, {
                    email: user.primaryEmailAddress?.emailAddress,
                    name: user.fullName,
                    createdAt: user.createdAt
                });
            }
        }
    }["AnalyticsProvider.useEffect"], [
        isLoaded,
        user?.id,
        user?.primaryEmailAddress?.emailAddress,
        user?.fullName,
        user?.createdAt
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: children
    }, void 0, false);
}
_s(AnalyticsProvider, "cxQnk1moaWbQKe5qulR/ORQD7Gc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$react$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useUser"]
    ];
});
_c = AnalyticsProvider;
var _c;
__turbopack_context__.k.register(_c, "AnalyticsProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/lib/logout.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clearSessionData",
    ()=>clearSessionData,
    "clearUserDataOnLogout",
    ()=>clearUserDataOnLogout
]);
/**
 * Logout utility functions
 * Clears all user-specific data from client-side storage on logout
 */ // Keys stored in localStorage that should be cleared on logout
const LOCAL_STORAGE_KEYS_TO_CLEAR = [
    "blah-hints-dismissed",
    "conversationsExpanded",
    "blah-recent-searches"
];
// Prefix patterns for sessionStorage keys to clear
const _SESSION_STORAGE_PREFIXES = [
    "modelHint-"
];
function clearUserDataOnLogout() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        // 1. Clear specific localStorage keys
        for (const key of LOCAL_STORAGE_KEYS_TO_CLEAR){
            localStorage.removeItem(key);
        }
        // 2. Clear sessionStorage completely (session-specific data)
        sessionStorage.clear();
        // 3. Clear any IndexedDB databases if used (future-proofing)
        // Currently not used, but pattern is here for future implementation
        console.log("[Logout] User data cleared from client storage");
    } catch (error) {
        console.error("[Logout] Failed to clear user data:", error);
    }
}
function clearSessionData() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        sessionStorage.clear();
    } catch (error) {
        console.error("[Logout] Failed to clear session data:", error);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/components/providers/AuthStateListener.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthStateListener",
    ()=>AuthStateListener
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$client$2d$boundary$2f$PromisifiedAuthProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__usePromisifiedAuth__as__useAuth$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/client-boundary/PromisifiedAuthProvider.js [app-client] (ecmascript) <export usePromisifiedAuth as useAuth>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$analytics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/analytics.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$logout$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/logout.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function AuthStateListener({ children }) {
    _s();
    const { userId } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$client$2d$boundary$2f$PromisifiedAuthProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__usePromisifiedAuth__as__useAuth$3e$__["useAuth"])();
    const prevUserIdRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(undefined);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthStateListener.useEffect": ()=>{
            // Skip on first render (when prevUserIdRef is undefined)
            if (prevUserIdRef.current === undefined) {
                prevUserIdRef.current = userId;
                return;
            }
            // User signed out (had a userId, now doesn't)
            if (prevUserIdRef.current && !userId) {
                console.log("[AuthStateListener] User signed out, clearing data");
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$logout$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearUserDataOnLogout"])();
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$analytics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analytics"].reset();
            }
            // User switched (different userId than before)
            if (prevUserIdRef.current && userId && prevUserIdRef.current !== userId) {
                console.log("[AuthStateListener] User switched, clearing previous data");
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$logout$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearUserDataOnLogout"])();
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$analytics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analytics"].reset();
                // Re-identify new user
                __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$analytics$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["analytics"].identify(userId);
            }
            // Update ref for next comparison
            prevUserIdRef.current = userId;
        }
    }["AuthStateListener.useEffect"], [
        userId
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: children
    }, void 0, false);
}
_s(AuthStateListener, "Ru65KDNadX387wz2WnsECoedMQQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$client$2d$boundary$2f$PromisifiedAuthProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__usePromisifiedAuth__as__useAuth$3e$__["useAuth"]
    ];
});
_c = AuthStateListener;
var _c;
__turbopack_context__.k.register(_c, "AuthStateListener");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/components/providers/convex-clerk-provider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConvexClerkProvider",
    ()=>ConvexClerkProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$client$2d$boundary$2f$PromisifiedAuthProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__usePromisifiedAuth__as__useAuth$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/client-boundary/PromisifiedAuthProvider.js [app-client] (ecmascript) <export usePromisifiedAuth as useAuth>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$themes$40$2$2e$4$2e$46$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$themes$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+themes@2.4.46+67f6792bdf102c28/node_modules/@clerk/themes/dist/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react/client.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2d$clerk$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react-clerk/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2d$clerk$2f$ConvexProviderWithClerk$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex@1.31.2+d2d3216ad6b090e4/node_modules/convex/dist/esm/react-clerk/ConvexProviderWithClerk.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$2d$helpers$40$0$2e$1$2e$108$2b$429930af951a2565$2f$node_modules$2f$convex$2d$helpers$2f$react$2f$cache$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex-helpers@0.1.108+429930af951a2565/node_modules/convex-helpers/react/cache.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$2d$helpers$40$0$2e$1$2e$108$2b$429930af951a2565$2f$node_modules$2f$convex$2d$helpers$2f$react$2f$cache$2f$provider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/convex-helpers@0.1.108+429930af951a2565/node_modules/convex-helpers/react/cache/provider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$providers$2f$AuthStateListener$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/components/providers/AuthStateListener.tsx [app-client] (ecmascript)");
"use client";
;
;
;
;
;
;
;
const convex = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ConvexReactClient"](("TURBOPACK compile-time value", "https://intent-coyote-706.convex.cloud"));
function ConvexClerkProvider({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ClerkProvider"], {
        publishableKey: ("TURBOPACK compile-time value", "pk_test_cGxlYXNlZC1vc3RyaWNoLTM1LmNsZXJrLmFjY291bnRzLmRldiQ"),
        appearance: {
            baseTheme: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$themes$40$2$2e$4$2e$46$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$themes$2f$dist$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["dark"],
            variables: {
                colorPrimary: "#e4a853",
                colorBackground: "#1a1513",
                colorInputBackground: "#1a1513",
                colorInputText: "#e8e3df",
                fontFamily: "'Clash Display', sans-serif"
            },
            elements: {
                formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
                card: "bg-card",
                headerTitle: "text-foreground",
                headerSubtitle: "text-muted-foreground",
                socialButtonsBlockButton: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                formFieldLabel: "text-foreground",
                formFieldInput: "bg-input border-border text-foreground",
                footerActionLink: "text-primary hover:text-primary/90"
            }
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$40$1$2e$31$2e$2$2b$d2d3216ad6b090e4$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2d$clerk$2f$ConvexProviderWithClerk$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ConvexProviderWithClerk"], {
            client: convex,
            useAuth: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$client$2d$boundary$2f$PromisifiedAuthProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__usePromisifiedAuth__as__useAuth$3e$__["useAuth"],
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$convex$2d$helpers$40$0$2e$1$2e$108$2b$429930af951a2565$2f$node_modules$2f$convex$2d$helpers$2f$react$2f$cache$2f$provider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ConvexQueryCacheProvider"], {
                expiration: 60000,
                maxIdleEntries: 100,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$components$2f$providers$2f$AuthStateListener$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthStateListener"], {
                    children: children
                }, void 0, false, {
                    fileName: "[project]/apps/web/src/components/providers/convex-clerk-provider.tsx",
                    lineNumber: 45,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/web/src/components/providers/convex-clerk-provider.tsx",
                lineNumber: 44,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/web/src/components/providers/convex-clerk-provider.tsx",
            lineNumber: 43,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/src/components/providers/convex-clerk-provider.tsx",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
_c = ConvexClerkProvider;
var _c;
__turbopack_context__.k.register(_c, "ConvexClerkProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/lib/query/client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getQueryClient",
    ()=>getQueryClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$tanstack$2b$query$2d$core$40$5$2e$90$2e$12$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@tanstack+query-core@5.90.12/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-client] (ecmascript)");
;
const isServer = ("TURBOPACK compile-time value", "object") === "undefined";
let browserQueryClient;
function makeQueryClient() {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$tanstack$2b$query$2d$core$40$5$2e$90$2e$12$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClient"]({
        defaultOptions: {
            queries: {
                // Phase 7: Aggressive caching - Convex real-time updates handle freshness
                staleTime: 5 * 60 * 1000,
                gcTime: 30 * 60 * 1000,
                refetchOnWindowFocus: false,
                refetchOnReconnect: true,
                refetchOnMount: false,
                retry: (failureCount, error)=>{
                    if (error?.status >= 400 && error?.status < 500) return false; // No retry on 4xx
                    return failureCount < 2; // Retry 5xx/network twice
                },
                retryDelay: (attemptIndex)=>Math.min(1000 * 2 ** attemptIndex, 10000)
            },
            mutations: {
                retry: false,
                gcTime: 0
            }
        }
    });
}
function getQueryClient() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
     // Server: always new
    if (!browserQueryClient) browserQueryClient = makeQueryClient(); // Browser: singleton
    return browserQueryClient;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/components/providers/QueryProvider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryProvider",
    ()=>QueryProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$tanstack$2b$react$2d$query$40$5$2e$90$2e$12$2b$83d5fd7b249dbeef$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@tanstack+react-query@5.90.12+83d5fd7b249dbeef/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$tanstack$2b$react$2d$query$2d$devtools$40$5$2e$91$2e$1$2b$4d327aa9bbe52471$2f$node_modules$2f40$tanstack$2f$react$2d$query$2d$devtools$2f$build$2f$modern$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@tanstack+react-query-devtools@5.91.1+4d327aa9bbe52471/node_modules/@tanstack/react-query-devtools/build/modern/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$query$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/query/client.ts [app-client] (ecmascript)");
"use client";
;
;
;
;
function QueryProvider({ children }) {
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$query$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getQueryClient"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$tanstack$2b$react$2d$query$40$5$2e$90$2e$12$2b$83d5fd7b249dbeef$2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: queryClient,
        children: [
            children,
            ("TURBOPACK compile-time value", "development") === "development" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$tanstack$2b$react$2d$query$2d$devtools$40$5$2e$91$2e$1$2b$4d327aa9bbe52471$2f$node_modules$2f40$tanstack$2f$react$2d$query$2d$devtools$2f$build$2f$modern$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ReactQueryDevtools"], {
                initialIsOpen: false,
                position: "bottom"
            }, void 0, false, {
                fileName: "[project]/apps/web/src/components/providers/QueryProvider.tsx",
                lineNumber: 14,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/web/src/components/providers/QueryProvider.tsx",
        lineNumber: 11,
        columnNumber: 5
    }, this);
}
_c = QueryProvider;
var _c;
__turbopack_context__.k.register(_c, "QueryProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/components/theme-provider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeProvider",
    ()=>ThemeProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$2d$themes$40$0$2e$4$2e$6$2b$67f6792bdf102c28$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next-themes@0.4.6+67f6792bdf102c28/node_modules/next-themes/dist/index.mjs [app-client] (ecmascript)");
"use client";
;
;
function ThemeProvider({ children, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$2d$themes$40$0$2e$4$2e$6$2b$67f6792bdf102c28$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ThemeProvider"], {
        ...props,
        children: children
    }, void 0, false, {
        fileName: "[project]/apps/web/src/components/theme-provider.tsx",
        lineNumber: 10,
        columnNumber: 10
    }, this);
}
_c = ThemeProvider;
var _c;
__turbopack_context__.k.register(_c, "ThemeProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/components/ui/sonner.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$555$2e$0$2b$83d5fd7b249dbeef$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircleCheckIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.555.0+83d5fd7b249dbeef/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CircleCheckIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$555$2e$0$2b$83d5fd7b249dbeef$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__InfoIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.555.0+83d5fd7b249dbeef/node_modules/lucide-react/dist/esm/icons/info.js [app-client] (ecmascript) <export default as InfoIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$555$2e$0$2b$83d5fd7b249dbeef$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2Icon$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.555.0+83d5fd7b249dbeef/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2Icon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$555$2e$0$2b$83d5fd7b249dbeef$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$octagon$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__OctagonXIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.555.0+83d5fd7b249dbeef/node_modules/lucide-react/dist/esm/icons/octagon-x.js [app-client] (ecmascript) <export default as OctagonXIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$555$2e$0$2b$83d5fd7b249dbeef$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TriangleAlertIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/lucide-react@0.555.0+83d5fd7b249dbeef/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as TriangleAlertIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$2d$themes$40$0$2e$4$2e$6$2b$67f6792bdf102c28$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next-themes@0.4.6+67f6792bdf102c28/node_modules/next-themes/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$67f6792bdf102c28$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/sonner@2.0.7+67f6792bdf102c28/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
const Toaster = ({ ...props })=>{
    _s();
    const { theme = "system" } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$2d$themes$40$0$2e$4$2e$6$2b$67f6792bdf102c28$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$sonner$40$2$2e$0$2e$7$2b$67f6792bdf102c28$2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Toaster"], {
        theme: theme,
        className: "toaster group",
        icons: {
            success: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$555$2e$0$2b$83d5fd7b249dbeef$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircleCheckIcon$3e$__["CircleCheckIcon"], {
                className: "size-4"
            }, void 0, false, {
                fileName: "[project]/apps/web/src/components/ui/sonner.tsx",
                lineNumber: 21,
                columnNumber: 18
            }, void 0),
            info: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$555$2e$0$2b$83d5fd7b249dbeef$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__InfoIcon$3e$__["InfoIcon"], {
                className: "size-4"
            }, void 0, false, {
                fileName: "[project]/apps/web/src/components/ui/sonner.tsx",
                lineNumber: 22,
                columnNumber: 15
            }, void 0),
            warning: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$555$2e$0$2b$83d5fd7b249dbeef$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TriangleAlertIcon$3e$__["TriangleAlertIcon"], {
                className: "size-4"
            }, void 0, false, {
                fileName: "[project]/apps/web/src/components/ui/sonner.tsx",
                lineNumber: 23,
                columnNumber: 18
            }, void 0),
            error: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$555$2e$0$2b$83d5fd7b249dbeef$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$octagon$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__OctagonXIcon$3e$__["OctagonXIcon"], {
                className: "size-4"
            }, void 0, false, {
                fileName: "[project]/apps/web/src/components/ui/sonner.tsx",
                lineNumber: 24,
                columnNumber: 16
            }, void 0),
            loading: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$lucide$2d$react$40$0$2e$555$2e$0$2b$83d5fd7b249dbeef$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2Icon$3e$__["Loader2Icon"], {
                className: "size-4 animate-spin"
            }, void 0, false, {
                fileName: "[project]/apps/web/src/components/ui/sonner.tsx",
                lineNumber: 25,
                columnNumber: 18
            }, void 0)
        },
        style: {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
            "--border-radius": "var(--radius)"
        },
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/web/src/components/ui/sonner.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Toaster, "EriOrahfenYKDCErPq+L6926Dw4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$2d$themes$40$0$2e$4$2e$6$2b$67f6792bdf102c28$2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"]
    ];
});
_c = Toaster;
;
var _c;
__turbopack_context__.k.register(_c, "Toaster");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$tailwind$2d$merge$40$3$2e$4$2e$0$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/tailwind-merge@3.4.0/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$tailwind$2d$merge$40$3$2e$4$2e$0$2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$clsx$40$2$2e$1$2e$1$2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/apps/web/src/components/ui/tooltip.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Tooltip",
    ()=>Tooltip,
    "TooltipContent",
    ()=>TooltipContent,
    "TooltipProvider",
    ()=>TooltipProvider,
    "TooltipTrigger",
    ()=>TooltipTrigger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$radix$2d$ui$2b$react$2d$tooltip$40$1$2e$2$2e$8$2b$f178f9b1194b24ba$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@radix-ui+react-tooltip@1.2.8+f178f9b1194b24ba/node_modules/@radix-ui/react-tooltip/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
function TooltipProvider({ delayDuration = 0, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$radix$2d$ui$2b$react$2d$tooltip$40$1$2e$2$2e$8$2b$f178f9b1194b24ba$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Provider"], {
        "data-slot": "tooltip-provider",
        delayDuration: delayDuration,
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/web/src/components/ui/tooltip.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_c = TooltipProvider;
function Tooltip({ ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$radix$2d$ui$2b$react$2d$tooltip$40$1$2e$2$2e$8$2b$f178f9b1194b24ba$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
        "data-slot": "tooltip",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/web/src/components/ui/tooltip.tsx",
        lineNumber: 24,
        columnNumber: 10
    }, this);
}
_c1 = Tooltip;
function TooltipTrigger({ ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$radix$2d$ui$2b$react$2d$tooltip$40$1$2e$2$2e$8$2b$f178f9b1194b24ba$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trigger"], {
        "data-slot": "tooltip-trigger",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/web/src/components/ui/tooltip.tsx",
        lineNumber: 30,
        columnNumber: 10
    }, this);
}
_c2 = TooltipTrigger;
function TooltipContent({ className, sideOffset = 0, children, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$radix$2d$ui$2b$react$2d$tooltip$40$1$2e$2$2e$8$2b$f178f9b1194b24ba$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Portal"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$radix$2d$ui$2b$react$2d$tooltip$40$1$2e$2$2e$8$2b$f178f9b1194b24ba$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Content"], {
            "data-slot": "tooltip-content",
            sideOffset: sideOffset,
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-popover text-popover-foreground border animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance", className),
            ...props,
            children: [
                children,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$radix$2d$ui$2b$react$2d$tooltip$40$1$2e$2$2e$8$2b$f178f9b1194b24ba$2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Arrow"], {
                    className: "bg-popover fill-popover border-l border-t z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]"
                }, void 0, false, {
                    fileName: "[project]/apps/web/src/components/ui/tooltip.tsx",
                    lineNumber: 51,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/web/src/components/ui/tooltip.tsx",
            lineNumber: 41,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/web/src/components/ui/tooltip.tsx",
        lineNumber: 40,
        columnNumber: 5
    }, this);
}
_c3 = TooltipContent;
;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "TooltipProvider");
__turbopack_context__.k.register(_c1, "Tooltip");
__turbopack_context__.k.register(_c2, "TooltipTrigger");
__turbopack_context__.k.register(_c3, "TooltipContent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=apps_web_src_362d843b._.js.map