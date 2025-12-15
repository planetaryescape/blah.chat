"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { AuthStateListener } from "./AuthStateListener";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClerkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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
          <AuthStateListener>{children}</AuthStateListener>
        </ConvexQueryCacheProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
