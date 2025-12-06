import { getModifierKey } from "@/lib/utils/platform";

interface ShortcutBadgeProps {
	keys: string[];
}

export function ShortcutBadge({ keys }: ShortcutBadgeProps) {
	const displayKeys = keys.map((key) =>
		key === "mod" ? getModifierKey() : key,
	);

	return (
		<kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
			{displayKeys.map((key, i) => (
				<span key={i}>
					{i > 0 && <span className="mx-0.5">+</span>}
					{key}
				</span>
			))}
		</kbd>
	);
}
