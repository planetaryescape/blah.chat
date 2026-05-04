"use client";

import { Brain, PenLine, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { useStarterSuggestions } from "@/hooks/useStarterSuggestions";

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
  const { visibleSuggestions } = useStarterSuggestions();

  const [greeting] = useState(() => {
    const timeOfDay = getTimeOfDay();
    const greetings = TIME_GREETINGS[timeOfDay];
    return greetings[Math.floor(Math.random() * greetings.length)];
  });

  const isReturningUser = (conversationCount ?? 0) >= 2;
  const title = isReturningUser
    ? nickname
      ? `${greeting}, ${nickname}`
      : greeting
    : "How can I help you?";

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center animate-message-enter w-full">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-10 bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
        {title}
      </h1>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl mb-8 sm:mb-10 px-2 sm:px-0">
        {visibleSuggestions.map((suggestion, i) => {
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
              className="group flex-1 flex flex-col gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              style={{
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.06] group-hover:bg-white/[0.1] transition-colors">
                <Icon className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-left line-clamp-2 leading-snug">
                {suggestion.text}
              </span>
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
