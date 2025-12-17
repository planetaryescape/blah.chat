import { useModifierKey } from "@/hooks/useModifierKey";

interface HydrationSafeShortcutBadgeProps {
  keys: string[];
}

/**
 * Hydration-safe wrapper around ShortcutBadge that handles the "mod" key properly
 * to prevent SSR/client mismatches.
 */
export function HydrationSafeShortcutBadge({
  keys,
}: HydrationSafeShortcutBadgeProps) {
  const modifierKey = useModifierKey();

  const displayKeys = keys.map((key) => (key === "mod" ? modifierKey : key));

  return (
    <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
      {displayKeys.map((key, i) => (
        <span key={key}>
          {i > 0 && <span className="mx-0.5">+</span>}
          {key}
        </span>
      ))}
    </kbd>
  );
}
