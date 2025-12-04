"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type ThinkingEffort = "low" | "medium" | "high";

interface ThinkingEffortSelectorProps {
  value: ThinkingEffort;
  onChange: (effort: ThinkingEffort) => void;
}

export function ThinkingEffortSelector({
  value,
  onChange,
}: ThinkingEffortSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Thinking Effort</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ThinkingEffort)}
        className="gap-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="low" id="low" />
          <Label htmlFor="low" className="font-normal cursor-pointer text-sm">
            Low - Faster responses
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="medium" id="medium" />
          <Label htmlFor="medium" className="font-normal cursor-pointer text-sm">
            Medium - Balanced
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="high" id="high" />
          <Label htmlFor="high" className="font-normal cursor-pointer text-sm">
            High - Deep reasoning
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
