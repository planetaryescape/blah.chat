"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";

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
    <div className="relative group max-w-xl mx-auto">
      <div className="relative flex items-center">
        <div className="relative flex-1">
          {/* Search icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-muted-foreground/60 group-focus-within:text-foreground transition-colors duration-200" />
            )}
          </div>

          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              "pl-9 pr-9 h-10 text-sm font-medium shadow-sm",
              "bg-background/50 border-transparent",
              "hover:bg-background/80 hover:border-border/40",
              "focus:bg-background focus:border-primary/20",
              "focus:ring-2 focus:ring-primary/10",
              "rounded-lg transition-all duration-200",
              "placeholder:text-muted-foreground/50",
            )}
          />

          {/* Clear button */}
          {value && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent text-muted-foreground/40 hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Keyboard hint */}
        <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
          <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            /
          </kbd>
        </div>
      </div>
    </div>
  );
}
