export const CHAT_WIDTH_CLASSES = {
  narrow: "max-w-2xl",
  standard: "max-w-4xl",
  wide: "max-w-6xl",
  full: "max-w-[95%]",
} as const;

export type ChatWidth = keyof typeof CHAT_WIDTH_CLASSES;

export function getChatWidthClass(
  width: ChatWidth | undefined,
  isComparison = false,
): string {
  if (isComparison) return CHAT_WIDTH_CLASSES.full;
  return CHAT_WIDTH_CLASSES[width || "standard"];
}
