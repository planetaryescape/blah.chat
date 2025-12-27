module.exports = [
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CURRENT_DEV_INSTANCE_SUFFIXES",
    ()=>CURRENT_DEV_INSTANCE_SUFFIXES,
    "DEV_OR_STAGING_SUFFIXES",
    ()=>DEV_OR_STAGING_SUFFIXES,
    "LEGACY_DEV_INSTANCE_SUFFIXES",
    ()=>LEGACY_DEV_INSTANCE_SUFFIXES,
    "LOCAL_API_URL",
    ()=>LOCAL_API_URL,
    "LOCAL_ENV_SUFFIXES",
    ()=>LOCAL_ENV_SUFFIXES,
    "PROD_API_URL",
    ()=>PROD_API_URL,
    "STAGING_API_URL",
    ()=>STAGING_API_URL,
    "STAGING_ENV_SUFFIXES",
    ()=>STAGING_ENV_SUFFIXES,
    "iconImageUrl",
    ()=>iconImageUrl
]);
//#region src/constants.ts
const LEGACY_DEV_INSTANCE_SUFFIXES = [
    ".lcl.dev",
    ".lclstage.dev",
    ".lclclerk.com"
];
const CURRENT_DEV_INSTANCE_SUFFIXES = [
    ".accounts.dev",
    ".accountsstage.dev",
    ".accounts.lclclerk.com"
];
const DEV_OR_STAGING_SUFFIXES = [
    ".lcl.dev",
    ".stg.dev",
    ".lclstage.dev",
    ".stgstage.dev",
    ".dev.lclclerk.com",
    ".stg.lclclerk.com",
    ".accounts.lclclerk.com",
    "accountsstage.dev",
    "accounts.dev"
];
const LOCAL_ENV_SUFFIXES = [
    ".lcl.dev",
    "lclstage.dev",
    ".lclclerk.com",
    ".accounts.lclclerk.com"
];
const STAGING_ENV_SUFFIXES = [
    ".accountsstage.dev"
];
const LOCAL_API_URL = "https://api.lclclerk.com";
const STAGING_API_URL = "https://api.clerkstage.dev";
const PROD_API_URL = "https://api.clerk.com";
/**
* Returns the URL for a static image
* using the new img.clerk.com service
*/ function iconImageUrl(id, format = "svg") {
    return `https://img.clerk.com/static/${id}.${format}`;
}
;
 //# sourceMappingURL=constants-ByUssRbE.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isomorphicAtob",
    ()=>isomorphicAtob
]);
//#region src/isomorphicAtob.ts
/**
* A function that decodes a string of data which has been encoded using base-64 encoding.
* Uses `atob` if available, otherwise uses `Buffer` from `global`. If neither are available, returns the data as-is.
*/ const isomorphicAtob = (data)=>{
    if (typeof atob !== "undefined" && typeof atob === "function") return atob(data);
    else if (("TURBOPACK compile-time value", "object") !== "undefined" && /*TURBOPACK member replacement*/ __turbopack_context__.g.Buffer) return new /*TURBOPACK member replacement*/ __turbopack_context__.g.Buffer(data, "base64").toString();
    return data;
};
;
 //# sourceMappingURL=isomorphicAtob-DybBXGFR.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isomorphicBtoa",
    ()=>isomorphicBtoa
]);
//#region src/isomorphicBtoa.ts
const isomorphicBtoa = (data)=>{
    if (typeof btoa !== "undefined" && typeof btoa === "function") return btoa(data);
    else if (("TURBOPACK compile-time value", "object") !== "undefined" && /*TURBOPACK member replacement*/ __turbopack_context__.g.Buffer) return new /*TURBOPACK member replacement*/ __turbopack_context__.g.Buffer(data).toString("base64");
    return data;
};
;
 //# sourceMappingURL=isomorphicBtoa-Dr7WubZv.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildPublishableKey",
    ()=>buildPublishableKey,
    "createDevOrStagingUrlCache",
    ()=>createDevOrStagingUrlCache,
    "getCookieSuffix",
    ()=>getCookieSuffix,
    "getSuffixedCookieName",
    ()=>getSuffixedCookieName,
    "isDevelopmentFromPublishableKey",
    ()=>isDevelopmentFromPublishableKey,
    "isDevelopmentFromSecretKey",
    ()=>isDevelopmentFromSecretKey,
    "isProductionFromPublishableKey",
    ()=>isProductionFromPublishableKey,
    "isProductionFromSecretKey",
    ()=>isProductionFromSecretKey,
    "isPublishableKey",
    ()=>isPublishableKey,
    "parsePublishableKey",
    ()=>parsePublishableKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs [app-ssr] (ecmascript)");
;
;
;
//#region src/keys.ts
/** Prefix used for production publishable keys */ const PUBLISHABLE_KEY_LIVE_PREFIX = "pk_live_";
/** Prefix used for development publishable keys */ const PUBLISHABLE_KEY_TEST_PREFIX = "pk_test_";
/**
* Regular expression that matches development frontend API keys.
* Matches patterns like: foo-bar-13.clerk.accounts.dev.
*/ const PUBLISHABLE_FRONTEND_API_DEV_REGEX = /^(([a-z]+)-){2}([0-9]{1,2})\.clerk\.accounts([a-z.]*)(dev|com)$/i;
/**
* Converts a frontend API URL into a base64-encoded publishable key.
*
* @param frontendApi - The frontend API URL (e.g., 'clerk.example.com').
* @returns A base64-encoded publishable key with appropriate prefix (pk_live_ or pk_test_).
*/ function buildPublishableKey(frontendApi) {
    return `${PUBLISHABLE_FRONTEND_API_DEV_REGEX.test(frontendApi) || frontendApi.startsWith("clerk.") && __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LEGACY_DEV_INSTANCE_SUFFIXES"].some((s)=>frontendApi.endsWith(s)) ? PUBLISHABLE_KEY_TEST_PREFIX : PUBLISHABLE_KEY_LIVE_PREFIX}${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isomorphicBtoa"])(`${frontendApi}$`)}`;
}
/**
* Validates that a decoded publishable key has the correct format.
* The decoded value should be a frontend API followed by exactly one '$' at the end.
*
* @param decoded - The decoded publishable key string to validate.
* @returns `true` if the decoded key has valid format, `false` otherwise.
*/ function isValidDecodedPublishableKey(decoded) {
    if (!decoded.endsWith("$")) return false;
    const withoutTrailing = decoded.slice(0, -1);
    if (withoutTrailing.includes("$")) return false;
    return withoutTrailing.includes(".");
}
/**
* Parses and validates a publishable key, extracting the frontend API and instance type.
*
* @param key - The publishable key to parse.
* @param options - Configuration options for parsing.
* @param options.fatal
* @param options.domain
* @param options.proxyUrl
* @param options.isSatellite
* @returns Parsed publishable key object with instanceType and frontendApi, or null if invalid.
*
* @throws {Error} When options.fatal is true and key is missing or invalid.
*/ function parsePublishableKey(key, options = {}) {
    key = key || "";
    if (!key || !isPublishableKey(key)) {
        if (options.fatal && !key) throw new Error("Publishable key is missing. Ensure that your publishable key is correctly configured. Double-check your environment configuration for your keys, or access them here: https://dashboard.clerk.com/last-active?path=api-keys");
        if (options.fatal && !isPublishableKey(key)) throw new Error("Publishable key not valid.");
        return null;
    }
    const instanceType = key.startsWith(PUBLISHABLE_KEY_LIVE_PREFIX) ? "production" : "development";
    let decodedFrontendApi;
    try {
        decodedFrontendApi = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isomorphicAtob"])(key.split("_")[2]);
    } catch  {
        if (options.fatal) throw new Error("Publishable key not valid: Failed to decode key.");
        return null;
    }
    if (!isValidDecodedPublishableKey(decodedFrontendApi)) {
        if (options.fatal) throw new Error("Publishable key not valid: Decoded key has invalid format.");
        return null;
    }
    let frontendApi = decodedFrontendApi.slice(0, -1);
    if (options.proxyUrl) frontendApi = options.proxyUrl;
    else if (instanceType !== "development" && options.domain && options.isSatellite) frontendApi = `clerk.${options.domain}`;
    return {
        instanceType,
        frontendApi
    };
}
/**
* Checks if the provided key is a valid publishable key.
*
* @param key - The key to be checked. Defaults to an empty string if not provided.
* @returns `true` if 'key' is a valid publishable key, `false` otherwise.
*/ function isPublishableKey(key = "") {
    try {
        if (!(key.startsWith(PUBLISHABLE_KEY_LIVE_PREFIX) || key.startsWith(PUBLISHABLE_KEY_TEST_PREFIX))) return false;
        const parts = key.split("_");
        if (parts.length !== 3) return false;
        const encodedPart = parts[2];
        if (!encodedPart) return false;
        return isValidDecodedPublishableKey((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isomorphicAtob"])(encodedPart));
    } catch  {
        return false;
    }
}
/**
* Creates a memoized cache for checking if URLs are development or staging environments.
* Uses a Map to cache results for better performance on repeated checks.
*
* @returns An object with an isDevOrStagingUrl method that checks if a URL is dev/staging.
*/ function createDevOrStagingUrlCache() {
    const devOrStagingUrlCache = /* @__PURE__ */ new Map();
    return {
        isDevOrStagingUrl: (url)=>{
            if (!url) return false;
            const hostname = typeof url === "string" ? url : url.hostname;
            let res = devOrStagingUrlCache.get(hostname);
            if (res === void 0) {
                res = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DEV_OR_STAGING_SUFFIXES"].some((s)=>hostname.endsWith(s));
                devOrStagingUrlCache.set(hostname, res);
            }
            return res;
        }
    };
}
/**
* Checks if a publishable key is for a development environment.
* Supports both legacy format (test_) and new format (pk_test_).
*
* @param apiKey - The API key to check.
* @returns `true` if the key is for development, `false` otherwise.
*/ function isDevelopmentFromPublishableKey(apiKey) {
    return apiKey.startsWith("test_") || apiKey.startsWith("pk_test_");
}
/**
* Checks if a publishable key is for a production environment.
* Supports both legacy format (live_) and new format (pk_live_).
*
* @param apiKey - The API key to check.
* @returns `true` if the key is for production, `false` otherwise.
*/ function isProductionFromPublishableKey(apiKey) {
    return apiKey.startsWith("live_") || apiKey.startsWith("pk_live_");
}
/**
* Checks if a secret key is for a development environment.
* Supports both legacy format (test_) and new format (sk_test_).
*
* @param apiKey - The secret key to check.
* @returns `true` if the key is for development, `false` otherwise.
*/ function isDevelopmentFromSecretKey(apiKey) {
    return apiKey.startsWith("test_") || apiKey.startsWith("sk_test_");
}
/**
* Checks if a secret key is for a production environment.
* Supports both legacy format (live_) and new format (sk_live_).
*
* @param apiKey - The secret key to check.
* @returns `true` if the key is for production, `false` otherwise.
*/ function isProductionFromSecretKey(apiKey) {
    return apiKey.startsWith("live_") || apiKey.startsWith("sk_live_");
}
/**
* Generates a unique cookie suffix based on the publishable key using SHA-1 hashing.
* The suffix is base64-encoded and URL-safe (+ and / characters are replaced).
*
* @param publishableKey - The publishable key to generate suffix from.
* @param subtle - The SubtleCrypto interface to use for hashing (defaults to globalThis.crypto.subtle).
* @returns A promise that resolves to an 8-character URL-safe base64 string.
*/ async function getCookieSuffix(publishableKey, subtle = globalThis.crypto.subtle) {
    const data = new TextEncoder().encode(publishableKey);
    const digest = await subtle.digest("sha-1", data);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isomorphicBtoa"])(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/gi, "-").replace(/\//gi, "_").substring(0, 8);
}
/**
* Creates a suffixed cookie name by appending the cookie suffix to the base name.
* Used to create unique cookie names based on the publishable key.
*
* @param cookieName - The base cookie name.
* @param cookieSuffix - The suffix to append (typically generated by getCookieSuffix).
* @returns The suffixed cookie name in format: `${cookieName}_${cookieSuffix}`.
*/ const getSuffixedCookieName = (cookieName, cookieSuffix)=>{
    return `${cookieName}_${cookieSuffix}`;
};
;
 //# sourceMappingURL=keys-YNv6yjKk.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-errors-CS1pNy8i.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isReverificationHint",
    ()=>isReverificationHint,
    "reverificationError",
    ()=>reverificationError,
    "reverificationErrorResponse",
    ()=>reverificationErrorResponse
]);
//#region src/authorization-errors.ts
const REVERIFICATION_REASON = "reverification-error";
const reverificationError = (missingConfig)=>({
        clerk_error: {
            type: "forbidden",
            reason: REVERIFICATION_REASON,
            metadata: {
                reverification: missingConfig
            }
        }
    });
const reverificationErrorResponse = (...args)=>new Response(JSON.stringify(reverificationError(...args)), {
        status: 403
    });
const isReverificationHint = (result)=>{
    return result && typeof result === "object" && "clerk_error" in result && result.clerk_error?.type === "forbidden" && result.clerk_error?.reason === REVERIFICATION_REASON;
};
;
 //# sourceMappingURL=authorization-errors-CS1pNy8i.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-D2ans7vW.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createCheckAuthorization",
    ()=>createCheckAuthorization,
    "resolveAuthState",
    ()=>resolveAuthState,
    "splitByScope",
    ()=>splitByScope,
    "validateReverificationConfig",
    ()=>validateReverificationConfig
]);
//#region src/authorization.ts
const TYPES_TO_OBJECTS = {
    strict_mfa: {
        afterMinutes: 10,
        level: "multi_factor"
    },
    strict: {
        afterMinutes: 10,
        level: "second_factor"
    },
    moderate: {
        afterMinutes: 60,
        level: "second_factor"
    },
    lax: {
        afterMinutes: 1440,
        level: "second_factor"
    }
};
const ALLOWED_LEVELS = new Set([
    "first_factor",
    "second_factor",
    "multi_factor"
]);
const ALLOWED_TYPES = new Set([
    "strict_mfa",
    "strict",
    "moderate",
    "lax"
]);
const isValidMaxAge = (maxAge)=>typeof maxAge === "number" && maxAge > 0;
const isValidLevel = (level)=>ALLOWED_LEVELS.has(level);
const isValidVerificationType = (type)=>ALLOWED_TYPES.has(type);
const prefixWithOrg = (value)=>value.replace(/^(org:)*/, "org:");
/**
* Checks if a user has the required Organization-level authorization.
* Verifies if the user has the specified Role or Permission within their Organization.
* @returns null, if unable to determine due to missing data or unspecified Role/Permission.
*/ const checkOrgAuthorization = (params, options)=>{
    const { orgId, orgRole, orgPermissions } = options;
    if (!params.role && !params.permission) return null;
    if (!orgId || !orgRole || !orgPermissions) return null;
    if (params.permission) return orgPermissions.includes(prefixWithOrg(params.permission));
    if (params.role) return prefixWithOrg(orgRole) === prefixWithOrg(params.role);
    return null;
};
const checkForFeatureOrPlan = (claim, featureOrPlan)=>{
    const { org: orgFeatures, user: userFeatures } = splitByScope(claim);
    const [scope, _id] = featureOrPlan.split(":");
    const id = _id || scope;
    if (scope === "org") return orgFeatures.includes(id);
    else if (scope === "user") return userFeatures.includes(id);
    else return [
        ...orgFeatures,
        ...userFeatures
    ].includes(id);
};
const checkBillingAuthorization = (params, options)=>{
    const { features, plans } = options;
    if (params.feature && features) return checkForFeatureOrPlan(features, params.feature);
    if (params.plan && plans) return checkForFeatureOrPlan(plans, params.plan);
    return null;
};
const splitByScope = (fea)=>{
    const features = fea ? fea.split(",").map((f)=>f.trim()) : [];
    return {
        org: features.filter((f)=>f.split(":")[0].includes("o")).map((f)=>f.split(":")[1]),
        user: features.filter((f)=>f.split(":")[0].includes("u")).map((f)=>f.split(":")[1])
    };
};
const validateReverificationConfig = (config)=>{
    if (!config) return false;
    const convertConfigToObject = (config$1)=>{
        if (typeof config$1 === "string") return TYPES_TO_OBJECTS[config$1];
        return config$1;
    };
    const isValidStringValue = typeof config === "string" && isValidVerificationType(config);
    const isValidObjectValue = typeof config === "object" && isValidLevel(config.level) && isValidMaxAge(config.afterMinutes);
    if (isValidStringValue || isValidObjectValue) return convertConfigToObject.bind(null, config);
    return false;
};
/**
* Evaluates if the user meets re-verification authentication requirements.
* Compares the user's factor verification ages against the specified maxAge.
* Handles different verification levels (first factor, second factor, multi-factor).
* @returns null, if requirements or verification data are missing.
*/ const checkReverificationAuthorization = (params, { factorVerificationAge })=>{
    if (!params.reverification || !factorVerificationAge) return null;
    const isValidReverification = validateReverificationConfig(params.reverification);
    if (!isValidReverification) return null;
    const { level, afterMinutes } = isValidReverification();
    const [factor1Age, factor2Age] = factorVerificationAge;
    const isValidFactor1 = factor1Age !== -1 ? afterMinutes > factor1Age : null;
    const isValidFactor2 = factor2Age !== -1 ? afterMinutes > factor2Age : null;
    switch(level){
        case "first_factor":
            return isValidFactor1;
        case "second_factor":
            return factor2Age !== -1 ? isValidFactor2 : isValidFactor1;
        case "multi_factor":
            return factor2Age === -1 ? isValidFactor1 : isValidFactor1 && isValidFactor2;
    }
};
/**
* Creates a function for comprehensive user authorization checks.
* Combines organization-level and reverification authentication checks.
* The returned function authorizes if both checks pass, or if at least one passes
* when the other is indeterminate. Fails if userId is missing.
*/ const createCheckAuthorization = (options)=>{
    return (params)=>{
        if (!options.userId) return false;
        const billingAuthorization = checkBillingAuthorization(params, options);
        const orgAuthorization = checkOrgAuthorization(params, options);
        const reverificationAuthorization = checkReverificationAuthorization(params, options);
        if ([
            billingAuthorization || orgAuthorization,
            reverificationAuthorization
        ].some((a)=>a === null)) return [
            billingAuthorization || orgAuthorization,
            reverificationAuthorization
        ].some((a)=>a === true);
        return [
            billingAuthorization || orgAuthorization,
            reverificationAuthorization
        ].every((a)=>a === true);
    };
};
/**
* Shared utility function that centralizes auth state resolution logic,
* preventing duplication across different packages.
* @internal
*/ const resolveAuthState = ({ authObject: { sessionId, sessionStatus, userId, actor, orgId, orgRole, orgSlug, signOut, getToken, has, sessionClaims }, options: { treatPendingAsSignedOut = true } })=>{
    if (sessionId === void 0 && userId === void 0) return {
        isLoaded: false,
        isSignedIn: void 0,
        sessionId,
        sessionClaims: void 0,
        userId,
        actor: void 0,
        orgId: void 0,
        orgRole: void 0,
        orgSlug: void 0,
        has: void 0,
        signOut,
        getToken
    };
    if (sessionId === null && userId === null) return {
        isLoaded: true,
        isSignedIn: false,
        sessionId,
        userId,
        sessionClaims: null,
        actor: null,
        orgId: null,
        orgRole: null,
        orgSlug: null,
        has: ()=>false,
        signOut,
        getToken
    };
    if (treatPendingAsSignedOut && sessionStatus === "pending") return {
        isLoaded: true,
        isSignedIn: false,
        sessionId: null,
        userId: null,
        sessionClaims: null,
        actor: null,
        orgId: null,
        orgRole: null,
        orgSlug: null,
        has: ()=>false,
        signOut,
        getToken
    };
    if (!!sessionId && !!sessionClaims && !!userId && !!orgId && !!orgRole) return {
        isLoaded: true,
        isSignedIn: true,
        sessionId,
        sessionClaims,
        userId,
        actor: actor || null,
        orgId,
        orgRole,
        orgSlug: orgSlug || null,
        has,
        signOut,
        getToken
    };
    if (!!sessionId && !!sessionClaims && !!userId && !orgId) return {
        isLoaded: true,
        isSignedIn: true,
        sessionId,
        sessionClaims,
        userId,
        actor: actor || null,
        orgId: null,
        orgRole: null,
        orgSlug: null,
        has,
        signOut,
        getToken
    };
};
;
 //# sourceMappingURL=authorization-D2ans7vW.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ClerkAPIError",
    ()=>ClerkAPIError,
    "ClerkAPIResponseError",
    ()=>ClerkAPIResponseError,
    "ClerkError",
    ()=>ClerkError,
    "ClerkRuntimeError",
    ()=>ClerkRuntimeError,
    "ClerkWebAuthnError",
    ()=>ClerkWebAuthnError,
    "EmailLinkError",
    ()=>EmailLinkError,
    "EmailLinkErrorCode",
    ()=>EmailLinkErrorCode,
    "EmailLinkErrorCodeStatus",
    ()=>EmailLinkErrorCodeStatus,
    "MissingExpiredTokenError",
    ()=>MissingExpiredTokenError,
    "buildErrorThrower",
    ()=>buildErrorThrower,
    "createClerkGlobalHookError",
    ()=>createClerkGlobalHookError,
    "errorToJSON",
    ()=>errorToJSON,
    "is4xxError",
    ()=>is4xxError,
    "isCaptchaError",
    ()=>isCaptchaError,
    "isClerkAPIError",
    ()=>isClerkAPIError,
    "isClerkAPIResponseError",
    ()=>isClerkAPIResponseError,
    "isClerkError",
    ()=>isClerkError,
    "isClerkRuntimeError",
    ()=>isClerkRuntimeError,
    "isEmailLinkError",
    ()=>isEmailLinkError,
    "isKnownError",
    ()=>isKnownError,
    "isMetamaskError",
    ()=>isMetamaskError,
    "isNetworkError",
    ()=>isNetworkError,
    "isPasswordCompromisedError",
    ()=>isPasswordCompromisedError,
    "isPasswordPwnedError",
    ()=>isPasswordPwnedError,
    "isReverificationCancelledError",
    ()=>isReverificationCancelledError,
    "isUnauthorizedError",
    ()=>isUnauthorizedError,
    "isUserLockedError",
    ()=>isUserLockedError,
    "parseError",
    ()=>parseError,
    "parseErrors",
    ()=>parseErrors
]);
//#region src/errors/createErrorTypeGuard.ts
/**
* Creates a type guard function for any error class.
* The returned function can be called as a standalone function or as a method on an error object.
*
* @example
* ```typescript
* class MyError extends Error {}
* const isMyError = createErrorTypeGuard(MyError);
*
* // As a standalone function
* if (isMyError(error)) { ... }
*
* // As a method (when attached to error object)
* if (error.isMyError()) { ... }
* ```
*/ function createErrorTypeGuard(ErrorClass) {
    function typeGuard(error) {
        const target = error ?? this;
        if (!target) throw new TypeError(`${ErrorClass.kind || ErrorClass.name} type guard requires an error object`);
        if (ErrorClass.kind && typeof target === "object" && target !== null && "constructor" in target) {
            if (target.constructor?.kind === ErrorClass.kind) return true;
        }
        return target instanceof ErrorClass;
    }
    return typeGuard;
}
//#endregion
//#region src/errors/clerkApiError.ts
/**
* This error contains the specific error message, code, and any additional metadata that was returned by the Clerk API.
*/ var ClerkAPIError = class {
    static kind = "ClerkApiError";
    code;
    message;
    longMessage;
    meta;
    constructor(json){
        const parsedError = {
            code: json.code,
            message: json.message,
            longMessage: json.long_message,
            meta: {
                paramName: json.meta?.param_name,
                sessionId: json.meta?.session_id,
                emailAddresses: json.meta?.email_addresses,
                identifiers: json.meta?.identifiers,
                zxcvbn: json.meta?.zxcvbn,
                plan: json.meta?.plan,
                isPlanUpgradePossible: json.meta?.is_plan_upgrade_possible
            }
        };
        this.code = parsedError.code;
        this.message = parsedError.message;
        this.longMessage = parsedError.longMessage;
        this.meta = parsedError.meta;
    }
};
/**
* Type guard to check if a value is a ClerkAPIError instance.
*/ const isClerkAPIError = createErrorTypeGuard(ClerkAPIError);
//#endregion
//#region src/errors/parseError.ts
/**
* Parses an array of ClerkAPIErrorJSON objects into an array of ClerkAPIError objects.
*
* @internal
*/ function parseErrors(data = []) {
    return data.length > 0 ? data.map((e)=>new ClerkAPIError(e)) : [];
}
/**
* Parses a ClerkAPIErrorJSON object into a ClerkAPIError object.
*
* @deprecated Use `ClerkAPIError` class instead
*
* @internal
*/ function parseError(error) {
    return new ClerkAPIError(error);
}
/**
* Converts a ClerkAPIError object into a ClerkAPIErrorJSON object.
*
* @internal
*/ function errorToJSON(error) {
    return {
        code: error?.code || "",
        message: error?.message || "",
        long_message: error?.longMessage,
        meta: {
            param_name: error?.meta?.paramName,
            session_id: error?.meta?.sessionId,
            email_addresses: error?.meta?.emailAddresses,
            identifiers: error?.meta?.identifiers,
            zxcvbn: error?.meta?.zxcvbn,
            plan: error?.meta?.plan,
            is_plan_upgrade_possible: error?.meta?.isPlanUpgradePossible
        }
    };
}
//#endregion
//#region src/errors/clerkError.ts
var ClerkError = class ClerkError extends Error {
    static kind = "ClerkError";
    clerkError = true;
    code;
    longMessage;
    docsUrl;
    cause;
    get name() {
        return this.constructor.name;
    }
    constructor(opts){
        super(new.target.formatMessage(new.target.kind, opts.message, opts.code, opts.docsUrl), {
            cause: opts.cause
        });
        Object.setPrototypeOf(this, ClerkError.prototype);
        this.code = opts.code;
        this.docsUrl = opts.docsUrl;
        this.longMessage = opts.longMessage;
        this.cause = opts.cause;
    }
    toString() {
        return `[${this.name}]\nMessage:${this.message}`;
    }
    static formatMessage(name, msg, code, docsUrl) {
        const prefix = "Clerk:";
        const regex = new RegExp(prefix.replace(" ", "\\s*"), "i");
        msg = msg.replace(regex, "");
        msg = `${prefix} ${msg.trim()}\n\n(code="${code}")\n\n`;
        if (docsUrl) msg += `\n\nDocs: ${docsUrl}`;
        return msg;
    }
};
/**
* Type guard to check if a value is a ClerkError instance.
*/ function isClerkError(val) {
    return createErrorTypeGuard(ClerkError)(val) || !!val && typeof val === "object" && "clerkError" in val && val.clerkError === true;
}
//#endregion
//#region src/errors/clerkApiResponseError.ts
var ClerkAPIResponseError = class ClerkAPIResponseError extends ClerkError {
    static kind = "ClerkAPIResponseError";
    status;
    clerkTraceId;
    retryAfter;
    errors;
    constructor(message, options){
        const { data: errorsJson, status, clerkTraceId, retryAfter } = options;
        super({
            ...options,
            message,
            code: "api_response_error"
        });
        Object.setPrototypeOf(this, ClerkAPIResponseError.prototype);
        this.status = status;
        this.clerkTraceId = clerkTraceId;
        this.retryAfter = retryAfter;
        this.errors = (errorsJson || []).map((e)=>new ClerkAPIError(e));
    }
    toString() {
        let message = `[${this.name}]\nMessage:${this.message}\nStatus:${this.status}\nSerialized errors: ${this.errors.map((e)=>JSON.stringify(e))}`;
        if (this.clerkTraceId) message += `\nClerk Trace ID: ${this.clerkTraceId}`;
        return message;
    }
    static formatMessage(name, msg, _, __) {
        return msg;
    }
};
/**
* Type guard to check if an error is a ClerkAPIResponseError.
* Can be called as a standalone function or as a method on an error object.
*
* @example
* // As a standalone function
* if (isClerkAPIResponseError(error)) { ... }
*
* // As a method (when attached to error object)
* if (error.isClerkAPIResponseError()) { ... }
*/ const isClerkAPIResponseError = createErrorTypeGuard(ClerkAPIResponseError);
//#endregion
//#region src/errors/missingExpiredTokenError.ts
/**
* Error class representing a missing expired token error from the API.
* This error occurs when the server requires an expired token to mint a new session token.
*
* Use the static `is` method to check if a ClerkAPIResponseError matches this error type.
*
* @example
* ```typescript
* if (MissingExpiredTokenError.is(error)) {
*   // Handle the missing expired token error
* }
* ```
*/ var MissingExpiredTokenError = class MissingExpiredTokenError extends ClerkAPIResponseError {
    static kind = "MissingExpiredTokenError";
    static ERROR_CODE = "missing_expired_token";
    static STATUS = 422;
    /**
	* Type guard to check if an error is a MissingExpiredTokenError.
	* This checks the error's properties (status and error code) rather than instanceof,
	* allowing it to work with ClerkAPIResponseError instances thrown from the API layer.
	*
	* @example
	* ```typescript
	* try {
	*   await someApiCall();
	* } catch (e) {
	*   if (MissingExpiredTokenError.is(e)) {
	*     // e is typed as ClerkAPIResponseError with the specific error properties
	*   }
	* }
	* ```
	*/ static is(err) {
        return isClerkAPIResponseError(err) && err.status === MissingExpiredTokenError.STATUS && err.errors.length > 0 && err.errors[0].code === MissingExpiredTokenError.ERROR_CODE;
    }
};
//#endregion
//#region src/errors/errorThrower.ts
const DefaultMessages = Object.freeze({
    InvalidProxyUrlErrorMessage: `The proxyUrl passed to Clerk is invalid. The expected value for proxyUrl is an absolute URL or a relative path with a leading '/'. (key={{url}})`,
    InvalidPublishableKeyErrorMessage: `The publishableKey passed to Clerk is invalid. You can get your Publishable key at https://dashboard.clerk.com/last-active?path=api-keys. (key={{key}})`,
    MissingPublishableKeyErrorMessage: `Missing publishableKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
    MissingSecretKeyErrorMessage: `Missing secretKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
    MissingClerkProvider: `{{source}} can only be used within the <ClerkProvider /> component. Learn more: https://clerk.com/docs/components/clerk-provider`
});
/**
* Builds an error thrower.
*
* @internal
*/ function buildErrorThrower({ packageName, customMessages }) {
    let pkg = packageName;
    /**
	* Builds a message from a raw message and replacements.
	*
	* @internal
	*/ function buildMessage(rawMessage, replacements) {
        if (!replacements) return `${pkg}: ${rawMessage}`;
        let msg = rawMessage;
        const matches = rawMessage.matchAll(/{{([a-zA-Z0-9-_]+)}}/g);
        for (const match of matches){
            const replacement = (replacements[match[1]] || "").toString();
            msg = msg.replace(`{{${match[1]}}}`, replacement);
        }
        return `${pkg}: ${msg}`;
    }
    const messages = {
        ...DefaultMessages,
        ...customMessages
    };
    return {
        setPackageName ({ packageName: packageName$1 }) {
            if (typeof packageName$1 === "string") pkg = packageName$1;
            return this;
        },
        setMessages ({ customMessages: customMessages$1 }) {
            Object.assign(messages, customMessages$1 || {});
            return this;
        },
        throwInvalidPublishableKeyError (params) {
            throw new Error(buildMessage(messages.InvalidPublishableKeyErrorMessage, params));
        },
        throwInvalidProxyUrl (params) {
            throw new Error(buildMessage(messages.InvalidProxyUrlErrorMessage, params));
        },
        throwMissingPublishableKeyError () {
            throw new Error(buildMessage(messages.MissingPublishableKeyErrorMessage));
        },
        throwMissingSecretKeyError () {
            throw new Error(buildMessage(messages.MissingSecretKeyErrorMessage));
        },
        throwMissingClerkProviderError (params) {
            throw new Error(buildMessage(messages.MissingClerkProvider, params));
        },
        throw (message) {
            throw new Error(buildMessage(message));
        }
    };
}
//#endregion
//#region src/errors/emailLinkError.ts
var EmailLinkError = class EmailLinkError extends Error {
    code;
    constructor(code){
        super(code);
        this.code = code;
        this.name = "EmailLinkError";
        Object.setPrototypeOf(this, EmailLinkError.prototype);
    }
};
/**
* @deprecated Use `EmailLinkErrorCodeStatus` instead.
*
* @internal
*/ const EmailLinkErrorCode = {
    Expired: "expired",
    Failed: "failed",
    ClientMismatch: "client_mismatch"
};
const EmailLinkErrorCodeStatus = {
    Expired: "expired",
    Failed: "failed",
    ClientMismatch: "client_mismatch"
};
//#endregion
//#region src/errors/clerkRuntimeError.ts
/**
* Custom error class for representing Clerk runtime errors.
*
* @class ClerkRuntimeError
*
* @example
*   throw new ClerkRuntimeError('An error occurred', { code: 'password_invalid' });
*/ var ClerkRuntimeError = class ClerkRuntimeError extends ClerkError {
    static kind = "ClerkRuntimeError";
    /**
	* @deprecated Use `clerkError` property instead. This property is maintained for backward compatibility.
	*/ clerkRuntimeError = true;
    constructor(message, options){
        super({
            ...options,
            message
        });
        Object.setPrototypeOf(this, ClerkRuntimeError.prototype);
    }
};
/**
* Type guard to check if an error is a ClerkRuntimeError.
* Can be called as a standalone function or as a method on an error object.
*
* @example
* // As a standalone function
* if (isClerkRuntimeError(error)) { ... }
*
* // As a method (when attached to error object)
* if (error.isClerkRuntimeError()) { ... }
*/ const isClerkRuntimeError = createErrorTypeGuard(ClerkRuntimeError);
//#endregion
//#region src/errors/webAuthNError.ts
var ClerkWebAuthnError = class extends ClerkRuntimeError {
    /**
	* A unique code identifying the error, can be used for localization.
	*/ code;
    constructor(message, { code }){
        super(message, {
            code
        });
        this.code = code;
    }
};
//#endregion
//#region src/errors/helpers.ts
/**
* Checks if the provided error object is an unauthorized error.
*
* @internal
*
* @deprecated This is no longer used, and will be removed in the next major version.
*/ function isUnauthorizedError(e) {
    const status = e?.status;
    return e?.errors?.[0]?.code === "authentication_invalid" && status === 401;
}
/**
* Checks if the provided error object is a captcha error.
*
* @internal
*/ function isCaptchaError(e) {
    return [
        "captcha_invalid",
        "captcha_not_enabled",
        "captcha_missing_token"
    ].includes(e.errors[0].code);
}
/**
* Checks if the provided error is a 4xx error.
*
* @internal
*/ function is4xxError(e) {
    const status = e?.status;
    return !!status && status >= 400 && status < 500;
}
/**
* Checks if the provided error is a network error.
*
* @internal
*/ function isNetworkError(e) {
    return (`${e.message}${e.name}` || "").toLowerCase().replace(/\s+/g, "").includes("networkerror");
}
/**
* Checks if the provided error is either a ClerkAPIResponseError, a ClerkRuntimeError, or a MetamaskError.
*
* @internal
*/ function isKnownError(error) {
    return isClerkAPIResponseError(error) || isMetamaskError(error) || isClerkRuntimeError(error);
}
/**
* Checks if the provided error is a Clerk runtime error indicating a reverification was cancelled.
*
* @internal
*/ function isReverificationCancelledError(err) {
    return isClerkRuntimeError(err) && err.code === "reverification_cancelled";
}
/**
* Checks if the provided error is a Metamask error.
*
* @internal
*/ function isMetamaskError(err) {
    return "code" in err && [
        4001,
        32602,
        32603
    ].includes(err.code) && "message" in err;
}
/**
* Checks if the provided error is clerk api response error indicating a user is locked.
*
* @internal
*/ function isUserLockedError(err) {
    return isClerkAPIResponseError(err) && err.errors?.[0]?.code === "user_locked";
}
/**
* Checks if the provided error is a clerk api response error indicating a password was pwned.
*
* @internal
*/ function isPasswordPwnedError(err) {
    return isClerkAPIResponseError(err) && err.errors?.[0]?.code === "form_password_pwned";
}
/**
* Checks if the provided error is a clerk api response error indicating a password was compromised.
*
* @internal
*/ function isPasswordCompromisedError(err) {
    return isClerkAPIResponseError(err) && err.errors?.[0]?.code === "form_password_compromised";
}
/**
* Checks if the provided error is an EmailLinkError.
*
* @internal
*/ function isEmailLinkError(err) {
    return err.name === "EmailLinkError";
}
//#endregion
//#region src/errors/globalHookError.ts
/**
* Creates a ClerkGlobalHookError object from a ClerkError instance.
* It's a wrapper for all the different instances of Clerk errors that can
* be returned when using Clerk hooks.
*/ function createClerkGlobalHookError(error) {
    const predicates = {
        isClerkAPIResponseError,
        isClerkRuntimeError
    };
    for (const [name, fn] of Object.entries(predicates))Object.assign(error, {
        [name]: fn
    });
    return error;
}
;
 //# sourceMappingURL=error-Dl9xmUf3.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/noop-B3MbDAfb.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "noop",
    ()=>noop
]);
//#region src/utils/noop.ts
const noop = (..._args)=>{};
;
 //# sourceMappingURL=noop-B3MbDAfb.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/createDeferredPromise-CjYZzUuU.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createDeferredPromise",
    ()=>createDeferredPromise
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$noop$2d$B3MbDAfb$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/noop-B3MbDAfb.mjs [app-ssr] (ecmascript)");
;
//#region src/utils/createDeferredPromise.ts
/**
* Create a promise that can be resolved or rejected from
* outside the Promise constructor callback
* A ES6 compatible utility that implements `Promise.withResolvers`
* @internal
*/ const createDeferredPromise = ()=>{
    let resolve = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$noop$2d$B3MbDAfb$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["noop"];
    let reject = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$noop$2d$B3MbDAfb$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["noop"];
    return {
        promise: new Promise((res, rej)=>{
            resolve = res;
            reject = rej;
        }),
        resolve,
        reject
    };
};
;
 //# sourceMappingURL=createDeferredPromise-CjYZzUuU.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "camelToSnake",
    ()=>camelToSnake,
    "deepCamelToSnake",
    ()=>deepCamelToSnake,
    "deepSnakeToCamel",
    ()=>deepSnakeToCamel,
    "getNonUndefinedValues",
    ()=>getNonUndefinedValues,
    "isIPV4Address",
    ()=>isIPV4Address,
    "isTruthy",
    ()=>isTruthy,
    "snakeToCamel",
    ()=>snakeToCamel,
    "titleize",
    ()=>titleize,
    "toSentence",
    ()=>toSentence
]);
//#region src/underscore.ts
/**
* Convert words to a sentence.
*
* @param items - An array of words to be joined.
* @returns A string with the items joined by a comma and the last item joined by ", or".
*/ const toSentence = (items)=>{
    if (items.length == 0) return "";
    if (items.length == 1) return items[0];
    let sentence = items.slice(0, -1).join(", ");
    sentence += `, or ${items.slice(-1)}`;
    return sentence;
};
const IP_V4_ADDRESS_REGEX = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
/**
* Checks if a string is a valid IPv4 address.
*
* @returns True if the string is a valid IPv4 address, false otherwise.
*/ function isIPV4Address(str) {
    return IP_V4_ADDRESS_REGEX.test(str || "");
}
/**
* Converts the first character of a string to uppercase.
*
* @param str - The string to be converted.
* @returns The modified string with the rest of the string unchanged.
*
* @example
* ```ts
* titleize('hello world') // 'Hello world'
* ```
*/ function titleize(str) {
    const s = str || "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}
/**
* Converts a string from snake_case to camelCase.
*/ function snakeToCamel(str) {
    return str ? str.replace(/([-_][a-z])/g, (match)=>match.toUpperCase().replace(/-|_/, "")) : "";
}
/**
* Converts a string from camelCase to snake_case.
*/ function camelToSnake(str) {
    return str ? str.replace(/[A-Z]/g, (letter)=>`_${letter.toLowerCase()}`) : "";
}
const createDeepObjectTransformer = (transform)=>{
    const deepTransform = (obj)=>{
        if (!obj) return obj;
        if (Array.isArray(obj)) return obj.map((el)=>{
            if (typeof el === "object" || Array.isArray(el)) return deepTransform(el);
            return el;
        });
        const copy = {
            ...obj
        };
        const keys = Object.keys(copy);
        for (const oldName of keys){
            const newName = transform(oldName.toString());
            if (newName !== oldName) {
                copy[newName] = copy[oldName];
                delete copy[oldName];
            }
            if (typeof copy[newName] === "object") copy[newName] = deepTransform(copy[newName]);
        }
        return copy;
    };
    return deepTransform;
};
/**
* Transforms camelCased objects/ arrays to snake_cased.
* This function recursively traverses all objects and arrays of the passed value
* camelCased keys are removed.
*
* @function
*/ const deepCamelToSnake = createDeepObjectTransformer(camelToSnake);
/**
* Transforms snake_cased objects/ arrays to camelCased.
* This function recursively traverses all objects and arrays of the passed value
* camelCased keys are removed.
*
* @function
*/ const deepSnakeToCamel = createDeepObjectTransformer(snakeToCamel);
/**
* A function to determine if a value is truthy.
*
* @returns True for `true`, true, positive numbers. False for `false`, false, 0, negative integers and anything else.
*/ function isTruthy(value) {
    if (typeof value === `boolean`) return value;
    if (value === void 0 || value === null) return false;
    if (typeof value === `string`) {
        if (value.toLowerCase() === `true`) return true;
        if (value.toLowerCase() === `false`) return false;
    }
    const number = parseInt(value, 10);
    if (isNaN(number)) return false;
    if (number > 0) return true;
    return false;
}
/**
* Get all non-undefined values from an object.
*/ function getNonUndefinedValues(obj) {
    return Object.entries(obj).reduce((acc, [key, value])=>{
        if (value !== void 0) acc[key] = value;
        return acc;
    }, {});
}
;
 //# sourceMappingURL=underscore-DjQrhefX.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/organization-BqxdOtRG.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getCurrentOrganizationMembership",
    ()=>getCurrentOrganizationMembership
]);
//#region src/organization.ts
/**
* Finds the Organization membership for a given Organization ID from a list of memberships
* @param organizationMemberships - Array of Organization memberships to search through
* @param organizationId - ID of the Organization to find the membership for
* @returns The matching Organization membership or undefined if not found
*/ function getCurrentOrganizationMembership(organizationMemberships, organizationId) {
    return organizationMemberships.find((organizationMembership)=>organizationMembership.organization.id === organizationId);
}
;
 //# sourceMappingURL=organization-BqxdOtRG.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/telemetry-wqMDWlvR.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs [app-ssr] (ecmascript)");
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
        const parsedKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parsePublishableKey"])(options.publishableKey);
        if (parsedKey) this.#metadata.instanceType = parsedKey.instanceType;
        if (options.secretKey) this.#metadata.secretKey = options.secretKey.substring(0, 16);
        this.#eventThrottler = new TelemetryEventThrottler(LocalStorageThrottlerCache.isSupported() ? new LocalStorageThrottlerCache() : new InMemoryThrottlerCache());
    }
    get isEnabled() {
        if (this.#metadata.instanceType !== "development") return false;
        if (this.#config.disabled || typeof process !== "undefined" && process.env && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isTruthy"])(process.env.CLERK_TELEMETRY_DISABLED)) return false;
        if (("TURBOPACK compile-time value", "undefined") !== "undefined" && !!window?.navigator?.webdriver) //TURBOPACK unreachable
        ;
        return true;
    }
    get isDebug() {
        return this.#config.debug || typeof process !== "undefined" && process.env && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isTruthy"])(process.env.CLERK_TELEMETRY_DEBUG);
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
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/react/index.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ClerkInstanceContext",
    ()=>ClerkInstanceContext,
    "ClientContext",
    ()=>ClientContext,
    "OptionsContext",
    ()=>OptionsContext,
    "OrganizationProvider",
    ()=>OrganizationProvider,
    "SessionContext",
    ()=>SessionContext,
    "UserContext",
    ()=>UserContext,
    "__experimental_CheckoutProvider",
    ()=>__experimental_CheckoutProvider,
    "__experimental_PaymentElement",
    ()=>PaymentElement,
    "__experimental_PaymentElementProvider",
    ()=>PaymentElementProvider,
    "__experimental_useAPIKeys",
    ()=>useAPIKeys,
    "__experimental_useCheckout",
    ()=>useCheckout,
    "__experimental_usePaymentAttempts",
    ()=>usePaymentAttempts,
    "__experimental_usePaymentElement",
    ()=>usePaymentElement,
    "__experimental_usePaymentMethods",
    ()=>usePaymentMethods,
    "__experimental_usePlans",
    ()=>usePlans,
    "__experimental_useStatements",
    ()=>useStatements,
    "__experimental_useSubscription",
    ()=>useSubscription,
    "__internal_usePaymentAttemptQuery",
    ()=>__internal_usePaymentAttemptQuery,
    "__internal_usePlanDetailsQuery",
    ()=>usePlanDetailsQuery,
    "__internal_useStatementQuery",
    ()=>__internal_useStatementQuery,
    "assertContextExists",
    ()=>assertContextExists,
    "createContextAndHook",
    ()=>createContextAndHook,
    "isDeeplyEqual",
    ()=>isDeeplyEqual,
    "useAssertWrappedByClerkProvider",
    ()=>useAssertWrappedByClerkProvider,
    "useAttemptToEnableOrganizations",
    ()=>useAttemptToEnableOrganizations,
    "useClerk",
    ()=>useClerk,
    "useClerkInstanceContext",
    ()=>useClerkInstanceContext,
    "useClientContext",
    ()=>useClientContext,
    "useDeepEqualMemo",
    ()=>useDeepEqualMemo,
    "useOptionsContext",
    ()=>useOptionsContext,
    "useOrganization",
    ()=>useOrganization,
    "useOrganizationContext",
    ()=>useOrganizationContext,
    "useOrganizationList",
    ()=>useOrganizationList,
    "useReverification",
    ()=>useReverification,
    "useSafeLayoutEffect",
    ()=>useSafeLayoutEffect,
    "useSession",
    ()=>useSession,
    "useSessionContext",
    ()=>useSessionContext,
    "useSessionList",
    ()=>useSessionList,
    "useUser",
    ()=>useUser,
    "useUserContext",
    ()=>useUserContext
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$errors$2d$CS1pNy8i$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-errors-CS1pNy8i.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$D2ans7vW$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-D2ans7vW.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$noop$2d$B3MbDAfb$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/noop-B3MbDAfb.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$createDeferredPromise$2d$CjYZzUuU$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/createDeferredPromise-CjYZzUuU.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$organization$2d$BqxdOtRG$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/organization-BqxdOtRG.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/telemetry-wqMDWlvR.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/swr@2.3.4+83d5fd7b249dbeef/node_modules/swr/dist/index/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$_internal$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/swr@2.3.4+83d5fd7b249dbeef/node_modules/swr/dist/_internal/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$infinite$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/swr@2.3.4+83d5fd7b249dbeef/node_modules/swr/dist/infinite/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$dequal$40$2$2e$0$2e$3$2f$node_modules$2f$dequal$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/dequal@2.0.3/node_modules/dequal/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$mutation$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/swr@2.3.4+83d5fd7b249dbeef/node_modules/swr/dist/mutation/index.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
//#region src/react/hooks/createContextAndHook.ts
/**
* Assert that the context value exists, otherwise throw an error.
*
* @internal
*/ function assertContextExists(contextVal, msgOrCtx) {
    if (!contextVal) throw typeof msgOrCtx === "string" ? new Error(msgOrCtx) : /* @__PURE__ */ new Error(`${msgOrCtx.displayName} not found`);
}
/**
* Create and return a Context and two hooks that return the context value.
* The Context type is derived from the type passed in by the user.
*
* The first hook returned guarantees that the context exists so the returned value is always `CtxValue`
* The second hook makes no guarantees, so the returned value can be `CtxValue | undefined`
*
* @internal
*/ const createContextAndHook = (displayName, options)=>{
    const { assertCtxFn = assertContextExists } = options || {};
    const Ctx = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createContext(void 0);
    Ctx.displayName = displayName;
    const useCtx = ()=>{
        const ctx = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useContext(Ctx);
        assertCtxFn(ctx, `${displayName} not found`);
        return ctx.value;
    };
    const useCtxWithoutGuarantee = ()=>{
        const ctx = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useContext(Ctx);
        return ctx ? ctx.value : {};
    };
    return [
        Ctx,
        useCtx,
        useCtxWithoutGuarantee
    ];
};
//#endregion
//#region src/react/providers/SWRConfigCompat.swr.tsx
/**
* @internal
*/ function SWRConfigCompat({ swrConfig, children }) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["SWRConfig"], {
        value: swrConfig
    }, children);
}
//#endregion
//#region src/react/contexts.tsx
const [ClerkInstanceContext, useClerkInstanceContext] = createContextAndHook("ClerkInstanceContext");
const [UserContext, useUserContext] = createContextAndHook("UserContext");
const [ClientContext, useClientContext] = createContextAndHook("ClientContext");
const [SessionContext, useSessionContext] = createContextAndHook("SessionContext");
const OptionsContext = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createContext({});
const [CheckoutContext, useCheckoutContext] = createContextAndHook("CheckoutContext");
const __experimental_CheckoutProvider = ({ children, ...rest })=>{
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(CheckoutContext.Provider, {
        value: {
            value: rest
        }
    }, children);
};
/**
* @internal
*/ function useOptionsContext() {
    const context = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useContext(OptionsContext);
    if (context === void 0) throw new Error("useOptions must be used within an OptionsContext");
    return context;
}
const [OrganizationContextInternal, useOrganizationContext] = createContextAndHook("OrganizationContext");
const OrganizationProvider = ({ children, organization, swrConfig })=>{
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(SWRConfigCompat, {
        swrConfig
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(OrganizationContextInternal.Provider, {
        value: {
            value: {
                organization
            }
        }
    }, children));
};
/**
* @internal
*/ function useAssertWrappedByClerkProvider(displayNameOrFn) {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useContext(ClerkInstanceContext)) {
        if (typeof displayNameOrFn === "function") {
            displayNameOrFn();
            return;
        }
        throw new Error(`${displayNameOrFn} can only be used within the <ClerkProvider /> component.

Possible fixes:
1. Ensure that the <ClerkProvider /> is correctly wrapping your application where this component is used.
2. Check for multiple versions of the \`@clerk/shared\` package in your project. Use a tool like \`npm ls @clerk/shared\` to identify multiple versions, and update your dependencies to only rely on one.

Learn more: https://clerk.com/docs/components/clerk-provider`.trim());
    }
}
//#endregion
//#region src/react/stable-keys.ts
const USER_MEMBERSHIPS_KEY = "userMemberships";
const USER_INVITATIONS_KEY = "userInvitations";
const USER_SUGGESTIONS_KEY = "userSuggestions";
const DOMAINS_KEY = "domains";
const MEMBERSHIP_REQUESTS_KEY = "membershipRequests";
const MEMBERSHIPS_KEY = "memberships";
const INVITATIONS_KEY = "invitations";
const API_KEYS_KEY = "apiKeys";
const PLANS_KEY = "billing-plans";
const SUBSCRIPTION_KEY = "billing-subscription";
const PAYMENT_METHODS_KEY = "billing-payment-methods";
const PAYMENT_ATTEMPTS_KEY = "billing-payment-attempts";
const STATEMENTS_KEY = "billing-statements";
const STABLE_KEYS = {
    USER_MEMBERSHIPS_KEY,
    USER_INVITATIONS_KEY,
    USER_SUGGESTIONS_KEY,
    DOMAINS_KEY,
    MEMBERSHIP_REQUESTS_KEY,
    MEMBERSHIPS_KEY,
    INVITATIONS_KEY,
    PLANS_KEY,
    SUBSCRIPTION_KEY,
    PAYMENT_METHODS_KEY,
    PAYMENT_ATTEMPTS_KEY,
    STATEMENTS_KEY,
    API_KEYS_KEY
};
/**
* Internal stable keys for queries only used by our UI components.
* These keys are not used by the hooks themselves.
*/ const PAYMENT_ATTEMPT_KEY = "billing-payment-attempt";
const BILLING_PLANS_KEY = "billing-plan";
const BILLING_STATEMENTS_KEY = "billing-statement";
const INTERNAL_STABLE_KEYS = {
    PAYMENT_ATTEMPT_KEY,
    BILLING_PLANS_KEY,
    BILLING_STATEMENTS_KEY
};
//#endregion
//#region src/react/hooks/createCacheKeys.ts
/**
* @internal
*/ function createCacheKeys(params) {
    return {
        queryKey: [
            params.stablePrefix,
            params.authenticated,
            params.tracked,
            params.untracked
        ],
        invalidationKey: [
            params.stablePrefix,
            params.authenticated,
            params.tracked
        ],
        stableKey: params.stablePrefix,
        authenticated: params.authenticated
    };
}
/**
* @internal
*/ function toSWRQuery(keys) {
    const { queryKey } = keys;
    return {
        type: queryKey[0],
        ...queryKey[2],
        ...queryKey[3].args
    };
}
//#endregion
//#region src/react/hooks/usePagesOrInfinite.shared.ts
/**
* A hook that safely merges user-provided pagination options with default values.
* It caches initial pagination values (page and size) until component unmount to prevent unwanted rerenders.
*
* @internal
*
* @example
* ```typescript
* // Example 1: With user-provided options
* const userOptions = { initialPage: 2, pageSize: 20, infinite: true };
* const defaults = { initialPage: 1, pageSize: 10, infinite: false };
* useWithSafeValues(userOptions, defaults);
* // Returns { initialPage: 2, pageSize: 20, infinite: true }
*
* // Example 2: With boolean true (use defaults)
* const params = true;
* const defaults = { initialPage: 1, pageSize: 10, infinite: false };
* useWithSafeValues(params, defaults);
* // Returns { initialPage: 1, pageSize: 10, infinite: false }
*
* // Example 3: With undefined options (fallback to defaults)
* const params = undefined;
* const defaults = { initialPage: 1, pageSize: 10, infinite: false };
* useWithSafeValues(params, defaults);
* // Returns { initialPage: 1, pageSize: 10, infinite: false }
* ```
*/ const useWithSafeValues = (params, defaultValues)=>{
    const shouldUseDefaults = typeof params === "boolean" && params;
    const initialPageRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(shouldUseDefaults ? defaultValues.initialPage : params?.initialPage ?? defaultValues.initialPage);
    const pageSizeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(shouldUseDefaults ? defaultValues.pageSize : params?.pageSize ?? defaultValues.pageSize);
    const newObj = {};
    for (const key of Object.keys(defaultValues))newObj[key] = shouldUseDefaults ? defaultValues[key] : params?.[key] ?? defaultValues[key];
    return {
        ...newObj,
        initialPage: initialPageRef.current,
        pageSize: pageSizeRef.current
    };
};
/**
* Returns an object containing only the keys from the first object that are not present in the second object.
* Useful for extracting unique parameters that should be passed to a request while excluding common cache keys.
*
* @internal
*
* @example
* ```typescript
* // Example 1: Basic usage
* const obj1 = { name: 'John', age: 30, city: 'NY' };
* const obj2 = { name: 'John', age: 30 };
* getDifferentKeys(obj1, obj2); // Returns { city: 'NY' }
*
* // Example 2: With cache keys
* const requestParams = { page: 1, limit: 10, userId: '123' };
* const cacheKeys = { userId: '123' };
* getDifferentKeys(requestParams, cacheKeys); // Returns { page: 1, limit: 10 }
* ```
*/ function getDifferentKeys(obj1, obj2) {
    const keysSet = new Set(Object.keys(obj2));
    const differentKeysObject = {};
    for (const key1 of Object.keys(obj1))if (!keysSet.has(key1)) differentKeysObject[key1] = obj1[key1];
    return differentKeysObject;
}
//#endregion
//#region src/react/hooks/usePreviousValue.ts
/**
* A hook that retains the previous value of a primitive type.
* It uses a ref to prevent causing unnecessary re-renders.
*
* @internal
*
* @example
* ```
* Render 1: value = 'A' → returns null
* Render 2: value = 'B' → returns 'A'
* Render 3: value = 'B' → returns 'A'
* Render 4: value = 'B' → returns 'A'
* Render 5: value = 'C' → returns 'B'
* ```
*/ function usePreviousValue(value) {
    const currentRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(value);
    const previousRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    if (currentRef.current !== value) {
        previousRef.current = currentRef.current;
        currentRef.current = value;
    }
    return previousRef.current;
}
//#endregion
//#region src/react/hooks/usePagesOrInfinite.swr.tsx
const cachingSWROptions = {
    dedupingInterval: 1e3 * 60,
    focusThrottleInterval: 1e3 * 60 * 2
};
const cachingSWRInfiniteOptions = {
    ...cachingSWROptions,
    revalidateFirstPage: false
};
/**
* A flexible pagination hook that supports both traditional pagination and infinite loading.
* It provides a unified API for handling paginated data fetching, with built-in caching through SWR.
* The hook can operate in two modes:
* - Traditional pagination: Fetches one page at a time with page navigation
* - Infinite loading: Accumulates data as more pages are loaded.
*
* Features:
* - Cache management with SWR
* - Loading and error states
* - Page navigation helpers
* - Data revalidation and updates
* - Support for keeping previous data while loading.
*
* @internal
*/ const usePagesOrInfinite = (params)=>{
    const { fetcher, config, keys } = params;
    const [paginatedPage, setPaginatedPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(config.initialPage ?? 1);
    const initialPageRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(config.initialPage ?? 1);
    const pageSizeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(config.pageSize ?? 10);
    const enabled = config.enabled ?? true;
    const cacheMode = config.__experimental_mode === "cache";
    const triggerInfinite = config.infinite ?? false;
    const keepPreviousData = config.keepPreviousData ?? false;
    const isSignedIn = config.isSignedIn;
    const pagesCacheKey = {
        ...toSWRQuery(keys),
        initialPage: paginatedPage,
        pageSize: pageSizeRef.current
    };
    const previousIsSignedIn = usePreviousValue(isSignedIn);
    const shouldFetch = !triggerInfinite && enabled && (!cacheMode ? !!fetcher : true);
    const { data: swrData, isValidating: swrIsValidating, isLoading: swrIsLoading, error: swrError, mutate: swrMutate } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(typeof isSignedIn === "boolean" ? previousIsSignedIn === true && isSignedIn === false ? pagesCacheKey : isSignedIn ? shouldFetch ? pagesCacheKey : null : null : shouldFetch ? pagesCacheKey : null, !cacheMode && !!fetcher ? (cacheKeyParams)=>{
        if (isSignedIn === false || shouldFetch === false) return null;
        return fetcher(getDifferentKeys(cacheKeyParams, {
            type: keys.queryKey[0],
            ...keys.queryKey[2]
        }));
    } : null, {
        keepPreviousData,
        ...cachingSWROptions
    });
    const { data: swrInfiniteData, isLoading: swrInfiniteIsLoading, isValidating: swrInfiniteIsValidating, error: swrInfiniteError, size, setSize, mutate: swrInfiniteMutate } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$infinite$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])((pageIndex)=>{
        if (!triggerInfinite || !enabled || isSignedIn === false) return null;
        return {
            ...toSWRQuery(keys),
            initialPage: initialPageRef.current + pageIndex,
            pageSize: pageSizeRef.current
        };
    }, (cacheKeyParams)=>{
        const requestParams = getDifferentKeys(cacheKeyParams, {
            type: keys.queryKey[0],
            ...keys.queryKey[2]
        });
        return fetcher?.(requestParams);
    }, cachingSWRInfiniteOptions);
    const page = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (triggerInfinite) return size;
        return paginatedPage;
    }, [
        triggerInfinite,
        size,
        paginatedPage
    ]);
    const fetchPage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((numberOrgFn)=>{
        if (triggerInfinite) {
            setSize(numberOrgFn);
            return;
        }
        return setPaginatedPage(numberOrgFn);
    }, [
        setSize,
        triggerInfinite
    ]);
    const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (triggerInfinite) return swrInfiniteData?.map((a)=>a?.data).flat() ?? [];
        return swrData?.data ?? [];
    }, [
        triggerInfinite,
        swrData,
        swrInfiniteData
    ]);
    const count = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (triggerInfinite) return swrInfiniteData?.[swrInfiniteData?.length - 1]?.total_count || 0;
        return swrData?.total_count ?? 0;
    }, [
        triggerInfinite,
        swrData,
        swrInfiniteData
    ]);
    const isLoading = triggerInfinite ? swrInfiniteIsLoading : swrIsLoading;
    const isFetching = triggerInfinite ? swrInfiniteIsValidating : swrIsValidating;
    const error = (triggerInfinite ? swrInfiniteError : swrError) ?? null;
    const isError = !!error;
    const fetchNext = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        fetchPage((n)=>Math.max(0, n + 1));
    }, [
        fetchPage
    ]);
    const fetchPrevious = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        fetchPage((n)=>Math.max(0, n - 1));
    }, [
        fetchPage
    ]);
    const offsetCount = (initialPageRef.current - 1) * pageSizeRef.current;
    return {
        data,
        count,
        error,
        isLoading,
        isFetching,
        isError,
        page,
        pageCount: Math.ceil((count - offsetCount) / pageSizeRef.current),
        fetchPage,
        fetchNext,
        fetchPrevious,
        hasNextPage: count - offsetCount * pageSizeRef.current > page * pageSizeRef.current,
        hasPreviousPage: (page - 1) * pageSizeRef.current > offsetCount * pageSizeRef.current,
        revalidate: triggerInfinite ? ()=>swrInfiniteMutate() : ()=>swrMutate(),
        setData: triggerInfinite ? (value)=>swrInfiniteMutate(value, {
                revalidate: false
            }) : (value)=>swrMutate(value, {
                revalidate: false
            })
    };
};
//#endregion
//#region src/react/hooks/useAPIKeys.swr.tsx
/**
* @internal
*
* The `useAPIKeys()` hook provides access to paginated API keys for the current user or organization.
*
* @example
* ### Basic usage with default pagination
*
* ```tsx
* const { data, isLoading, page, pageCount, fetchNext, fetchPrevious } = useAPIKeys({
*   subject: 'user_123',
*   pageSize: 10,
*   initialPage: 1,
* });
* ```
*
* @example
* ### With search query
*
* ```tsx
* const [searchValue, setSearchValue] = useState('');
* const debouncedSearch = useDebounce(searchValue, 500);
*
* const { data, isLoading } = useAPIKeys({
*   subject: 'user_123',
*   query: debouncedSearch.trim(),
*   pageSize: 10,
* });
* ```
*
* @example
* ### Infinite scroll
*
* ```tsx
* const { data, isLoading, fetchNext, hasNextPage } = useAPIKeys({
*   subject: 'user_123',
*   infinite: true,
* });
* ```
*/ function useAPIKeys(params) {
    useAssertWrappedByClerkProvider("useAPIKeys");
    const safeValues = useWithSafeValues(params, {
        initialPage: 1,
        pageSize: 10,
        keepPreviousData: false,
        infinite: false,
        subject: "",
        query: "",
        enabled: true
    });
    const clerk = useClerkInstanceContext();
    clerk.telemetry?.record((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["eventMethodCalled"])("useAPIKeys"));
    const hookParams = {
        initialPage: safeValues.initialPage,
        pageSize: safeValues.pageSize,
        ...safeValues.subject ? {
            subject: safeValues.subject
        } : {},
        ...safeValues.query ? {
            query: safeValues.query
        } : {}
    };
    const isEnabled = (safeValues.enabled ?? true) && clerk.loaded;
    const result = usePagesOrInfinite({
        fetcher: clerk.apiKeys?.getAll ? (params$1)=>clerk.apiKeys.getAll({
                ...params$1,
                subject: safeValues.subject
            }) : void 0,
        config: {
            keepPreviousData: safeValues.keepPreviousData,
            infinite: safeValues.infinite,
            enabled: isEnabled,
            isSignedIn: Boolean(clerk.user),
            initialPage: safeValues.initialPage,
            pageSize: safeValues.pageSize
        },
        keys: createCacheKeys({
            stablePrefix: STABLE_KEYS.API_KEYS_KEY,
            authenticated: Boolean(clerk.user),
            tracked: {
                subject: safeValues.subject
            },
            untracked: {
                args: hookParams
            }
        })
    });
    const { mutate } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$_internal$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useSWRConfig"])();
    const invalidateAll = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        return mutate((key)=>{
            if (!key || typeof key !== "object") return false;
            return "type" in key && key.type === "apiKeys" && "subject" in key && key.subject === safeValues.subject;
        });
    }, [
        mutate,
        safeValues.subject
    ]);
    return {
        ...result,
        revalidate: invalidateAll
    };
}
//#endregion
//#region src/react/hooks/useClerk.ts
/**
* > [!WARNING]
* > This hook should only be used for advanced use cases, such as building a completely custom OAuth flow or as an escape hatch to access to the `Clerk` object.
*
* The `useClerk()` hook provides access to the [`Clerk`](https://clerk.com/docs/reference/javascript/clerk) object, allowing you to build alternatives to any Clerk Component.
*
* @function
*
* @returns The `useClerk()` hook returns the `Clerk` object, which includes all the methods and properties listed in the [`Clerk` reference](https://clerk.com/docs/reference/javascript/clerk).
*
* @example
*
* The following example uses the `useClerk()` hook to access the `clerk` object. The `clerk` object is used to call the [`openSignIn()`](https://clerk.com/docs/reference/javascript/clerk#sign-in) method to open the sign-in modal.
*
* <Tabs items='React,Next.js'>
* <Tab>
*
* ```tsx {{ filename: 'src/Home.tsx' }}
* import { useClerk } from '@clerk/clerk-react'
*
* export default function Home() {
*   const clerk = useClerk()
*
*   return <button onClick={() => clerk.openSignIn({})}>Sign in</button>
* }
* ```
*
* </Tab>
* <Tab>
*
* {@include ../../../docs/use-clerk.md#nextjs-01}
*
* </Tab>
* </Tabs>
*/ const useClerk = ()=>{
    useAssertWrappedByClerkProvider("useClerk");
    return useClerkInstanceContext();
};
//#endregion
//#region src/react/hooks/useAttemptToEnableOrganizations.ts
/**
* Attempts to enable the organizations environment setting for a given caller
*
* @internal
*/ function useAttemptToEnableOrganizations(caller) {
    const clerk = useClerk();
    const hasAttempted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (hasAttempted.current) return;
        hasAttempted.current = true;
        clerk.__internal_attemptToEnableEnvironmentSetting?.({
            for: "organizations",
            caller
        });
    }, [
        clerk,
        caller
    ]);
}
//#endregion
//#region src/react/hooks/useOrganization.tsx
const undefinedPaginatedResource$1 = {
    data: void 0,
    count: void 0,
    error: void 0,
    isLoading: false,
    isFetching: false,
    isError: false,
    page: void 0,
    pageCount: void 0,
    fetchPage: void 0,
    fetchNext: void 0,
    fetchPrevious: void 0,
    hasNextPage: false,
    hasPreviousPage: false,
    revalidate: void 0,
    setData: void 0
};
/**
* The `useOrganization()` hook retrieves attributes of the currently Active Organization.
*
* @example
* ### Expand and paginate attributes
*
* To keep network usage to a minimum, developers are required to opt-in by specifying which resource they need to fetch and paginate through. By default, the `memberships`, `invitations`, `membershipRequests`, and `domains` attributes are not populated. You must pass `true` or an object with the desired properties to fetch and paginate the data.
*
* ```tsx
* // invitations.data will never be populated.
* const { invitations } = useOrganization()
*
* // Use default values to fetch invitations, such as initialPage = 1 and pageSize = 10
* const { invitations } = useOrganization({
*   invitations: true,
* })
*
* // Pass your own values to fetch invitations
* const { invitations } = useOrganization({
*   invitations: {
*     pageSize: 20,
*     initialPage: 2, // skips the first page
*   },
* })
*
* // Aggregate pages in order to render an infinite list
* const { invitations } = useOrganization({
*   invitations: {
*     infinite: true,
*   },
* })
* ```
*
* @example
* ### Infinite pagination
*
* The following example demonstrates how to use the `infinite` property to fetch and append new data to the existing list. The `memberships` attribute will be populated with the first page of the Organization's memberships. When the "Load more" button is clicked, the `fetchNext` helper function will be called to append the next page of memberships to the list.
*
* ```tsx
* import { useOrganization } from '@clerk/clerk-react'
*
* export default function MemberList() {
*   const { memberships } = useOrganization({
*     memberships: {
*       infinite: true, // Append new data to the existing list
*       keepPreviousData: true, // Persist the cached data until the new data has been fetched
*     },
*   })
*
*   if (!memberships) {
*     // Handle loading state
*     return null
*   }
*
*   return (
*     <div>
*       <h2>Organization members</h2>
*       <ul>
*         {memberships.data?.map((membership) => (
*           <li key={membership.id}>
*             {membership.publicUserData.firstName} {membership.publicUserData.lastName} <
*             {membership.publicUserData.identifier}> :: {membership.role}
*           </li>
*         ))}
*       </ul>
*
*       <button
*         disabled={!memberships.hasNextPage} // Disable the button if there are no more available pages to be fetched
*         onClick={memberships.fetchNext}
*       >
*         Load more
*       </button>
*     </div>
*   )
* }
* ```
*
* @example
* ### Simple pagination
*
* The following example demonstrates how to use the `fetchPrevious` and `fetchNext` helper functions to paginate through the data. The `memberships` attribute will be populated with the first page of the Organization's memberships. When the "Previous page" or "Next page" button is clicked, the `fetchPrevious` or `fetchNext` helper function will be called to fetch the previous or next page of memberships.
*
* Notice the difference between this example's pagination and the infinite pagination example above.
*
* ```tsx
* import { useOrganization } from '@clerk/clerk-react'
*
* export default function MemberList() {
*   const { memberships } = useOrganization({
*     memberships: {
*       keepPreviousData: true, // Persist the cached data until the new data has been fetched
*     },
*   })
*
*   if (!memberships) {
*     // Handle loading state
*     return null
*   }
*
*   return (
*     <div>
*       <h2>Organization members</h2>
*       <ul>
*         {memberships.data?.map((membership) => (
*           <li key={membership.id}>
*             {membership.publicUserData.firstName} {membership.publicUserData.lastName} <
*             {membership.publicUserData.identifier}> :: {membership.role}
*           </li>
*         ))}
*       </ul>
*
*       <button disabled={!memberships.hasPreviousPage} onClick={memberships.fetchPrevious}>
*         Previous page
*       </button>
*
*       <button disabled={!memberships.hasNextPage} onClick={memberships.fetchNext}>
*         Next page
*       </button>
*     </div>
*   )
* }
* ```
*/ function useOrganization(params) {
    const { domains: domainListParams, membershipRequests: membershipRequestsListParams, memberships: membersListParams, invitations: invitationsListParams } = params || {};
    useAssertWrappedByClerkProvider("useOrganization");
    useAttemptToEnableOrganizations("useOrganization");
    const { organization } = useOrganizationContext();
    const session = useSessionContext();
    const domainSafeValues = useWithSafeValues(domainListParams, {
        initialPage: 1,
        pageSize: 10,
        keepPreviousData: false,
        infinite: false,
        enrollmentMode: void 0
    });
    const membershipRequestSafeValues = useWithSafeValues(membershipRequestsListParams, {
        initialPage: 1,
        pageSize: 10,
        status: "pending",
        keepPreviousData: false,
        infinite: false
    });
    const membersSafeValues = useWithSafeValues(membersListParams, {
        initialPage: 1,
        pageSize: 10,
        role: void 0,
        keepPreviousData: false,
        infinite: false,
        query: void 0
    });
    const invitationsSafeValues = useWithSafeValues(invitationsListParams, {
        initialPage: 1,
        pageSize: 10,
        status: [
            "pending"
        ],
        keepPreviousData: false,
        infinite: false
    });
    const clerk = useClerkInstanceContext();
    clerk.telemetry?.record((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["eventMethodCalled"])("useOrganization"));
    const domainParams = typeof domainListParams === "undefined" ? void 0 : {
        initialPage: domainSafeValues.initialPage,
        pageSize: domainSafeValues.pageSize,
        enrollmentMode: domainSafeValues.enrollmentMode
    };
    const membershipRequestParams = typeof membershipRequestsListParams === "undefined" ? void 0 : {
        initialPage: membershipRequestSafeValues.initialPage,
        pageSize: membershipRequestSafeValues.pageSize,
        status: membershipRequestSafeValues.status
    };
    const membersParams = typeof membersListParams === "undefined" ? void 0 : {
        initialPage: membersSafeValues.initialPage,
        pageSize: membersSafeValues.pageSize,
        role: membersSafeValues.role,
        query: membersSafeValues.query
    };
    const invitationsParams = typeof invitationsListParams === "undefined" ? void 0 : {
        initialPage: invitationsSafeValues.initialPage,
        pageSize: invitationsSafeValues.pageSize,
        status: invitationsSafeValues.status
    };
    const domains = usePagesOrInfinite({
        fetcher: organization?.getDomains,
        config: {
            keepPreviousData: domainSafeValues.keepPreviousData,
            infinite: domainSafeValues.infinite,
            enabled: !!domainParams,
            isSignedIn: Boolean(organization),
            initialPage: domainSafeValues.initialPage,
            pageSize: domainSafeValues.pageSize
        },
        keys: createCacheKeys({
            stablePrefix: STABLE_KEYS.DOMAINS_KEY,
            authenticated: Boolean(organization),
            tracked: {
                organizationId: organization?.id
            },
            untracked: {
                args: domainParams
            }
        })
    });
    const membershipRequests = usePagesOrInfinite({
        fetcher: organization?.getMembershipRequests,
        config: {
            keepPreviousData: membershipRequestSafeValues.keepPreviousData,
            infinite: membershipRequestSafeValues.infinite,
            enabled: !!membershipRequestParams,
            isSignedIn: Boolean(organization),
            initialPage: membershipRequestSafeValues.initialPage,
            pageSize: membershipRequestSafeValues.pageSize
        },
        keys: createCacheKeys({
            stablePrefix: STABLE_KEYS.MEMBERSHIP_REQUESTS_KEY,
            authenticated: Boolean(organization),
            tracked: {
                organizationId: organization?.id
            },
            untracked: {
                args: membershipRequestParams
            }
        })
    });
    const memberships = usePagesOrInfinite({
        fetcher: organization?.getMemberships,
        config: {
            keepPreviousData: membersSafeValues.keepPreviousData,
            infinite: membersSafeValues.infinite,
            enabled: !!membersParams,
            isSignedIn: Boolean(organization),
            initialPage: membersSafeValues.initialPage,
            pageSize: membersSafeValues.pageSize
        },
        keys: createCacheKeys({
            stablePrefix: STABLE_KEYS.MEMBERSHIPS_KEY,
            authenticated: Boolean(organization),
            tracked: {
                organizationId: organization?.id
            },
            untracked: {
                args: membersParams
            }
        })
    });
    const invitations = usePagesOrInfinite({
        fetcher: organization?.getInvitations,
        config: {
            keepPreviousData: invitationsSafeValues.keepPreviousData,
            infinite: invitationsSafeValues.infinite,
            enabled: !!invitationsParams,
            isSignedIn: Boolean(organization),
            initialPage: invitationsSafeValues.initialPage,
            pageSize: invitationsSafeValues.pageSize
        },
        keys: createCacheKeys({
            stablePrefix: STABLE_KEYS.INVITATIONS_KEY,
            authenticated: Boolean(organization),
            tracked: {
                organizationId: organization?.id
            },
            untracked: {
                args: invitationsParams
            }
        })
    });
    if (organization === void 0) return {
        isLoaded: false,
        organization: void 0,
        membership: void 0,
        domains: undefinedPaginatedResource$1,
        membershipRequests: undefinedPaginatedResource$1,
        memberships: undefinedPaginatedResource$1,
        invitations: undefinedPaginatedResource$1
    };
    if (organization === null) return {
        isLoaded: true,
        organization: null,
        membership: null,
        domains: null,
        membershipRequests: null,
        memberships: null,
        invitations: null
    };
    /** In SSR context we include only the organization object when loadOrg is set to true. */ if (!clerk.loaded && organization) return {
        isLoaded: true,
        organization,
        membership: void 0,
        domains: undefinedPaginatedResource$1,
        membershipRequests: undefinedPaginatedResource$1,
        memberships: undefinedPaginatedResource$1,
        invitations: undefinedPaginatedResource$1
    };
    return {
        isLoaded: clerk.loaded,
        organization,
        membership: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$organization$2d$BqxdOtRG$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentOrganizationMembership"])(session.user.organizationMemberships, organization.id),
        domains,
        membershipRequests,
        memberships,
        invitations
    };
}
//#endregion
//#region src/react/hooks/useOrganizationList.tsx
const undefinedPaginatedResource = {
    data: void 0,
    count: void 0,
    error: void 0,
    isLoading: false,
    isFetching: false,
    isError: false,
    page: void 0,
    pageCount: void 0,
    fetchPage: void 0,
    fetchNext: void 0,
    fetchPrevious: void 0,
    hasNextPage: false,
    hasPreviousPage: false,
    revalidate: void 0,
    setData: void 0
};
/**
* The `useOrganizationList()` hook provides access to the current user's organization memberships, invitations, and suggestions. It also includes methods for creating new organizations and managing the active organization.
*
* @example
* ### Expanding and paginating attributes
*
* To keep network usage to a minimum, developers are required to opt-in by specifying which resource they need to fetch and paginate through. So by default, the `userMemberships`, `userInvitations`, and `userSuggestions` attributes are not populated. You must pass true or an object with the desired properties to fetch and paginate the data.
*
* ```tsx
* // userMemberships.data will never be populated
* const { userMemberships } = useOrganizationList()
*
* // Use default values to fetch userMemberships, such as initialPage = 1 and pageSize = 10
* const { userMemberships } = useOrganizationList({
*   userMemberships: true,
* })
*
* // Pass your own values to fetch userMemberships
* const { userMemberships } = useOrganizationList({
*   userMemberships: {
*     pageSize: 20,
*     initialPage: 2, // skips the first page
*   },
* })
*
* // Aggregate pages in order to render an infinite list
* const { userMemberships } = useOrganizationList({
*   userMemberships: {
*     infinite: true,
*   },
* })
* ```
*
* @example
* ### Infinite pagination
*
* The following example demonstrates how to use the `infinite` property to fetch and append new data to the existing list. The `userMemberships` attribute will be populated with the first page of the user's Organization memberships. When the "Load more" button is clicked, the `fetchNext` helper function will be called to append the next page of memberships to the list.
*
* ```tsx {{ filename: 'src/components/JoinedOrganizations.tsx' }}
* import { useOrganizationList } from '@clerk/clerk-react'
* import React from 'react'
*
* const JoinedOrganizations = () => {
*   const { isLoaded, setActive, userMemberships } = useOrganizationList({
*     userMemberships: {
*       infinite: true,
*     },
*   })
*
*   if (!isLoaded) {
*     return <>Loading</>
*   }
*
*   return (
*     <>
*       <ul>
*         {userMemberships.data?.map((mem) => (
*           <li key={mem.id}>
*             <span>{mem.organization.name}</span>
*             <button onClick={() => setActive({ organization: mem.organization.id })}>Select</button>
*           </li>
*         ))}
*       </ul>
*
*       <button disabled={!userMemberships.hasNextPage} onClick={() => userMemberships.fetchNext()}>
*         Load more
*       </button>
*     </>
*   )
* }
*
* export default JoinedOrganizations
* ```
*
* @example
* ### Simple pagination
*
* The following example demonstrates how to use the `fetchPrevious` and `fetchNext` helper functions to paginate through the data. The `userInvitations` attribute will be populated with the first page of invitations. When the "Previous page" or "Next page" button is clicked, the `fetchPrevious` or `fetchNext` helper function will be called to fetch the previous or next page of invitations.
*
* Notice the difference between this example's pagination and the infinite pagination example above.
*
* ```tsx {{ filename: 'src/components/UserInvitationsTable.tsx' }}
* import { useOrganizationList } from '@clerk/clerk-react'
* import React from 'react'
*
* const UserInvitationsTable = () => {
*   const { isLoaded, userInvitations } = useOrganizationList({
*     userInvitations: {
*       infinite: true,
*       keepPreviousData: true,
*     },
*   })
*
*   if (!isLoaded || userInvitations.isLoading) {
*     return <>Loading</>
*   }
*
*   return (
*     <>
*       <table>
*         <thead>
*           <tr>
*             <th>Email</th>
*             <th>Org name</th>
*           </tr>
*         </thead>
*
*         <tbody>
*           {userInvitations.data?.map((inv) => (
*             <tr key={inv.id}>
*               <th>{inv.emailAddress}</th>
*               <th>{inv.publicOrganizationData.name}</th>
*             </tr>
*           ))}
*         </tbody>
*       </table>
*
*       <button disabled={!userInvitations.hasPreviousPage} onClick={userInvitations.fetchPrevious}>
*         Prev
*       </button>
*       <button disabled={!userInvitations.hasNextPage} onClick={userInvitations.fetchNext}>
*         Next
*       </button>
*     </>
*   )
* }
*
* export default UserInvitationsTable
* ```
*/ function useOrganizationList(params) {
    const { userMemberships, userInvitations, userSuggestions } = params || {};
    useAssertWrappedByClerkProvider("useOrganizationList");
    useAttemptToEnableOrganizations("useOrganizationList");
    const userMembershipsSafeValues = useWithSafeValues(userMemberships, {
        initialPage: 1,
        pageSize: 10,
        keepPreviousData: false,
        infinite: false
    });
    const userInvitationsSafeValues = useWithSafeValues(userInvitations, {
        initialPage: 1,
        pageSize: 10,
        status: "pending",
        keepPreviousData: false,
        infinite: false
    });
    const userSuggestionsSafeValues = useWithSafeValues(userSuggestions, {
        initialPage: 1,
        pageSize: 10,
        status: "pending",
        keepPreviousData: false,
        infinite: false
    });
    const clerk = useClerkInstanceContext();
    const user = useUserContext();
    clerk.telemetry?.record((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["eventMethodCalled"])("useOrganizationList"));
    const userMembershipsParams = typeof userMemberships === "undefined" ? void 0 : {
        initialPage: userMembershipsSafeValues.initialPage,
        pageSize: userMembershipsSafeValues.pageSize
    };
    const userInvitationsParams = typeof userInvitations === "undefined" ? void 0 : {
        initialPage: userInvitationsSafeValues.initialPage,
        pageSize: userInvitationsSafeValues.pageSize,
        status: userInvitationsSafeValues.status
    };
    const userSuggestionsParams = typeof userSuggestions === "undefined" ? void 0 : {
        initialPage: userSuggestionsSafeValues.initialPage,
        pageSize: userSuggestionsSafeValues.pageSize,
        status: userSuggestionsSafeValues.status
    };
    const isClerkLoaded = !!(clerk.loaded && user);
    const memberships = usePagesOrInfinite({
        fetcher: user?.getOrganizationMemberships,
        config: {
            keepPreviousData: userMembershipsSafeValues.keepPreviousData,
            infinite: userMembershipsSafeValues.infinite,
            enabled: !!userMembershipsParams,
            isSignedIn: Boolean(user),
            initialPage: userMembershipsSafeValues.initialPage,
            pageSize: userMembershipsSafeValues.pageSize
        },
        keys: createCacheKeys({
            stablePrefix: STABLE_KEYS.USER_MEMBERSHIPS_KEY,
            authenticated: Boolean(user),
            tracked: {
                userId: user?.id
            },
            untracked: {
                args: userMembershipsParams
            }
        })
    });
    const invitations = usePagesOrInfinite({
        fetcher: user?.getOrganizationInvitations,
        config: {
            keepPreviousData: userInvitationsSafeValues.keepPreviousData,
            infinite: userInvitationsSafeValues.infinite,
            enabled: !!userInvitationsParams,
            isSignedIn: Boolean(user),
            initialPage: userInvitationsSafeValues.initialPage,
            pageSize: userInvitationsSafeValues.pageSize
        },
        keys: createCacheKeys({
            stablePrefix: STABLE_KEYS.USER_INVITATIONS_KEY,
            authenticated: Boolean(user),
            tracked: {
                userId: user?.id
            },
            untracked: {
                args: userInvitationsParams
            }
        })
    });
    const suggestions = usePagesOrInfinite({
        fetcher: user?.getOrganizationSuggestions,
        config: {
            keepPreviousData: userSuggestionsSafeValues.keepPreviousData,
            infinite: userSuggestionsSafeValues.infinite,
            enabled: !!userSuggestionsParams,
            isSignedIn: Boolean(user),
            initialPage: userSuggestionsSafeValues.initialPage,
            pageSize: userSuggestionsSafeValues.pageSize
        },
        keys: createCacheKeys({
            stablePrefix: STABLE_KEYS.USER_SUGGESTIONS_KEY,
            authenticated: Boolean(user),
            tracked: {
                userId: user?.id
            },
            untracked: {
                args: userSuggestionsParams
            }
        })
    });
    if (!isClerkLoaded) return {
        isLoaded: false,
        createOrganization: void 0,
        setActive: void 0,
        userMemberships: undefinedPaginatedResource,
        userInvitations: undefinedPaginatedResource,
        userSuggestions: undefinedPaginatedResource
    };
    return {
        isLoaded: isClerkLoaded,
        setActive: clerk.setActive,
        createOrganization: clerk.createOrganization,
        userMemberships: memberships,
        userInvitations: invitations,
        userSuggestions: suggestions
    };
}
//#endregion
//#region src/react/hooks/useSafeLayoutEffect.tsx
/**
* @internal
*/ const useSafeLayoutEffect = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useEffect;
//#endregion
//#region src/react/hooks/useSession.ts
const hookName$3 = `useSession`;
/**
* The `useSession()` hook provides access to the current user's [`Session`](https://clerk.com/docs/reference/javascript/session) object, as well as helpers for setting the active session.
*
* @unionReturnHeadings
* ["Initialization", "Signed out", "Signed in"]
*
* @function
*
* @param [options] - An object containing options for the `useSession()` hook.
* @example
* ### Access the `Session` object
*
* The following example uses the `useSession()` hook to access the `Session` object, which has the `lastActiveAt` property. The `lastActiveAt` property is a `Date` object used to show the time the session was last active.
*
* <Tabs items='React,Next.js'>
* <Tab>
*
* ```tsx {{ filename: 'src/Home.tsx' }}
* import { useSession } from '@clerk/clerk-react'
*
* export default function Home() {
*   const { isLoaded, session, isSignedIn } = useSession()
*
*   if (!isLoaded) {
*     // Handle loading state
*     return null
*   }
*   if (!isSignedIn) {
*     // Handle signed out state
*     return null
*   }
*
*   return (
*     <div>
*       <p>This session has been active since {session.lastActiveAt.toLocaleString()}</p>
*     </div>
*   )
* }
* ```
*
* </Tab>
* <Tab>
*
* {@include ../../../docs/use-session.md#nextjs-01}
*
* </Tab>
* </Tabs>
*/ const useSession = ()=>{
    useAssertWrappedByClerkProvider(hookName$3);
    const session = useSessionContext();
    const clerk = useClerkInstanceContext();
    clerk.telemetry?.record((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["eventMethodCalled"])(hookName$3));
    if (session === void 0) return {
        isLoaded: false,
        isSignedIn: void 0,
        session: void 0
    };
    if (session === null) return {
        isLoaded: true,
        isSignedIn: false,
        session: null
    };
    return {
        isLoaded: true,
        isSignedIn: clerk.isSignedIn,
        session
    };
};
//#endregion
//#region src/react/hooks/useSessionList.ts
const hookName$2 = "useSessionList";
/**
* The `useSessionList()` hook returns an array of [`Session`](https://clerk.com/docs/reference/javascript/session) objects that have been registered on the client device.
*
* @unionReturnHeadings
* ["Initialization", "Loaded"]
*
* @function
*
* @example
* ### Get a list of sessions
*
* The following example uses `useSessionList()` to get a list of sessions that have been registered on the client device. The `sessions` property is used to show the number of times the user has visited the page.
*
* <Tabs items='React,Next.js'>
* <Tab>
*
* ```tsx {{ filename: 'src/Home.tsx' }}
* import { useSessionList } from '@clerk/clerk-react'
*
* export default function Home() {
*   const { isLoaded, sessions } = useSessionList()
*
*   if (!isLoaded) {
*     // Handle loading state
*     return null
*   }
*
*   return (
*     <div>
*       <p>Welcome back. You've been here {sessions.length} times before.</p>
*     </div>
*   )
* }
* ```
*
* </Tab>
* <Tab>
*
* {@include ../../../docs/use-session-list.md#nextjs-01}
*
* </Tab>
* </Tabs>
*/ const useSessionList = ()=>{
    useAssertWrappedByClerkProvider(hookName$2);
    const isomorphicClerk = useClerkInstanceContext();
    const client = useClientContext();
    useClerkInstanceContext().telemetry?.record((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["eventMethodCalled"])(hookName$2));
    if (!client) return {
        isLoaded: false,
        sessions: void 0,
        setActive: void 0
    };
    return {
        isLoaded: true,
        sessions: client.sessions,
        setActive: isomorphicClerk.setActive
    };
};
//#endregion
//#region src/react/hooks/useUser.ts
const hookName$1 = "useUser";
/**
* The `useUser()` hook provides access to the current user's [`User`](https://clerk.com/docs/reference/javascript/user) object, which contains all the data for a single user in your application and provides methods to manage their account. This hook also allows you to check if the user is signed in and if Clerk has loaded and initialized.
*
* @unionReturnHeadings
* ["Initialization", "Signed out", "Signed in"]
*
* @example
* ### Get the current user
*
* The following example uses the `useUser()` hook to access the [`User`](https://clerk.com/docs/reference/javascript/user) object, which contains the current user's data such as their full name. The `isLoaded` and `isSignedIn` properties are used to handle the loading state and to check if the user is signed in, respectively.
*
* ```tsx {{ filename: 'src/Example.tsx' }}
* import { useUser } from '@clerk/clerk-react'
*
* export default function Example() {
*   const { isSignedIn, user, isLoaded } = useUser()
*
*   if (!isLoaded) {
*     return <div>Loading...</div>
*   }
*
*   if (!isSignedIn) {
*     return <div>Sign in to view this page</div>
*   }
*
*   return <div>Hello {user.firstName}!</div>
* }
* ```
*
* @example
* ### Update user data
*
* The following example uses the `useUser()` hook to access the [`User`](https://clerk.com/docs/reference/javascript/user) object, which calls the [`update()`](https://clerk.com/docs/reference/javascript/user#update) method to update the current user's information.
*
* <Tabs items='React,Next.js'>
* <Tab>
*
* ```tsx {{ filename: 'src/Home.tsx' }}
* import { useUser } from '@clerk/clerk-react'
*
* export default function Home() {
*   const { isSignedIn, isLoaded, user } = useUser()
*
*   if (!isLoaded) {
*     // Handle loading state
*     return null
*   }
*
*   if (!isSignedIn) return null
*
*   const updateUser = async () => {
*     await user.update({
*       firstName: 'John',
*       lastName: 'Doe',
*     })
*   }
*
*   return (
*     <>
*       <button onClick={updateUser}>Update your name</button>
*       <p>user.firstName: {user.firstName}</p>
*       <p>user.lastName: {user.lastName}</p>
*     </>
*   )
* }
* ```
* </Tab>
* <Tab>
*
* {@include ../../../docs/use-user.md#nextjs-01}
*
* </Tab>
* </Tabs>
*
* @example
* ### Reload user data
*
* The following example uses the `useUser()` hook to access the [`User`](https://clerk.com/docs/reference/javascript/user) object, which calls the [`reload()`](https://clerk.com/docs/reference/javascript/user#reload) method to get the latest user's information.
*
* <Tabs items='React,Next.js'>
* <Tab>
*
* ```tsx {{ filename: 'src/Home.tsx' }}
* import { useUser } from '@clerk/clerk-react'
*
* export default function Home() {
*   const { isSignedIn, isLoaded, user } = useUser();
*
*   if (!isLoaded) {
*     // Handle loading state
*     return null;
*   }
*
*   if (!isSignedIn) return null;
*
*   const updateUser = async () => {
*     // Update data via an API endpoint
*     const updateMetadata = await fetch('/api/updateMetadata', {
*       method: 'POST',
*       body: JSON.stringify({
*         role: 'admin'
*       })
*     });
*
*     // Check if the update was successful
*     if ((await updateMetadata.json()).message !== 'success') {
*       throw new Error('Error updating');
*     }
*
*     // If the update was successful, reload the user data
*     await user.reload();
*   };
*
*   return (
*     <>
*       <button onClick={updateUser}>Update your metadata</button>
*       <p>user role: {user.publicMetadata.role}</p>
*     </>
*   );
* }
* ```
*
* </Tab>
* <Tab>
*
* {@include ../../../docs/use-user.md#nextjs-02}
*
* </Tab>
* </Tabs>
*/ function useUser() {
    useAssertWrappedByClerkProvider(hookName$1);
    const user = useUserContext();
    useClerkInstanceContext().telemetry?.record((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["eventMethodCalled"])(hookName$1));
    if (user === void 0) return {
        isLoaded: false,
        isSignedIn: void 0,
        user: void 0
    };
    if (user === null) return {
        isLoaded: true,
        isSignedIn: false,
        user: null
    };
    return {
        isLoaded: true,
        isSignedIn: true,
        user
    };
}
//#endregion
//#region src/react/hooks/useDeepEqualMemo.ts
const useDeepEqualMemoize = (value)=>{
    const ref = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useRef(value);
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$dequal$40$2$2e$0$2e$3$2f$node_modules$2f$dequal$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dequal"])(value, ref.current)) ref.current = value;
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useMemo(()=>ref.current, [
        ref.current
    ]);
};
/**
* @internal
*/ const useDeepEqualMemo = (factory, dependencyArray)=>{
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useMemo(factory, useDeepEqualMemoize(dependencyArray));
};
/**
* @internal
*/ const isDeeplyEqual = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$dequal$40$2$2e$0$2e$3$2f$node_modules$2f$dequal$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["dequal"];
//#endregion
//#region src/react/hooks/useReverification.ts
const CLERK_API_REVERIFICATION_ERROR_CODE = "session_reverification_required";
/**
*
*/ async function resolveResult(result) {
    try {
        const r = await result;
        if (r instanceof Response) return r.json();
        return r;
    } catch (e) {
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isClerkAPIResponseError"])(e) && e.errors.find(({ code })=>code === CLERK_API_REVERIFICATION_ERROR_CODE)) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$errors$2d$CS1pNy8i$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["reverificationError"])();
        throw e;
    }
}
/**
*
*/ function createReverificationHandler(params) {
    /**
	*
	*/ function assertReverification(fetcher) {
        return async (...args)=>{
            let result = await resolveResult(fetcher(...args));
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$errors$2d$CS1pNy8i$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isReverificationHint"])(result)) {
                /**
				* Create a promise
				*/ const resolvers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$createDeferredPromise$2d$CjYZzUuU$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createDeferredPromise"])();
                const isValidMetadata = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$D2ans7vW$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateReverificationConfig"])(result.clerk_error.metadata?.reverification);
                const level = isValidMetadata ? isValidMetadata().level : void 0;
                const cancel = ()=>{
                    resolvers.reject(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ClerkRuntimeError"]("User cancelled attempted verification", {
                        code: "reverification_cancelled"
                    }));
                };
                const complete = ()=>{
                    resolvers.resolve(true);
                };
                if (params.onNeedsReverification === void 0) /**
				* On success resolve the pending promise
				* On cancel reject the pending promise
				*/ params.openUIComponent?.({
                    level,
                    afterVerification: complete,
                    afterVerificationCancelled: cancel
                });
                else params.onNeedsReverification({
                    cancel,
                    complete,
                    level
                });
                /**
				* Wait until the promise from above have been resolved or rejected
				*/ await resolvers.promise;
                /**
				* After the promise resolved successfully try the original request one more time
				*/ result = await resolveResult(fetcher(...args));
            }
            return result;
        };
    }
    return assertReverification;
}
/**
* > [!WARNING]
* >
* > Depending on the SDK you're using, this feature requires `@clerk/nextjs@6.12.7` or later, `@clerk/clerk-react@5.25.1` or later, and `@clerk/clerk-js@5.57.1` or later.
*
* The `useReverification()` hook is used to handle a session's reverification flow. If a request requires reverification, a modal will display, prompting the user to verify their credentials. Upon successful verification, the original request will automatically retry.
*
* @function
*
* @returns The `useReverification()` hook returns an array with the "enhanced" fetcher.
*
* @example
* ### Handle cancellation of the reverification process
*
* The following example demonstrates how to handle scenarios where a user cancels the reverification flow, such as closing the modal, which might result in `myData` being `null`.
*
* In the following example, `myFetcher` would be a function in your backend that fetches data from the route that requires reverification. See the [guide on how to require reverification](https://clerk.com/docs/guides/secure/reverification) for more information.
*
* ```tsx {{ filename: 'src/components/MyButton.tsx' }}
* import { useReverification } from '@clerk/clerk-react'
* import { isReverificationCancelledError } from '@clerk/clerk-react/error'
*
* type MyData = {
*   balance: number
* }
*
* export function MyButton() {
*   const fetchMyData = () => fetch('/api/balance').then(res=> res.json() as Promise<MyData>)
*   const enhancedFetcher = useReverification(fetchMyData);
*
*   const handleClick = async () => {
*     try {
*       const myData = await enhancedFetcher()
*       //     ^ is types as `MyData`
*     } catch (e) {
*       // Handle error returned from the fetcher here
*
*       // You can also handle cancellation with the following
*       if (isReverificationCancelledError(err)) {
*         // Handle the cancellation error here
*       }
*     }
*   }
*
*   return <button onClick={handleClick}>Update User</button>
* }
* ```
*/ const useReverification = (fetcher, options)=>{
    const { __internal_openReverification, telemetry } = useClerk();
    const fetcherRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(fetcher);
    const optionsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(options);
    telemetry?.record((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["eventMethodCalled"])("useReverification", {
        onNeedsReverification: Boolean(options?.onNeedsReverification)
    }));
    useSafeLayoutEffect(()=>{
        fetcherRef.current = fetcher;
        optionsRef.current = options;
    });
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((...args)=>{
        return createReverificationHandler({
            openUIComponent: __internal_openReverification,
            telemetry,
            ...optionsRef.current
        })(fetcherRef.current)(...args);
    }, [
        __internal_openReverification,
        telemetry
    ]);
};
//#endregion
//#region src/react/hooks/useBillingHookEnabled.ts
/**
* @internal
*/ function useBillingHookEnabled(params) {
    const clerk = useClerkInstanceContext();
    const enabledFromParam = params?.enabled ?? true;
    const environment = clerk.__unstable__environment;
    const user = useUserContext();
    const { organization } = useOrganizationContext();
    const isOrganization = params?.for === "organization";
    const billingEnabled = isOrganization ? environment?.commerceSettings.billing.organization.enabled : environment?.commerceSettings.billing.user.enabled;
    const requireUserAndOrganizationWhenAuthenticated = params?.authenticated ?? true ? (isOrganization ? Boolean(organization?.id) : true) && Boolean(user?.id) : true;
    return billingEnabled && enabledFromParam && clerk.loaded && requireUserAndOrganizationWhenAuthenticated;
}
//#endregion
//#region src/react/hooks/createBillingPaginatedHook.tsx
/**
* A hook factory that creates paginated data fetching hooks for commerce-related resources.
* It provides a standardized way to create hooks that can fetch either user or Organization resources
* with built-in pagination support.
*
* The generated hooks handle:
* - Clerk authentication context
* - Resource-specific data fetching
* - Pagination (both traditional and infinite scroll)
* - Telemetry tracking
* - Type safety for the specific resource.
*
* @internal
*/ function createBillingPaginatedHook({ hookName: hookName$4, resourceType, useFetcher, options }) {
    return function useBillingHook(params) {
        const { for: _for, enabled: externalEnabled, ...paginationParams } = params || {};
        const safeFor = _for || "user";
        useAssertWrappedByClerkProvider(hookName$4);
        const fetchFn = useFetcher(safeFor);
        const safeValues = useWithSafeValues(paginationParams, {
            initialPage: 1,
            pageSize: 10,
            keepPreviousData: false,
            infinite: false,
            __experimental_mode: void 0
        });
        const clerk = useClerkInstanceContext();
        const user = useUserContext();
        const { organization } = useOrganizationContext();
        clerk.telemetry?.record((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["eventMethodCalled"])(hookName$4));
        const isForOrganization = safeFor === "organization";
        const billingEnabled = useBillingHookEnabled({
            for: safeFor,
            enabled: externalEnabled,
            authenticated: !options?.unauthenticated
        });
        const hookParams = typeof paginationParams === "undefined" ? void 0 : {
            initialPage: safeValues.initialPage,
            pageSize: safeValues.pageSize,
            ...options?.unauthenticated ? {} : isForOrganization ? {
                orgId: organization?.id
            } : {}
        };
        const isEnabled = !!hookParams && clerk.loaded && !!billingEnabled;
        return usePagesOrInfinite({
            fetcher: fetchFn,
            config: {
                keepPreviousData: safeValues.keepPreviousData,
                infinite: safeValues.infinite,
                enabled: isEnabled,
                ...options?.unauthenticated ? {} : {
                    isSignedIn: user !== null
                },
                __experimental_mode: safeValues.__experimental_mode,
                initialPage: safeValues.initialPage,
                pageSize: safeValues.pageSize
            },
            keys: createCacheKeys({
                stablePrefix: resourceType,
                authenticated: !options?.unauthenticated,
                tracked: options?.unauthenticated ? {
                    for: safeFor
                } : {
                    userId: user?.id,
                    ...isForOrganization ? {
                        ["_orgId"]: organization?.id
                    } : {}
                },
                untracked: {
                    args: hookParams
                }
            })
        });
    };
}
//#endregion
//#region src/react/hooks/useStatements.tsx
/**
* @internal
*/ const useStatements = createBillingPaginatedHook({
    hookName: "useStatements",
    resourceType: STABLE_KEYS.STATEMENTS_KEY,
    useFetcher: ()=>{
        const clerk = useClerkInstanceContext();
        if (clerk.loaded) return clerk.billing.getStatements;
    }
});
//#endregion
//#region src/react/hooks/usePaymentAttempts.tsx
/**
* @internal
*/ const usePaymentAttempts = createBillingPaginatedHook({
    hookName: "usePaymentAttempts",
    resourceType: STABLE_KEYS.PAYMENT_ATTEMPTS_KEY,
    useFetcher: ()=>{
        const clerk = useClerkInstanceContext();
        if (clerk.loaded) return clerk.billing.getPaymentAttempts;
    }
});
//#endregion
//#region src/react/hooks/usePaymentMethods.tsx
/**
* @internal
*/ const usePaymentMethods = createBillingPaginatedHook({
    hookName: "usePaymentMethods",
    resourceType: STABLE_KEYS.PAYMENT_METHODS_KEY,
    useFetcher: (resource)=>{
        const { organization } = useOrganizationContext();
        const user = useUserContext();
        if (resource === "organization") return organization?.getPaymentMethods;
        return user?.getPaymentMethods;
    }
});
//#endregion
//#region src/react/hooks/usePlans.tsx
/**
* @internal
*/ const usePlans = createBillingPaginatedHook({
    hookName: "usePlans",
    resourceType: STABLE_KEYS.PLANS_KEY,
    useFetcher: (_for)=>{
        const clerk = useClerkInstanceContext();
        if (!clerk.loaded) return;
        return (params)=>clerk.billing.getPlans({
                ...params,
                for: _for
            });
    },
    options: {
        unauthenticated: true
    }
});
//#endregion
//#region src/react/hooks/useSubscription.shared.ts
function useSubscriptionCacheKeys(params) {
    const { userId, orgId, for: forType } = params;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const safeOrgId = forType === "organization" ? orgId : void 0;
        return createCacheKeys({
            stablePrefix: STABLE_KEYS.SUBSCRIPTION_KEY,
            authenticated: true,
            tracked: {
                userId,
                orgId: safeOrgId
            },
            untracked: {
                args: {
                    orgId: safeOrgId
                }
            }
        });
    }, [
        userId,
        orgId,
        forType
    ]);
}
//#endregion
//#region src/react/hooks/useSubscription.swr.tsx
const hookName = "useSubscription";
/**
* This is the existing implementation of useSubscription using SWR.
* It is kept here for backwards compatibility until our next major version.
*
* @internal
*/ function useSubscription(params) {
    useAssertWrappedByClerkProvider(hookName);
    const clerk = useClerkInstanceContext();
    const user = useUserContext();
    const { organization } = useOrganizationContext();
    const environment = clerk.__unstable__environment;
    clerk.telemetry?.record((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["eventMethodCalled"])(hookName));
    const billingEnabled = params?.for === "organization" ? environment?.commerceSettings.billing.organization.enabled : environment?.commerceSettings.billing.user.enabled;
    const isEnabled = (params?.enabled ?? true) && billingEnabled;
    const { queryKey } = useSubscriptionCacheKeys({
        userId: user?.id,
        orgId: organization?.id,
        for: params?.for
    });
    const swr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(isEnabled ? {
        queryKey
    } : null, ({ queryKey: queryKey$1 })=>{
        const args = queryKey$1[3].args;
        if (queryKey$1[2].userId) return clerk.billing.getSubscription(args);
        return null;
    }, {
        dedupingInterval: 1e3 * 60,
        keepPreviousData: params?.keepPreviousData
    });
    const revalidate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        swr.mutate();
    }, [
        swr
    ]);
    return {
        data: swr.data,
        error: swr.error,
        isLoading: swr.isLoading,
        isFetching: swr.isValidating,
        revalidate
    };
}
//#endregion
//#region src/react/hooks/useCheckout.ts
/**
* @function
*
* @param [options] - An object containing the configuration for the checkout flow.
*
* **Required** if the hook is used without a `<CheckoutProvider />` wrapping the component tree.
*/ const useCheckout = (options)=>{
    const contextOptions = useCheckoutContext();
    const { for: forOrganization, planId, planPeriod } = options || contextOptions;
    const clerk = useClerk();
    const { organization } = useOrganizationContext();
    const { isLoaded, user } = useUser();
    if (!isLoaded) throw new Error("Clerk: Ensure that `useCheckout` is inside a component wrapped with `<ClerkLoaded />`.");
    if (!user) throw new Error("Clerk: Ensure that `useCheckout` is inside a component wrapped with `<SignedIn />`.");
    if (forOrganization === "organization" && !organization) throw new Error("Clerk: Ensure your flow checks for an active organization. Retrieve `orgId` from `useAuth()` and confirm it is defined. For SSR, see: https://clerk.com/docs/reference/backend/types/auth-object#how-to-access-the-auth-object");
    const manager = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>clerk.__experimental_checkout({
            planId,
            planPeriod,
            for: forOrganization
        }), [
        user.id,
        organization?.id,
        planId,
        planPeriod,
        forOrganization
    ]);
    const managerProperties = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSyncExternalStore"])((cb)=>manager.subscribe(cb), ()=>manager.getState(), ()=>manager.getState());
    return {
        checkout: {
            ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
                if (!managerProperties.checkout) return {
                    id: null,
                    externalClientSecret: null,
                    externalGatewayId: null,
                    totals: null,
                    isImmediatePlanChange: null,
                    planPeriod: null,
                    plan: null,
                    paymentMethod: null,
                    freeTrialEndsAt: null,
                    payer: null,
                    needsPaymentMethod: null,
                    planPeriodStart: null
                };
                const { reload, confirm, pathRoot, ...rest } = managerProperties.checkout;
                return rest;
            }, [
                managerProperties.checkout
            ]),
            getState: manager.getState,
            start: manager.start,
            confirm: manager.confirm,
            clear: manager.clear,
            finalize: manager.finalize,
            isStarting: managerProperties.isStarting,
            isConfirming: managerProperties.isConfirming,
            error: managerProperties.error,
            status: managerProperties.status,
            fetchStatus: managerProperties.fetchStatus
        }
    };
};
//#endregion
//#region src/react/hooks/useStatementQuery.shared.ts
function useStatementQueryCacheKeys(params) {
    const { statementId, userId, orgId, for: forType } = params;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return createCacheKeys({
            stablePrefix: INTERNAL_STABLE_KEYS.BILLING_STATEMENTS_KEY,
            authenticated: true,
            tracked: {
                statementId,
                forType,
                userId,
                orgId
            },
            untracked: {
                args: {
                    id: statementId ?? void 0,
                    orgId: orgId ?? void 0
                }
            }
        });
    }, [
        statementId,
        forType,
        userId,
        orgId
    ]);
}
//#endregion
//#region src/react/hooks/useStatementQuery.swr.tsx
/**
* This is the existing implementation of useStatementQuery using SWR.
* It is kept here for backwards compatibility until our next major version.
*
* @internal
*/ function __internal_useStatementQuery(params = {}) {
    const { statementId = null, enabled = true, keepPreviousData = false, for: forType = "user" } = params;
    const clerk = useClerkInstanceContext();
    const user = useUserContext();
    const { organization } = useOrganizationContext();
    const organizationId = forType === "organization" ? organization?.id ?? null : null;
    const { queryKey } = useStatementQueryCacheKeys({
        statementId,
        userId: user?.id ?? null,
        orgId: organizationId,
        for: forType
    });
    const swr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(Boolean(statementId) && enabled && (forType !== "organization" || Boolean(organizationId)) ? queryKey : null, ()=>{
        if (!statementId) throw new Error("statementId is required to fetch a statement");
        return clerk.billing.getStatement({
            id: statementId,
            orgId: organizationId ?? void 0
        });
    }, {
        dedupingInterval: 1e3 * 60,
        keepPreviousData
    });
    return {
        data: swr.data,
        error: swr.error ?? null,
        isLoading: swr.isLoading,
        isFetching: swr.isValidating
    };
}
//#endregion
//#region src/react/hooks/usePlanDetailsQuery.shared.ts
function usePlanDetailsQueryCacheKeys(params) {
    const { planId } = params;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return createCacheKeys({
            stablePrefix: INTERNAL_STABLE_KEYS.BILLING_PLANS_KEY,
            authenticated: false,
            tracked: {
                planId: planId ?? null
            },
            untracked: {
                args: {
                    id: planId ?? void 0
                }
            }
        });
    }, [
        planId
    ]);
}
//#endregion
//#region src/react/hooks/usePlanDetailsQuery.swr.tsx
/**
* This is the existing implementation of usePlanDetailsQuery using SWR.
* It is kept here for backwards compatibility until our next major version.
*
* @internal
*/ function usePlanDetailsQuery(params = {}) {
    const { planId, initialPlan = null, enabled = true, keepPreviousData = true } = params;
    const clerk = useClerkInstanceContext();
    const targetPlanId = planId ?? initialPlan?.id ?? null;
    const { queryKey } = usePlanDetailsQueryCacheKeys({
        planId: targetPlanId
    });
    const swr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(Boolean(targetPlanId) && enabled ? queryKey : null, ()=>{
        if (!targetPlanId) throw new Error("planId is required to fetch plan details");
        return clerk.billing.getPlan({
            id: targetPlanId
        });
    }, {
        dedupingInterval: 1e3 * 60,
        keepPreviousData,
        fallbackData: initialPlan ?? void 0
    });
    return {
        data: swr.data,
        error: swr.error ?? null,
        isLoading: swr.isLoading,
        isFetching: swr.isValidating
    };
}
//#endregion
//#region src/react/hooks/usePaymentAttemptQuery.shared.ts
function usePaymentAttemptQueryCacheKeys(params) {
    const { paymentAttemptId, userId, orgId, for: forType } = params;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return createCacheKeys({
            stablePrefix: INTERNAL_STABLE_KEYS.PAYMENT_ATTEMPT_KEY,
            authenticated: true,
            tracked: {
                paymentAttemptId,
                forType,
                userId,
                orgId
            },
            untracked: {
                args: {
                    id: paymentAttemptId ?? void 0,
                    orgId: orgId ?? void 0
                }
            }
        });
    }, [
        paymentAttemptId,
        forType,
        userId,
        orgId
    ]);
}
//#endregion
//#region src/react/hooks/usePaymentAttemptQuery.swr.tsx
/**
* This is the existing implementation of usePaymentAttemptQuery using SWR.
* It is kept here for backwards compatibility until our next major version.
*
* @internal
*/ function __internal_usePaymentAttemptQuery(params) {
    const { paymentAttemptId, enabled = true, keepPreviousData = false, for: forType = "user" } = params;
    const clerk = useClerkInstanceContext();
    const user = useUserContext();
    const { organization } = useOrganizationContext();
    const organizationId = forType === "organization" ? organization?.id ?? null : null;
    const { queryKey } = usePaymentAttemptQueryCacheKeys({
        paymentAttemptId,
        userId: user?.id ?? null,
        orgId: organizationId,
        for: forType
    });
    const swr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(Boolean(paymentAttemptId) && enabled && (forType !== "organization" || Boolean(organizationId)) ? {
        queryKey
    } : null, ({ queryKey: queryKey$1 })=>{
        const args = queryKey$1[3].args;
        return clerk.billing.getPaymentAttempt(args);
    }, {
        dedupingInterval: 1e3 * 60,
        keepPreviousData
    });
    return {
        data: swr.data,
        error: swr.error ?? null,
        isLoading: swr.isLoading,
        isFetching: swr.isValidating
    };
}
//#endregion
//#region src/react/stripe-react/utils.ts
const usePrevious = (value)=>{
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(value);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        ref.current = value;
    }, [
        value
    ]);
    return ref.current;
};
const useAttachEvent = (element, event, cb)=>{
    const cbDefined = !!cb;
    const cbRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(cb);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        cbRef.current = cb;
    }, [
        cb
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!cbDefined || !element) return ()=>{};
        const decoratedCb = (...args)=>{
            if (cbRef.current) cbRef.current(...args);
        };
        element.on(event, decoratedCb);
        return ()=>{
            element.off(event, decoratedCb);
        };
    }, [
        cbDefined,
        event,
        element,
        cbRef
    ]);
};
//#endregion
//#region src/react/stripe-react/index.tsx
const ElementsContext = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createContext(null);
ElementsContext.displayName = "ElementsContext";
const parseElementsContext = (ctx, useCase)=>{
    if (!ctx) throw new Error(`Could not find Elements context; You need to wrap the part of your app that ${useCase} in an <Elements> provider.`);
    return ctx;
};
/**
* The `Elements` provider allows you to use [Element components](https://stripe.com/docs/stripe-js/react#element-components) and access the [Stripe object](https://stripe.com/docs/js/initializing) in any nested component.
* Render an `Elements` provider at the root of your React app so that it is available everywhere you need it.
*
* To use the `Elements` provider, call `loadStripe` from `@stripe/stripe-js` with your publishable key.
* The `loadStripe` function will asynchronously load the Stripe.js script and initialize a `Stripe` object.
* Pass the returned `Promise` to `Elements`.
*
* @docs https://stripe.com/docs/stripe-js/react#elements-provider
*/ const Elements = ({ stripe: rawStripeProp, options, children })=>{
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useMemo(()=>parseStripeProp(rawStripeProp), [
        rawStripeProp
    ]);
    const [ctx, setContext] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState(()=>({
            stripe: parsed.tag === "sync" ? parsed.stripe : null,
            elements: parsed.tag === "sync" ? parsed.stripe.elements(options) : null
        }));
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useEffect(()=>{
        let isMounted = true;
        const safeSetContext = (stripe)=>{
            setContext((ctx$1)=>{
                if (ctx$1.stripe) return ctx$1;
                return {
                    stripe,
                    elements: stripe.elements(options)
                };
            });
        };
        if (parsed.tag === "async" && !ctx.stripe) parsed.stripePromise.then((stripe)=>{
            if (stripe && isMounted) safeSetContext(stripe);
        });
        else if (parsed.tag === "sync" && !ctx.stripe) safeSetContext(parsed.stripe);
        return ()=>{
            isMounted = false;
        };
    }, [
        parsed,
        ctx,
        options
    ]);
    const prevStripe = usePrevious(rawStripeProp);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useEffect(()=>{
        if (prevStripe !== null && prevStripe !== rawStripeProp) console.warn("Unsupported prop change on Elements: You cannot change the `stripe` prop after setting it.");
    }, [
        prevStripe,
        rawStripeProp
    ]);
    const prevOptions = usePrevious(options);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useEffect(()=>{
        if (!ctx.elements) return;
        const updates = extractAllowedOptionsUpdates(options, prevOptions, [
            "clientSecret",
            "fonts"
        ]);
        if (updates) ctx.elements.update(updates);
    }, [
        options,
        prevOptions,
        ctx.elements
    ]);
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(ElementsContext.Provider, {
        value: ctx
    }, children);
};
const useElementsContextWithUseCase = (useCaseMessage)=>{
    return parseElementsContext(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useContext(ElementsContext), useCaseMessage);
};
const useElements = ()=>{
    const { elements } = useElementsContextWithUseCase("calls useElements()");
    return elements;
};
const INVALID_STRIPE_ERROR = "Invalid prop `stripe` supplied to `Elements`. We recommend using the `loadStripe` utility from `@stripe/stripe-js`. See https://stripe.com/docs/stripe-js/react#elements-props-stripe for details.";
const validateStripe = (maybeStripe, errorMsg = INVALID_STRIPE_ERROR)=>{
    if (maybeStripe === null || isStripe(maybeStripe)) return maybeStripe;
    throw new Error(errorMsg);
};
const parseStripeProp = (raw, errorMsg = INVALID_STRIPE_ERROR)=>{
    if (isPromise(raw)) return {
        tag: "async",
        stripePromise: Promise.resolve(raw).then((result)=>validateStripe(result, errorMsg))
    };
    const stripe = validateStripe(raw, errorMsg);
    if (stripe === null) return {
        tag: "empty"
    };
    return {
        tag: "sync",
        stripe
    };
};
const isUnknownObject = (raw)=>{
    return raw !== null && typeof raw === "object";
};
const isPromise = (raw)=>{
    return isUnknownObject(raw) && typeof raw.then === "function";
};
const isStripe = (raw)=>{
    return isUnknownObject(raw) && typeof raw.elements === "function" && typeof raw.createToken === "function" && typeof raw.createPaymentMethod === "function" && typeof raw.confirmCardPayment === "function";
};
const extractAllowedOptionsUpdates = (options, prevOptions, immutableKeys)=>{
    if (!isUnknownObject(options)) return null;
    return Object.keys(options).reduce((newOptions, key)=>{
        const isUpdated = !isUnknownObject(prevOptions) || !isEqual(options[key], prevOptions[key]);
        if (immutableKeys.includes(key)) {
            if (isUpdated) console.warn(`Unsupported prop change: options.${key} is not a mutable property.`);
            return newOptions;
        }
        if (!isUpdated) return newOptions;
        return {
            ...newOptions || {},
            [key]: options[key]
        };
    }, null);
};
const PLAIN_OBJECT_STR = "[object Object]";
const isEqual = (left, right)=>{
    if (!isUnknownObject(left) || !isUnknownObject(right)) return left === right;
    const leftArray = Array.isArray(left);
    if (leftArray !== Array.isArray(right)) return false;
    const leftPlainObject = Object.prototype.toString.call(left) === PLAIN_OBJECT_STR;
    if (leftPlainObject !== (Object.prototype.toString.call(right) === PLAIN_OBJECT_STR)) return false;
    if (!leftPlainObject && !leftArray) return left === right;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    const keySet = {};
    for(let i = 0; i < leftKeys.length; i += 1)keySet[leftKeys[i]] = true;
    for(let i = 0; i < rightKeys.length; i += 1)keySet[rightKeys[i]] = true;
    const allKeys = Object.keys(keySet);
    if (allKeys.length !== leftKeys.length) return false;
    const l = left;
    const r = right;
    const pred = (key)=>{
        return isEqual(l[key], r[key]);
    };
    return allKeys.every(pred);
};
const useStripe = ()=>{
    const { stripe } = useElementsOrCheckoutSdkContextWithUseCase("calls useStripe()");
    return stripe;
};
const useElementsOrCheckoutSdkContextWithUseCase = (useCaseString)=>{
    return parseElementsContext(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useContext(ElementsContext), useCaseString);
};
const capitalized = (str)=>str.charAt(0).toUpperCase() + str.slice(1);
const createElementComponent = (type, isServer)=>{
    const displayName = `${capitalized(type)}Element`;
    const ClientElement = ({ id, className, fallback, options = {}, onBlur, onFocus, onReady, onChange, onEscape, onClick, onLoadError, onLoaderStart, onNetworksChange, onConfirm, onCancel, onShippingAddressChange, onShippingRateChange })=>{
        const ctx = useElementsOrCheckoutSdkContextWithUseCase(`mounts <${displayName}>`);
        const elements = "elements" in ctx ? ctx.elements : null;
        const [element, setElement] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState(null);
        const elementRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useRef(null);
        const domNode = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useRef(null);
        const [isReady, setReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
        useAttachEvent(element, "blur", onBlur);
        useAttachEvent(element, "focus", onFocus);
        useAttachEvent(element, "escape", onEscape);
        useAttachEvent(element, "click", onClick);
        useAttachEvent(element, "loaderror", onLoadError);
        useAttachEvent(element, "loaderstart", onLoaderStart);
        useAttachEvent(element, "networkschange", onNetworksChange);
        useAttachEvent(element, "confirm", onConfirm);
        useAttachEvent(element, "cancel", onCancel);
        useAttachEvent(element, "shippingaddresschange", onShippingAddressChange);
        useAttachEvent(element, "shippingratechange", onShippingRateChange);
        useAttachEvent(element, "change", onChange);
        let readyCallback;
        if (onReady) readyCallback = ()=>{
            setReady(true);
            onReady(element);
        };
        useAttachEvent(element, "ready", readyCallback);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useLayoutEffect(()=>{
            if (elementRef.current === null && domNode.current !== null && elements) {
                let newElement = null;
                if (elements) newElement = elements.create(type, options);
                elementRef.current = newElement;
                setElement(newElement);
                if (newElement) newElement.mount(domNode.current);
            }
        }, [
            elements,
            options
        ]);
        const prevOptions = usePrevious(options);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useEffect(()=>{
            if (!elementRef.current) return;
            const updates = extractAllowedOptionsUpdates(options, prevOptions, [
                "paymentRequest"
            ]);
            if (updates && "update" in elementRef.current) elementRef.current.update(updates);
        }, [
            options,
            prevOptions
        ]);
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useLayoutEffect(()=>{
            return ()=>{
                if (elementRef.current && typeof elementRef.current.destroy === "function") try {
                    elementRef.current.destroy();
                    elementRef.current = null;
                } catch  {}
            };
        }, []);
        return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].Fragment, null, !isReady && fallback, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("div", {
            id,
            style: {
                height: isReady ? "unset" : "0px",
                visibility: isReady ? "visible" : "hidden"
            },
            className,
            ref: domNode
        }));
    };
    const ServerElement = (props)=>{
        useElementsOrCheckoutSdkContextWithUseCase(`mounts <${displayName}>`);
        const { id, className } = props;
        return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement("div", {
            id,
            className
        });
    };
    const Element = isServer ? ServerElement : ClientElement;
    Element.displayName = displayName;
    Element.__elementType = type;
    return Element;
};
const PaymentElement$1 = createElementComponent("payment", ("TURBOPACK compile-time value", "undefined") === "undefined");
//#endregion
//#region src/react/billing/useInitializePaymentMethod.swr.tsx
/**
* This is the existing implementation of the payment method initializer using SWR.
* It is kept here for backwards compatibility until our next major version.
*
* @internal
*/ function useInitializePaymentMethod(options) {
    const { for: forType = "user" } = options ?? {};
    const { organization } = useOrganizationContext();
    const user = useUserContext();
    const resource = forType === "organization" ? organization : user;
    const { data, trigger } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$mutation$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"])(resource?.id ? {
        key: "billing-payment-method-initialize",
        resourceId: resource.id,
        for: forType
    } : null, ()=>{
        return resource?.initializePaymentMethod({
            gateway: "stripe"
        });
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!resource?.id) return;
        trigger().catch(()=>{});
    }, [
        resource?.id,
        trigger
    ]);
    return {
        initializedPaymentMethod: data,
        initializePaymentMethod: trigger
    };
}
//#endregion
//#region src/react/billing/useStripeClerkLibs.swr.tsx
/**
* This is the existing implementation of the Stripe libraries loader using SWR.
* It is kept here for backwards compatibility until our next major version.
*
* @internal
*/ function useStripeClerkLibs() {
    const clerk = useClerk();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])("clerk-stripe-sdk", async ()=>{
        return {
            loadStripe: await clerk.__internal_loadStripeJs()
        };
    }, {
        keepPreviousData: true,
        revalidateOnFocus: false,
        dedupingInterval: Infinity
    }).data ?? null;
}
//#endregion
//#region src/react/billing/useStripeLoader.swr.tsx
/**
* This is the existing implementation of the Stripe instance loader using SWR.
* It is kept here for backwards compatibility until our next major version.
*
* @internal
*/ function useStripeLoader(options) {
    const { stripeClerkLibs, externalGatewayId, stripePublishableKey } = options;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$swr$40$2$2e$3$2e$4$2b$83d5fd7b249dbeef$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(stripeClerkLibs && externalGatewayId && stripePublishableKey ? {
        key: "stripe-sdk",
        externalGatewayId,
        stripePublishableKey
    } : null, ({ stripePublishableKey: stripePublishableKey$1, externalGatewayId: externalGatewayId$1 })=>{
        return stripeClerkLibs?.loadStripe(stripePublishableKey$1, {
            stripeAccount: externalGatewayId$1
        });
    }, {
        keepPreviousData: true,
        revalidateOnFocus: false,
        dedupingInterval: 1e3 * 60
    }).data;
}
//#endregion
//#region src/react/billing/payment-element.tsx
const useInternalEnvironment = ()=>{
    return useClerk().__unstable__environment;
};
const useLocalization = ()=>{
    const clerk = useClerk();
    let locale = "en";
    try {
        locale = clerk.__internal_getOption("localization")?.locale || "en";
    } catch  {}
    return locale.split("-")[0];
};
const usePaymentSourceUtils = (forResource = "user")=>{
    const stripeClerkLibs = useStripeClerkLibs();
    const environment = useInternalEnvironment();
    const { initializedPaymentMethod, initializePaymentMethod } = useInitializePaymentMethod({
        for: forResource
    });
    const stripePublishableKey = environment?.commerceSettings.billing.stripePublishableKey ?? void 0;
    return {
        stripe: useStripeLoader({
            stripeClerkLibs,
            externalGatewayId: initializedPaymentMethod?.externalGatewayId,
            stripePublishableKey
        }),
        initializePaymentMethod,
        externalClientSecret: initializedPaymentMethod?.externalClientSecret,
        paymentMethodOrder: initializedPaymentMethod?.paymentMethodOrder
    };
};
const [PaymentElementContext, usePaymentElementContext] = createContextAndHook("PaymentElementContext");
const [StripeUtilsContext, useStripeUtilsContext] = createContextAndHook("StripeUtilsContext");
const ValidateStripeUtils = ({ children })=>{
    const stripe = useStripe();
    const elements = useElements();
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(StripeUtilsContext.Provider, {
        value: {
            value: {
                stripe,
                elements
            }
        }
    }, children);
};
const DummyStripeUtils = ({ children })=>{
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(StripeUtilsContext.Provider, {
        value: {
            value: {}
        }
    }, children);
};
const PropsProvider = ({ children, ...props })=>{
    const utils = usePaymentSourceUtils(props.for);
    const [isPaymentElementReady, setIsPaymentElementReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(PaymentElementContext.Provider, {
        value: {
            value: {
                ...props,
                ...utils,
                setIsPaymentElementReady,
                isPaymentElementReady
            }
        }
    }, children);
};
const PaymentElementProvider = ({ children, ...props })=>{
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(PropsProvider, props, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(PaymentElementInternalRoot, null, children));
};
const PaymentElementInternalRoot = (props)=>{
    const { stripe, externalClientSecret, stripeAppearance } = usePaymentElementContext();
    const locale = useLocalization();
    if (stripe && externalClientSecret) return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(Elements, {
        key: externalClientSecret,
        stripe,
        options: {
            loader: "never",
            clientSecret: externalClientSecret,
            appearance: {
                variables: stripeAppearance
            },
            locale
        }
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(ValidateStripeUtils, null, props.children));
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(DummyStripeUtils, null, props.children);
};
const PaymentElement = ({ fallback })=>{
    const { setIsPaymentElementReady, paymentMethodOrder, checkout, stripe, externalClientSecret, paymentDescription, for: _for } = usePaymentElementContext();
    const environment = useInternalEnvironment();
    const applePay = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!checkout || !checkout.totals || !checkout.plan) return;
        return {
            recurringPaymentRequest: {
                paymentDescription: paymentDescription || "",
                managementURL: _for === "organization" ? environment?.displayConfig.organizationProfileUrl || "" : environment?.displayConfig.userProfileUrl || "",
                regularBilling: {
                    amount: checkout.totals.totalDueNow?.amount || checkout.totals.grandTotal.amount,
                    label: checkout.plan.name,
                    recurringPaymentIntervalUnit: checkout.planPeriod === "annual" ? "year" : "month"
                }
            }
        };
    }, [
        checkout,
        paymentDescription,
        _for,
        environment
    ]);
    const options = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return {
            layout: {
                type: "tabs",
                defaultCollapsed: false
            },
            paymentMethodOrder,
            applePay
        };
    }, [
        applePay,
        paymentMethodOrder
    ]);
    const onReady = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setIsPaymentElementReady(true);
    }, [
        setIsPaymentElementReady
    ]);
    if (!stripe || !externalClientSecret) return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].Fragment, null, fallback);
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].createElement(PaymentElement$1, {
        fallback,
        onReady,
        options
    });
};
const throwLibsMissingError = ()=>{
    throw new Error("Clerk: Unable to submit, Stripe libraries are not yet loaded. Be sure to check `isFormReady` before calling `submit`.");
};
const usePaymentElement = ()=>{
    const { isPaymentElementReady, initializePaymentMethod } = usePaymentElementContext();
    const { stripe, elements } = useStripeUtilsContext();
    const { externalClientSecret } = usePaymentElementContext();
    const submit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        if (!stripe || !elements) return throwLibsMissingError();
        const { setupIntent, error } = await stripe.confirmSetup({
            elements,
            confirmParams: {
                return_url: window.location.href
            },
            redirect: "if_required"
        });
        if (error) return {
            data: null,
            error: {
                gateway: "stripe",
                error: {
                    code: error.code,
                    message: error.message,
                    type: error.type
                }
            }
        };
        return {
            data: {
                gateway: "stripe",
                paymentToken: setupIntent.payment_method
            },
            error: null
        };
    }, [
        stripe,
        elements
    ]);
    const reset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        if (!stripe || !elements) return throwLibsMissingError();
        await initializePaymentMethod();
    }, [
        stripe,
        elements,
        initializePaymentMethod
    ]);
    const isProviderReady = Boolean(stripe && externalClientSecret);
    if (!isProviderReady) return {
        submit: throwLibsMissingError,
        reset: throwLibsMissingError,
        isFormReady: false,
        provider: void 0,
        isProviderReady: false
    };
    return {
        submit,
        reset,
        isFormReady: isPaymentElementReady,
        provider: {
            name: "stripe"
        },
        isProviderReady
    };
};
;
 //# sourceMappingURL=index.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs [app-ssr] (ecmascript)");
;
;
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$D2ans7vW$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-D2ans7vW.mjs [app-ssr] (ecmascript)");
;
;
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/telemetry.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$telemetry$2d$wqMDWlvR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/telemetry-wqMDWlvR.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isDevelopmentEnvironment",
    ()=>isDevelopmentEnvironment,
    "isProductionEnvironment",
    ()=>isProductionEnvironment,
    "isTestEnvironment",
    ()=>isTestEnvironment
]);
//#region src/utils/runtimeEnvironment.ts
const isDevelopmentEnvironment = ()=>{
    try {
        return ("TURBOPACK compile-time value", "development") === "development";
    } catch  {}
    return false;
};
const isTestEnvironment = ()=>{
    try {
        return ("TURBOPACK compile-time value", "development") === "test";
    } catch  {}
    return false;
};
const isProductionEnvironment = ()=>{
    try {
        return ("TURBOPACK compile-time value", "development") === "production";
    } catch  {}
    return false;
};
;
 //# sourceMappingURL=runtimeEnvironment-BB2sO-19.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/deprecated-BqlFbLHj.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "deprecated",
    ()=>deprecated,
    "deprecatedObjectProperty",
    ()=>deprecatedObjectProperty,
    "deprecatedProperty",
    ()=>deprecatedProperty
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [app-ssr] (ecmascript)");
;
//#region src/deprecated.ts
/**
* Mark class method / function as deprecated.
*
* A console WARNING will be displayed when class method / function is invoked.
*
* Examples
* 1. Deprecate class method
* class Example {
*   getSomething = (arg1, arg2) => {
*       deprecated('Example.getSomething', 'Use `getSomethingElse` instead.');
*       return `getSomethingValue:${arg1 || '-'}:${arg2 || '-'}`;
*   };
* }
*
* 2. Deprecate function
* const getSomething = () => {
*   deprecated('getSomething', 'Use `getSomethingElse` instead.');
*   return 'getSomethingValue';
* };
*/ const displayedWarnings = /* @__PURE__ */ new Set();
const deprecated = (fnName, warning, key)=>{
    const hideWarning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isTestEnvironment"])() || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isProductionEnvironment"])();
    const messageId = key ?? fnName;
    if (displayedWarnings.has(messageId) || hideWarning) return;
    displayedWarnings.add(messageId);
    console.warn(`Clerk - DEPRECATION WARNING: "${fnName}" is deprecated and will be removed in the next major release.\n${warning}`);
};
const deprecatedProperty = (cls, propName, warning, isStatic = false)=>{
    const target = isStatic ? cls : cls.prototype;
    let value = target[propName];
    Object.defineProperty(target, propName, {
        get () {
            deprecated(propName, warning, `${cls.name}:${propName}`);
            return value;
        },
        set (v) {
            value = v;
        }
    });
};
/**
* Mark object property as deprecated.
*
* A console WARNING will be displayed when object property is being accessed.
*
* 1. Deprecate object property
* const obj = { something: 'aloha' };
*
* deprecatedObjectProperty(obj, 'something', 'Use `somethingElse` instead.');
*/ const deprecatedObjectProperty = (obj, propName, warning, key)=>{
    let value = obj[propName];
    Object.defineProperty(obj, propName, {
        get () {
            deprecated(propName, warning, key);
            return value;
        },
        set (v) {
            value = v;
        }
    });
};
;
 //# sourceMappingURL=deprecated-BqlFbLHj.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/deprecated.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$deprecated$2d$BqlFbLHj$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/deprecated-BqlFbLHj.mjs [app-ssr] (ecmascript)");
;
;
;
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/handleValueOrFn-CcwnRX-K.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "handleValueOrFn",
    ()=>handleValueOrFn
]);
//#region src/utils/handleValueOrFn.ts
function handleValueOrFn(value, url, defaultValue) {
    if (typeof value === "function") return value(url);
    if (typeof value !== "undefined") return value;
    if (typeof defaultValue !== "undefined") return defaultValue;
}
;
 //# sourceMappingURL=handleValueOrFn-CcwnRX-K.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/utils-BjdCqECo.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "allSettled",
    ()=>allSettled,
    "fastDeepMergeAndKeep",
    ()=>fastDeepMergeAndKeep,
    "fastDeepMergeAndReplace",
    ()=>fastDeepMergeAndReplace,
    "logErrorInDevMode",
    ()=>logErrorInDevMode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [app-ssr] (ecmascript)");
;
//#region src/utils/allSettled.ts
/**
* A ES6 compatible utility that implements `Promise.allSettled`
* @internal
*/ function allSettled(iterable) {
    const promises = Array.from(iterable).map((p)=>p.then((value)=>({
                status: "fulfilled",
                value
            }), (reason)=>({
                status: "rejected",
                reason
            })));
    return Promise.all(promises);
}
//#endregion
//#region src/utils/logErrorInDevMode.ts
const logErrorInDevMode = (message)=>{
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isDevelopmentEnvironment"])()) console.error(`Clerk: ${message}`);
};
//#endregion
//#region src/utils/fastDeepMerge.ts
/**
* Merges 2 objects without creating new object references
* The merged props will appear on the `target` object
* If `target` already has a value for a given key it will not be overwritten
*/ const fastDeepMergeAndReplace = (source, target)=>{
    if (!source || !target) return;
    for(const key in source)if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== null && typeof source[key] === `object`) {
        if (target[key] === void 0) target[key] = new (Object.getPrototypeOf(source[key])).constructor();
        fastDeepMergeAndReplace(source[key], target[key]);
    } else if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== void 0) target[key] = source[key];
};
const fastDeepMergeAndKeep = (source, target)=>{
    if (!source || !target) return;
    for(const key in source)if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== null && typeof source[key] === `object`) {
        if (target[key] === void 0) target[key] = new (Object.getPrototypeOf(source[key])).constructor();
        fastDeepMergeAndKeep(source[key], target[key]);
    } else if (Object.prototype.hasOwnProperty.call(source, key) && target[key] === void 0) target[key] = source[key];
};
;
 //# sourceMappingURL=utils-BjdCqECo.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/instance-Cze6Nv61.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isStaging",
    ()=>isStaging
]);
//#region src/utils/instance.ts
/**
* Check if the frontendApi ends with a staging domain
*/ function isStaging(frontendApi) {
    return frontendApi.endsWith(".lclstage.dev") || frontendApi.endsWith(".stgstage.dev") || frontendApi.endsWith(".clerkstage.dev") || frontendApi.endsWith(".accountsstage.dev");
}
;
 //# sourceMappingURL=instance-Cze6Nv61.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/utils/index.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$handleValueOrFn$2d$CcwnRX$2d$K$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/handleValueOrFn-CcwnRX-K.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$noop$2d$B3MbDAfb$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/noop-B3MbDAfb.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$createDeferredPromise$2d$CjYZzUuU$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/createDeferredPromise-CjYZzUuU.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$utils$2d$BjdCqECo$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/utils-BjdCqECo.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$instance$2d$Cze6Nv61$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/instance-Cze6Nv61.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/object-Be3MMNTQ.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "applyFunctionToObj",
    ()=>applyFunctionToObj,
    "filterProps",
    ()=>filterProps,
    "removeUndefined",
    ()=>removeUndefined,
    "without",
    ()=>without
]);
//#region src/object.ts
const without = (obj, ...props)=>{
    const copy = {
        ...obj
    };
    for (const prop of props)delete copy[prop];
    return copy;
};
const removeUndefined = (obj)=>{
    return Object.entries(obj).reduce((acc, [key, value])=>{
        if (value !== void 0 && value !== null) acc[key] = value;
        return acc;
    }, {});
};
const applyFunctionToObj = (obj, fn)=>{
    const result = {};
    for(const key in obj)result[key] = fn(obj[key], key);
    return result;
};
const filterProps = (obj, filter)=>{
    const result = {};
    for(const key in obj)if (obj[key] && filter(obj[key])) result[key] = obj[key];
    return result;
};
;
 //# sourceMappingURL=object-Be3MMNTQ.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/object.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$object$2d$Be3MMNTQ$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/object-Be3MMNTQ.mjs [app-ssr] (ecmascript)");
;
;
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/retry-DAlTROH9.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "retry",
    ()=>retry
]);
//#region src/retry.ts
const defaultOptions = {
    initialDelay: 125,
    maxDelayBetweenRetries: 0,
    factor: 2,
    shouldRetry: (_, iteration)=>iteration < 5,
    retryImmediately: false,
    jitter: true
};
const RETRY_IMMEDIATELY_DELAY = 100;
const sleep = async (ms)=>new Promise((s)=>setTimeout(s, ms));
const applyJitter = (delay, jitter)=>{
    return jitter ? delay * (1 + Math.random()) : delay;
};
const createExponentialDelayAsyncFn = (opts)=>{
    let timesCalled = 0;
    const calculateDelayInMs = ()=>{
        const constant = opts.initialDelay;
        const base = opts.factor;
        let delay = constant * Math.pow(base, timesCalled);
        delay = applyJitter(delay, opts.jitter);
        return Math.min(opts.maxDelayBetweenRetries || delay, delay);
    };
    return async ()=>{
        await sleep(calculateDelayInMs());
        timesCalled++;
    };
};
/**
* Retries a callback until it succeeds or the shouldRetry function returns false.
* See {@link RetryOptions} for the available options.
*/ const retry = async (callback, options = {})=>{
    let iterations = 0;
    const { shouldRetry, initialDelay, maxDelayBetweenRetries, factor, retryImmediately, jitter, onBeforeRetry } = {
        ...defaultOptions,
        ...options
    };
    const delay = createExponentialDelayAsyncFn({
        initialDelay,
        maxDelayBetweenRetries,
        factor,
        jitter
    });
    while(true)try {
        return await callback();
    } catch (e) {
        iterations++;
        if (!shouldRetry(e, iterations)) throw e;
        if (onBeforeRetry) await onBeforeRetry(iterations);
        if (retryImmediately && iterations === 1) await sleep(applyJitter(RETRY_IMMEDIATELY_DELAY, jitter));
        else await delay();
    }
};
;
 //# sourceMappingURL=retry-DAlTROH9.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/loadScript-t1vaIfy5.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "loadScript",
    ()=>loadScript
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$retry$2d$DAlTROH9$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/retry-DAlTROH9.mjs [app-ssr] (ecmascript)");
;
//#region src/loadScript.ts
const NO_DOCUMENT_ERROR = "loadScript cannot be called when document does not exist";
const NO_SRC_ERROR = "loadScript cannot be called without a src";
async function loadScript(src = "", opts) {
    const { async, defer, beforeLoad, crossOrigin, nonce } = opts || {};
    const load = ()=>{
        return new Promise((resolve, reject)=>{
            if (!src) reject(new Error(NO_SRC_ERROR));
            if (!document || !document.body) reject(new Error(NO_DOCUMENT_ERROR));
            const script = document.createElement("script");
            if (crossOrigin) script.setAttribute("crossorigin", crossOrigin);
            script.async = async || false;
            script.defer = defer || false;
            script.addEventListener("load", ()=>{
                script.remove();
                resolve(script);
            });
            script.addEventListener("error", (event)=>{
                script.remove();
                reject(event.error ?? /* @__PURE__ */ new Error(`failed to load script: ${src}`));
            });
            script.src = src;
            script.nonce = nonce;
            beforeLoad?.(script);
            document.body.appendChild(script);
        });
    };
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$retry$2d$DAlTROH9$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["retry"])(load, {
        shouldRetry: (_, iterations)=>iterations <= 5
    });
}
;
 //# sourceMappingURL=loadScript-t1vaIfy5.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/proxy-Bq8EHApG.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isHttpOrHttps",
    ()=>isHttpOrHttps,
    "isProxyUrlRelative",
    ()=>isProxyUrlRelative,
    "isValidProxyUrl",
    ()=>isValidProxyUrl,
    "proxyUrlToAbsoluteURL",
    ()=>proxyUrlToAbsoluteURL
]);
//#region src/proxy.ts
function isValidProxyUrl(key) {
    if (!key) return true;
    return isHttpOrHttps(key) || isProxyUrlRelative(key);
}
function isHttpOrHttps(key) {
    return /^http(s)?:\/\//.test(key || "");
}
function isProxyUrlRelative(key) {
    return key.startsWith("/");
}
function proxyUrlToAbsoluteURL(url) {
    if (!url) return "";
    return isProxyUrlRelative(url) ? new URL(url, window.location.origin).toString() : url;
}
;
 //# sourceMappingURL=proxy-Bq8EHApG.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/url-Cdy8w8vK.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addClerkPrefix",
    ()=>addClerkPrefix,
    "cleanDoubleSlashes",
    ()=>cleanDoubleSlashes,
    "getClerkJsMajorVersionOrTag",
    ()=>getClerkJsMajorVersionOrTag,
    "getScriptUrl",
    ()=>getScriptUrl,
    "hasLeadingSlash",
    ()=>hasLeadingSlash,
    "hasTrailingSlash",
    ()=>hasTrailingSlash,
    "isAbsoluteUrl",
    ()=>isAbsoluteUrl,
    "isCurrentDevAccountPortalOrigin",
    ()=>isCurrentDevAccountPortalOrigin,
    "isLegacyDevAccountPortalOrigin",
    ()=>isLegacyDevAccountPortalOrigin,
    "isNonEmptyURL",
    ()=>isNonEmptyURL,
    "joinURL",
    ()=>joinURL,
    "parseSearchParams",
    ()=>parseSearchParams,
    "stripScheme",
    ()=>stripScheme,
    "withLeadingSlash",
    ()=>withLeadingSlash,
    "withTrailingSlash",
    ()=>withTrailingSlash,
    "withoutLeadingSlash",
    ()=>withoutLeadingSlash,
    "withoutTrailingSlash",
    ()=>withoutTrailingSlash
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$instance$2d$Cze6Nv61$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/instance-Cze6Nv61.mjs [app-ssr] (ecmascript)");
;
;
//#region src/url.ts
function parseSearchParams(queryString = "") {
    if (queryString.startsWith("?")) queryString = queryString.slice(1);
    return new URLSearchParams(queryString);
}
function stripScheme(url = "") {
    return (url || "").replace(/^.+:\/\//, "");
}
function addClerkPrefix(str) {
    if (!str) return "";
    let regex;
    if (str.match(/^(clerk\.)+\w*$/)) regex = /(clerk\.)*(?=clerk\.)/;
    else if (str.match(/\.clerk.accounts/)) return str;
    else regex = /^(clerk\.)*/gi;
    return `clerk.${str.replace(regex, "")}`;
}
/**
*
* Retrieve the clerk-js major tag using the major version from the pkgVersion
* param or use the frontendApi to determine if the canary tag should be used.
* The default tag is `latest`.
*/ const getClerkJsMajorVersionOrTag = (frontendApi, version)=>{
    if (!version && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$instance$2d$Cze6Nv61$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isStaging"])(frontendApi)) return "canary";
    if (!version) return "latest";
    return version.split(".")[0] || "latest";
};
/**
*
* Retrieve the clerk-js script url from the frontendApi and the major tag
* using the {@link getClerkJsMajorVersionOrTag} or a provided clerkJSVersion tag.
*/ const getScriptUrl = (frontendApi, { clerkJSVersion })=>{
    const noSchemeFrontendApi = frontendApi.replace(/http(s)?:\/\//, "");
    const major = getClerkJsMajorVersionOrTag(frontendApi, clerkJSVersion);
    return `https://${noSchemeFrontendApi}/npm/@clerk/clerk-js@${clerkJSVersion || major}/dist/clerk.browser.js`;
};
function isLegacyDevAccountPortalOrigin(host) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LEGACY_DEV_INSTANCE_SUFFIXES"].some((legacyDevSuffix)=>{
        return host.startsWith("accounts.") && host.endsWith(legacyDevSuffix);
    });
}
function isCurrentDevAccountPortalOrigin(host) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CURRENT_DEV_INSTANCE_SUFFIXES"].some((currentDevSuffix)=>{
        return host.endsWith(currentDevSuffix) && !host.endsWith(".clerk" + currentDevSuffix);
    });
}
const TRAILING_SLASH_RE = /\/$|\/\?|\/#/;
function hasTrailingSlash(input = "", respectQueryAndFragment) {
    if (!respectQueryAndFragment) return input.endsWith("/");
    return TRAILING_SLASH_RE.test(input);
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
    if (!respectQueryAndFragment) return input.endsWith("/") ? input : input + "/";
    if (hasTrailingSlash(input, true)) return input || "/";
    let path = input;
    let fragment = "";
    const fragmentIndex = input.indexOf("#");
    if (fragmentIndex >= 0) {
        path = input.slice(0, fragmentIndex);
        fragment = input.slice(fragmentIndex);
        if (!path) return fragment;
    }
    const [s0, ...s] = path.split("?");
    return s0 + "/" + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
    if (!respectQueryAndFragment) return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
    if (!hasTrailingSlash(input, true)) return input || "/";
    let path = input;
    let fragment = "";
    const fragmentIndex = input.indexOf("#");
    if (fragmentIndex >= 0) {
        path = input.slice(0, fragmentIndex);
        fragment = input.slice(fragmentIndex);
    }
    const [s0, ...s] = path.split("?");
    return (s0.slice(0, -1) || "/") + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function hasLeadingSlash(input = "") {
    return input.startsWith("/");
}
function withoutLeadingSlash(input = "") {
    return (hasLeadingSlash(input) ? input.slice(1) : input) || "/";
}
function withLeadingSlash(input = "") {
    return hasLeadingSlash(input) ? input : "/" + input;
}
function cleanDoubleSlashes(input = "") {
    return input.split("://").map((string_)=>string_.replace(/\/{2,}/g, "/")).join("://");
}
function isNonEmptyURL(url) {
    return url && url !== "/";
}
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function joinURL(base, ...input) {
    let url = base || "";
    for (const segment of input.filter((url$1)=>isNonEmptyURL(url$1)))if (url) {
        const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
        url = withTrailingSlash(url) + _segment;
    } else url = segment;
    return url;
}
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;
const isAbsoluteUrl = (url)=>ABSOLUTE_URL_REGEX.test(url);
;
 //# sourceMappingURL=url-Cdy8w8vK.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/versionSelector-D29MCAQA.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getMajorVersion",
    ()=>getMajorVersion,
    "versionSelector",
    ()=>versionSelector
]);
//#region src/versionSelector.ts
/**
* This version selector is a bit complicated, so here is the flow:
* 1. Use the clerkJSVersion prop on the provider
* 2. Use the exact `@clerk/clerk-js` version if it is a `@snapshot` prerelease
* 3. Use the prerelease tag of `@clerk/clerk-js` or the packageVersion provided
* 4. Fallback to the major version of `@clerk/clerk-js` or the packageVersion provided
* @param clerkJSVersion - The optional clerkJSVersion prop on the provider
* @param packageVersion - The version of `@clerk/clerk-js` that will be used if an explicit version is not provided
* @returns The npm tag, version or major version to use
*/ const versionSelector = (clerkJSVersion, packageVersion = "5.117.0")=>{
    if (clerkJSVersion) return clerkJSVersion;
    const prereleaseTag = getPrereleaseTag(packageVersion);
    if (prereleaseTag) {
        if (prereleaseTag === "snapshot") return "5.117.0";
        return prereleaseTag;
    }
    return getMajorVersion(packageVersion);
};
const getPrereleaseTag = (packageVersion)=>packageVersion.trim().replace(/^v/, "").match(/-(.+?)(\.|$)/)?.[1];
const getMajorVersion = (packageVersion)=>packageVersion.trim().replace(/^v/, "").split(".")[0];
;
 //# sourceMappingURL=versionSelector-D29MCAQA.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/loadClerkJsScript-qRGdRMGp.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildClerkJsScriptAttributes",
    ()=>buildClerkJsScriptAttributes,
    "clerkJsScriptUrl",
    ()=>clerkJsScriptUrl,
    "loadClerkJsScript",
    ()=>loadClerkJsScript,
    "setClerkJsLoadingErrorPackageName",
    ()=>setClerkJsLoadingErrorPackageName
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$loadScript$2d$t1vaIfy5$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/loadScript-t1vaIfy5.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$proxy$2d$Bq8EHApG$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/proxy-Bq8EHApG.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$url$2d$Cdy8w8vK$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/url-Cdy8w8vK.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$versionSelector$2d$D29MCAQA$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/versionSelector-D29MCAQA.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
;
//#region src/loadClerkJsScript.ts
const ERROR_CODE = "failed_to_load_clerk_js";
const ERROR_CODE_TIMEOUT = "failed_to_load_clerk_js_timeout";
const FAILED_TO_LOAD_ERROR = "Failed to load Clerk";
const { isDevOrStagingUrl } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createDevOrStagingUrlCache"])();
const errorThrower = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["buildErrorThrower"])({
    packageName: "@clerk/shared"
});
/**
* Sets the package name for error messages during ClerkJS script loading.
*
* @param packageName - The name of the package to use in error messages (e.g., '@clerk/clerk-react').
* @example
* ```typescript
* setClerkJsLoadingErrorPackageName('@clerk/clerk-react');
* ```
*/ function setClerkJsLoadingErrorPackageName(packageName) {
    errorThrower.setPackageName({
        packageName
    });
}
/**
* Validates that window.Clerk exists and is properly initialized.
* This ensures we don't have false positives where the script loads but Clerk is malformed.
*
* @returns `true` if window.Clerk exists and has the expected structure with a load method.
*/ function isClerkProperlyLoaded() {
    if ("TURBOPACK compile-time truthy", 1) return false;
    //TURBOPACK unreachable
    ;
    const clerk = undefined;
}
/**
* Checks if an existing script has a request error using Performance API.
*
* @param scriptUrl - The URL of the script to check.
* @returns True if the script has failed to load due to a network/HTTP error.
*/ function hasScriptRequestError(scriptUrl) {
    if ("TURBOPACK compile-time truthy", 1) return false;
    //TURBOPACK unreachable
    ;
    const entries = undefined;
    const scriptEntry = undefined;
}
/**
* Waits for Clerk to be properly loaded with a timeout mechanism.
* Uses polling to check if Clerk becomes available within the specified timeout.
*
* @param timeoutMs - Maximum time to wait in milliseconds.
* @param existingScript - The existing script element to wait for. Optional, for existing scripts.
* @returns Promise that resolves with null if Clerk loads successfully, or rejects with an error if timeout is reached.
*/ function waitForClerkWithTimeout(timeoutMs, existingScript) {
    return new Promise((resolve, reject)=>{
        let resolved = false;
        const cleanup = (timeoutId$1, pollInterval$1)=>{
            clearTimeout(timeoutId$1);
            clearInterval(pollInterval$1);
        };
        existingScript?.addEventListener("error", ()=>{
            cleanup(timeoutId, pollInterval);
            reject(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ClerkRuntimeError"](FAILED_TO_LOAD_ERROR, {
                code: ERROR_CODE
            }));
        });
        const checkAndResolve = ()=>{
            if (resolved) return;
            if (isClerkProperlyLoaded()) {
                resolved = true;
                cleanup(timeoutId, pollInterval);
                resolve(null);
            }
        };
        const handleTimeout = ()=>{
            if (resolved) return;
            resolved = true;
            cleanup(timeoutId, pollInterval);
            if (!isClerkProperlyLoaded()) reject(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ClerkRuntimeError"](FAILED_TO_LOAD_ERROR, {
                code: ERROR_CODE_TIMEOUT
            }));
            else resolve(null);
        };
        const timeoutId = setTimeout(handleTimeout, timeoutMs);
        checkAndResolve();
        const pollInterval = setInterval(()=>{
            if (resolved) {
                clearInterval(pollInterval);
                return;
            }
            checkAndResolve();
        }, 100);
    });
}
/**
* Hotloads the Clerk JS script with robust failure detection and retry logic.
*
* For existing scripts:
* - If no request error detected: waits for timeout, then retries with loadScript if timeout expires
* - If request error detected: immediately retries with loadScript.
*
* For new scripts: uses loadScript which has built-in retry logic via the retry utility.
*
* @param opts - The options used to build the Clerk JS script URL and load the script.
*               Must include a `publishableKey` if no existing script is found.
* @returns Promise that resolves with null if Clerk loads successfully, or rejects with an error.
*
* @example
* ```typescript
* try {
*   await loadClerkJsScript({ publishableKey: 'pk_test_...' });
*   console.log('Clerk loaded successfully');
* } catch (error) {
*   console.error('Failed to load Clerk:', error.message);
* }
* ```
*/ const loadClerkJsScript = async (opts)=>{
    const timeout = opts?.scriptLoadTimeout ?? 15e3;
    if (isClerkProperlyLoaded()) return null;
    if (!opts?.publishableKey) {
        errorThrower.throwMissingPublishableKeyError();
        return null;
    }
    const scriptUrl = clerkJsScriptUrl(opts);
    const existingScript = document.querySelector("script[data-clerk-js-script]");
    if (existingScript) if (hasScriptRequestError(scriptUrl)) existingScript.remove();
    else try {
        await waitForClerkWithTimeout(timeout, existingScript);
        return null;
    } catch  {
        existingScript.remove();
    }
    const loadPromise = waitForClerkWithTimeout(timeout);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$loadScript$2d$t1vaIfy5$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadScript"])(scriptUrl, {
        async: true,
        crossOrigin: "anonymous",
        nonce: opts.nonce,
        beforeLoad: applyClerkJsScriptAttributes(opts)
    }).catch((error)=>{
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ClerkRuntimeError"](FAILED_TO_LOAD_ERROR + (error.message ? `, ${error.message}` : ""), {
            code: ERROR_CODE,
            cause: error
        });
    });
    return loadPromise;
};
/**
* Generates a Clerk JS script URL based on the provided options.
*
* @param opts - The options to use when building the Clerk JS script URL.
* @returns The complete URL to the Clerk JS script.
*
* @example
* ```typescript
* const url = clerkJsScriptUrl({ publishableKey: 'pk_test_...' });
* // Returns: "https://example.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
* ```
*/ const clerkJsScriptUrl = (opts)=>{
    const { clerkJSUrl, clerkJSVariant, clerkJSVersion, proxyUrl, domain, publishableKey } = opts;
    if (clerkJSUrl) return clerkJSUrl;
    let scriptHost = "";
    if (!!proxyUrl && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$proxy$2d$Bq8EHApG$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isValidProxyUrl"])(proxyUrl)) scriptHost = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$proxy$2d$Bq8EHApG$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["proxyUrlToAbsoluteURL"])(proxyUrl).replace(/http(s)?:\/\//, "");
    else if (domain && !isDevOrStagingUrl((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parsePublishableKey"])(publishableKey)?.frontendApi || "")) scriptHost = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$url$2d$Cdy8w8vK$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addClerkPrefix"])(domain);
    else scriptHost = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parsePublishableKey"])(publishableKey)?.frontendApi || "";
    const variant = clerkJSVariant ? `${clerkJSVariant.replace(/\.+$/, "")}.` : "";
    const version = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$versionSelector$2d$D29MCAQA$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["versionSelector"])(clerkJSVersion);
    return `https://${scriptHost}/npm/@clerk/clerk-js@${version}/dist/clerk.${variant}browser.js`;
};
/**
* Builds an object of Clerk JS script attributes based on the provided options.
*
* @param options - The options containing the values for script attributes.
* @returns An object containing data attributes to be applied to the script element.
*/ const buildClerkJsScriptAttributes = (options)=>{
    const obj = {};
    if (options.publishableKey) obj["data-clerk-publishable-key"] = options.publishableKey;
    if (options.proxyUrl) obj["data-clerk-proxy-url"] = options.proxyUrl;
    if (options.domain) obj["data-clerk-domain"] = options.domain;
    if (options.nonce) obj.nonce = options.nonce;
    return obj;
};
/**
* Returns a function that applies Clerk JS script attributes to a script element.
*
* @param options - The options containing the values for script attributes.
* @returns A function that accepts a script element and applies the attributes to it.
*/ const applyClerkJsScriptAttributes = (options)=>(script)=>{
        const attributes = buildClerkJsScriptAttributes(options);
        for(const attribute in attributes)script.setAttribute(attribute, attributes[attribute]);
    };
;
 //# sourceMappingURL=loadClerkJsScript-qRGdRMGp.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/loadClerkJsScript.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$instance$2d$Cze6Nv61$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/instance-Cze6Nv61.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$retry$2d$DAlTROH9$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/retry-DAlTROH9.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$loadScript$2d$t1vaIfy5$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/loadScript-t1vaIfy5.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$proxy$2d$Bq8EHApG$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/proxy-Bq8EHApG.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$url$2d$Cdy8w8vK$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/url-Cdy8w8vK.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$versionSelector$2d$D29MCAQA$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/versionSelector-D29MCAQA.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$loadClerkJsScript$2d$qRGdRMGp$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/loadClerkJsScript-qRGdRMGp.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/deriveState-ChDqlleE.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "deriveState",
    ()=>deriveState
]);
//#region src/deriveState.ts
/**
* Derives authentication state based on the current rendering context (SSR or client-side).
*/ const deriveState = (clerkOperational, state, initialState)=>{
    if (!clerkOperational && initialState) return deriveFromSsrInitialState(initialState);
    return deriveFromClientSideState(state);
};
const deriveFromSsrInitialState = (initialState)=>{
    const userId = initialState.userId;
    const user = initialState.user;
    const sessionId = initialState.sessionId;
    const sessionStatus = initialState.sessionStatus;
    const sessionClaims = initialState.sessionClaims;
    return {
        userId,
        user,
        sessionId,
        session: initialState.session,
        sessionStatus,
        sessionClaims,
        organization: initialState.organization,
        orgId: initialState.orgId,
        orgRole: initialState.orgRole,
        orgPermissions: initialState.orgPermissions,
        orgSlug: initialState.orgSlug,
        actor: initialState.actor,
        factorVerificationAge: initialState.factorVerificationAge
    };
};
const deriveFromClientSideState = (state)=>{
    const userId = state.user ? state.user.id : state.user;
    const user = state.user;
    const sessionId = state.session ? state.session.id : state.session;
    const session = state.session;
    const sessionStatus = state.session?.status;
    const sessionClaims = state.session ? state.session.lastActiveToken?.jwt?.claims : null;
    const factorVerificationAge = state.session ? state.session.factorVerificationAge : null;
    const actor = session?.actor;
    const organization = state.organization;
    const orgId = state.organization ? state.organization.id : state.organization;
    const orgSlug = organization?.slug;
    const membership = organization ? user?.organizationMemberships?.find((om)=>om.organization.id === orgId) : organization;
    const orgPermissions = membership ? membership.permissions : membership;
    return {
        userId,
        user,
        sessionId,
        session,
        sessionStatus,
        sessionClaims,
        organization,
        orgId,
        orgRole: membership ? membership.role : membership,
        orgSlug,
        orgPermissions,
        actor,
        factorVerificationAge
    };
};
;
 //# sourceMappingURL=deriveState-ChDqlleE.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/deriveState.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$deriveState$2d$ChDqlleE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/deriveState-ChDqlleE.mjs [app-ssr] (ecmascript)");
;
;
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/browser-D5e8obql.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "inBrowser",
    ()=>inBrowser,
    "isBrowserOnline",
    ()=>isBrowserOnline,
    "isValidBrowser",
    ()=>isValidBrowser,
    "isValidBrowserOnline",
    ()=>isValidBrowserOnline,
    "userAgentIsRobot",
    ()=>userAgentIsRobot
]);
//#region src/browser.ts
/**
* Checks if the window object is defined. You can also use this to check if something is happening on the client side.
* @returns {boolean}
*/ function inBrowser() {
    return ("TURBOPACK compile-time value", "undefined") !== "undefined";
}
const botAgentRegex = new RegExp([
    "bot",
    "spider",
    "crawl",
    "APIs-Google",
    "AdsBot",
    "Googlebot",
    "mediapartners",
    "Google Favicon",
    "FeedFetcher",
    "Google-Read-Aloud",
    "DuplexWeb-Google",
    "googleweblight",
    "bing",
    "yandex",
    "baidu",
    "duckduck",
    "yahoo",
    "ecosia",
    "ia_archiver",
    "facebook",
    "instagram",
    "pinterest",
    "reddit",
    "slack",
    "twitter",
    "whatsapp",
    "youtube",
    "semrush"
].join("|"), "i");
/**
* Checks if the user agent is a bot.
* @param userAgent - Any user agent string
* @returns {boolean}
*/ function userAgentIsRobot(userAgent) {
    return !userAgent ? false : botAgentRegex.test(userAgent);
}
/**
* Checks if the current environment is a browser and the user agent is not a bot.
* @returns {boolean}
*/ function isValidBrowser() {
    const navigator = inBrowser() ? "TURBOPACK unreachable" : null;
    if ("TURBOPACK compile-time truthy", 1) return false;
    //TURBOPACK unreachable
    ;
}
/**
* Checks if the current environment is a browser and if the navigator is online.
* @returns {boolean}
*/ function isBrowserOnline() {
    const navigator = inBrowser() ? "TURBOPACK unreachable" : null;
    if ("TURBOPACK compile-time truthy", 1) return false;
    //TURBOPACK unreachable
    ;
    const isNavigatorOnline = undefined;
}
/**
* Runs `isBrowserOnline` and `isValidBrowser` to check if the current environment is a valid browser and if the navigator is online.
* @returns {boolean}
*/ function isValidBrowserOnline() {
    return isBrowserOnline() && isValidBrowser();
}
;
 //# sourceMappingURL=browser-D5e8obql.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/browser.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$browser$2d$D5e8obql$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/browser-D5e8obql.mjs [app-ssr] (ecmascript)");
;
;
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/eventBus-UpdW-1JB.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createEventBus",
    ()=>createEventBus
]);
//#region src/eventBus.ts
/**
* @internal
*/ const _on = (eventToHandlersMap, latestPayloadMap, event, handler, opts)=>{
    const { notify } = opts || {};
    let handlers = eventToHandlersMap.get(event);
    if (!handlers) {
        handlers = [];
        eventToHandlersMap.set(event, handlers);
    }
    handlers.push(handler);
    if (notify && latestPayloadMap.has(event)) handler(latestPayloadMap.get(event));
};
/**
* @internal
*/ const _dispatch = (eventToHandlersMap, event, payload)=>(eventToHandlersMap.get(event) || []).map((h)=>h(payload));
/**
* @internal
*/ const _off = (eventToHandlersMap, event, handler)=>{
    const handlers = eventToHandlersMap.get(event);
    if (handlers) if (handler) handlers.splice(handlers.indexOf(handler) >>> 0, 1);
    else eventToHandlersMap.set(event, []);
};
/**
* A ES6/2015 compatible 300 byte event bus
*
* Creates a strongly-typed event bus that enables publish/subscribe communication between components.
*
* @template Events - A record type that maps event names to their payload types
* @returns An EventBus instance with the following methods:
* - `on`: Subscribe to an event
* - `onPreDispatch`: Subscribe to an event, triggered before regular subscribers
* - `emit`: Publish an event with payload
* - `off`: Unsubscribe from an event
* - `offPreDispatch`: Unsubscribe from a pre-dispatch event
*
* @example
* // Define event types
* const eventBus = createEventBus<{
*   'user-login': { userId: string; timestamp: number };
*   'data-updated': { records: any[] };
*   'error': Error;
* }>();
*
* // Subscribe to events
* eventBus.on('user-login', ({ userId, timestamp }) => {
*   console.log(`User ${userId} logged in at ${timestamp}`);
* });
*
* // Subscribe with immediate notification if event was already dispatched
* eventBus.on('user-login', (payload) => {
*   // This will be called immediately if 'user-login' was previously dispatched
* }, { notify: true });
*
* // Publish an event
* eventBus.emit('user-login', { userId: 'abc123', timestamp: Date.now() });
*
* // Unsubscribe from event
* const handler = (payload) => console.log(payload);
* eventBus.on('error', handler);
* // Later...
* eventBus.off('error', handler);
*
* // Unsubscribe all handlers for an event
* eventBus.off('data-updated');
*/ const createEventBus = ()=>{
    const eventToHandlersMap = /* @__PURE__ */ new Map();
    const latestPayloadMap = /* @__PURE__ */ new Map();
    const eventToPredispatchHandlersMap = /* @__PURE__ */ new Map();
    const emit = (event, payload)=>{
        latestPayloadMap.set(event, payload);
        _dispatch(eventToPredispatchHandlersMap, event, payload);
        _dispatch(eventToHandlersMap, event, payload);
    };
    return {
        on: (...args)=>_on(eventToHandlersMap, latestPayloadMap, ...args),
        prioritizedOn: (...args)=>_on(eventToPredispatchHandlersMap, latestPayloadMap, ...args),
        emit,
        off: (...args)=>_off(eventToHandlersMap, ...args),
        prioritizedOff: (...args)=>_off(eventToPredispatchHandlersMap, ...args),
        internal: {
            retrieveListeners: (event)=>eventToHandlersMap.get(event) || []
        }
    };
};
;
 //# sourceMappingURL=eventBus-UpdW-1JB.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/clerkEventBus.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clerkEvents",
    ()=>clerkEvents,
    "createClerkEventBus",
    ()=>createClerkEventBus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$eventBus$2d$UpdW$2d$1JB$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/eventBus-UpdW-1JB.mjs [app-ssr] (ecmascript)");
;
//#region src/clerkEventBus.ts
const clerkEvents = {
    Status: "status"
};
const createClerkEventBus = ()=>{
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$eventBus$2d$UpdW$2d$1JB$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createEventBus"])();
};
;
 //# sourceMappingURL=clerkEventBus.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/logger-B9q7E6uE.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "logger",
    ()=>logger
]);
//#region src/logger.ts
const loggedMessages = /* @__PURE__ */ new Set();
const logger = {
    warnOnce: (msg)=>{
        if (loggedMessages.has(msg)) return;
        loggedMessages.add(msg);
        console.warn(msg);
    },
    logOnce: (msg)=>{
        if (loggedMessages.has(msg)) return;
        console.log(msg);
        loggedMessages.add(msg);
    }
};
;
 //# sourceMappingURL=logger-B9q7E6uE.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/logger.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$logger$2d$B9q7E6uE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/logger-B9q7E6uE.mjs [app-ssr] (ecmascript)");
;
;
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/apiUrlFromPublishableKey-B2KkwQp6.mjs [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "apiUrlFromPublishableKey",
    ()=>apiUrlFromPublishableKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-ssr] (ecmascript)");
;
;
//#region src/apiUrlFromPublishableKey.ts
/**
* Get the correct API url based on the publishable key.
*
* @param publishableKey - The publishable key to parse.
* @returns One of Clerk's API URLs.
*/ const apiUrlFromPublishableKey = (publishableKey)=>{
    const frontendApi = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parsePublishableKey"])(publishableKey)?.frontendApi;
    if (frontendApi?.startsWith("clerk.") && __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LEGACY_DEV_INSTANCE_SUFFIXES"].some((suffix)=>frontendApi?.endsWith(suffix))) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROD_API_URL"];
    if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LOCAL_ENV_SUFFIXES"].some((suffix)=>frontendApi?.endsWith(suffix))) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LOCAL_API_URL"];
    if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["STAGING_ENV_SUFFIXES"].some((suffix)=>frontendApi?.endsWith(suffix))) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["STAGING_API_URL"];
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROD_API_URL"];
};
;
 //# sourceMappingURL=apiUrlFromPublishableKey-B2KkwQp6.mjs.map
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/apiUrlFromPublishableKey.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$apiUrlFromPublishableKey$2d$B2KkwQp6$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/apiUrlFromPublishableKey-B2KkwQp6.mjs [app-ssr] (ecmascript)");
;
;
;
;
;
;
}),
"[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore.mjs [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs [app-ssr] (ecmascript)");
;
;
}),
];

//# sourceMappingURL=3f84d_%40clerk_shared_dist_runtime_d6530ea8._.js.map