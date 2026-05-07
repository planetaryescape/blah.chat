"use client";

import { Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error to whatever observability is wired up. The root error
    // boundary is the last defence so we always want a record of what blew up.
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[root-error-boundary]", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-muted-foreground">
          {error.message ||
            "An unexpected error occurred. You can try again or head back home."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Reference: <code>{error.digest}</code>
          </p>
        )}
        <div className="flex flex-col gap-3">
          <Button onClick={reset} variant="outline" className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <a href="/">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Still stuck? Email{" "}
          <a
            href="mailto:support@blah.chat"
            className="text-primary hover:underline"
          >
            support@blah.chat
          </a>
        </p>
      </div>
    </div>
  );
}
