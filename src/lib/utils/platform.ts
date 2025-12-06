export type Platform = "mac" | "windows" | "other";

export function getPlatform(): Platform {
	if (typeof window === "undefined") return "other";

	const ua = window.navigator.userAgent;
	if (ua.includes("Mac")) return "mac";
	if (ua.includes("Win")) return "windows";
	return "other";
}

export function getModifierKey(): string {
	return getPlatform() === "mac" ? "⌘" : "Ctrl";
}
