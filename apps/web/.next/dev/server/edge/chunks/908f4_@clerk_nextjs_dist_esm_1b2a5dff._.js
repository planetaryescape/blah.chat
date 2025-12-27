(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/908f4_@clerk_nextjs_dist_esm_1b2a5dff._.js",
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/constants.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "constants",
    ()=>constants
]);
;
const Headers = {
    NextRewrite: "x-middleware-rewrite",
    NextResume: "x-middleware-next",
    NextRedirect: "Location",
    // Used by next to identify internal navigation for app router
    NextUrl: "next-url",
    NextAction: "next-action",
    // Used by next to identify internal navigation for pages router
    NextjsData: "x-nextjs-data"
};
const constants = {
    Headers
};
;
 //# sourceMappingURL=constants.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/response.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isRedirect",
    ()=>isRedirect,
    "setHeader",
    ()=>setHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/constants.js [middleware-edge] (ecmascript)");
;
;
const isRedirect = (res)=>{
    return res.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["constants"].Headers.NextRedirect);
};
const setHeader = (res, name, val)=>{
    res.headers.set(name, val);
    return res;
};
;
 //# sourceMappingURL=response.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/serverRedirectWithAuth.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "serverRedirectWithAuth",
    ()=>serverRedirectWithAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$internal$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/internal.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TTM76E4X.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$devBrowser$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/devBrowser.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$devBrowser$2d$Dm$2d$lbUnV$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/devBrowser-Dm-lbUnV.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
;
;
;
;
const serverRedirectWithAuth = (clerkRequest, res, opts)=>{
    const location = res.headers.get("location");
    const shouldAppendDevBrowser = res.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.ClerkRedirectTo) === "true";
    if (shouldAppendDevBrowser && !!location && (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isDevelopmentFromSecretKey"])(opts.secretKey) && clerkRequest.clerkUrl.isCrossOrigin(location)) {
        const dbJwt = clerkRequest.cookies.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$devBrowser$2d$Dm$2d$lbUnV$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["DEV_BROWSER_JWT_KEY"]) || "";
        const url = new URL(location);
        const urlWithDevBrowser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$devBrowser$2d$Dm$2d$lbUnV$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setDevBrowserJWTInURL"])(url, dbJwt);
        return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(urlWithDevBrowser.href, res);
    }
    return res;
};
;
 //# sourceMappingURL=serverRedirectWithAuth.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/logFormatter.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "logFormatter",
    ()=>logFormatter
]);
;
const maskSecretKey = (str)=>{
    if (!str || typeof str !== "string") {
        return str;
    }
    try {
        return (str || "").replace(/^(sk_(live|test)_)(.+?)(.{3})$/, "$1*********$4");
    } catch  {
        return "";
    }
};
const logFormatter = (entry)=>{
    return (Array.isArray(entry) ? entry : [
        entry
    ]).map((entry2)=>{
        if (typeof entry2 === "string") {
            return maskSecretKey(entry2);
        }
        const masked = Object.fromEntries(Object.entries(entry2).map(([k, v])=>[
                k,
                maskSecretKey(v)
            ]));
        return JSON.stringify(masked, null, 2);
    }).join(", ");
};
;
 //# sourceMappingURL=logFormatter.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/debugLogger.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createDebugLogger",
    ()=>createDebugLogger,
    "withLogger",
    ()=>withLogger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$package$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/package.json (json)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$logFormatter$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/logFormatter.js [middleware-edge] (ecmascript)");
;
;
;
const createDebugLogger = (name, formatter)=>()=>{
        const entries = [];
        let isEnabled = false;
        return {
            enable: ()=>{
                isEnabled = true;
            },
            debug: (...args)=>{
                if (isEnabled) {
                    entries.push(args.map((arg)=>typeof arg === "function" ? arg() : arg));
                }
            },
            commit: ()=>{
                if (isEnabled) {
                    console.log(debugLogHeader(name));
                    for (const log of entries){
                        let output = formatter(log);
                        output = output.split("\n").map((l)=>`  ${l}`).join("\n");
                        if (process.env.VERCEL) {
                            output = truncate(output, 4096);
                        }
                        console.log(output);
                    }
                    console.log(debugLogFooter(name));
                }
            }
        };
    };
const withLogger = (loggerFactoryOrName, handlerCtor)=>{
    return (...args)=>{
        const factory = typeof loggerFactoryOrName === "string" ? createDebugLogger(loggerFactoryOrName, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$logFormatter$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logFormatter"]) : loggerFactoryOrName;
        const logger = factory();
        const handler = handlerCtor(logger);
        try {
            const res = handler(...args);
            if (typeof res === "object" && "then" in res && typeof res.then === "function") {
                return res.then((val)=>{
                    logger.commit();
                    return val;
                }).catch((err)=>{
                    logger.commit();
                    throw err;
                });
            }
            logger.commit();
            return res;
        } catch (err) {
            logger.commit();
            throw err;
        }
    };
};
function debugLogHeader(name) {
    return `[clerk debug start: ${name}]`;
}
function debugLogFooter(name) {
    return `[clerk debug end: ${name}] (@clerk/nextjs=${"6.36.5"},next=${__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$package$2e$json__$28$json$29$__["default"].version},timestamp=${Math.round(/* @__PURE__ */ new Date().getTime() / 1e3)})`;
}
function truncate(str, maxLength) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder("utf-8");
    const encodedString = encoder.encode(str);
    const truncatedString = encodedString.slice(0, maxLength);
    return decoder.decode(truncatedString).replace(/\uFFFD/g, "");
}
;
 //# sourceMappingURL=debugLogger.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/constants.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "API_URL",
    ()=>API_URL,
    "API_VERSION",
    ()=>API_VERSION,
    "CLERK_JS_URL",
    ()=>CLERK_JS_URL,
    "CLERK_JS_VERSION",
    ()=>CLERK_JS_VERSION,
    "DOMAIN",
    ()=>DOMAIN,
    "ENCRYPTION_KEY",
    ()=>ENCRYPTION_KEY,
    "IS_SATELLITE",
    ()=>IS_SATELLITE,
    "KEYLESS_DISABLED",
    ()=>KEYLESS_DISABLED,
    "MACHINE_SECRET_KEY",
    ()=>MACHINE_SECRET_KEY,
    "PROXY_URL",
    ()=>PROXY_URL,
    "PUBLISHABLE_KEY",
    ()=>PUBLISHABLE_KEY,
    "SDK_METADATA",
    ()=>SDK_METADATA,
    "SECRET_KEY",
    ()=>SECRET_KEY,
    "SIGN_IN_URL",
    ()=>SIGN_IN_URL,
    "SIGN_UP_URL",
    ()=>SIGN_UP_URL,
    "TELEMETRY_DEBUG",
    ()=>TELEMETRY_DEBUG,
    "TELEMETRY_DISABLED",
    ()=>TELEMETRY_DISABLED
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$apiUrlFromPublishableKey$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/apiUrlFromPublishableKey.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$apiUrlFromPublishableKey$2d$B2KkwQp6$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/apiUrlFromPublishableKey-B2KkwQp6.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs [middleware-edge] (ecmascript)");
;
;
;
const CLERK_JS_VERSION = process.env.NEXT_PUBLIC_CLERK_JS_VERSION || "";
const CLERK_JS_URL = process.env.NEXT_PUBLIC_CLERK_JS_URL || "";
const API_VERSION = process.env.CLERK_API_VERSION || "v1";
const SECRET_KEY = process.env.CLERK_SECRET_KEY || "";
const MACHINE_SECRET_KEY = process.env.CLERK_MACHINE_SECRET_KEY || "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const ENCRYPTION_KEY = process.env.CLERK_ENCRYPTION_KEY || "";
const API_URL = process.env.CLERK_API_URL || (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$apiUrlFromPublishableKey$2d$B2KkwQp6$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["apiUrlFromPublishableKey"])(PUBLISHABLE_KEY);
const DOMAIN = process.env.NEXT_PUBLIC_CLERK_DOMAIN || "";
const PROXY_URL = process.env.NEXT_PUBLIC_CLERK_PROXY_URL || "";
const IS_SATELLITE = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isTruthy"])(process.env.NEXT_PUBLIC_CLERK_IS_SATELLITE) || false;
const SIGN_IN_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "";
const SIGN_UP_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "";
const SDK_METADATA = {
    name: "@clerk/nextjs",
    version: "6.36.5",
    environment: ("TURBOPACK compile-time value", "development")
};
const TELEMETRY_DISABLED = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isTruthy"])(process.env.NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED);
const TELEMETRY_DEBUG = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isTruthy"])(process.env.NEXT_PUBLIC_CLERK_TELEMETRY_DEBUG);
const KEYLESS_DISABLED = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isTruthy"])(process.env.NEXT_PUBLIC_CLERK_KEYLESS_DISABLED) || false;
;
 //# sourceMappingURL=constants.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/sdk-versions.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isNext13",
    ()=>isNext13,
    "isNextWithUnstableServerActions",
    ()=>isNextWithUnstableServerActions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$package$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/package.json (json)");
;
;
const isNext13 = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$package$2e$json__$28$json$29$__["default"].version.startsWith("13.");
const isNextWithUnstableServerActions = isNext13 || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$package$2e$json__$28$json$29$__["default"].version.startsWith("14.0");
;
 //# sourceMappingURL=sdk-versions.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/feature-flags.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "canUseKeyless",
    ()=>canUseKeyless
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$utils$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/utils/index.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/constants.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$sdk$2d$versions$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/sdk-versions.js [middleware-edge] (ecmascript)");
;
;
;
;
const canUseKeyless = !__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$sdk$2d$versions$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isNextWithUnstableServerActions"] && // Next.js will inline the value of 'development' or 'production' on the client bundle, so this is client-safe.
(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isDevelopmentEnvironment"])() && !__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["KEYLESS_DISABLED"];
;
 //# sourceMappingURL=feature-flags.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/server/utils.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildRequestLike",
    ()=>buildRequestLike,
    "getScriptNonceFromHeader",
    ()=>getScriptNonceFromHeader,
    "isPrerenderingBailout",
    ()=>isPrerenderingBailout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
;
const isPrerenderingBailout = (e)=>{
    if (!(e instanceof Error) || !("message" in e)) {
        return false;
    }
    const { message } = e;
    const lowerCaseInput = message.toLowerCase();
    const dynamicServerUsage = lowerCaseInput.includes("dynamic server usage");
    const bailOutPrerendering = lowerCaseInput.includes("this page needs to bail out of prerendering");
    const routeRegex = /Route .*? needs to bail out of prerendering at this point because it used .*?./;
    return routeRegex.test(message) || dynamicServerUsage || bailOutPrerendering;
};
async function buildRequestLike() {
    try {
        const { headers } = await Promise.resolve().then(()=>__turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/api/headers.js [middleware-edge] (ecmascript)"));
        const resolvedHeaders = await headers();
        return new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextRequest"]("https://placeholder.com", {
            headers: resolvedHeaders
        });
    } catch (e) {
        if (e && isPrerenderingBailout(e)) {
            throw e;
        }
        throw new Error(`Clerk: auth(), currentUser() and clerkClient(), are only supported in App Router (/app directory).
If you're using /pages, try getAuth() instead.
Original error: ${e}`);
    }
}
function getScriptNonceFromHeader(cspHeaderValue) {
    var _a;
    const directives = cspHeaderValue.split(";").map((directive2)=>directive2.trim());
    const directive = directives.find((dir)=>dir.startsWith("script-src")) || directives.find((dir)=>dir.startsWith("default-src"));
    if (!directive) {
        return;
    }
    const nonce = (_a = directive.split(" ").slice(1).map((source)=>source.trim()).find((source)=>source.startsWith("'nonce-") && source.length > 8 && source.endsWith("'"))) == null ? void 0 : _a.slice(7, -1);
    if (!nonce) {
        return;
    }
    if (/[&><\u2028\u2029]/g.test(nonce)) {
        throw new Error("Nonce value from Content-Security-Policy contained invalid HTML escape characters, which is disallowed for security reasons. Make sure that your nonce value does not contain the following characters: `<`, `>`, `&`");
    }
    return nonce;
}
;
 //# sourceMappingURL=utils.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/createClerkClient.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClerkClientWithOptions",
    ()=>createClerkClientWithOptions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/index.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/constants.js [middleware-edge] (ecmascript)");
;
;
;
const clerkClientDefaultOptions = {
    secretKey: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SECRET_KEY"],
    publishableKey: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["PUBLISHABLE_KEY"],
    apiUrl: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["API_URL"],
    apiVersion: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["API_VERSION"],
    userAgent: `${"@clerk/nextjs"}@${"6.36.5"}`,
    proxyUrl: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["PROXY_URL"],
    domain: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["DOMAIN"],
    isSatellite: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["IS_SATELLITE"],
    machineSecretKey: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["MACHINE_SECRET_KEY"],
    sdkMetadata: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SDK_METADATA"],
    telemetry: {
        disabled: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["TELEMETRY_DISABLED"],
        debug: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["TELEMETRY_DEBUG"]
    }
};
const createClerkClientWithOptions = (options)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createClerkClient"])({
        ...clerkClientDefaultOptions,
        ...options
    });
;
 //# sourceMappingURL=createClerkClient.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/headers-utils.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "detectClerkMiddleware",
    ()=>detectClerkMiddleware,
    "getAuthKeyFromRequest",
    ()=>getAuthKeyFromRequest,
    "getCustomAttributeFromRequest",
    ()=>getCustomAttributeFromRequest,
    "getHeader",
    ()=>getHeader,
    "isNextRequest",
    ()=>isNextRequest,
    "isRequestWebAPI",
    ()=>isRequestWebAPI
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$internal$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/internal.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TTM76E4X.mjs [middleware-edge] (ecmascript) <locals>");
;
;
function getCustomAttributeFromRequest(req, key) {
    return key in req ? req[key] : void 0;
}
function getAuthKeyFromRequest(req, key) {
    return getCustomAttributeFromRequest(req, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Attributes[key]) || getHeader(req, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers[key]);
}
function getHeader(req, name) {
    var _a, _b;
    if (isNextRequest(req) || isRequestWebAPI(req)) {
        return req.headers.get(name);
    }
    return req.headers[name] || req.headers[name.toLowerCase()] || ((_b = (_a = req.socket) == null ? void 0 : _a._httpMessage) == null ? void 0 : _b.getHeader(name));
}
function detectClerkMiddleware(req) {
    return Boolean(getAuthKeyFromRequest(req, "AuthStatus"));
}
function isNextRequest(val) {
    try {
        const { headers, nextUrl, cookies } = val || {};
        return typeof (headers == null ? void 0 : headers.get) === "function" && typeof (nextUrl == null ? void 0 : nextUrl.searchParams.get) === "function" && typeof (cookies == null ? void 0 : cookies.get) === "function";
    } catch  {
        return false;
    }
}
function isRequestWebAPI(val) {
    try {
        const { headers } = val || {};
        return typeof (headers == null ? void 0 : headers.get) === "function";
    } catch  {
        return false;
    }
}
;
 //# sourceMappingURL=headers-utils.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/middleware-storage.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clerkMiddlewareRequestDataStorage",
    ()=>clerkMiddlewareRequestDataStorage,
    "clerkMiddlewareRequestDataStore",
    ()=>clerkMiddlewareRequestDataStore
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$async_hooks__$5b$external$5d$__$28$node$3a$async_hooks$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:async_hooks [external] (node:async_hooks, cjs)");
;
;
const clerkMiddlewareRequestDataStore = /* @__PURE__ */ new Map();
const clerkMiddlewareRequestDataStorage = new __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$async_hooks__$5b$external$5d$__$28$node$3a$async_hooks$2c$__cjs$29$__["AsyncLocalStorage"]();
;
 //# sourceMappingURL=middleware-storage.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/vendor/crypto-es.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AES",
    ()=>Ht,
    "HmacSHA1",
    ()=>Dt,
    "Utf8",
    ()=>X
]);
var kt = Object.defineProperty;
var bt = (c, t, s)=>t in c ? kt(c, t, {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: s
    }) : c[t] = s;
var it = (c, t, s)=>bt(c, typeof t != "symbol" ? t + "" : t, s);
var lt, ht, dt, pt, xt, _t, at = ((lt = typeof globalThis != "undefined" ? globalThis : void 0) == null ? void 0 : lt.crypto) || ((ht = ("TURBOPACK compile-time truthy", 1) ? /*TURBOPACK member replacement*/ __turbopack_context__.g : "TURBOPACK unreachable") == null ? void 0 : ht.crypto) || ((dt = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : void 0) == null ? void 0 : dt.crypto) || ((pt = typeof self != "undefined" ? self : void 0) == null ? void 0 : pt.crypto) || ((_t = (xt = typeof frames != "undefined" ? frames : void 0) == null ? void 0 : xt[0]) == null ? void 0 : _t.crypto), Z;
at ? Z = (c)=>{
    let t = [];
    for(let s = 0, e; s < c; s += 4)t.push(at.getRandomValues(new Uint32Array(1))[0]);
    return new u(t, c);
} : Z = (c)=>{
    let t = [], s = (e)=>{
        let r = e, o = 987654321, n = 4294967295;
        return ()=>{
            o = 36969 * (o & 65535) + (o >> 16) & n, r = 18e3 * (r & 65535) + (r >> 16) & n;
            let h = (o << 16) + r & n;
            return h /= 4294967296, h += .5, h * (Math.random() > .5 ? 1 : -1);
        };
    };
    for(let e = 0, r; e < c; e += 4){
        let o = s((r || Math.random()) * 4294967296);
        r = o() * 987654071, t.push(o() * 4294967296 | 0);
    }
    return new u(t, c);
};
var m = class {
    static create(...t) {
        return new this(...t);
    }
    mixIn(t) {
        return Object.assign(this, t);
    }
    clone() {
        let t = new this.constructor;
        return Object.assign(t, this), t;
    }
}, u = class extends m {
    constructor(t = [], s = t.length * 4){
        super();
        let e = t;
        if (e instanceof ArrayBuffer && (e = new Uint8Array(e)), (e instanceof Int8Array || e instanceof Uint8ClampedArray || e instanceof Int16Array || e instanceof Uint16Array || e instanceof Int32Array || e instanceof Uint32Array || e instanceof Float32Array || e instanceof Float64Array) && (e = new Uint8Array(e.buffer, e.byteOffset, e.byteLength)), e instanceof Uint8Array) {
            let r = e.byteLength, o = [];
            for(let n = 0; n < r; n += 1)o[n >>> 2] |= e[n] << 24 - n % 4 * 8;
            this.words = o, this.sigBytes = r;
        } else this.words = t, this.sigBytes = s;
    }
    toString(t = Mt) {
        return t.stringify(this);
    }
    concat(t) {
        let s = this.words, e = t.words, r = this.sigBytes, o = t.sigBytes;
        if (this.clamp(), r % 4) for(let n = 0; n < o; n += 1){
            let h = e[n >>> 2] >>> 24 - n % 4 * 8 & 255;
            s[r + n >>> 2] |= h << 24 - (r + n) % 4 * 8;
        }
        else for(let n = 0; n < o; n += 4)s[r + n >>> 2] = e[n >>> 2];
        return this.sigBytes += o, this;
    }
    clamp() {
        let { words: t, sigBytes: s } = this;
        t[s >>> 2] &= 4294967295 << 32 - s % 4 * 8, t.length = Math.ceil(s / 4);
    }
    clone() {
        let t = super.clone.call(this);
        return t.words = this.words.slice(0), t;
    }
};
it(u, "random", Z);
var Mt = {
    stringify (c) {
        let { words: t, sigBytes: s } = c, e = [];
        for(let r = 0; r < s; r += 1){
            let o = t[r >>> 2] >>> 24 - r % 4 * 8 & 255;
            e.push((o >>> 4).toString(16)), e.push((o & 15).toString(16));
        }
        return e.join("");
    },
    parse (c) {
        let t = c.length, s = [];
        for(let e = 0; e < t; e += 2)s[e >>> 3] |= parseInt(c.substr(e, 2), 16) << 24 - e % 8 * 4;
        return new u(s, t / 2);
    }
}, ft = {
    stringify (c) {
        let { words: t, sigBytes: s } = c, e = [];
        for(let r = 0; r < s; r += 1){
            let o = t[r >>> 2] >>> 24 - r % 4 * 8 & 255;
            e.push(String.fromCharCode(o));
        }
        return e.join("");
    },
    parse (c) {
        let t = c.length, s = [];
        for(let e = 0; e < t; e += 1)s[e >>> 2] |= (c.charCodeAt(e) & 255) << 24 - e % 4 * 8;
        return new u(s, t);
    }
}, X = {
    stringify (c) {
        try {
            return decodeURIComponent(escape(ft.stringify(c)));
        } catch  {
            throw new Error("Malformed UTF-8 data");
        }
    },
    parse (c) {
        return ft.parse(unescape(encodeURIComponent(c)));
    }
}, N = class extends m {
    constructor(){
        super(), this._minBufferSize = 0;
    }
    reset() {
        this._data = new u, this._nDataBytes = 0;
    }
    _append(t) {
        let s = t;
        typeof s == "string" && (s = X.parse(s)), this._data.concat(s), this._nDataBytes += s.sigBytes;
    }
    _process(t) {
        let s, { _data: e, blockSize: r } = this, o = e.words, n = e.sigBytes, h = r * 4, x = n / h;
        t ? x = Math.ceil(x) : x = Math.max((x | 0) - this._minBufferSize, 0);
        let p = x * r, _ = Math.min(p * 4, n);
        if (p) {
            for(let y = 0; y < p; y += r)this._doProcessBlock(o, y);
            s = o.splice(0, p), e.sigBytes -= _;
        }
        return new u(s, _);
    }
    clone() {
        let t = super.clone.call(this);
        return t._data = this._data.clone(), t;
    }
}, H = class extends N {
    constructor(t){
        super(), this.blockSize = 512 / 32, this.cfg = Object.assign(new m, t), this.reset();
    }
    static _createHelper(t) {
        return (s, e)=>new t(e).finalize(s);
    }
    static _createHmacHelper(t) {
        return (s, e)=>new $(t, e).finalize(s);
    }
    reset() {
        super.reset.call(this), this._doReset();
    }
    update(t) {
        return this._append(t), this._process(), this;
    }
    finalize(t) {
        return t && this._append(t), this._doFinalize();
    }
}, $ = class extends m {
    constructor(t, s){
        super();
        let e = new t;
        this._hasher = e;
        let r = s;
        typeof r == "string" && (r = X.parse(r));
        let o = e.blockSize, n = o * 4;
        r.sigBytes > n && (r = e.finalize(s)), r.clamp();
        let h = r.clone();
        this._oKey = h;
        let x = r.clone();
        this._iKey = x;
        let p = h.words, _ = x.words;
        for(let y = 0; y < o; y += 1)p[y] ^= 1549556828, _[y] ^= 909522486;
        h.sigBytes = n, x.sigBytes = n, this.reset();
    }
    reset() {
        let t = this._hasher;
        t.reset(), t.update(this._iKey);
    }
    update(t) {
        return this._hasher.update(t), this;
    }
    finalize(t) {
        let s = this._hasher, e = s.finalize(t);
        return s.reset(), s.finalize(this._oKey.clone().concat(e));
    }
};
var zt = (c, t, s)=>{
    let e = [], r = 0;
    for(let o = 0; o < t; o += 1)if (o % 4) {
        let n = s[c.charCodeAt(o - 1)] << o % 4 * 2, h = s[c.charCodeAt(o)] >>> 6 - o % 4 * 2, x = n | h;
        e[r >>> 2] |= x << 24 - r % 4 * 8, r += 1;
    }
    return u.create(e, r);
}, tt = {
    stringify (c) {
        let { words: t, sigBytes: s } = c, e = this._map;
        c.clamp();
        let r = [];
        for(let n = 0; n < s; n += 3){
            let h = t[n >>> 2] >>> 24 - n % 4 * 8 & 255, x = t[n + 1 >>> 2] >>> 24 - (n + 1) % 4 * 8 & 255, p = t[n + 2 >>> 2] >>> 24 - (n + 2) % 4 * 8 & 255, _ = h << 16 | x << 8 | p;
            for(let y = 0; y < 4 && n + y * .75 < s; y += 1)r.push(e.charAt(_ >>> 6 * (3 - y) & 63));
        }
        let o = e.charAt(64);
        if (o) for(; r.length % 4;)r.push(o);
        return r.join("");
    },
    parse (c) {
        let t = c.length, s = this._map, e = this._reverseMap;
        if (!e) {
            this._reverseMap = [], e = this._reverseMap;
            for(let o = 0; o < s.length; o += 1)e[s.charCodeAt(o)] = o;
        }
        let r = s.charAt(64);
        if (r) {
            let o = c.indexOf(r);
            o !== -1 && (t = o);
        }
        return zt(c, t, e);
    },
    _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
};
var d = [];
for(let c = 0; c < 64; c += 1)d[c] = Math.abs(Math.sin(c + 1)) * 4294967296 | 0;
var w = (c, t, s, e, r, o, n)=>{
    let h = c + (t & s | ~t & e) + r + n;
    return (h << o | h >>> 32 - o) + t;
}, B = (c, t, s, e, r, o, n)=>{
    let h = c + (t & e | s & ~e) + r + n;
    return (h << o | h >>> 32 - o) + t;
}, k = (c, t, s, e, r, o, n)=>{
    let h = c + (t ^ s ^ e) + r + n;
    return (h << o | h >>> 32 - o) + t;
}, b = (c, t, s, e, r, o, n)=>{
    let h = c + (s ^ (t | ~e)) + r + n;
    return (h << o | h >>> 32 - o) + t;
}, L = class extends H {
    _doReset() {
        this._hash = new u([
            1732584193,
            4023233417,
            2562383102,
            271733878
        ]);
    }
    _doProcessBlock(t, s) {
        let e = t;
        for(let Y = 0; Y < 16; Y += 1){
            let ct = s + Y, G = t[ct];
            e[ct] = (G << 8 | G >>> 24) & 16711935 | (G << 24 | G >>> 8) & 4278255360;
        }
        let r = this._hash.words, o = e[s + 0], n = e[s + 1], h = e[s + 2], x = e[s + 3], p = e[s + 4], _ = e[s + 5], y = e[s + 6], M = e[s + 7], z = e[s + 8], v = e[s + 9], g = e[s + 10], O = e[s + 11], S = e[s + 12], P = e[s + 13], I = e[s + 14], W = e[s + 15], i = r[0], a = r[1], f = r[2], l = r[3];
        i = w(i, a, f, l, o, 7, d[0]), l = w(l, i, a, f, n, 12, d[1]), f = w(f, l, i, a, h, 17, d[2]), a = w(a, f, l, i, x, 22, d[3]), i = w(i, a, f, l, p, 7, d[4]), l = w(l, i, a, f, _, 12, d[5]), f = w(f, l, i, a, y, 17, d[6]), a = w(a, f, l, i, M, 22, d[7]), i = w(i, a, f, l, z, 7, d[8]), l = w(l, i, a, f, v, 12, d[9]), f = w(f, l, i, a, g, 17, d[10]), a = w(a, f, l, i, O, 22, d[11]), i = w(i, a, f, l, S, 7, d[12]), l = w(l, i, a, f, P, 12, d[13]), f = w(f, l, i, a, I, 17, d[14]), a = w(a, f, l, i, W, 22, d[15]), i = B(i, a, f, l, n, 5, d[16]), l = B(l, i, a, f, y, 9, d[17]), f = B(f, l, i, a, O, 14, d[18]), a = B(a, f, l, i, o, 20, d[19]), i = B(i, a, f, l, _, 5, d[20]), l = B(l, i, a, f, g, 9, d[21]), f = B(f, l, i, a, W, 14, d[22]), a = B(a, f, l, i, p, 20, d[23]), i = B(i, a, f, l, v, 5, d[24]), l = B(l, i, a, f, I, 9, d[25]), f = B(f, l, i, a, x, 14, d[26]), a = B(a, f, l, i, z, 20, d[27]), i = B(i, a, f, l, P, 5, d[28]), l = B(l, i, a, f, h, 9, d[29]), f = B(f, l, i, a, M, 14, d[30]), a = B(a, f, l, i, S, 20, d[31]), i = k(i, a, f, l, _, 4, d[32]), l = k(l, i, a, f, z, 11, d[33]), f = k(f, l, i, a, O, 16, d[34]), a = k(a, f, l, i, I, 23, d[35]), i = k(i, a, f, l, n, 4, d[36]), l = k(l, i, a, f, p, 11, d[37]), f = k(f, l, i, a, M, 16, d[38]), a = k(a, f, l, i, g, 23, d[39]), i = k(i, a, f, l, P, 4, d[40]), l = k(l, i, a, f, o, 11, d[41]), f = k(f, l, i, a, x, 16, d[42]), a = k(a, f, l, i, y, 23, d[43]), i = k(i, a, f, l, v, 4, d[44]), l = k(l, i, a, f, S, 11, d[45]), f = k(f, l, i, a, W, 16, d[46]), a = k(a, f, l, i, h, 23, d[47]), i = b(i, a, f, l, o, 6, d[48]), l = b(l, i, a, f, M, 10, d[49]), f = b(f, l, i, a, I, 15, d[50]), a = b(a, f, l, i, _, 21, d[51]), i = b(i, a, f, l, S, 6, d[52]), l = b(l, i, a, f, x, 10, d[53]), f = b(f, l, i, a, g, 15, d[54]), a = b(a, f, l, i, n, 21, d[55]), i = b(i, a, f, l, z, 6, d[56]), l = b(l, i, a, f, W, 10, d[57]), f = b(f, l, i, a, y, 15, d[58]), a = b(a, f, l, i, P, 21, d[59]), i = b(i, a, f, l, p, 6, d[60]), l = b(l, i, a, f, O, 10, d[61]), f = b(f, l, i, a, h, 15, d[62]), a = b(a, f, l, i, v, 21, d[63]), r[0] = r[0] + i | 0, r[1] = r[1] + a | 0, r[2] = r[2] + f | 0, r[3] = r[3] + l | 0;
    }
    _doFinalize() {
        let t = this._data, s = t.words, e = this._nDataBytes * 8, r = t.sigBytes * 8;
        s[r >>> 5] |= 128 << 24 - r % 32;
        let o = Math.floor(e / 4294967296), n = e;
        s[(r + 64 >>> 9 << 4) + 15] = (o << 8 | o >>> 24) & 16711935 | (o << 24 | o >>> 8) & 4278255360, s[(r + 64 >>> 9 << 4) + 14] = (n << 8 | n >>> 24) & 16711935 | (n << 24 | n >>> 8) & 4278255360, t.sigBytes = (s.length + 1) * 4, this._process();
        let h = this._hash, x = h.words;
        for(let p = 0; p < 4; p += 1){
            let _ = x[p];
            x[p] = (_ << 8 | _ >>> 24) & 16711935 | (_ << 24 | _ >>> 8) & 4278255360;
        }
        return h;
    }
    clone() {
        let t = super.clone.call(this);
        return t._hash = this._hash.clone(), t;
    }
}, St = H._createHelper(L), Pt = H._createHmacHelper(L);
var T = class extends m {
    constructor(t){
        super(), this.cfg = Object.assign(new m, {
            keySize: 128 / 32,
            hasher: L,
            iterations: 1
        }, t);
    }
    compute(t, s) {
        let e, { cfg: r } = this, o = r.hasher.create(), n = u.create(), h = n.words, { keySize: x, iterations: p } = r;
        for(; h.length < x;){
            e && o.update(e), e = o.update(t).finalize(s), o.reset();
            for(let _ = 1; _ < p; _ += 1)e = o.finalize(e), o.reset();
            n.concat(e);
        }
        return n.sigBytes = x * 4, n;
    }
};
var C = class extends N {
    constructor(t, s, e){
        super(), this.cfg = Object.assign(new m, e), this._xformMode = t, this._key = s, this.reset();
    }
    static createEncryptor(t, s) {
        return this.create(this._ENC_XFORM_MODE, t, s);
    }
    static createDecryptor(t, s) {
        return this.create(this._DEC_XFORM_MODE, t, s);
    }
    static _createHelper(t) {
        let s = (e)=>typeof e == "string" ? q : E;
        return {
            encrypt (e, r, o) {
                return s(r).encrypt(t, e, r, o);
            },
            decrypt (e, r, o) {
                return s(r).decrypt(t, e, r, o);
            }
        };
    }
    reset() {
        super.reset.call(this), this._doReset();
    }
    process(t) {
        return this._append(t), this._process();
    }
    finalize(t) {
        return t && this._append(t), this._doFinalize();
    }
};
C._ENC_XFORM_MODE = 1;
C._DEC_XFORM_MODE = 2;
C.keySize = 128 / 32;
C.ivSize = 128 / 32;
var et = class extends m {
    constructor(t, s){
        super(), this._cipher = t, this._iv = s;
    }
    static createEncryptor(t, s) {
        return this.Encryptor.create(t, s);
    }
    static createDecryptor(t, s) {
        return this.Decryptor.create(t, s);
    }
};
function yt(c, t, s) {
    let e = c, r, o = this._iv;
    o ? (r = o, this._iv = void 0) : r = this._prevBlock;
    for(let n = 0; n < s; n += 1)e[t + n] ^= r[n];
}
var j = class extends et {
};
j.Encryptor = class extends j {
    processBlock(c, t) {
        let s = this._cipher, { blockSize: e } = s;
        yt.call(this, c, t, e), s.encryptBlock(c, t), this._prevBlock = c.slice(t, t + e);
    }
};
j.Decryptor = class extends j {
    processBlock(c, t) {
        let s = this._cipher, { blockSize: e } = s, r = c.slice(t, t + e);
        s.decryptBlock(c, t), yt.call(this, c, t, e), this._prevBlock = r;
    }
};
var vt = {
    pad (c, t) {
        let s = t * 4, e = s - c.sigBytes % s, r = e << 24 | e << 16 | e << 8 | e, o = [];
        for(let h = 0; h < e; h += 4)o.push(r);
        let n = u.create(o, e);
        c.concat(n);
    },
    unpad (c) {
        let t = c, s = t.words[t.sigBytes - 1 >>> 2] & 255;
        t.sigBytes -= s;
    }
}, U = class extends C {
    constructor(t, s, e){
        super(t, s, Object.assign({
            mode: j,
            padding: vt
        }, e)), this.blockSize = 128 / 32;
    }
    reset() {
        let t;
        super.reset.call(this);
        let { cfg: s } = this, { iv: e, mode: r } = s;
        this._xformMode === this.constructor._ENC_XFORM_MODE ? t = r.createEncryptor : (t = r.createDecryptor, this._minBufferSize = 1), this._mode = t.call(r, this, e && e.words), this._mode.__creator = t;
    }
    _doProcessBlock(t, s) {
        this._mode.processBlock(t, s);
    }
    _doFinalize() {
        let t, { padding: s } = this.cfg;
        return this._xformMode === this.constructor._ENC_XFORM_MODE ? (s.pad(this._data, this.blockSize), t = this._process(!0)) : (t = this._process(!0), s.unpad(t)), t;
    }
}, V = class extends m {
    constructor(t){
        super(), this.mixIn(t);
    }
    toString(t) {
        return (t || this.formatter).stringify(this);
    }
}, Rt = {
    stringify (c) {
        let t, { ciphertext: s, salt: e } = c;
        return e ? t = u.create([
            1398893684,
            1701076831
        ]).concat(e).concat(s) : t = s, t.toString(tt);
    },
    parse (c) {
        let t, s = tt.parse(c), e = s.words;
        return e[0] === 1398893684 && e[1] === 1701076831 && (t = u.create(e.slice(2, 4)), e.splice(0, 4), s.sigBytes -= 16), V.create({
            ciphertext: s,
            salt: t
        });
    }
}, E = class extends m {
    static encrypt(t, s, e, r) {
        let o = Object.assign(new m, this.cfg, r), n = t.createEncryptor(e, o), h = n.finalize(s), x = n.cfg;
        return V.create({
            ciphertext: h,
            key: e,
            iv: x.iv,
            algorithm: t,
            mode: x.mode,
            padding: x.padding,
            blockSize: n.blockSize,
            formatter: o.format
        });
    }
    static decrypt(t, s, e, r) {
        let o = s, n = Object.assign(new m, this.cfg, r);
        return o = this._parse(o, n.format), t.createDecryptor(e, n).finalize(o.ciphertext);
    }
    static _parse(t, s) {
        return typeof t == "string" ? s.parse(t, this) : t;
    }
};
E.cfg = Object.assign(new m, {
    format: Rt
});
var Ft = {
    execute (c, t, s, e, r) {
        let o = e;
        o || (o = u.random(64 / 8));
        let n;
        r ? n = T.create({
            keySize: t + s,
            hasher: r
        }).compute(c, o) : n = T.create({
            keySize: t + s
        }).compute(c, o);
        let h = u.create(n.words.slice(t), s * 4);
        return n.sigBytes = t * 4, V.create({
            key: n,
            iv: h,
            salt: o
        });
    }
}, q = class extends E {
    static encrypt(t, s, e, r) {
        let o = Object.assign(new m, this.cfg, r), n = o.kdf.execute(e, t.keySize, t.ivSize, o.salt, o.hasher);
        o.iv = n.iv;
        let h = E.encrypt.call(this, t, s, n.key, o);
        return h.mixIn(n), h;
    }
    static decrypt(t, s, e, r) {
        let o = s, n = Object.assign(new m, this.cfg, r);
        o = this._parse(o, n.format);
        let h = n.kdf.execute(e, t.keySize, t.ivSize, o.salt, n.hasher);
        return n.iv = h.iv, E.decrypt.call(this, t, o, h.key, n);
    }
};
q.cfg = Object.assign(E.cfg, {
    kdf: Ft
});
var R = [], ut = [], gt = [], mt = [], wt = [], Bt = [], st = [], rt = [], ot = [], nt = [], A = [];
for(let c = 0; c < 256; c += 1)c < 128 ? A[c] = c << 1 : A[c] = c << 1 ^ 283;
var F = 0, D = 0;
for(let c = 0; c < 256; c += 1){
    let t = D ^ D << 1 ^ D << 2 ^ D << 3 ^ D << 4;
    t = t >>> 8 ^ t & 255 ^ 99, R[F] = t, ut[t] = F;
    let s = A[F], e = A[s], r = A[e], o = A[t] * 257 ^ t * 16843008;
    gt[F] = o << 24 | o >>> 8, mt[F] = o << 16 | o >>> 16, wt[F] = o << 8 | o >>> 24, Bt[F] = o, o = r * 16843009 ^ e * 65537 ^ s * 257 ^ F * 16843008, st[t] = o << 24 | o >>> 8, rt[t] = o << 16 | o >>> 16, ot[t] = o << 8 | o >>> 24, nt[t] = o, F ? (F = s ^ A[A[A[r ^ s]]], D ^= A[A[D]]) : (D = 1, F = D);
}
var At = [
    0,
    1,
    2,
    4,
    8,
    16,
    32,
    64,
    128,
    27,
    54
], J = class extends U {
    _doReset() {
        let t;
        if (this._nRounds && this._keyPriorReset === this._key) return;
        this._keyPriorReset = this._key;
        let s = this._keyPriorReset, e = s.words, r = s.sigBytes / 4;
        this._nRounds = r + 6;
        let n = (this._nRounds + 1) * 4;
        this._keySchedule = [];
        let h = this._keySchedule;
        for(let p = 0; p < n; p += 1)p < r ? h[p] = e[p] : (t = h[p - 1], p % r ? r > 6 && p % r === 4 && (t = R[t >>> 24] << 24 | R[t >>> 16 & 255] << 16 | R[t >>> 8 & 255] << 8 | R[t & 255]) : (t = t << 8 | t >>> 24, t = R[t >>> 24] << 24 | R[t >>> 16 & 255] << 16 | R[t >>> 8 & 255] << 8 | R[t & 255], t ^= At[p / r | 0] << 24), h[p] = h[p - r] ^ t);
        this._invKeySchedule = [];
        let x = this._invKeySchedule;
        for(let p = 0; p < n; p += 1){
            let _ = n - p;
            p % 4 ? t = h[_] : t = h[_ - 4], p < 4 || _ <= 4 ? x[p] = t : x[p] = st[R[t >>> 24]] ^ rt[R[t >>> 16 & 255]] ^ ot[R[t >>> 8 & 255]] ^ nt[R[t & 255]];
        }
    }
    encryptBlock(t, s) {
        this._doCryptBlock(t, s, this._keySchedule, gt, mt, wt, Bt, R);
    }
    decryptBlock(t, s) {
        let e = t, r = e[s + 1];
        e[s + 1] = e[s + 3], e[s + 3] = r, this._doCryptBlock(e, s, this._invKeySchedule, st, rt, ot, nt, ut), r = e[s + 1], e[s + 1] = e[s + 3], e[s + 3] = r;
    }
    _doCryptBlock(t, s, e, r, o, n, h, x) {
        let p = t, _ = this._nRounds, y = p[s] ^ e[0], M = p[s + 1] ^ e[1], z = p[s + 2] ^ e[2], v = p[s + 3] ^ e[3], g = 4;
        for(let W = 1; W < _; W += 1){
            let i = r[y >>> 24] ^ o[M >>> 16 & 255] ^ n[z >>> 8 & 255] ^ h[v & 255] ^ e[g];
            g += 1;
            let a = r[M >>> 24] ^ o[z >>> 16 & 255] ^ n[v >>> 8 & 255] ^ h[y & 255] ^ e[g];
            g += 1;
            let f = r[z >>> 24] ^ o[v >>> 16 & 255] ^ n[y >>> 8 & 255] ^ h[M & 255] ^ e[g];
            g += 1;
            let l = r[v >>> 24] ^ o[y >>> 16 & 255] ^ n[M >>> 8 & 255] ^ h[z & 255] ^ e[g];
            g += 1, y = i, M = a, z = f, v = l;
        }
        let O = (x[y >>> 24] << 24 | x[M >>> 16 & 255] << 16 | x[z >>> 8 & 255] << 8 | x[v & 255]) ^ e[g];
        g += 1;
        let S = (x[M >>> 24] << 24 | x[z >>> 16 & 255] << 16 | x[v >>> 8 & 255] << 8 | x[y & 255]) ^ e[g];
        g += 1;
        let P = (x[z >>> 24] << 24 | x[v >>> 16 & 255] << 16 | x[y >>> 8 & 255] << 8 | x[M & 255]) ^ e[g];
        g += 1;
        let I = (x[v >>> 24] << 24 | x[y >>> 16 & 255] << 16 | x[M >>> 8 & 255] << 8 | x[z & 255]) ^ e[g];
        g += 1, p[s] = O, p[s + 1] = S, p[s + 2] = P, p[s + 3] = I;
    }
};
J.keySize = 256 / 32;
var Ht = U._createHelper(J);
var K = [], Q = class extends H {
    _doReset() {
        this._hash = new u([
            1732584193,
            4023233417,
            2562383102,
            271733878,
            3285377520
        ]);
    }
    _doProcessBlock(t, s) {
        let e = this._hash.words, r = e[0], o = e[1], n = e[2], h = e[3], x = e[4];
        for(let p = 0; p < 80; p += 1){
            if (p < 16) K[p] = t[s + p] | 0;
            else {
                let y = K[p - 3] ^ K[p - 8] ^ K[p - 14] ^ K[p - 16];
                K[p] = y << 1 | y >>> 31;
            }
            let _ = (r << 5 | r >>> 27) + x + K[p];
            p < 20 ? _ += (o & n | ~o & h) + 1518500249 : p < 40 ? _ += (o ^ n ^ h) + 1859775393 : p < 60 ? _ += (o & n | o & h | n & h) - 1894007588 : _ += (o ^ n ^ h) - 899497514, x = h, h = n, n = o << 30 | o >>> 2, o = r, r = _;
        }
        e[0] = e[0] + r | 0, e[1] = e[1] + o | 0, e[2] = e[2] + n | 0, e[3] = e[3] + h | 0, e[4] = e[4] + x | 0;
    }
    _doFinalize() {
        let t = this._data, s = t.words, e = this._nDataBytes * 8, r = t.sigBytes * 8;
        return s[r >>> 5] |= 128 << 24 - r % 32, s[(r + 64 >>> 9 << 4) + 14] = Math.floor(e / 4294967296), s[(r + 64 >>> 9 << 4) + 15] = e, t.sigBytes = s.length * 4, this._process(), this._hash;
    }
    clone() {
        let t = super.clone.call(this);
        return t._hash = this._hash.clone(), t;
    }
}, Xt = H._createHelper(Q), Dt = H._createHmacHelper(Q);
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/errors.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "authAuthHeaderMissing",
    ()=>authAuthHeaderMissing,
    "authSignatureInvalid",
    ()=>authSignatureInvalid,
    "encryptionKeyInvalid",
    ()=>encryptionKeyInvalid,
    "encryptionKeyInvalidDev",
    ()=>encryptionKeyInvalidDev,
    "getAuthAuthHeaderMissing",
    ()=>getAuthAuthHeaderMissing,
    "missingDomainAndProxy",
    ()=>missingDomainAndProxy,
    "missingSignInUrlInDev",
    ()=>missingSignInUrlInDev
]);
;
const missingDomainAndProxy = `
Missing domain and proxyUrl. A satellite application needs to specify a domain or a proxyUrl.

1) With middleware
   e.g. export default clerkMiddleware({domain:'YOUR_DOMAIN',isSatellite:true});
2) With environment variables e.g.
   NEXT_PUBLIC_CLERK_DOMAIN='YOUR_DOMAIN'
   NEXT_PUBLIC_CLERK_IS_SATELLITE='true'
   `;
const missingSignInUrlInDev = `
Invalid signInUrl. A satellite application requires a signInUrl for development instances.
Check if signInUrl is missing from your configuration or if it is not an absolute URL

1) With middleware
   e.g. export default clerkMiddleware({signInUrl:'SOME_URL', isSatellite:true});
2) With environment variables e.g.
   NEXT_PUBLIC_CLERK_SIGN_IN_URL='SOME_URL'
   NEXT_PUBLIC_CLERK_IS_SATELLITE='true'`;
const getAuthAuthHeaderMissing = ()=>authAuthHeaderMissing("getAuth");
const authAuthHeaderMissing = (helperName = "auth", prefixSteps)=>`Clerk: ${helperName}() was called but Clerk can't detect usage of clerkMiddleware(). Please ensure the following:
- ${prefixSteps ? [
        ...prefixSteps,
        ""
    ].join("\n- ") : " "}clerkMiddleware() is used in your Next.js Middleware.
- Your Middleware matcher is configured to match this route or page.
- If you are using the src directory, make sure the Middleware file is inside of it.

For more details, see https://clerk.com/err/auth-middleware
`;
const authSignatureInvalid = `Clerk: Unable to verify request, this usually means the Clerk middleware did not run. Ensure Clerk's middleware is properly integrated and matches the current route. For more information, see: https://clerk.com/docs/reference/nextjs/clerk-middleware. (code=auth_signature_invalid)`;
const encryptionKeyInvalid = `Clerk: Unable to decrypt request data, this usually means the encryption key is invalid. Ensure the encryption key is properly set. For more information, see: https://clerk.com/docs/reference/nextjs/clerk-middleware#dynamic-keys. (code=encryption_key_invalid)`;
const encryptionKeyInvalidDev = `Clerk: Unable to decrypt request data.

Refresh the page if your .env file was just updated. If the issue persists, ensure the encryption key is valid and properly set.

For more information, see: https://clerk.com/docs/reference/nextjs/clerk-middleware#dynamic-keys. (code=encryption_key_invalid)`;
;
 //# sourceMappingURL=errors.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/errorThrower.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "errorThrower",
    ()=>errorThrower
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs [middleware-edge] (ecmascript)");
;
;
const errorThrower = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["buildErrorThrower"])({
    packageName: "@clerk/nextjs"
});
;
 //# sourceMappingURL=errorThrower.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/utils.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "assertAuthStatus",
    ()=>assertAuthStatus,
    "assertKey",
    ()=>assertKey,
    "assertTokenSignature",
    ()=>assertTokenSignature,
    "decorateRequest",
    ()=>decorateRequest,
    "decryptClerkRequestData",
    ()=>decryptClerkRequestData,
    "encryptClerkRequestData",
    ()=>encryptClerkRequestData,
    "handleMultiDomainAndProxy",
    ()=>handleMultiDomainAndProxy,
    "redirectAdapter",
    ()=>redirectAdapter,
    "setRequestHeadersOnNextResponse",
    ()=>setRequestHeadersOnNextResponse
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$internal$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/internal.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TTM76E4X.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$logger$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/logger.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$logger$2d$B9q7E6uE$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/logger-B9q7E6uE.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$proxy$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/proxy.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$proxy$2d$Bq8EHApG$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/proxy-Bq8EHApG.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$utils$2f$index$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/utils/index.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$handleValueOrFn$2d$CcwnRX$2d$K$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/handleValueOrFn-CcwnRX-K.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/constants.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/feature-flags.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$vendor$2f$crypto$2d$es$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/vendor/crypto-es.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/constants.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/errors.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errorThrower$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/errorThrower.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$headers$2d$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/headers-utils.js [middleware-edge] (ecmascript)");
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
const OVERRIDE_HEADERS = "x-middleware-override-headers";
const MIDDLEWARE_HEADER_PREFIX = "x-middleware-request";
const setRequestHeadersOnNextResponse = (res, req, newHeaders)=>{
    if (!res.headers.get(OVERRIDE_HEADERS)) {
        res.headers.set(OVERRIDE_HEADERS, [
            ...req.headers.keys()
        ]);
        req.headers.forEach((val, key)=>{
            res.headers.set(`${MIDDLEWARE_HEADER_PREFIX}-${key}`, val);
        });
    }
    Object.entries(newHeaders).forEach(([key, val])=>{
        res.headers.set(OVERRIDE_HEADERS, `${res.headers.get(OVERRIDE_HEADERS)},${key}`);
        res.headers.set(`${MIDDLEWARE_HEADER_PREFIX}-${key}`, val);
    });
};
function decorateRequest(req, res, requestState, requestData, keylessMode, machineAuthObject) {
    const { reason, message, status, token } = requestState;
    if (!res) {
        res = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    if (res.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["constants"].Headers.NextRedirect)) {
        return res;
    }
    let rewriteURL;
    if (res.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["constants"].Headers.NextResume) === "1") {
        res.headers.delete(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["constants"].Headers.NextResume);
        rewriteURL = new URL(req.url);
    }
    const rewriteURLHeader = res.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["constants"].Headers.NextRewrite);
    if (rewriteURLHeader) {
        const reqURL = new URL(req.url);
        rewriteURL = new URL(rewriteURLHeader);
        if (rewriteURL.origin !== reqURL.origin) {
            return res;
        }
    }
    if (rewriteURL) {
        const clerkRequestData = encryptClerkRequestData(requestData, keylessMode, machineAuthObject);
        setRequestHeadersOnNextResponse(res, req, {
            [__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.AuthStatus]: status,
            [__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.AuthToken]: token || "",
            [__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.AuthSignature]: token ? createTokenSignature(token, (requestData == null ? void 0 : requestData.secretKey) || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SECRET_KEY"] || keylessMode.secretKey || "") : "",
            [__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.AuthMessage]: message || "",
            [__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.AuthReason]: reason || "",
            [__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.ClerkUrl]: req.clerkUrl.toString(),
            ...clerkRequestData ? {
                [__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.ClerkRequestData]: clerkRequestData
            } : {}
        });
        res.headers.set(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["constants"].Headers.NextRewrite, rewriteURL.href);
    }
    return res;
}
const handleMultiDomainAndProxy = (clerkRequest, opts)=>{
    const relativeOrAbsoluteProxyUrl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$handleValueOrFn$2d$CcwnRX$2d$K$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["handleValueOrFn"])(opts == null ? void 0 : opts.proxyUrl, clerkRequest.clerkUrl, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["PROXY_URL"]);
    let proxyUrl;
    if (!!relativeOrAbsoluteProxyUrl && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$proxy$2d$Bq8EHApG$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isHttpOrHttps"])(relativeOrAbsoluteProxyUrl)) {
        proxyUrl = new URL(relativeOrAbsoluteProxyUrl, clerkRequest.clerkUrl).toString();
    } else {
        proxyUrl = relativeOrAbsoluteProxyUrl;
    }
    const isSatellite = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$handleValueOrFn$2d$CcwnRX$2d$K$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["handleValueOrFn"])(opts.isSatellite, new URL(clerkRequest.url), __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["IS_SATELLITE"]);
    const domain = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$handleValueOrFn$2d$CcwnRX$2d$K$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["handleValueOrFn"])(opts.domain, new URL(clerkRequest.url), __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["DOMAIN"]);
    const signInUrl = (opts == null ? void 0 : opts.signInUrl) || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SIGN_IN_URL"];
    if (isSatellite && !proxyUrl && !domain) {
        throw new Error(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["missingDomainAndProxy"]);
    }
    if (isSatellite && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$proxy$2d$Bq8EHApG$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isHttpOrHttps"])(signInUrl) && (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isDevelopmentFromSecretKey"])(opts.secretKey || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SECRET_KEY"])) {
        throw new Error(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["missingSignInUrlInDev"]);
    }
    return {
        proxyUrl,
        isSatellite,
        domain,
        signInUrl
    };
};
const redirectAdapter = (url)=>{
    return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(url, {
        headers: {
            [__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.ClerkRedirectTo]: "true"
        }
    });
};
function assertAuthStatus(req, error) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$headers$2d$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["detectClerkMiddleware"])(req)) {
        throw new Error(error);
    }
}
function assertKey(key, onError) {
    if (!key) {
        onError();
    }
    return key;
}
function createTokenSignature(token, key) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$vendor$2f$crypto$2d$es$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["HmacSHA1"])(token, key).toString();
}
function assertTokenSignature(token, key, signature) {
    if (!signature) {
        throw new Error(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["authSignatureInvalid"]);
    }
    const expectedSignature = createTokenSignature(token, key);
    if (expectedSignature !== signature) {
        throw new Error(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["authSignatureInvalid"]);
    }
}
const KEYLESS_ENCRYPTION_KEY = "clerk_keyless_dummy_key";
function encryptClerkRequestData(requestData, keylessModeKeys, machineAuthObject) {
    const isEmpty = (obj)=>{
        if (!obj) {
            return true;
        }
        return !Object.values(obj).some((v)=>v !== void 0);
    };
    if (isEmpty(requestData) && isEmpty(keylessModeKeys) && !machineAuthObject) {
        return;
    }
    if (requestData.secretKey && !__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["ENCRYPTION_KEY"]) {
        __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$logger$2d$B9q7E6uE$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].warnOnce("Clerk: Missing `CLERK_ENCRYPTION_KEY`. Required for propagating `secretKey` middleware option. See docs: https://clerk.com/docs/reference/nextjs/clerk-middleware#dynamic-keys");
        return;
    }
    const maybeKeylessEncryptionKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isProductionEnvironment"])() ? __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["ENCRYPTION_KEY"] || assertKey(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SECRET_KEY"], ()=>__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errorThrower$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["errorThrower"].throwMissingSecretKeyError()) : __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["ENCRYPTION_KEY"] || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SECRET_KEY"] || KEYLESS_ENCRYPTION_KEY;
    return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$vendor$2f$crypto$2d$es$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["AES"].encrypt(JSON.stringify({
        ...keylessModeKeys,
        ...requestData,
        machineAuthObject: machineAuthObject != null ? machineAuthObject : void 0
    }), maybeKeylessEncryptionKey).toString();
}
function decryptClerkRequestData(encryptedRequestData) {
    if (!encryptedRequestData) {
        return {};
    }
    const maybeKeylessEncryptionKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isProductionEnvironment"])() ? __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["ENCRYPTION_KEY"] || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SECRET_KEY"] : __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["ENCRYPTION_KEY"] || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SECRET_KEY"] || KEYLESS_ENCRYPTION_KEY;
    try {
        return decryptData(encryptedRequestData, maybeKeylessEncryptionKey);
    } catch  {
        if (__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["canUseKeyless"]) {
            try {
                return decryptData(encryptedRequestData, KEYLESS_ENCRYPTION_KEY);
            } catch  {
                throwInvalidEncryptionKey();
            }
        }
        throwInvalidEncryptionKey();
    }
}
function throwInvalidEncryptionKey() {
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isProductionEnvironment"])()) {
        throw new Error(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["encryptionKeyInvalid"]);
    }
    throw new Error(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["encryptionKeyInvalidDev"]);
}
function decryptData(data, key) {
    const decryptedBytes = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$vendor$2f$crypto$2d$es$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["AES"].decrypt(data, key);
    const encoded = decryptedBytes.toString(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$vendor$2f$crypto$2d$es$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["Utf8"]);
    return JSON.parse(encoded);
}
;
 //# sourceMappingURL=utils.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/clerkClient.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clerkClient",
    ()=>clerkClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$internal$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/internal.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TTM76E4X.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$app$2d$router$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/server/utils.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$createClerkClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/createClerkClient.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$headers$2d$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/headers-utils.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$middleware$2d$storage$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/middleware-storage.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/utils.js [middleware-edge] (ecmascript)");
;
;
;
;
;
;
;
const clerkClient = async ()=>{
    var _a, _b;
    let requestData;
    try {
        const request = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$app$2d$router$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["buildRequestLike"])();
        const encryptedRequestData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$headers$2d$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getHeader"])(request, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.ClerkRequestData);
        requestData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["decryptClerkRequestData"])(encryptedRequestData);
    } catch (err) {
        if (err && (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$app$2d$router$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isPrerenderingBailout"])(err)) {
            throw err;
        }
    }
    const options = (_b = (_a = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$middleware$2d$storage$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["clerkMiddlewareRequestDataStorage"].getStore()) == null ? void 0 : _a.get("requestData")) != null ? _b : requestData;
    if ((options == null ? void 0 : options.secretKey) || (options == null ? void 0 : options.publishableKey)) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$createClerkClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createClerkClientWithOptions"])(options);
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$createClerkClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createClerkClientWithOptions"])({});
};
;
 //# sourceMappingURL=clerkClient.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/content-security-policy.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createContentSecurityPolicyHeaders",
    ()=>createContentSecurityPolicyHeaders,
    "generateNonce",
    ()=>generateNonce
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$internal$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/internal.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TTM76E4X.mjs [middleware-edge] (ecmascript) <locals>");
;
;
class ContentSecurityPolicyDirectiveManager {
    /**
   * Creates a new ContentSecurityPolicyDirectiveSet with default values
   * @returns A new ContentSecurityPolicyDirectiveSet with default values
   */ static createDefaultDirectives() {
        return Object.entries(this.DEFAULT_DIRECTIVES).reduce((acc, [key, values])=>{
            acc[key] = new Set(values);
            return acc;
        }, {});
    }
    /**
   * Checks if a value is a special keyword that requires quoting
   * @param value - The value to check
   * @returns True if the value is a special keyword
   */ static isKeyword(value) {
        return this.KEYWORDS.has(value.replace(/^'|'$/g, ""));
    }
    /**
   * Formats a value according to CSP rules, adding quotes for special keywords
   * @param value - The value to format
   * @returns The formatted value
   */ static formatValue(value) {
        const unquoted = value.replace(/^'|'$/g, "");
        return this.isKeyword(unquoted) ? `'${unquoted}'` : value;
    }
    /**
   * Handles directive values, ensuring proper formatting and special case handling
   * @param values - Array of values to process
   * @returns Set of formatted values
   */ static handleDirectiveValues(values) {
        const result = /* @__PURE__ */ new Set();
        if (values.includes("'none'") || values.includes("none")) {
            result.add("'none'");
            return result;
        }
        values.forEach((v)=>result.add(this.formatValue(v)));
        return result;
    }
}
/** Set of special keywords that require quoting in CSP directives */ ContentSecurityPolicyDirectiveManager.KEYWORDS = /* @__PURE__ */ new Set([
    "none",
    "self",
    "strict-dynamic",
    "unsafe-eval",
    "unsafe-hashes",
    "unsafe-inline"
]);
/** Default CSP directives and their values */ ContentSecurityPolicyDirectiveManager.DEFAULT_DIRECTIVES = {
    "connect-src": [
        "self",
        "https://clerk-telemetry.com",
        "https://*.clerk-telemetry.com",
        "https://api.stripe.com",
        "https://maps.googleapis.com"
    ],
    "default-src": [
        "self"
    ],
    "form-action": [
        "self"
    ],
    "frame-src": [
        "self",
        "https://challenges.cloudflare.com",
        "https://*.js.stripe.com",
        "https://js.stripe.com",
        "https://hooks.stripe.com"
    ],
    "img-src": [
        "self",
        "https://img.clerk.com"
    ],
    "script-src": [
        "self",
        ...("TURBOPACK compile-time truthy", 1) ? [
            "unsafe-eval"
        ] : "TURBOPACK unreachable",
        "unsafe-inline",
        "https:",
        "http:",
        "https://*.js.stripe.com",
        "https://js.stripe.com",
        "https://maps.googleapis.com"
    ],
    "style-src": [
        "self",
        "unsafe-inline"
    ],
    "worker-src": [
        "self",
        "blob:"
    ]
};
function handleExistingDirective(mergedCSP, key, values) {
    if (values.includes("'none'") || values.includes("none")) {
        mergedCSP[key] = /* @__PURE__ */ new Set([
            "'none'"
        ]);
        return;
    }
    const deduplicatedSet = /* @__PURE__ */ new Set();
    mergedCSP[key].forEach((value)=>{
        deduplicatedSet.add(ContentSecurityPolicyDirectiveManager.formatValue(value));
    });
    values.forEach((value)=>{
        deduplicatedSet.add(ContentSecurityPolicyDirectiveManager.formatValue(value));
    });
    mergedCSP[key] = deduplicatedSet;
}
function handleCustomDirective(customDirectives, key, values) {
    if (values.includes("'none'") || values.includes("none")) {
        customDirectives.set(key, /* @__PURE__ */ new Set([
            "'none'"
        ]));
        return;
    }
    const formattedValues = /* @__PURE__ */ new Set();
    values.forEach((value)=>{
        const formattedValue = ContentSecurityPolicyDirectiveManager.formatValue(value);
        formattedValues.add(formattedValue);
    });
    customDirectives.set(key, formattedValues);
}
function formatCSPHeader(mergedCSP) {
    return Object.entries(mergedCSP).sort(([a], [b])=>a.localeCompare(b)).map(([key, values])=>{
        const valueObjs = Array.from(values).map((v)=>({
                raw: v,
                formatted: ContentSecurityPolicyDirectiveManager.formatValue(v)
            }));
        return `${key} ${valueObjs.map((item)=>item.formatted).join(" ")}`;
    }).join("; ");
}
function generateNonce() {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const binaryString = Array.from(randomBytes, (byte)=>String.fromCharCode(byte)).join("");
    return btoa(binaryString);
}
function buildContentSecurityPolicyDirectives(strict, host, customDirectives, nonce) {
    const directives = Object.entries(ContentSecurityPolicyDirectiveManager.DEFAULT_DIRECTIVES).reduce((acc, [key, values])=>{
        acc[key] = new Set(values);
        return acc;
    }, {});
    directives["connect-src"].add(host);
    if (strict) {
        directives["script-src"].delete("http:");
        directives["script-src"].delete("https:");
        directives["script-src"].add("'strict-dynamic'");
        if (nonce) {
            directives["script-src"].add(`'nonce-${nonce}'`);
        }
    }
    if (customDirectives) {
        const customDirectivesMap = /* @__PURE__ */ new Map();
        Object.entries(customDirectives).forEach(([key, values])=>{
            const valuesArray = Array.isArray(values) ? values : [
                values
            ];
            if (ContentSecurityPolicyDirectiveManager.DEFAULT_DIRECTIVES[key]) {
                handleExistingDirective(directives, key, valuesArray);
            } else {
                handleCustomDirective(customDirectivesMap, key, valuesArray);
            }
        });
        customDirectivesMap.forEach((values, key)=>{
            directives[key] = values;
        });
    }
    return formatCSPHeader(directives);
}
function createContentSecurityPolicyHeaders(host, options) {
    var _a;
    const headers = [];
    const nonce = options.strict ? generateNonce() : void 0;
    let cspHeader = buildContentSecurityPolicyDirectives((_a = options.strict) != null ? _a : false, host, options.directives, nonce);
    if (options.reportTo) {
        cspHeader += "; report-to csp-endpoint";
        headers.push([
            __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.ReportingEndpoints,
            `csp-endpoint="${options.reportTo}"`
        ]);
    }
    if (options.reportOnly) {
        headers.push([
            __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.ContentSecurityPolicyReportOnly,
            cspHeader
        ]);
    } else {
        headers.push([
            __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.ContentSecurityPolicy,
            cspHeader
        ]);
    }
    if (nonce) {
        headers.push([
            __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.Nonce,
            nonce
        ]);
    }
    return {
        headers
    };
}
;
 //# sourceMappingURL=content-security-policy.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/keyless.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getKeylessCookieName",
    ()=>getKeylessCookieName,
    "getKeylessCookieValue",
    ()=>getKeylessCookieValue
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/feature-flags.js [middleware-edge] (ecmascript)");
;
;
const keylessCookiePrefix = `__clerk_keys_`;
async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b)=>b.toString(16).padStart(2, "0")).join("");
    return hashHex.slice(0, 16);
}
async function getKeylessCookieName() {
    const PATH = process.env.PWD;
    if (!PATH) {
        return `${keylessCookiePrefix}${0}`;
    }
    const lastThreeDirs = PATH.split("/").filter(Boolean).slice(-3).reverse().join("/");
    const hash = await hashString(lastThreeDirs);
    return `${keylessCookiePrefix}${hash}`;
}
async function getKeylessCookieValue(getter) {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["canUseKeyless"]) {
        return void 0;
    }
    const keylessCookieName = await getKeylessCookieName();
    let keyless;
    try {
        if ("TURBOPACK compile-time truthy", 1) {
            keyless = JSON.parse(getter(keylessCookieName) || "{}");
        }
    } catch  {
        keyless = void 0;
    }
    return keyless;
}
;
 //# sourceMappingURL=keyless.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/nextErrors.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HTTP_ERROR_FALLBACK_ERROR_CODE",
    ()=>HTTP_ERROR_FALLBACK_ERROR_CODE,
    "isHTTPAccessFallbackError",
    ()=>isHTTPAccessFallbackError,
    "isLegacyNextjsNotFoundError",
    ()=>isLegacyNextjsNotFoundError,
    "isNextjsNotFoundError",
    ()=>isNextjsNotFoundError,
    "isNextjsRedirectError",
    ()=>isNextjsRedirectError,
    "isNextjsUnauthorizedError",
    ()=>isNextjsUnauthorizedError,
    "isRedirectToSignInError",
    ()=>isRedirectToSignInError,
    "isRedirectToSignUpError",
    ()=>isRedirectToSignUpError,
    "nextjsRedirectError",
    ()=>nextjsRedirectError,
    "redirectToSignInError",
    ()=>redirectToSignInError,
    "redirectToSignUpError",
    ()=>redirectToSignUpError,
    "unauthorized",
    ()=>unauthorized,
    "whichHTTPAccessFallbackError",
    ()=>whichHTTPAccessFallbackError
]);
;
const CONTROL_FLOW_ERROR = {
    REDIRECT_TO_URL: "CLERK_PROTECT_REDIRECT_TO_URL",
    REDIRECT_TO_SIGN_IN: "CLERK_PROTECT_REDIRECT_TO_SIGN_IN",
    REDIRECT_TO_SIGN_UP: "CLERK_PROTECT_REDIRECT_TO_SIGN_UP"
};
const LEGACY_NOT_FOUND_ERROR_CODE = "NEXT_NOT_FOUND";
function isLegacyNextjsNotFoundError(error) {
    if (typeof error !== "object" || error === null || !("digest" in error)) {
        return false;
    }
    return error.digest === LEGACY_NOT_FOUND_ERROR_CODE;
}
const HTTPAccessErrorStatusCodes = {
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    UNAUTHORIZED: 401
};
const ALLOWED_CODES = new Set(Object.values(HTTPAccessErrorStatusCodes));
const HTTP_ERROR_FALLBACK_ERROR_CODE = "NEXT_HTTP_ERROR_FALLBACK";
function isHTTPAccessFallbackError(error) {
    if (typeof error !== "object" || error === null || !("digest" in error) || typeof error.digest !== "string") {
        return false;
    }
    const [prefix, httpStatus] = error.digest.split(";");
    return prefix === HTTP_ERROR_FALLBACK_ERROR_CODE && ALLOWED_CODES.has(Number(httpStatus));
}
function whichHTTPAccessFallbackError(error) {
    if (!isHTTPAccessFallbackError(error)) {
        return void 0;
    }
    const [, httpStatus] = error.digest.split(";");
    return Number(httpStatus);
}
function isNextjsNotFoundError(error) {
    return isLegacyNextjsNotFoundError(error) || // Checks for the error thrown from `notFound()` for canary versions of next@15
    whichHTTPAccessFallbackError(error) === HTTPAccessErrorStatusCodes.NOT_FOUND;
}
const REDIRECT_ERROR_CODE = "NEXT_REDIRECT";
function nextjsRedirectError(url, extra, type = "replace", statusCode = 307) {
    const error = new Error(REDIRECT_ERROR_CODE);
    error.digest = `${REDIRECT_ERROR_CODE};${type};${url};${statusCode};`;
    error.clerk_digest = CONTROL_FLOW_ERROR.REDIRECT_TO_URL;
    Object.assign(error, extra);
    throw error;
}
function buildReturnBackUrl(url, returnBackUrl) {
    return returnBackUrl === null ? "" : returnBackUrl || url;
}
function redirectToSignInError(url, returnBackUrl) {
    nextjsRedirectError(url, {
        clerk_digest: CONTROL_FLOW_ERROR.REDIRECT_TO_SIGN_IN,
        returnBackUrl: buildReturnBackUrl(url, returnBackUrl)
    });
}
function redirectToSignUpError(url, returnBackUrl) {
    nextjsRedirectError(url, {
        clerk_digest: CONTROL_FLOW_ERROR.REDIRECT_TO_SIGN_UP,
        returnBackUrl: buildReturnBackUrl(url, returnBackUrl)
    });
}
function isNextjsRedirectError(error) {
    if (typeof error !== "object" || error === null || !("digest" in error) || typeof error.digest !== "string") {
        return false;
    }
    const digest = error.digest.split(";");
    const [errorCode, type] = digest;
    const destination = digest.slice(2, -2).join(";");
    const status = digest.at(-2);
    const statusCode = Number(status);
    return errorCode === REDIRECT_ERROR_CODE && (type === "replace" || type === "push") && typeof destination === "string" && !isNaN(statusCode) && statusCode === 307;
}
function isRedirectToSignInError(error) {
    if (isNextjsRedirectError(error) && "clerk_digest" in error) {
        return error.clerk_digest === CONTROL_FLOW_ERROR.REDIRECT_TO_SIGN_IN;
    }
    return false;
}
function isRedirectToSignUpError(error) {
    if (isNextjsRedirectError(error) && "clerk_digest" in error) {
        return error.clerk_digest === CONTROL_FLOW_ERROR.REDIRECT_TO_SIGN_UP;
    }
    return false;
}
function isNextjsUnauthorizedError(error) {
    return whichHTTPAccessFallbackError(error) === HTTPAccessErrorStatusCodes.UNAUTHORIZED;
}
function unauthorized() {
    const error = new Error(HTTP_ERROR_FALLBACK_ERROR_CODE);
    error.digest = `${HTTP_ERROR_FALLBACK_ERROR_CODE};${HTTPAccessErrorStatusCodes.UNAUTHORIZED}`;
    throw error;
}
;
 //# sourceMappingURL=nextErrors.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/nextFetcher.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isNextFetcher",
    ()=>isNextFetcher
]);
;
function isNextFetcher(fetch) {
    return "__nextPatched" in fetch && fetch.__nextPatched === true;
}
;
 //# sourceMappingURL=nextFetcher.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/protect.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createProtect",
    ()=>createProtect
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$internal$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/internal.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TTM76E4X.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/constants.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$nextFetcher$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/nextFetcher.js [middleware-edge] (ecmascript)");
;
;
;
;
function createProtect(opts) {
    const { redirectToSignIn, authObject, redirect, notFound, request, unauthorized } = opts;
    return async (...args)=>{
        var _a, _b, _c, _d, _e, _f;
        const paramsOrFunction = getAuthorizationParams(args[0]);
        const unauthenticatedUrl = ((_a = args[0]) == null ? void 0 : _a.unauthenticatedUrl) || ((_b = args[1]) == null ? void 0 : _b.unauthenticatedUrl);
        const unauthorizedUrl = ((_c = args[0]) == null ? void 0 : _c.unauthorizedUrl) || ((_d = args[1]) == null ? void 0 : _d.unauthorizedUrl);
        const requestedToken = ((_e = args[0]) == null ? void 0 : _e.token) || ((_f = args[1]) == null ? void 0 : _f.token) || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["TokenType"].SessionToken;
        const handleUnauthenticated = ()=>{
            if (unauthenticatedUrl) {
                return redirect(unauthenticatedUrl);
            }
            if (isPageRequest(request)) {
                return redirectToSignIn();
            }
            return notFound();
        };
        const handleUnauthorized = ()=>{
            if (authObject.tokenType !== __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["TokenType"].SessionToken) {
                return unauthorized();
            }
            if (unauthorizedUrl) {
                return redirect(unauthorizedUrl);
            }
            return notFound();
        };
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isTokenTypeAccepted"])(authObject.tokenType, requestedToken)) {
            return handleUnauthorized();
        }
        if (authObject.tokenType !== __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["TokenType"].SessionToken) {
            if (!authObject.isAuthenticated) {
                return handleUnauthorized();
            }
            return authObject;
        }
        if (authObject.sessionStatus === "pending") {
            return handleUnauthenticated();
        }
        if (!authObject.userId) {
            return handleUnauthenticated();
        }
        if (!paramsOrFunction) {
            return authObject;
        }
        if (typeof paramsOrFunction === "function") {
            if (paramsOrFunction(authObject.has)) {
                return authObject;
            }
            return handleUnauthorized();
        }
        if (authObject.has(paramsOrFunction)) {
            return authObject;
        }
        return handleUnauthorized();
    };
}
const getAuthorizationParams = (arg)=>{
    if (!arg) {
        return void 0;
    }
    if (arg.unauthenticatedUrl || arg.unauthorizedUrl || arg.token) {
        return void 0;
    }
    if (Object.keys(arg).length === 1 && "token" in arg) {
        return void 0;
    }
    return arg;
};
const isServerActionRequest = (req)=>{
    var _a, _b;
    return !!req.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["constants"].Headers.NextUrl) && (((_a = req.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.Accept)) == null ? void 0 : _a.includes("text/x-component")) || ((_b = req.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.ContentType)) == null ? void 0 : _b.includes("multipart/form-data")) || !!req.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["constants"].Headers.NextAction));
};
const isPageRequest = (req)=>{
    var _a;
    return req.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.SecFetchDest) === "document" || req.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.SecFetchDest) === "iframe" || ((_a = req.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.Accept)) == null ? void 0 : _a.includes("text/html")) || isAppRouterInternalNavigation(req) || isPagesRouterInternalNavigation(req);
};
const isAppRouterInternalNavigation = (req)=>!!req.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["constants"].Headers.NextUrl) && !isServerActionRequest(req) || isPagePathAvailable();
const isPagePathAvailable = ()=>{
    const __fetch = globalThis.fetch;
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$nextFetcher$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isNextFetcher"])(__fetch)) {
        return false;
    }
    const { page, pagePath } = __fetch.__nextGetStaticStore().getStore() || {};
    return Boolean(// available on next@14
    pagePath || // available on next@15
    page);
};
const isPagesRouterInternalNavigation = (req)=>!!req.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["constants"].Headers.NextjsData);
;
 //# sourceMappingURL=protect.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/clerkMiddleware.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clerkMiddleware",
    ()=>clerkMiddleware,
    "createAuthenticateRequestOptions",
    ()=>createAuthenticateRequestOptions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$internal$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/internal.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TTM76E4X.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/api/navigation.react-server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/client/components/navigation.react-server.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/response.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$serverRedirectWithAuth$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/serverRedirectWithAuth.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$debugLogger$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/debugLogger.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/feature-flags.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$clerkClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/clerkClient.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/constants.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$content$2d$security$2d$policy$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/content-security-policy.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errorThrower$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/errorThrower.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$headers$2d$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/headers-utils.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$keyless$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/keyless.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$middleware$2d$storage$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/middleware-storage.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$nextErrors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/nextErrors.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$protect$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/protect.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/utils.js [middleware-edge] (ecmascript)");
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
;
const clerkMiddleware = (...args)=>{
    const [request, event] = parseRequestAndEvent(args);
    const [handler, params] = parseHandlerAndOptions(args);
    const middleware = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$middleware$2d$storage$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["clerkMiddlewareRequestDataStorage"].run(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$middleware$2d$storage$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["clerkMiddlewareRequestDataStore"], ()=>{
        const baseNextMiddleware = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$debugLogger$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["withLogger"])("clerkMiddleware", (logger)=>async (request2, event2)=>{
                var _a, _b;
                const resolvedParams = typeof params === "function" ? await params(request2) : params;
                const keyless = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$keyless$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getKeylessCookieValue"])((name)=>{
                    var _a2;
                    return (_a2 = request2.cookies.get(name)) == null ? void 0 : _a2.value;
                });
                const publishableKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["assertKey"])(resolvedParams.publishableKey || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["PUBLISHABLE_KEY"] || (keyless == null ? void 0 : keyless.publishableKey), ()=>__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errorThrower$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["errorThrower"].throwMissingPublishableKeyError());
                const secretKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["assertKey"])(resolvedParams.secretKey || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SECRET_KEY"] || (keyless == null ? void 0 : keyless.secretKey), ()=>__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errorThrower$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["errorThrower"].throwMissingSecretKeyError());
                const signInUrl = resolvedParams.signInUrl || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SIGN_IN_URL"];
                const signUpUrl = resolvedParams.signUpUrl || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["SIGN_UP_URL"];
                const options = {
                    publishableKey,
                    secretKey,
                    signInUrl,
                    signUpUrl,
                    ...resolvedParams
                };
                __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$middleware$2d$storage$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["clerkMiddlewareRequestDataStore"].set("requestData", options);
                const resolvedClerkClient = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$clerkClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["clerkClient"])();
                if (options.debug) {
                    logger.enable();
                }
                const clerkRequest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClerkRequest"])(request2);
                logger.debug("options", options);
                logger.debug("url", ()=>clerkRequest.toJSON());
                const authHeader = request2.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.Authorization);
                if (authHeader && authHeader.startsWith("Basic ")) {
                    logger.debug("Basic Auth detected");
                }
                const cspHeader = request2.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.ContentSecurityPolicy);
                if (cspHeader) {
                    logger.debug("Content-Security-Policy detected", ()=>({
                            value: cspHeader
                        }));
                }
                const requestState = await resolvedClerkClient.authenticateRequest(clerkRequest, createAuthenticateRequestOptions(clerkRequest, options));
                logger.debug("requestState", ()=>({
                        status: requestState.status,
                        headers: JSON.stringify(Object.fromEntries(requestState.headers)),
                        reason: requestState.reason
                    }));
                const locationHeader = requestState.headers.get(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.Location);
                if (locationHeader) {
                    const res = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(locationHeader);
                    requestState.headers.forEach((value, key)=>{
                        if (key === __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.Location) {
                            return;
                        }
                        res.headers.append(key, value);
                    });
                    return res;
                } else if (requestState.status === __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["AuthStatus"].Handshake) {
                    throw new Error("Clerk: handshake status without redirect");
                }
                const authObject = requestState.toAuth();
                logger.debug("auth", ()=>({
                        auth: authObject,
                        debug: authObject.debug()
                    }));
                const redirectToSignIn = createMiddlewareRedirectToSignIn(clerkRequest);
                const redirectToSignUp = createMiddlewareRedirectToSignUp(clerkRequest);
                const protect = await createMiddlewareProtect(clerkRequest, authObject, redirectToSignIn);
                const authHandler = createMiddlewareAuthHandler(requestState, redirectToSignIn, redirectToSignUp);
                authHandler.protect = protect;
                let handlerResult = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
                try {
                    const userHandlerResult = await __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$middleware$2d$storage$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["clerkMiddlewareRequestDataStorage"].run(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$middleware$2d$storage$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["clerkMiddlewareRequestDataStore"], async ()=>handler == null ? void 0 : handler(authHandler, request2, event2));
                    handlerResult = userHandlerResult || handlerResult;
                } catch (e) {
                    handlerResult = handleControlFlowErrors(e, clerkRequest, request2, requestState);
                }
                if (options.contentSecurityPolicy) {
                    const { headers } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$content$2d$security$2d$policy$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createContentSecurityPolicyHeaders"])(((_b = (_a = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["parsePublishableKey"])(publishableKey)) == null ? void 0 : _a.frontendApi) != null ? _b : "").replace("$", ""), options.contentSecurityPolicy);
                    headers.forEach(([key, value])=>{
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setHeader"])(handlerResult, key, value);
                    });
                    logger.debug("Clerk generated CSP", ()=>({
                            headers
                        }));
                }
                if (requestState.headers) {
                    requestState.headers.forEach((value, key)=>{
                        if (key === __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.ContentSecurityPolicy) {
                            logger.debug("Content-Security-Policy detected", ()=>({
                                    value
                                }));
                        }
                        handlerResult.headers.append(key, value);
                    });
                }
                if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isRedirect"])(handlerResult)) {
                    logger.debug("handlerResult is redirect");
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$serverRedirectWithAuth$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["serverRedirectWithAuth"])(clerkRequest, handlerResult, options);
                }
                if (options.debug) {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setRequestHeadersOnNextResponse"])(handlerResult, clerkRequest, {
                        [__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.EnableDebug]: "true"
                    });
                }
                const keylessKeysForRequestData = // Only pass keyless credentials when there are no explicit keys
                secretKey === (keyless == null ? void 0 : keyless.secretKey) ? {
                    publishableKey: keyless == null ? void 0 : keyless.publishableKey,
                    secretKey: keyless == null ? void 0 : keyless.secretKey
                } : {};
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["decorateRequest"])(clerkRequest, handlerResult, requestState, resolvedParams, keylessKeysForRequestData, authObject.tokenType === "session_token" ? null : (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["makeAuthObjectSerializable"])(authObject));
                return handlerResult;
            });
        const keylessMiddleware = async (request2, event2)=>{
            var _a, _b;
            if (isKeylessSyncRequest(request2)) {
                return returnBackFromKeylessSync(request2);
            }
            const resolvedParams = typeof params === "function" ? await params(request2) : params;
            const keyless = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$keyless$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getKeylessCookieValue"])((name)=>{
                var _a2;
                return (_a2 = request2.cookies.get(name)) == null ? void 0 : _a2.value;
            });
            const isMissingPublishableKey = !(resolvedParams.publishableKey || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["PUBLISHABLE_KEY"] || (keyless == null ? void 0 : keyless.publishableKey));
            const authHeader = (_b = (_a = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$headers$2d$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["getHeader"])(request2, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.Authorization)) == null ? void 0 : _a.replace("Bearer ", "")) != null ? _b : "";
            if (isMissingPublishableKey && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isMachineTokenByPrefix"])(authHeader)) {
                const res = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setRequestHeadersOnNextResponse"])(res, request2, {
                    [__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.AuthStatus]: "signed-out"
                });
                return res;
            }
            return baseNextMiddleware(request2, event2);
        };
        const nextMiddleware = async (request2, event2)=>{
            if (__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["canUseKeyless"]) {
                return keylessMiddleware(request2, event2);
            }
            return baseNextMiddleware(request2, event2);
        };
        if (request && event) {
            return nextMiddleware(request, event);
        }
        return nextMiddleware;
    });
    return middleware;
};
const parseRequestAndEvent = (args)=>{
    return [
        args[0] instanceof Request ? args[0] : void 0,
        args[0] instanceof Request ? args[1] : void 0
    ];
};
const parseHandlerAndOptions = (args)=>{
    return [
        typeof args[0] === "function" ? args[0] : void 0,
        (args.length === 2 ? args[1] : typeof args[0] === "function" ? {} : args[0]) || {}
    ];
};
const isKeylessSyncRequest = (request)=>request.nextUrl.pathname === "/clerk-sync-keyless";
const returnBackFromKeylessSync = (request)=>{
    const returnUrl = request.nextUrl.searchParams.get("returnUrl");
    const url = new URL(request.url);
    url.pathname = "";
    return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(returnUrl || url.toString());
};
const createAuthenticateRequestOptions = (clerkRequest, options)=>{
    return {
        ...options,
        ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["handleMultiDomainAndProxy"])(clerkRequest, options),
        // TODO: Leaving the acceptsToken as 'any' opens up the possibility of
        // an economic attack. We should revisit this and only verify a token
        // when auth() or auth.protect() is invoked.
        acceptsToken: "any"
    };
};
const createMiddlewareRedirectToSignIn = (clerkRequest)=>{
    return (opts = {})=>{
        const url = clerkRequest.clerkUrl.toString();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$nextErrors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["redirectToSignInError"])(url, opts.returnBackUrl);
    };
};
const createMiddlewareRedirectToSignUp = (clerkRequest)=>{
    return (opts = {})=>{
        const url = clerkRequest.clerkUrl.toString();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$nextErrors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["redirectToSignUpError"])(url, opts.returnBackUrl);
    };
};
const createMiddlewareProtect = (clerkRequest, rawAuthObject, redirectToSignIn)=>{
    return async (params, options)=>{
        const notFound = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["notFound"])();
        const redirect = (url)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$nextErrors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["nextjsRedirectError"])(url, {
                redirectUrl: url
            });
        const requestedToken = (params == null ? void 0 : params.token) || (options == null ? void 0 : options.token) || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["TokenType"].SessionToken;
        const authObject = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getAuthObjectForAcceptedToken"])({
            authObject: rawAuthObject,
            acceptsToken: requestedToken
        });
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$protect$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createProtect"])({
            request: clerkRequest,
            redirect,
            notFound,
            unauthorized: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$nextErrors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["unauthorized"],
            authObject,
            redirectToSignIn
        })(params, options);
    };
};
const createMiddlewareAuthHandler = (requestState, redirectToSignIn, redirectToSignUp)=>{
    const authHandler = async (options)=>{
        var _a;
        const rawAuthObject = requestState.toAuth({
            treatPendingAsSignedOut: options == null ? void 0 : options.treatPendingAsSignedOut
        });
        const acceptsToken = (_a = options == null ? void 0 : options.acceptsToken) != null ? _a : __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["TokenType"].SessionToken;
        const authObject = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getAuthObjectForAcceptedToken"])({
            authObject: rawAuthObject,
            acceptsToken
        });
        if (authObject.tokenType === __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["TokenType"].SessionToken && (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isTokenTypeAccepted"])(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["TokenType"].SessionToken, acceptsToken)) {
            return Object.assign(authObject, {
                redirectToSignIn,
                redirectToSignUp
            });
        }
        return authObject;
    };
    return authHandler;
};
const handleControlFlowErrors = (e, clerkRequest, nextRequest, requestState)=>{
    var _a;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$nextErrors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isNextjsUnauthorizedError"])(e)) {
        const response = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"](null, {
            status: 401
        });
        const authObject = requestState.toAuth();
        if (authObject && authObject.tokenType === __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["TokenType"].OAuthToken) {
            const publishableKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["parsePublishableKey"])(requestState.publishableKey);
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setHeader"])(response, "WWW-Authenticate", `Bearer resource_metadata="https://${publishableKey == null ? void 0 : publishableKey.frontendApi}/.well-known/oauth-protected-resource"`);
        }
        return response;
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$nextErrors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isNextjsNotFoundError"])(e)) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["setHeader"])(// This is an internal rewrite purely to trigger a not found error. We do not want Next.js to think that the
        // destination URL is a valid page, so we use `nextRequest.url` as the base for the fake URL, which Next.js
        // understands is an internal URL and won't run middleware against the request.
        __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].rewrite(new URL(`/clerk_${Date.now()}`, nextRequest.url)), __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers.AuthReason, "protect-rewrite");
    }
    const isRedirectToSignIn = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$nextErrors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isRedirectToSignInError"])(e);
    const isRedirectToSignUp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$nextErrors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isRedirectToSignUpError"])(e);
    if (isRedirectToSignIn || isRedirectToSignUp) {
        const redirect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createRedirect"])({
            redirectAdapter: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["redirectAdapter"],
            baseUrl: clerkRequest.clerkUrl,
            signInUrl: requestState.signInUrl,
            signUpUrl: requestState.signUpUrl,
            publishableKey: requestState.publishableKey,
            sessionStatus: (_a = requestState.toAuth()) == null ? void 0 : _a.sessionStatus
        });
        const { returnBackUrl } = e;
        return redirect[isRedirectToSignIn ? "redirectToSignIn" : "redirectToSignUp"]({
            returnBackUrl
        });
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$nextErrors$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["isNextjsRedirectError"])(e)) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$utils$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["redirectAdapter"])(e.redirectUrl);
    }
    throw e;
};
;
 //# sourceMappingURL=clerkMiddleware.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/routeMatcher.js [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createRouteMatcher",
    ()=>createRouteMatcher
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$pathMatcher$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/pathMatcher.mjs [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$pathMatcher$2d$B0k8rNqO$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/pathMatcher-B0k8rNqO.mjs [middleware-edge] (ecmascript)");
;
;
const createRouteMatcher = (routes)=>{
    if (typeof routes === "function") {
        return (req)=>routes(req);
    }
    const matcher = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$pathMatcher$2d$B0k8rNqO$2e$mjs__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createPathMatcher"])(routes);
    return (req)=>matcher(req.nextUrl.pathname);
};
;
 //# sourceMappingURL=routeMatcher.js.map
}),
]);

//# sourceMappingURL=908f4_%40clerk_nextjs_dist_esm_1b2a5dff._.js.map