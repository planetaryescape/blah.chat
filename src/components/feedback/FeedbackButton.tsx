"use client";

import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { FeedbackModal } from "./FeedbackModal";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground gap-2"
        aria-label="Give feedback"
      >
        <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Give Feedback</span>
      </Button>
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  );
}
