"use client";

import { Button } from "@/components/ui/button";
import type { PromptCategory } from "@/lib/prompts/examplePrompts";
import {
  CAPABILITY_PROMPTS,
  getPromptsForModel,
} from "@/lib/prompts/examplePrompts";
import { cn } from "@/lib/utils";
import { ArrowRight, Brain, Code2, Eye, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { MarkdownContent } from "./MarkdownContent";

interface EmptyScreenProps {
  onClick: (value: string) => void;
  selectedModel?: string;
}

export function EmptyScreen({ onClick, selectedModel }: EmptyScreenProps) {
  const result = getPromptsForModel(selectedModel);
  const [activeCategory, setActiveCategory] = useState<PromptCategory>(
    result.category,
  );

  // Update active category when model changes
  useEffect(() => {
    setActiveCategory(result.category);
  }, [result.category]);

  // Category config
  const categories: Array<{
    key: PromptCategory;
    label: string;
    icon: typeof Sparkles;
    prompts: readonly string[];
  }> = [
    // Show "Suggested" only if exact model match
    ...(result.source === "exact-model"
      ? [
          {
            key: "suggested" as const,
            label: "Suggested",
            icon: Sparkles,
            prompts: result.prompts,
          },
        ]
      : []),
    {
      key: "thinking" as const,
      label: "Thinking",
      icon: Brain,
      prompts: CAPABILITY_PROMPTS.thinking,
    },
    {
      key: "vision" as const,
      label: "Vision",
      icon: Eye,
      prompts: CAPABILITY_PROMPTS.vision,
    },
    {
      key: "fast" as const,
      label: "Fast",
      icon: Zap,
      prompts: CAPABILITY_PROMPTS.fast,
    },
    {
      key: "general" as const,
      label: "General",
      icon: Code2,
      prompts: CAPABILITY_PROMPTS.general,
    },
  ];

  const activePrompts =
    categories.find((c) => c.key === activeCategory)?.prompts || result.prompts;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center animate-message-enter">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
        How can I help you?
      </h1>

      {/* Category tabs - hide on mobile */}
      <div className="hidden sm:flex flex-wrap gap-2 justify-center mb-12 max-w-2xl">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.key}
              variant="outline"
              className={cn(
                "rounded-full gap-2 px-4 h-9 transition-all duration-300 border-white/10 hover:scale-105",
                activeCategory === category.key
                  ? "bg-primary/20 text-primary border-primary/20 hover:bg-primary/30"
                  : "bg-background/40 hover:bg-background/80 hover:border-white/20",
              )}
              onClick={() => setActiveCategory(category.key)}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{category.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Prompts - staggered animation */}
      <div className="grid gap-1.5 sm:gap-2 w-full max-w-full sm:max-w-md text-left mb-6 sm:mb-8 px-2 sm:px-0">
        {activePrompts.slice(0, 4).map((prompt, i) => (
          <div
            key={prompt}
            role="button"
            tabIndex={0}
            onClick={() => onClick(prompt)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(prompt);
              }
            }}
            className="group flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/5 text-xs sm:text-sm text-muted-foreground hover:text-foreground cursor-pointer"
            style={{
              animationDelay: `${i * 100}ms`,
            }}
          >
            <div className="line-clamp-2 text-left">
              <MarkdownContent content={prompt} />
            </div>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-50 transition-all duration-300 shrink-0 ml-1.5 sm:ml-3" />
          </div>
        ))}
      </div>

      {/* Footer Hints */}
      <div className="hidden sm:flex gap-6 text-xs text-muted-foreground/60 animate-in fade-in duration-700 delay-500">
        <div className="flex items-center gap-1.5">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>J
          </kbd>
          <span>to select model</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
          <span>for commands</span>
        </div>
      </div>
    </div>
  );
}
