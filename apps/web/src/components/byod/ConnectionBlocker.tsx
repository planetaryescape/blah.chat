"use client";

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
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useBYOD } from "@/lib/hooks/queries/useBYODConfig";

interface ConnectionBlockerProps {
  children: React.ReactNode;
}

export function ConnectionBlocker({ children }: ConnectionBlockerProps) {
  const { isEnabled, isLoading, config, error, mutate } = useBYOD();
  const [retryCount, setRetryCount] = useState(0);

  const { run: handleRetry, isPending: isRetrying } = useAsyncAction(
    async () => {
      await fetch("/api/v1/byod/test", { method: "POST" });
      mutate();
      setRetryCount((c) => c + 1);
    },
    {
      // Error handled via mutate re-fetch
      onError: () => {},
    },
  );

  if (!isEnabled && !isLoading) {
    return <>{children}</>;
  }

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

  if (
    config?.connectionStatus === "connected" ||
    config?.connectionStatus === "pending"
  ) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <CardTitle>Database Connection Error</CardTitle>
          </div>
          <CardDescription>
            Unable to connect to your Neon database. The app is blocked to
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
              <li>Your Neon project is suspended or deleted</li>
              <li>Connection string credentials changed</li>
              <li>Network connectivity issues</li>
              <li>Neon service outage</li>
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
                href="https://console.neon.tech"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Neon Console
              </a>
            </Button>
          </div>

          {retryCount > 2 && (
            <p className="text-xs text-muted-foreground text-center">
              Still having issues? Try updating your connection string in
              Settings.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
