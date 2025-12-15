"use client";

import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ChatWidth } from "@/lib/utils/chatWidth";

interface DisplayLayoutSectionProps {
  chatWidth: ChatWidth;
  onChatWidthChange: (width: ChatWidth) => Promise<void>;
}

const widthOptions: { value: ChatWidth; label: string; description: string }[] = [
  { value: "narrow", label: "Narrow", description: "~672px - Focused reading" },
  { value: "standard", label: "Standard", description: "~896px - Balanced (default)" },
  { value: "wide", label: "Wide", description: "~1152px - Spacious" },
  { value: "full", label: "Full", description: "~95% width - Maximum space" },
];

const widthSizes: Record<ChatWidth, string> = {
  narrow: "40px",
  standard: "60px",
  wide: "80px",
  full: "100px",
};

export function DisplayLayoutSection({
  chatWidth,
  onChatWidthChange,
}: DisplayLayoutSectionProps) {
  return (
    <AccordionItem value="display">
      <AccordionTrigger>Display & Layout</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-4">
        <div className="space-y-1">
          <Label>Chat Width</Label>
          <p className="text-sm text-muted-foreground">
            Choose your preferred chat message width
          </p>
        </div>

        <div className="space-y-2">
          {widthOptions.map(({ value, label, description }) => (
            <label
              key={value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                chatWidth === value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <input
                type="radio"
                name="chatWidth"
                value={value}
                checked={chatWidth === value}
                onChange={() => onChatWidthChange(value)}
                className="sr-only"
              />
              <div className="flex-1 space-y-1">
                <div className="font-medium capitalize">{label}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </div>
              <div
                className="h-8 rounded border border-border/50 bg-muted/30"
                style={{ width: widthSizes[value] }}
              />
            </label>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
