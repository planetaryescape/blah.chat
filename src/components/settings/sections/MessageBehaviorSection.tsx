"use client";

import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface MessageBehaviorSectionProps {
  alwaysShowMessageActions: boolean;
  onAlwaysShowActionsChange: (checked: boolean) => Promise<void>;
}

export function MessageBehaviorSection({
  alwaysShowMessageActions,
  onAlwaysShowActionsChange,
}: MessageBehaviorSectionProps) {
  return (
    <AccordionItem value="messages">
      <AccordionTrigger>Message Behavior</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="always-show-actions">
              Always show message actions
            </Label>
            <p className="text-sm text-muted-foreground">
              Show copy, regenerate, branch, and delete buttons on all messages
              instead of only on hover
            </p>
          </div>
          <Switch
            id="always-show-actions"
            checked={alwaysShowMessageActions}
            onCheckedChange={onAlwaysShowActionsChange}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
