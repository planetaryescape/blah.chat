"use client";

import { Button } from "@/components/ui/button";
import { useClerk, useUser } from "@clerk/nextjs";
import { AlertTriangle, LogOut, RefreshCw } from "lucide-react";

/**
 * UserSyncError Component
 *
 * Displays when a user is authenticated via Clerk but has no corresponding
 * user record in Convex (webhook failure scenario).
 *
 * Shows different messages based on environment:
 * - Development: Detailed message with Clerk ID for debugging
 * - Production: Simple error message with support contact
 */
export function UserSyncError() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const isDev = process.env.NODE_ENV === "development";

  const handleSignOut = () => {
    signOut({ redirectUrl: "/" });
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Account Setup Incomplete
          </h1>

          {isDev ? (
            <div className="space-y-3 text-left bg-muted/50 rounded-lg p-4 mt-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Development Mode:</strong>{" "}
                Your user record wasn&apos;t synced to Convex. This usually
                means the Clerk webhook didn&apos;t fire.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Possible causes:</strong>
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Webhook not configured in Clerk dashboard</li>
                <li>No tunnel exposing localhost to Clerk</li>
                <li>
                  Missing{" "}
                  <code className="bg-muted px-1 rounded">
                    CLERK_WEBHOOK_SECRET
                  </code>
                </li>
              </ul>
              {user?.id && (
                <p className="text-xs text-muted-foreground/70 font-mono mt-2">
                  Clerk ID: {user.id}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Something went wrong setting up your account. Please try again or
              contact support if the issue persists.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={handleRefresh} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
          <Button onClick={handleSignOut} variant="ghost" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {!isDev && (
          <p className="text-xs text-muted-foreground">
            If this issue continues, please contact{" "}
            <a
              href="mailto:support@blah.chat"
              className="text-primary hover:underline"
            >
              support@blah.chat
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
