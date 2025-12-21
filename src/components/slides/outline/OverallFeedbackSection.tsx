"use client";

import { MessageSquarePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface OverallFeedbackSectionProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function OverallFeedbackSection({
  value,
  onChange,
  disabled = false,
}: OverallFeedbackSectionProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
          Overall Presentation Feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="General feedback about the presentation structure, tone, or style that applies to the whole deck..."
          className="min-h-[100px] resize-none"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground mt-2">
          This feedback will be applied to the entire presentation, not specific
          slides.
        </p>
      </CardContent>
    </Card>
  );
}
