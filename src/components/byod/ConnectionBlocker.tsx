"use client";

import { useAction } from "convex/react";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useBYOD } from "@/lib/hooks/queries/useBYODConfig";

interface ConnectionBlockerProps {
  children: React.ReactNode;
}

/**
 * Wraps app content and blocks UI when BYOD connection fails.
 * This protects data integrity by preventing operations when user's DB is unreachable.
 */
export function ConnectionBlocker({ children }: ConnectionBlockerProps) {
  const { isEnabled, isLoading, config, error } = useBYOD();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // @ts-ignore - Type depth exceeded with complex Convex action (94+ modules)
  const testConnection = useAction(api.byod.testConnection.testConnection);

  // If BYOD not enabled, just render children (using main DB)
  if (!isEnabled && !isLoading) {
    return <>{children}</>;
  }

  // If loading BYOD config, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            Connecting to your database...
          </p>
        </div>
      </div>
    );
  }

  // If connected, render children normally
  if (config?.connectionStatus === "connected") {
    return <>{children}</>;
  }

  // If pending (setup in progress), render children
  if (config?.connectionStatus === "pending") {
    return <>{children}</>;
  }

  // Connection error or disconnected - block UI
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await testConnection({});
      setRetryCount((c) => c + 1);
    } catch (err) {
      console.error("Retry failed:", err);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <CardTitle>Database Connection Error</CardTitle>
          </div>
          <CardDescription>
            Unable to connect to your Convex database. The app is blocked to
            protect your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Possible causes:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Your Convex project is paused or deleted</li>
              <li>Deploy key has expired or been revoked</li>
              <li>Network connectivity issues</li>
              <li>Convex service outage</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full"
            >
              {isRetrying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isRetrying ? "Retrying..." : "Retry Connection"}
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/settings?tab=database">
                <Settings className="h-4 w-4 mr-2" />
                Check Settings
              </Link>
            </Button>

            <Button variant="ghost" asChild className="w-full">
              <a
                href="https://dashboard.convex.dev"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Convex Dashboard
              </a>
            </Button>
          </div>

          {retryCount > 2 && (
            <p className="text-xs text-muted-foreground text-center">
              Still having issues? Try updating your credentials in Settings or
              contact support.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
