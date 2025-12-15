"use client";

import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ReasoningDisplaySectionProps {
  showByDefault: boolean;
  autoExpand: boolean;
  showDuringStreaming: boolean;
  onShowByDefaultChange: (checked: boolean) => Promise<void>;
  onAutoExpandChange: (checked: boolean) => Promise<void>;
  onShowDuringStreamingChange: (checked: boolean) => Promise<void>;
}

export function ReasoningDisplaySection({
  showByDefault,
  autoExpand,
  showDuringStreaming,
  onShowByDefaultChange,
  onAutoExpandChange,
  onShowDuringStreamingChange,
}: ReasoningDisplaySectionProps) {
  return (
    <AccordionItem value="reasoning">
      <AccordionTrigger>Reasoning Display</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          Control how AI thinking is displayed for reasoning models (o1/o3,
          DeepSeek R1)
        </p>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-reasoning">Show reasoning sections</Label>
            <p className="text-sm text-muted-foreground">
              Display the thinking process when using reasoning models
            </p>
          </div>
          <Switch
            id="show-reasoning"
            checked={showByDefault}
            onCheckedChange={onShowByDefaultChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-expand">Auto-expand reasoning</Label>
            <p className="text-sm text-muted-foreground">
              Automatically expand reasoning sections instead of keeping them
              collapsed by default
            </p>
          </div>
          <Switch
            id="auto-expand"
            checked={autoExpand}
            onCheckedChange={onAutoExpandChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-streaming">Show reasoning while generating</Label>
            <p className="text-sm text-muted-foreground">
              Display reasoning as it streams in real-time during AI response
              generation
            </p>
          </div>
          <Switch
            id="show-streaming"
            checked={showDuringStreaming}
            onCheckedChange={onShowDuringStreamingChange}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
