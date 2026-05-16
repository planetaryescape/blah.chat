import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildCorsHeaders } from "@/lib/api/cors";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share(.*)",
  "/privacy",
  "/terms",
  "/api/webhooks/clerk", // Clerk webhooks
  "/api/code-execution", // Allow internal calls
  "/api/internal(.*)", // Bearer-authenticated Trigger.dev callbacks
  "/api/desktop-updater/latest", // Public updater manifest endpoint
  "/api/v1/health",
  "/api/v1/doc",
  "/api/v1/openapi.json",
  "/api/v1/cli(.*)",
]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
export default clerkMiddleware(async (auth, req) => {
  // CORS preflight for cross-origin API clients
  if (req.nextUrl.pathname.startsWith("/api/v1") && req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: buildCorsHeaders(req),
    });
  }

  const { userId, sessionClaims } = await auth();

  // Redirect authenticated users from / to /app
  if (userId && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  // Admin route protection
  if (isAdminRoute(req)) {
    if (!userId) {
      // Not authenticated, redirect to sign-in
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // Check for admin role in session claims publicMetadata
    const isAdmin =
      (sessionClaims?.publicMetadata as { isAdmin?: boolean })?.isAdmin ===
      true;
    if (!isAdmin) {
      // Not an admin, redirect to /app
      return NextResponse.redirect(new URL("/app", req.url));
    }
  }

  // Handle protected routes
  if (!isPublicRoute(req)) {
    // For /app route, check if user is authenticated before calling protect
    // This prevents redirect loop when Clerk session exists but isn't fully ready
    if (req.nextUrl.pathname === "/app") {
      if (!userId) {
        // Not authenticated, redirect to sign-in
        return NextResponse.redirect(new URL("/sign-in", req.url));
      }
      // Authenticated user on /app, allow access (don't call protect to avoid redirect loop)
      return NextResponse.next();
    }
    // For other protected routes, use protect
    await auth.protect();
  }

  const response = NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/v1")) {
    const corsHeaders = buildCorsHeaders(req);
    for (const [key, value] of corsHeaders.entries()) {
      response.headers.set(key, value);
    }
  }

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
