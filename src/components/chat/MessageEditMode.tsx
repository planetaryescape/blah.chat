"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";

interface MessageEditModeProps {
  editedContent: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Edit mode UI for user messages.
 * Displays a textarea with the message content and save/cancel buttons.
 */
export function MessageEditMode({
  editedContent,
  onContentChange,
  onSave,
  onCancel,
}: MessageEditModeProps) {
  return (
    <div className="space-y-3">
      <Textarea
        value={editedContent}
        onChange={(e) => onContentChange(e.target.value)}
        className="min-h-[100px] resize-none font-normal"
        autoFocus
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onSave}
          className="h-8"
          disabled={!editedContent.trim()}
        >
          <Check className="w-3.5 h-3.5 mr-1.5" />
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="h-8"
        >
          <X className="w-3.5 h-3.5 mr-1.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
