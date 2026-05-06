"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { signOut } = useClerk();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Couldn&apos;t sync your account
        </h1>
        <p className="text-muted-foreground">
          {error.message ||
            "Something went wrong loading your workspace. Try again or sign out."}
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={reset} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
          <Button
            onClick={() => signOut({ redirectUrl: "/" })}
            variant="ghost"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          If this issue continues, please contact{" "}
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
