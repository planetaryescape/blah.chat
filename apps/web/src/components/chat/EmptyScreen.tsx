"use client";

import { ArrowRight, Brain, PenLine, Sparkles, Zap } from "lucide-react";
import { useMemo } from "react";
import { useStarterSuggestions } from "@/hooks/useStarterSuggestions";
import { MarkdownContent } from "./MarkdownContent";

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const TIME_GREETINGS: Record<"morning" | "afternoon" | "evening", string[]> = {
  morning: ["Good morning", "Morning", "Ready to start the day"],
  afternoon: ["Good afternoon", "How's the day going", "Afternoon"],
  evening: ["Good evening", "Evening work session", "How can I help tonight"],
};

const ICON_MAP = {
  sparkles: Sparkles,
  brain: Brain,
  zap: Zap,
  penLine: PenLine,
} as const;

interface EmptyScreenProps {
  onClick: (value: string) => void;
  selectedModel?: string;
  conversationCount?: number;
  nickname?: string;
}

export function EmptyScreen({
  onClick,
  selectedModel: _selectedModel,
  conversationCount,
  nickname,
}: EmptyScreenProps) {
  const { suggestions } = useStarterSuggestions();

  const greeting = useMemo(() => {
    const timeOfDay = getTimeOfDay();
    const greetings = TIME_GREETINGS[timeOfDay];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }, []);

  const isReturningUser = (conversationCount ?? 0) >= 2;
  const title = isReturningUser
    ? nickname
      ? `${greeting}, ${nickname}`
      : greeting
    : "How can I help you?";

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center animate-message-enter w-full">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
        {title}
      </h1>

      <div className="grid gap-1.5 sm:gap-2 w-full max-w-full sm:max-w-md text-left mb-6 sm:mb-8 px-2 sm:px-0">
        {suggestions.slice(0, 5).map((suggestion, i) => {
          const Icon = ICON_MAP[suggestion.icon];

          return (
            <div
              key={suggestion.id}
              role="button"
              tabIndex={0}
              onClick={() => onClick(suggestion.text)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick(suggestion.text);
                }
              }}
              className="group flex h-16 items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/5 text-xs sm:text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              style={{
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 opacity-70" />
                <div className="line-clamp-2 text-left">
                  <MarkdownContent content={suggestion.text} />
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-50 transition-all duration-300 shrink-0 ml-1.5 sm:ml-3" />
            </div>
          );
        })}
      </div>

      <div className="hidden sm:flex gap-6 text-xs text-muted-foreground/60 animate-in fade-in duration-700 delay-500">
        <div className="flex items-center gap-1.5">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>J
          </kbd>
          <span>models</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
          <span>commands</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>
            {";"}
          </kbd>
          <span>templates</span>
        </div>
      </div>
    </div>
  );
}
