"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import type { Id } from "@blah-chat/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackInputProps {
  outlineItemId: Id<"outlineItems">;
  initialFeedback?: string;
  placeholder?: string;
}

export function FeedbackInput({
  outlineItemId,
  initialFeedback = "",
  placeholder = "Suggest changes, additions, or improvements...",
}: FeedbackInputProps) {
  const [value, setValue] = useState(initialFeedback);

  // @ts-ignore - Type depth exceeded with 94+ Convex modules
  const updateFeedback = useMutation(api.outlineItems.updateFeedback);

  // Sync from props when they change (e.g., after regeneration)
  useEffect(() => {
    setValue(initialFeedback);
  }, [initialFeedback]);

  // Debounced save (500ms)
  const debouncedSave = useDebouncedCallback(
    useCallback(
      async (feedback: string) => {
        await updateFeedback({
          outlineItemId,
          feedback,
        });
      },
      [outlineItemId, updateFeedback],
    ),
    500,
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSave(newValue);
  };

  return (
    <Textarea
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className="min-h-[80px] text-sm resize-none"
    />
  );
}
