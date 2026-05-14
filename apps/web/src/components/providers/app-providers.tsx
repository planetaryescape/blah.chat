"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { AuthStateListener } from "./AuthStateListener";
import { CacheProvider } from "./cache-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      afterSignOutUrl="/sign-in"
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
      <CacheProvider>
        <AuthStateListener>{children}</AuthStateListener>
      </CacheProvider>
    </ClerkProvider>
  );
}
