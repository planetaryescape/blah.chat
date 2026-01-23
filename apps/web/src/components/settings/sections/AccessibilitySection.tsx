"use client";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { TextScale } from "@/hooks/useUISettingsState";
import { cn } from "@/lib/utils";

interface AccessibilitySectionProps {
  highContrastMode: boolean;
  textScale: TextScale;
  onHighContrastChange: (checked: boolean) => Promise<void>;
  onTextScaleChange: (scale: TextScale) => Promise<void>;
}

const textScaleOptions: { value: TextScale; label: string }[] = [
  { value: 75, label: "75%" },
  { value: 100, label: "100%" },
  { value: 125, label: "125%" },
  { value: 150, label: "150%" },
  { value: 175, label: "175%" },
  { value: 200, label: "200%" },
];

export function AccessibilitySection({
  highContrastMode,
  textScale,
  onHighContrastChange,
  onTextScaleChange,
}: AccessibilitySectionProps) {
  return (
    <AccordionItem value="accessibility">
      <AccordionTrigger>Accessibility</AccordionTrigger>
      <AccordionContent className="space-y-6 pt-4">
        {/* High Contrast Mode */}
        <div
          id="setting-highContrastMode"
          className="flex items-center justify-between rounded-lg"
        >
          <div className="space-y-0.5">
            <Label htmlFor="high-contrast-toggle">High Contrast Mode</Label>
            <p className="text-sm text-muted-foreground">
              Increases contrast and removes decorative backgrounds
            </p>
          </div>
          <Switch
            id="high-contrast-toggle"
            checked={highContrastMode}
            onCheckedChange={onHighContrastChange}
          />
        </div>

        {/* Text Scaling */}
        <div id="setting-textScale" className="space-y-3">
          <div className="space-y-0.5">
            <Label>Text Scale</Label>
            <p className="text-sm text-muted-foreground">
              Adjust base font size for better readability
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {textScaleOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onTextScaleChange(value)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg border transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  textScale === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Info about OS preferences */}
        <p className="text-xs text-muted-foreground">
          Reduced motion and forced-colors are automatically detected from your
          operating system settings.
        </p>
      </AccordionContent>
    </AccordionItem>
  );
}
