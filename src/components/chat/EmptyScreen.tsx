"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Code2, Compass, Lightbulb, Terminal } from "lucide-react";
import { useState } from "react";

export function EmptyScreen({ onClick }: { onClick: (value: string) => void }) {
  const [activeCategory, setActiveCategory] = useState<string>("Explore");

  const quickActions = [
    {
      icon: Compass,
      label: "Explore",
    },
    {
      icon: Terminal,
      label: "Code",
    },
    {
      icon: Lightbulb,
      label: "Learn",
    },
    {
      icon: Code2,
      label: "Refactor",
    },
  ];

  const questionsByCategory: Record<string, string[]> = {
    Explore: [
      "Tell me about the history of space exploration",
      "What are the most interesting recent scientific discoveries?",
      "Who are the key figures in the development of the internet?",
      "Describe the cultural impact of the Renaissance.",
    ],
    Code: [
      "Write a Python script to scrape a website",
      "Create a React component for a customizable button",
      "Explain the difference between REST and GraphQL",
      "Debug a memory leak in a Node.js application",
    ],
    Learn: [
      "Explain quantum computing to a 5-year-old",
      "How does the human immune system work?",
      "What is the theory of relativity?",
      "Teach me the basics of game theory.",
    ],
    Refactor: [
      "How can I improve this React component?",
      "Optimize this SQL query for better performance",
      "Refactor this function to be more functional",
      "Suggest better variable names for this code block.",
    ],
  };

  const activeQuestions =
    questionsByCategory[activeCategory] || questionsByCategory["Explore"];

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center animate-message-enter">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
        How can I help you?
      </h1>

      {/* Quick Actions / Pillars */}
      <div className="flex flex-wrap gap-2 justify-center mb-12 max-w-2xl">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className={cn(
              "rounded-full gap-2 px-4 h-9 transition-all duration-300 border-white/10 hover:scale-105",
              activeCategory === action.label
                ? "bg-primary/20 text-primary border-primary/20 hover:bg-primary/30"
                : "bg-background/40 hover:bg-background/80 hover:border-white/20",
            )}
            onClick={() => setActiveCategory(action.label)}
          >
            <action.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Suggestion List */}
      <div className="grid gap-2 w-full max-w-md text-left">
        {activeQuestions.map((question, i) => (
          <button
            key={question}
            onClick={() => onClick(question)}
            className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/5 text-sm text-muted-foreground hover:text-foreground"
            style={{
              animationDelay: `${i * 100}ms`,
            }}
          >
            <span>{question}</span>
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-50 transition-all duration-300" />
          </button>
        ))}
      </div>
    </div>
  );
}
