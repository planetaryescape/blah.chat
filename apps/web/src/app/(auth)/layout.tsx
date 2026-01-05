"use client";

import { Logo } from "@/components/brand/Logo";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSignUp = pathname?.includes("sign-up");

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Gradient background - using global theme vars */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />

      {/* Animated glow orbs - using primary/accent colors */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Fixed Header - Logo and Title (always at top, never moves) */}
      <div className="relative z-10 w-full flex flex-col items-center pt-16 pb-6 px-4">
        {/* Logo and branding - fixed position with link to homepage */}
        <Link
          href="/"
          className="text-center mb-8 scale-125 transition-opacity hover:opacity-80"
        >
          <Logo size="lg" />
        </Link>

        {/* Title - fixed position */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp
              ? "Get started with blah.chat in seconds"
              : "Sign in to continue to blah.chat"}
          </p>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center overflow-y-auto px-4">
        <div className="w-full max-w-md">
          {/* Auth card - content changes here, header stays above */}
          <div className="w-full relative overflow-hidden flex flex-col items-center">
            {/* Glass Highlight */}
            <div className="absolute inset-0 pointer-events-none" />

            <div className="relative z-10 w-full flex justify-center">
              {children}
            </div>
          </div>

          {/* Footer text */}
          <div className="mt-8 mb-8 flex flex-col items-center gap-2 text-center">
            <p className="text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy
              Policy.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <span>Powered by</span>
              <span className="font-semibold text-foreground/80">
                blah.chat
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
