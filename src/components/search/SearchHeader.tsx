"use client";

import { cn } from "@/lib/utils";

interface SearchHeaderProps {
  children: React.ReactNode;
}

export function SearchHeader({ children }: SearchHeaderProps) {
  return (
    <div
      className={cn(
        "transition-all duration-200",
        "bg-background/60 backdrop-blur-xl border-b border-border/40 shadow-sm",
      )}
    >
      <div className="container mx-auto max-w-6xl px-4 py-4">
        <div className="mb-6 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Search History
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            Find anything you've discussed with your AI assistant across all
            your conversations.
          </p>
        </div>
        {children}
      </div>

      {/* Gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5 pointer-events-none" />
    </div>
  );
}
