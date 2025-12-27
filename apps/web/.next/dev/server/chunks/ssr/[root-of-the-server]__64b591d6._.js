module.exports = [
"[externals]/node:fs [external] (node:fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:fs", () => require("node:fs"));

module.exports = mod;
}),
"[externals]/node:path [external] (node:path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:path", () => require("node:path"));

module.exports = mod;
}),
"[project]/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-P263NW7Z.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "withLegacyReturn",
    ()=>withLegacyReturn,
    "withLegacySyncReturn",
    ()=>withLegacySyncReturn
]);
// src/jwt/legacyReturn.ts
function withLegacyReturn(cb) {
    return async (...args)=>{
        const { data, errors } = await cb(...args);
        if (errors) {
            throw errors[0];
        }
        return data;
    };
}
function withLegacySyncReturn(cb) {
    return (...args)=>{
        const { data, errors } = cb(...args);
        if (errors) {
            throw errors[0];
        }
        return data;
    };
}
;
 //# sourceMappingURL=chunk-P263NW7Z.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/telemetry-wqMDWlvR.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EVENT_SAMPLING_RATE",
    ()=>EVENT_SAMPLING_RATE,
    "EVENT_THEME_USAGE",
    ()=>EVENT_THEME_USAGE,
    "TelemetryCollector",
    ()=>TelemetryCollector,
    "eventComponentMounted",
    ()=>eventComponentMounted,
    "eventFrameworkMetadata",
    ()=>eventFrameworkMetadata,
    "eventMethodCalled",
    ()=>eventMethodCalled,
    "eventPrebuiltComponentMounted",
    ()=>eventPrebuiltComponentMounted,
    "eventPrebuiltComponentOpened",
    ()=>eventPrebuiltComponentOpened,
    "eventThemeUsage",
    ()=>eventThemeUsage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs [app-rsc] (ecmascript)");
;
;
//#region src/telemetry/throttler.ts
const DEFAULT_CACHE_TTL_MS = 864e5;
/**
* Manages throttling for telemetry events using a configurable cache implementation
* to mitigate event flooding in frequently executed code paths.
*/ var TelemetryEventThrottler = class {
    #cache;
    #cacheTtl = DEFAULT_CACHE_TTL_MS;
    constructor(cache){
        this.#cache = cache;
    }
    isEventThrottled(payload) {
        const now = Date.now();
        const key = this.#generateKey(payload);
        const entry = this.#cache.getItem(key);
        if (!entry) {
            this.#cache.setItem(key, now);
            return false;
        }
        if (now - entry > this.#cacheTtl) {
            this.#cache.setItem(key, now);
            return false;
        }
        return true;
    }
    /**
	* Generates a consistent unique key for telemetry events by sorting payload properties.
	* This ensures that payloads with identical content in different orders produce the same key.
	*/ #generateKey(event) {
        const { sk: _sk, pk: _pk, payload, ...rest } = event;
        const sanitizedEvent = {
            ...payload,
            ...rest
        };
        return JSON.stringify(Object.keys({
            ...payload,
            ...rest
        }).sort().map((key)=>sanitizedEvent[key]));
    }
};
/**
* LocalStorage-based cache implementation for browser environments.
*/ var LocalStorageThrottlerCache = class {
    #storageKey = "clerk_telemetry_throttler";
    getItem(key) {
        return this.#getCache()[key];
    }
    setItem(key, value) {
        try {
            const cache = this.#getCache();
            cache[key] = value;
            localStorage.setItem(this.#storageKey, JSON.stringify(cache));
        } catch (err) {
            if (err instanceof DOMException && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED") && localStorage.length > 0) localStorage.removeItem(this.#storageKey);
        }
    }
    removeItem(key) {
        try {
            const cache = this.#getCache();
            delete cache[key];
            localStorage.setItem(this.#storageKey, JSON.stringify(cache));
        } catch  {}
    }
    #getCache() {
        try {
            const cacheString = localStorage.getItem(this.#storageKey);
            if (!cacheString) return {};
            return JSON.parse(cacheString);
        } catch  {
            return {};
        }
    }
    static isSupported() {
        return ("TURBOPACK compile-time value", "undefined") !== "undefined" && !!window.localStorage;
    }
};
/**
* In-memory cache implementation for non-browser environments (e.g., React Native).
*/ var InMemoryThrottlerCache = class {
    #cache = /* @__PURE__ */ new Map();
    #maxSize = 1e4;
    getItem(key) {
        if (this.#cache.size > this.#maxSize) {
            this.#cache.clear();
            return;
        }
        return this.#cache.get(key);
    }
    setItem(key, value) {
        this.#cache.set(key, value);
    }
    removeItem(key) {
        this.#cache.delete(key);
    }
};
//#endregion
//#region src/telemetry/collector.ts
/**
* Type guard to check if window.Clerk exists and has the expected structure.
*/ function isWindowClerkWithMetadata(clerk) {
    return typeof clerk === "object" && clerk !== null && "constructor" in clerk && typeof clerk.constructor === "function";
}
const VALID_LOG_LEVELS = new Set([
    "error",
    "warn",
    "info",
    "debug",
    "trace"
]);
const DEFAULT_CONFIG = {
    samplingRate: 1,
    maxBufferSize: 5,
    endpoint: "https://clerk-telemetry.com"
};
var TelemetryCollector = class {
    #config;
    #eventThrottler;
    #metadata = {};
    #buffer = [];
    #pendingFlush = null;
    constructor(options){
        this.#config = {
            maxBufferSize: options.maxBufferSize ?? DEFAULT_CONFIG.maxBufferSize,
            samplingRate: options.samplingRate ?? DEFAULT_CONFIG.samplingRate,
            perEventSampling: options.perEventSampling ?? true,
            disabled: options.disabled ?? false,
            debug: options.debug ?? false,
            endpoint: DEFAULT_CONFIG.endpoint
        };
        if (!options.clerkVersion && ("TURBOPACK compile-time value", "undefined") === "undefined") this.#metadata.clerkVersion = "";
        else this.#metadata.clerkVersion = options.clerkVersion ?? "";
        this.#metadata.sdk = options.sdk;
        this.#metadata.sdkVersion = options.sdkVersion;
        this.#metadata.publishableKey = options.publishableKey ?? "";
        const parsedKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parsePublishableKey"])(options.publishableKey);
        if (parsedKey) this.#metadata.instanceType = parsedKey.instanceType;
        if (options.secretKey) this.#metadata.secretKey = options.secretKey.substring(0, 16);
        this.#eventThrottler = new TelemetryEventThrottler(LocalStorageThrottlerCache.isSupported() ? new LocalStorageThrottlerCache() : new InMemoryThrottlerCache());
    }
    get isEnabled() {
        if (this.#metadata.instanceType !== "development") return false;
        if (this.#config.disabled || typeof process !== "undefined" && process.env && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isTruthy"])(process.env.CLERK_TELEMETRY_DISABLED)) return false;
        if (("TURBOPACK compile-time value", "undefined") !== "undefined" && !!window?.navigator?.webdriver) //TURBOPACK unreachable
        ;
        return true;
    }
    get isDebug() {
        return this.#config.debug || typeof process !== "undefined" && process.env && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isTruthy"])(process.env.CLERK_TELEMETRY_DEBUG);
    }
    record(event) {
        try {
            const preparedPayload = this.#preparePayload(event.event, event.payload);
            this.#logEvent(preparedPayload.event, preparedPayload);
            if (!this.#shouldRecord(preparedPayload, event.eventSamplingRate)) return;
            this.#buffer.push({
                kind: "event",
                value: preparedPayload
            });
            this.#scheduleFlush();
        } catch (error) {
            console.error("[clerk/telemetry] Error recording telemetry event", error);
        }
    }
    /**
	* Records a telemetry log entry if logging is enabled and not in debug mode.
	*
	* @param entry - The telemetry log entry to record.
	*/ recordLog(entry) {
        try {
            if (!this.#shouldRecordLog(entry)) return;
            const levelIsValid = typeof entry?.level === "string" && VALID_LOG_LEVELS.has(entry.level);
            const messageIsValid = typeof entry?.message === "string" && entry.message.trim().length > 0;
            let normalizedTimestamp = null;
            const timestampInput = entry?.timestamp;
            if (typeof timestampInput === "number" || typeof timestampInput === "string") {
                const candidate = new Date(timestampInput);
                if (!Number.isNaN(candidate.getTime())) normalizedTimestamp = candidate;
            }
            if (!levelIsValid || !messageIsValid || normalizedTimestamp === null) {
                if (this.isDebug && typeof console !== "undefined") console.warn("[clerk/telemetry] Dropping invalid telemetry log entry", {
                    levelIsValid,
                    messageIsValid,
                    timestampIsValid: normalizedTimestamp !== null
                });
                return;
            }
            const sdkMetadata = this.#getSDKMetadata();
            const logData = {
                sdk: sdkMetadata.name,
                sdkv: sdkMetadata.version,
                cv: this.#metadata.clerkVersion ?? "",
                lvl: entry.level,
                msg: entry.message,
                ts: normalizedTimestamp.toISOString(),
                pk: this.#metadata.publishableKey || null,
                payload: this.#sanitizeContext(entry.context)
            };
            this.#buffer.push({
                kind: "log",
                value: logData
            });
            this.#scheduleFlush();
        } catch (error) {
            console.error("[clerk/telemetry] Error recording telemetry log entry", error);
        }
    }
    #shouldRecord(preparedPayload, eventSamplingRate) {
        return this.isEnabled && !this.isDebug && this.#shouldBeSampled(preparedPayload, eventSamplingRate);
    }
    #shouldRecordLog(_entry) {
        return true;
    }
    #shouldBeSampled(preparedPayload, eventSamplingRate) {
        const randomSeed = Math.random();
        if (!(randomSeed <= this.#config.samplingRate && (this.#config.perEventSampling === false || typeof eventSamplingRate === "undefined" || randomSeed <= eventSamplingRate))) return false;
        return !this.#eventThrottler.isEventThrottled(preparedPayload);
    }
    #scheduleFlush() {
        if ("TURBOPACK compile-time truthy", 1) {
            this.#flush();
            return;
        }
        //TURBOPACK unreachable
        ;
    }
    #flush() {
        const itemsToSend = [
            ...this.#buffer
        ];
        this.#buffer = [];
        this.#pendingFlush = null;
        if (itemsToSend.length === 0) return;
        const eventsToSend = itemsToSend.filter((item)=>item.kind === "event").map((item)=>item.value);
        const logsToSend = itemsToSend.filter((item)=>item.kind === "log").map((item)=>item.value);
        if (eventsToSend.length > 0) {
            const eventsUrl = new URL("/v1/event", this.#config.endpoint);
            fetch(eventsUrl, {
                headers: {
                    "Content-Type": "application/json"
                },
                keepalive: true,
                method: "POST",
                body: JSON.stringify({
                    events: eventsToSend
                })
            }).catch(()=>void 0);
        }
        if (logsToSend.length > 0) {
            const logsUrl = new URL("/v1/logs", this.#config.endpoint);
            fetch(logsUrl, {
                headers: {
                    "Content-Type": "application/json"
                },
                keepalive: true,
                method: "POST",
                body: JSON.stringify({
                    logs: logsToSend
                })
            }).catch(()=>void 0);
        }
    }
    /**
	* If running in debug mode, log the event and its payload to the console.
	*/ #logEvent(event, payload) {
        if (!this.isDebug) return;
        if (typeof console.groupCollapsed !== "undefined") {
            console.groupCollapsed("[clerk/telemetry]", event);
            console.log(payload);
            console.groupEnd();
        } else console.log("[clerk/telemetry]", event, payload);
    }
    /**
	* If in browser, attempt to lazily grab the SDK metadata from the Clerk singleton, otherwise fallback to the initially passed in values.
	*
	* This is necessary because the sdkMetadata can be set by the host SDK after the TelemetryCollector is instantiated.
	*/ #getSDKMetadata() {
        const sdkMetadata = {
            name: this.#metadata.sdk,
            version: this.#metadata.sdkVersion
        };
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        return sdkMetadata;
    }
    /**
	* Append relevant metadata from the Clerk singleton to the event payload.
	*/ #preparePayload(event, payload) {
        const sdkMetadata = this.#getSDKMetadata();
        return {
            event,
            cv: this.#metadata.clerkVersion ?? "",
            it: this.#metadata.instanceType ?? "",
            sdk: sdkMetadata.name,
            sdkv: sdkMetadata.version,
            ...this.#metadata.publishableKey ? {
                pk: this.#metadata.publishableKey
            } : {},
            ...this.#metadata.secretKey ? {
                sk: this.#metadata.secretKey
            } : {},
            payload
        };
    }
    /**
	* Best-effort sanitization of the context payload. Returns a plain object with JSON-serializable
	* values or null when the input is missing or not serializable. Arrays are not accepted.
	*/ #sanitizeContext(context) {
        if (context === null || typeof context === "undefined") return null;
        if (typeof context !== "object") return null;
        try {
            const cleaned = JSON.parse(JSON.stringify(context));
            if (cleaned && typeof cleaned === "object" && !Array.isArray(cleaned)) return cleaned;
            return null;
        } catch  {
            return null;
        }
    }
};
//#endregion
//#region src/telemetry/events/component-mounted.ts
const EVENT_COMPONENT_MOUNTED = "COMPONENT_MOUNTED";
const EVENT_COMPONENT_OPENED = "COMPONENT_OPENED";
const EVENT_SAMPLING_RATE$3 = .1;
/** Increase sampling for high-signal auth components on mount. */ const AUTH_COMPONENTS = new Set([
    "SignIn",
    "SignUp"
]);
/**
* Returns the per-event sampling rate for component-mounted telemetry events.
* Uses a higher rate for SignIn/SignUp to improve signal quality.
*
*  @internal
*/ function getComponentMountedSamplingRate(component) {
    return AUTH_COMPONENTS.has(component) ? 1 : EVENT_SAMPLING_RATE$3;
}
/**
* Factory for prebuilt component telemetry events.
*
* @internal
*/ function createPrebuiltComponentEvent(event) {
    return function(component, props, additionalPayload) {
        return {
            event,
            eventSamplingRate: event === EVENT_COMPONENT_MOUNTED ? getComponentMountedSamplingRate(component) : EVENT_SAMPLING_RATE$3,
            payload: {
                component,
                appearanceProp: Boolean(props?.appearance),
                baseTheme: Boolean(props?.appearance?.baseTheme),
                elements: Boolean(props?.appearance?.elements),
                variables: Boolean(props?.appearance?.variables),
                ...additionalPayload
            }
        };
    };
}
/**
* Helper function for `telemetry.record()`. Create a consistent event object for when a prebuilt (AIO) component is mounted.
*
* @param component - The name of the component.
* @param props - The props passed to the component. Will be filtered to a known list of props.
* @param additionalPayload - Additional data to send with the event.
* @example
* telemetry.record(eventPrebuiltComponentMounted('SignUp', props));
*/ function eventPrebuiltComponentMounted(component, props, additionalPayload) {
    return createPrebuiltComponentEvent(EVENT_COMPONENT_MOUNTED)(component, props, additionalPayload);
}
/**
* Helper function for `telemetry.record()`. Create a consistent event object for when a prebuilt (AIO) component is opened as a modal.
*
* @param component - The name of the component.
* @param props - The props passed to the component. Will be filtered to a known list of props.
* @param additionalPayload - Additional data to send with the event.
* @example
* telemetry.record(eventPrebuiltComponentOpened('GoogleOneTap', props));
*/ function eventPrebuiltComponentOpened(component, props, additionalPayload) {
    return createPrebuiltComponentEvent(EVENT_COMPONENT_OPENED)(component, props, additionalPayload);
}
/**
* Helper function for `telemetry.record()`. Create a consistent event object for when a component is mounted. Use `eventPrebuiltComponentMounted` for prebuilt components.
*
* **Caution:** Filter the `props` you pass to this function to avoid sending too much data.
*
* @param component - The name of the component.
* @param props - The props passed to the component. Ideally you only pass a handful of props here.
* @example
* telemetry.record(eventComponentMounted('SignUp', props));
*/ function eventComponentMounted(component, props = {}) {
    return {
        event: EVENT_COMPONENT_MOUNTED,
        eventSamplingRate: getComponentMountedSamplingRate(component),
        payload: {
            component,
            ...props
        }
    };
}
//#endregion
//#region src/telemetry/events/method-called.ts
const EVENT_METHOD_CALLED = "METHOD_CALLED";
const EVENT_SAMPLING_RATE$2 = .1;
/**
* Fired when a helper method is called from a Clerk SDK.
*/ function eventMethodCalled(method, payload) {
    return {
        event: EVENT_METHOD_CALLED,
        eventSamplingRate: EVENT_SAMPLING_RATE$2,
        payload: {
            method,
            ...payload
        }
    };
}
//#endregion
//#region src/telemetry/events/framework-metadata.ts
const EVENT_FRAMEWORK_METADATA = "FRAMEWORK_METADATA";
const EVENT_SAMPLING_RATE$1 = .1;
/**
* Fired when a helper method is called from a Clerk SDK.
*/ function eventFrameworkMetadata(payload) {
    return {
        event: EVENT_FRAMEWORK_METADATA,
        eventSamplingRate: EVENT_SAMPLING_RATE$1,
        payload
    };
}
//#endregion
//#region src/telemetry/events/theme-usage.ts
const EVENT_THEME_USAGE = "THEME_USAGE";
const EVENT_SAMPLING_RATE = 1;
/**
* Helper function for `telemetry.record()`. Create a consistent event object for tracking theme usage in ClerkProvider.
*
* @param appearance - The appearance prop from ClerkProvider.
* @example
* telemetry.record(eventThemeUsage(appearance));
*/ function eventThemeUsage(appearance) {
    return {
        event: EVENT_THEME_USAGE,
        eventSamplingRate: EVENT_SAMPLING_RATE,
        payload: analyzeThemeUsage(appearance)
    };
}
/**
* Analyzes the appearance prop to extract theme usage information for telemetry.
*
* @internal
*/ function analyzeThemeUsage(appearance) {
    if (!appearance || typeof appearance !== "object") return {};
    const themeProperty = appearance.theme || appearance.baseTheme;
    if (!themeProperty) return {};
    let themeName;
    if (Array.isArray(themeProperty)) for (const theme of themeProperty){
        const name = extractThemeName(theme);
        if (name) {
            themeName = name;
            break;
        }
    }
    else themeName = extractThemeName(themeProperty);
    return {
        themeName
    };
}
/**
* Extracts the theme name from a theme object.
*
* @internal
*/ function extractThemeName(theme) {
    if (typeof theme === "string") return theme;
    if (typeof theme === "object" && theme !== null) {
        if ("name" in theme && typeof theme.name === "string") return theme.name;
    }
}
;
 //# sourceMappingURL=telemetry-wqMDWlvR.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/telemetry.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/telemetry-wqMDWlvR.mjs [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
}),
"[project]/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/index.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClerkClient",
    ()=>createClerkClient,
    "verifyToken",
    ()=>verifyToken2
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TTM76E4X.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$YBVFDYDR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-YBVFDYDR.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$P263NW7Z$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-P263NW7Z.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-7X3P2E3X.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TCIXZLLW.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$RPS7XK5K$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-RPS7XK5K.mjs [app-rsc] (ecmascript)");
// src/index.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/telemetry.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/telemetry-wqMDWlvR.mjs [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
var verifyToken2 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$P263NW7Z$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["withLegacyReturn"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["verifyToken"]);
function createClerkClient(options) {
    const opts = {
        ...options
    };
    const apiClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createBackendApiClient"])(opts);
    const requestState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createAuthenticateRequest"])({
        options: opts,
        apiClient
    });
    const telemetry = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TelemetryCollector"]({
        publishableKey: opts.publishableKey,
        secretKey: opts.secretKey,
        samplingRate: 0.1,
        ...opts.sdkMetadata ? {
            sdk: opts.sdkMetadata.name,
            sdkVersion: opts.sdkMetadata.version
        } : {},
        ...opts.telemetry || {}
    });
    return {
        ...apiClient,
        ...requestState,
        telemetry
    };
}
;
 //# sourceMappingURL=index.mjs.map
}),
"[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/createClerkClient.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClerkClientWithOptions",
    ()=>createClerkClientWithOptions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/index.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/constants.js [app-rsc] (ecmascript)");
;
;
;
const clerkClientDefaultOptions = {
    secretKey: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SECRET_KEY"],
    publishableKey: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PUBLISHABLE_KEY"],
    apiUrl: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["API_URL"],
    apiVersion: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["API_VERSION"],
    userAgent: `${"@clerk/nextjs"}@${"6.36.5"}`,
    proxyUrl: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PROXY_URL"],
    domain: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DOMAIN"],
    isSatellite: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IS_SATELLITE"],
    machineSecretKey: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MACHINE_SECRET_KEY"],
    sdkMetadata: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SDK_METADATA"],
    telemetry: {
        disabled: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TELEMETRY_DISABLED"],
        debug: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TELEMETRY_DEBUG"]
    }
};
const createClerkClientWithOptions = (options)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClerkClient"])({
        ...clerkClientDefaultOptions,
        ...options
    });
;
 //# sourceMappingURL=createClerkClient.js.map
}),
"[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/chunk-BUSYA2B4.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__commonJS",
    ()=>__commonJS
]);
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod)=>function __require() {
        return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = {
            exports: {}
        }).exports, mod), mod.exports;
    };
;
 //# sourceMappingURL=chunk-BUSYA2B4.js.map
}),
"[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/runtime/node/safe-node-apis.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$chunk$2d$BUSYA2B4$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/chunk-BUSYA2B4.js [app-rsc] (ecmascript)");
;
var require_safe_node_apis = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$chunk$2d$BUSYA2B4$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["__commonJS"])({
    "src/runtime/node/safe-node-apis.js" (exports, module) {
        const { existsSync, writeFileSync, readFileSync, appendFileSync, mkdirSync, rmSync } = __turbopack_context__.r("[externals]/node:fs [external] (node:fs, cjs)");
        const path = __turbopack_context__.r("[externals]/node:path [external] (node:path, cjs)");
        const fs = {
            existsSync,
            writeFileSync,
            readFileSync,
            appendFileSync,
            mkdirSync,
            rmSync
        };
        const cwd = ()=>process.cwd();
        module.exports = {
            fs,
            path,
            cwd
        };
    }
});
const __TURBOPACK__default__export__ = require_safe_node_apis();
 //# sourceMappingURL=safe-node-apis.js.map
}),
"[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/fs/utils.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "nodeCwdOrThrow",
    ()=>nodeCwdOrThrow,
    "nodeFsOrThrow",
    ()=>nodeFsOrThrow,
    "nodePathOrThrow",
    ()=>nodePathOrThrow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$runtime$2f$node$2f$safe$2d$node$2d$apis$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/runtime/node/safe-node-apis.js [app-rsc] (ecmascript)");
;
;
function assertNotNullable(value, moduleName) {
    if (!value) {
        throw new Error(`Clerk: ${moduleName} is missing. This is an internal error. Please contact Clerk's support.`);
    }
}
const nodeFsOrThrow = ()=>{
    assertNotNullable(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$runtime$2f$node$2f$safe$2d$node$2d$apis$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].fs, "fs");
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$runtime$2f$node$2f$safe$2d$node$2d$apis$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].fs;
};
const nodePathOrThrow = ()=>{
    assertNotNullable(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$runtime$2f$node$2f$safe$2d$node$2d$apis$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].path, "path");
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$runtime$2f$node$2f$safe$2d$node$2d$apis$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].path;
};
const nodeCwdOrThrow = ()=>{
    assertNotNullable(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$runtime$2f$node$2f$safe$2d$node$2d$apis$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].cwd, "cwd");
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$runtime$2f$node$2f$safe$2d$node$2d$apis$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].cwd;
};
;
 //# sourceMappingURL=utils.js.map
}),
"[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/keyless-telemetry.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "detectKeylessEnvDrift",
    ()=>detectKeylessEnvDrift
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/feature-flags.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$createClerkClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/createClerkClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$fs$2f$utils$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/fs/utils.js [app-rsc] (ecmascript)");
;
;
;
;
const EVENT_KEYLESS_ENV_DRIFT_DETECTED = "KEYLESS_ENV_DRIFT_DETECTED";
const EVENT_SAMPLING_RATE = 1;
const TELEMETRY_FLAG_FILE = ".clerk/.tmp/telemetry.json";
function getTelemetryFlagFilePath() {
    const path = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$fs$2f$utils$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["nodePathOrThrow"])();
    return path.join(process.cwd(), TELEMETRY_FLAG_FILE);
}
function tryMarkTelemetryEventAsFired() {
    try {
        if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canUseKeyless"]) {
            const { mkdirSync, writeFileSync } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$fs$2f$utils$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["nodeFsOrThrow"])();
            const path = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$fs$2f$utils$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["nodePathOrThrow"])();
            const flagFilePath = getTelemetryFlagFilePath();
            const flagDirectory = path.dirname(flagFilePath);
            mkdirSync(flagDirectory, {
                recursive: true
            });
            const flagData = {
                firedAt: /* @__PURE__ */ new Date().toISOString(),
                event: EVENT_KEYLESS_ENV_DRIFT_DETECTED
            };
            writeFileSync(flagFilePath, JSON.stringify(flagData, null, 2), {
                flag: "wx"
            });
            return true;
        } else {
            return false;
        }
    } catch (error) {
        if ((error == null ? void 0 : error.code) === "EEXIST") {
            return false;
        }
        console.warn("Failed to create telemetry flag file:", error);
        return false;
    }
}
async function detectKeylessEnvDrift() {
    var _a, _b;
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canUseKeyless"]) {
        return;
    }
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const { safeParseClerkFile } = await __turbopack_context__.A("[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/keyless-node.js [app-rsc] (ecmascript, async loader)");
        const keylessFile = safeParseClerkFile();
        if (!keylessFile) {
            return;
        }
        const envPublishableKey = ("TURBOPACK compile-time value", "pk_test_cGxlYXNlZC1vc3RyaWNoLTM1LmNsZXJrLmFjY291bnRzLmRldiQ");
        const envSecretKey = process.env.CLERK_SECRET_KEY;
        const hasEnvVars = Boolean(envPublishableKey || envSecretKey);
        const keylessFileHasKeys = Boolean((keylessFile == null ? void 0 : keylessFile.publishableKey) && (keylessFile == null ? void 0 : keylessFile.secretKey));
        const envVarsMissing = !envPublishableKey && !envSecretKey;
        if (!hasEnvVars && !keylessFileHasKeys) {
            return;
        }
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        if (!keylessFileHasKeys) {
            return;
        }
        if (!hasEnvVars) {
            return;
        }
        const publicKeyMatch = Boolean(envPublishableKey && keylessFile.publishableKey && envPublishableKey === keylessFile.publishableKey);
        const secretKeyMatch = Boolean(envSecretKey && keylessFile.secretKey && envSecretKey === keylessFile.secretKey);
        const hasActualDrift = envPublishableKey && keylessFile.publishableKey && !publicKeyMatch || envSecretKey && keylessFile.secretKey && !secretKeyMatch;
        if (!hasActualDrift) {
            return;
        }
        const payload = {
            publicKeyMatch,
            secretKeyMatch,
            envVarsMissing,
            keylessFileHasKeys,
            keylessPublishableKey: (_a = keylessFile.publishableKey) != null ? _a : "",
            envPublishableKey: envPublishableKey != null ? envPublishableKey : ""
        };
        const clerkClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$createClerkClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClerkClientWithOptions"])({
            publishableKey: keylessFile.publishableKey,
            secretKey: keylessFile.secretKey,
            telemetry: {
                samplingRate: 1
            }
        });
        const shouldFireEvent = tryMarkTelemetryEventAsFired();
        if (shouldFireEvent) {
            const driftDetectedEvent = {
                event: EVENT_KEYLESS_ENV_DRIFT_DETECTED,
                eventSamplingRate: EVENT_SAMPLING_RATE,
                payload
            };
            (_b = clerkClient.telemetry) == null ? void 0 : _b.record(driftDetectedEvent);
        }
    } catch (error) {
        console.warn("Failed to detect keyless environment drift:", error);
    }
}
;
 //# sourceMappingURL=keyless-telemetry.js.map
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__64b591d6._.js.map