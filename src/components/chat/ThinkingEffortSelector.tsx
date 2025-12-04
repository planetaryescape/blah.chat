"use client";

import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ThinkingEffort = "low" | "medium" | "high";

interface ThinkingEffortSelectorProps {
  value: ThinkingEffort;
  onChange: (effort: ThinkingEffort) => void;
}

const efforts = [
  { value: "low", label: "Low", shortcut: "1" },
  { value: "medium", label: "Medium", shortcut: "2" },
  { value: "high", label: "High", shortcut: "3" },
] as const;

export function ThinkingEffortSelector({
  value,
  onChange,
}: ThinkingEffortSelectorProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey) {
        const effort = efforts.find((ef) => ef.shortcut === e.key);
        if (effort) {
          e.preventDefault();
          onChange(effort.value as ThinkingEffort);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Thinking Effort</Label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as ThinkingEffort)}
        className="justify-start"
      >
        {efforts.map((effort) => (
          <ToggleGroupItem
            key={effort.value}
            value={effort.value}
            aria-label={`${effort.label} thinking effort`}
            className="min-w-20"
          >
            {effort.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
