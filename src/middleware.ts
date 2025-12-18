import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share(.*)",
  "/api/webhooks/clerk", // Clerk webhooks
  "/api/code-execution", // Allow Convex internal calls
]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
export default clerkMiddleware(async (auth, req) => {
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

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
