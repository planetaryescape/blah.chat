module.exports = [
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/keyless-log-cache.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clerkDevelopmentCache",
    ()=>clerkDevelopmentCache,
    "createConfirmationMessage",
    ()=>createConfirmationMessage,
    "createKeylessModeMessage",
    ()=>createKeylessModeMessage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$utils$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/utils/index.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [app-rsc] (ecmascript)");
;
;
const THROTTLE_DURATION_MS = 10 * 60 * 1e3;
function createClerkDevCache() {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isDevelopmentEnvironment"])()) {
        return;
    }
    if (!/*TURBOPACK member replacement*/ __turbopack_context__.g.__clerk_internal_keyless_logger) {
        /*TURBOPACK member replacement*/ __turbopack_context__.g.__clerk_internal_keyless_logger = {
            __cache: /* @__PURE__ */ new Map(),
            log: function({ cacheKey, msg }) {
                var _a;
                if (this.__cache.has(cacheKey) && Date.now() < (((_a = this.__cache.get(cacheKey)) == null ? void 0 : _a.expiresAt) || 0)) {
                    return;
                }
                console.log(msg);
                this.__cache.set(cacheKey, {
                    expiresAt: Date.now() + THROTTLE_DURATION_MS
                });
            },
            run: async function(callback, { cacheKey, onSuccessStale = THROTTLE_DURATION_MS, onErrorStale = THROTTLE_DURATION_MS }) {
                var _a, _b;
                if (this.__cache.has(cacheKey) && Date.now() < (((_a = this.__cache.get(cacheKey)) == null ? void 0 : _a.expiresAt) || 0)) {
                    return (_b = this.__cache.get(cacheKey)) == null ? void 0 : _b.data;
                }
                try {
                    const result = await callback();
                    this.__cache.set(cacheKey, {
                        expiresAt: Date.now() + onSuccessStale,
                        data: result
                    });
                    return result;
                } catch (e) {
                    this.__cache.set(cacheKey, {
                        expiresAt: Date.now() + onErrorStale
                    });
                    throw e;
                }
            }
        };
    }
    return globalThis.__clerk_internal_keyless_logger;
}
const createKeylessModeMessage = (keys)=>{
    return `
\x1B[35m
[Clerk]:\x1B[0m You are running in keyless mode.
You can \x1B[35mclaim your keys\x1B[0m by visiting ${keys.claimUrl}
`;
};
const createConfirmationMessage = ()=>{
    return `
\x1B[35m
[Clerk]:\x1B[0m Your application is running with your claimed keys.
You can safely remove the \x1B[35m.clerk/\x1B[0m from your project.
`;
};
const clerkDevelopmentCache = createClerkDevCache();
;
 //# sourceMappingURL=keyless-log-cache.js.map
}),
];

//# sourceMappingURL=908f4_%40clerk_nextjs_dist_esm_server_keyless-log-cache_36771bb2.js.map