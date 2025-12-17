"use client";

import { cn } from "@/lib/utils";

interface SearchHeaderProps {
  children: React.ReactNode;
}

export function SearchHeader({ children }: SearchHeaderProps) {
  return (
    <div
      className={cn(
        "bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm",
      )}
    >
      <div className="container mx-auto max-w-6xl px-4 py-4">
        <div className="mb-6 space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Search</h1>
          <p className="text-sm text-muted-foreground">
            Find anything across all your conversations
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
