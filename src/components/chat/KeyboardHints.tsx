import { ShortcutBadge } from "@/components/ui/shortcut-badge";

interface KeyboardHintsProps {
	isEmpty: boolean;
	hasContent: boolean;
}

export function KeyboardHints({ isEmpty, hasContent }: KeyboardHintsProps) {
	if (hasContent) {
		return (
			<div className="flex items-center gap-4 text-xs text-muted-foreground/70">
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
			<div className="flex items-center gap-4 text-xs text-muted-foreground/70">
				<span className="flex items-center gap-1.5">
					<ShortcutBadge keys={["mod", "K"]} /> commands
				</span>
				<span className="flex items-center gap-1.5">
					<ShortcutBadge keys={["mod", "N"]} /> new chat
				</span>
			</div>
		);
	}

	return (
		<span className="text-xs text-muted-foreground/70">
			<ShortcutBadge keys={["Shift", "Enter"]} /> new line
		</span>
	);
}
