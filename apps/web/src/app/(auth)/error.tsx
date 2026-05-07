"use client";

import { Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign-in is having trouble
        </h1>
        <p className="text-muted-foreground">
          {error.message ||
            "We couldn't load the sign-in screen. Try again, or come back in a moment."}
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
      </div>
    </div>
  );
}
