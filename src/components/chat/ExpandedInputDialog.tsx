"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ExpandedInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export function ExpandedInputDialog({
  open,
  onOpenChange,
  value,
  onChange,
  onSubmit,
  placeholder,
}: ExpandedInputDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      // Focus and move cursor to end
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(value.length, value.length);
    }
  }, [open, value.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
    // Escape to close
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-medium text-muted-foreground">
              Edit message
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 p-4 overflow-hidden">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-full w-full resize-none border-0 bg-transparent focus-visible:ring-0 text-base"
          />
        </div>

        <div className="px-4 py-3 border-t shrink-0 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {value.length} characters
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              ⌘ + Enter to send
            </span>
            <Button onClick={onSubmit} disabled={!value.trim()} size="sm">
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
