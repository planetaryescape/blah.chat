"use client";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ComparisonSettingsSectionProps {
  showModelNamesDuringComparison: boolean;
  onShowModelNamesChange: (checked: boolean) => Promise<void>;
}

export function ComparisonSettingsSection({
  showModelNamesDuringComparison,
  onShowModelNamesChange,
}: ComparisonSettingsSectionProps) {
  return (
    <AccordionItem value="comparison">
      <AccordionTrigger>Comparison Settings</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-model-names">
              Show model names during comparison
            </Label>
            <p className="text-sm text-muted-foreground">
              Display model identities immediately (enabled) or hide until after
              voting (disabled) for unbiased comparison
            </p>
          </div>
          <Switch
            id="show-model-names"
            checked={showModelNamesDuringComparison}
            onCheckedChange={onShowModelNamesChange}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
