"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  isSearching?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChange,
  isSearching = false,
  placeholder = "Search conversations...",
  autoFocus = false,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // `/` to focus (when not in an input)
      if (e.key === "/" && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // `Escape` to clear and blur
      if (e.key === "Escape" && inputRef.current === document.activeElement) {
        e.preventDefault();
        onChange("");
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onChange]);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative group">
      {/* Glow effect on focus */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-orange-500/30 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-center">
        <div className="relative flex-1">
          {/* Search icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            )}
          </div>

          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              "pl-12 pr-12 h-14 text-lg font-medium shadow-sm",
              "bg-background/80 backdrop-blur-sm border-border/50",
              "focus-visible:ring-0 focus-visible:border-primary/50",
              "rounded-xl transition-all duration-200",
              "placeholder:text-muted-foreground/50",
            )}
          />

          {/* Clear button */}
          {value && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted/50 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Keyboard hint */}
        <div className="absolute right-14 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
          <kbd className="inline-flex h-6 select-none items-center gap-1 rounded border bg-muted/50 px-2 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            /
          </kbd>
        </div>
      </div>
    </div>
  );
}
