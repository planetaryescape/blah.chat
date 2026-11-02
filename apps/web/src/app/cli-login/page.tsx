"use client";

/**
 * CLI Login Page
 *
 * Handles OAuth redirect for the CLI client.
 * After Clerk authentication, generates an API key and redirects to CLI's local callback.
 */

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function CLILoginContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (94+ modules)
  const createCliKey = useMutation(api.cliAuth.create);
  const hasRun = useRef(false);

  const callbackUrl = searchParams.get("callback");

  useEffect(() => {
    async function handleAuth() {
      // Prevent double execution
      if (hasRun.current) return;

      // Validate callback URL
      if (!callbackUrl) {
        setError("Missing callback URL");
        return;
      }

      // Only allow localhost callbacks for security
      try {
        const url = new URL(callbackUrl);
        if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
          setError("Invalid callback URL - must be localhost");
          return;
        }
      } catch {
        setError("Invalid callback URL format");
        return;
      }

      // Wait for Clerk to load
      if (!isLoaded) return;

      // If not signed in, redirect to sign-in with return URL
      if (!isSignedIn) {
        const returnUrl = `/cli-login?callback=${encodeURIComponent(callbackUrl)}`;
        router.push(`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`);
        return;
      }

      // Generate API key
      try {
        hasRun.current = true;
        setRedirecting(true);

        const { key, keyPrefix, email, name } = await createCliKey();

        // Build callback URL with credentials in fragment (not query params)
        // Fragments are never sent to server, only accessible client-side
        const redirectUrl = new URL(callbackUrl);
        const fragment = new URLSearchParams({
          api_key: key,
          key_prefix: keyPrefix,
          email: email || "",
          name: name || "",
        });
        redirectUrl.hash = fragment.toString();

        // Redirect to CLI callback
        window.location.href = redirectUrl.toString();
      } catch (err) {
        hasRun.current = false;
        setError(
          err instanceof Error ? err.message : "Failed to create API key",
        );
        setRedirecting(false);
      }
    }

    handleAuth();
  }, [isLoaded, isSignedIn, callbackUrl, createCliKey, router]);

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-destructive">
            Authentication Error
          </h1>
          <p className="text-muted-foreground">{error}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Return to the terminal and try again.
          </p>
        </div>
      </div>
    );
  }

  // Loading/redirecting state
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <h1 className="mb-2 text-xl font-semibold">
          {redirecting ? "Redirecting to CLI..." : "Authenticating..."}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSignedIn
            ? "Creating CLI access key..."
            : "Please wait while we verify your identity..."}
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <h1 className="mb-2 text-xl font-semibold">Loading...</h1>
      </div>
    </div>
  );
}

export default function CLILoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CLILoginContent />
    </Suspense>
  );
}
