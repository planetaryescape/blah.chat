"use client";

import { Keyboard } from "lucide-react";
import { HydrationSafeShortcutBadge } from "@/components/chat/HydrationSafeShortcutBadge";
import { Button } from "@/components/ui/button";
import { ShortcutBadge } from "@/components/ui/shortcut-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMobileDetect } from "@/hooks/useMobileDetect";

interface KeyboardHintsProps {
  isEmpty: boolean;
  hasContent: boolean;
}

export function KeyboardHints({ isEmpty, hasContent }: KeyboardHintsProps) {
  const { isMobile } = useMobileDetect();

  if (isMobile) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground/60 hover:text-muted-foreground hover:bg-transparent"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" align="end" className="p-3 space-y-2">
        <p className="text-xs font-medium text-foreground mb-2">Shortcuts</p>
        {hasContent ? (
          <>
            <ShortcutRow keys={["Enter"]} label="Send message" />
            <ShortcutRow keys={["Shift", "Enter"]} label="New line" />
          </>
        ) : isEmpty ? (
          <>
            <ShortcutRowWithMod keys={["mod", "K"]} label="Commands" />
            <ShortcutRow keys={["Alt", "N"]} label="New chat" />
          </>
        ) : (
          <ShortcutRow keys={["Shift", "Enter"]} label="New line" />
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <ShortcutBadge keys={keys} />
    </div>
  );
}

function ShortcutRowWithMod({
  keys,
  label,
}: {
  keys: string[];
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <HydrationSafeShortcutBadge keys={keys} />
    </div>
  );
}
