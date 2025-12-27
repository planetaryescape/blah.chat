(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__8bd37c4c._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/apps/web/src/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$clerkMiddleware$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/clerkMiddleware.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$routeMatcher$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/routeMatcher.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
;
;
const isPublicRoute = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$routeMatcher$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createRouteMatcher"])([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/share(.*)",
    "/api/webhooks/clerk",
    "/api/code-execution"
]);
const isAdminRoute = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$routeMatcher$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createRouteMatcher"])([
    "/admin(.*)"
]);
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$clerkMiddleware$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["clerkMiddleware"])(async (auth, req)=>{
    const { userId, sessionClaims } = await auth();
    // Redirect authenticated users from / to /app
    if (userId && req.nextUrl.pathname === "/") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/app", req.url));
    }
    // Admin route protection
    if (isAdminRoute(req)) {
        if (!userId) {
            // Not authenticated, redirect to sign-in
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/sign-in", req.url));
        }
        // Check for admin role in session claims publicMetadata
        const isAdmin = sessionClaims?.publicMetadata?.isAdmin === true;
        if (!isAdmin) {
            // Not an admin, redirect to /app
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/app", req.url));
        }
    }
    // Handle protected routes
    if (!isPublicRoute(req)) {
        // For /app route, check if user is authenticated before calling protect
        // This prevents redirect loop when Clerk session exists but isn't fully ready
        if (req.nextUrl.pathname === "/app") {
            if (!userId) {
                // Not authenticated, redirect to sign-in
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/sign-in", req.url));
            }
            // Authenticated user on /app, allow access (don't call protect to avoid redirect loop)
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
        }
        // For other protected routes, use protect
        await auth.protect();
    }
});
const config = {
    matcher: [
        // Skip Next.js internals and all static files
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)"
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__8bd37c4c._.js.map