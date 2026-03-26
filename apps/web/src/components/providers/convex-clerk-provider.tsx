"use client";

// TODO: Phase G - This provider still uses Convex for real-time subscriptions.
// Once all queries/mutations are migrated to REST, this can be replaced with
// just ClerkProvider + React Query provider. Keep for now as migration bridge.

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";
import { AuthStateListener } from "./AuthStateListener";
import { CacheProvider } from "./cache-provider";

const convex = process.env.NEXT_PUBLIC_CONVEX_URL
  ? new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)
  : null;

export function ConvexClerkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!convex) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
  }

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#e4a853",
          colorBackground: "#1a1513",
          colorInputBackground: "#1a1513",
          colorInputText: "#e8e3df",
          fontFamily: "'Clash Display', sans-serif",
        },
        elements: {
          formButtonPrimary:
            "bg-primary text-primary-foreground hover:bg-primary/90",
          card: "bg-card",
          headerTitle: "text-foreground",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton:
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          formFieldLabel: "text-foreground",
          formFieldInput: "bg-input border-border text-foreground",
          footerActionLink: "text-primary hover:text-primary/90",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ConvexQueryCacheProvider expiration={60000} maxIdleEntries={100}>
          <CacheProvider>
            <AuthStateListener>{children}</AuthStateListener>
          </CacheProvider>
        </ConvexQueryCacheProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
