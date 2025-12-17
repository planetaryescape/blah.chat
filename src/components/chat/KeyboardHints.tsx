import { ShortcutBadge } from "@/components/ui/shortcut-badge";
import { HydrationSafeShortcutBadge } from "@/components/chat/HydrationSafeShortcutBadge";
import { useMobileDetect } from "@/hooks/useMobileDetect";

interface KeyboardHintsProps {
  isEmpty: boolean;
  hasContent: boolean;
}

export function KeyboardHints({ isEmpty, hasContent }: KeyboardHintsProps) {
  const { isMobile } = useMobileDetect();

  if (isMobile) return null;
  if (hasContent) {
    return (
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground/70">
        <span className="flex items-center gap-1.5">
          <ShortcutBadge keys={["Enter"]} /> send
        </span>
        <span className="flex items-center gap-1.5">
          <ShortcutBadge keys={["Shift", "Enter"]} /> new line
        </span>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground/70">
        <span className="flex items-center gap-1.5">
          <HydrationSafeShortcutBadge keys={["mod", "K"]} /> commands
        </span>
        <span className="flex items-center gap-1.5">
          <ShortcutBadge keys={["Alt", "N"]} /> new chat
        </span>
      </div>
    );
  }

  return (
    <span className="hidden sm:inline-flex text-xs text-muted-foreground/70">
      <ShortcutBadge keys={["Shift", "Enter"]} /> new line
    </span>
  );
}
