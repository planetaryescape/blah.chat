export type ChatComposerSurfaceId = "web" | "mobile" | "cli";

export type ChatComposerCommandId = "model" | "think" | "template" | "compare";

export interface ChatComposerCommandDefinition {
  id: ChatComposerCommandId;
  label: string;
  aliases: string[];
  surfaces: ChatComposerSurfaceId[];
}

export interface ChatComposerSlashMatch {
  query: string;
  rangeStart: number;
  rangeEnd: number;
}

export const CHAT_COMPOSER_COMMANDS: readonly ChatComposerCommandDefinition[] =
  [
    {
      id: "model",
      label: "Choose model",
      aliases: ["model"],
      surfaces: ["web", "mobile", "cli"],
    },
    {
      id: "think",
      label: "Reasoning effort",
      aliases: ["think", "reason", "reasoning"],
      surfaces: ["web", "mobile"],
    },
    {
      id: "template",
      label: "Insert template",
      aliases: ["template", "tmpl"],
      surfaces: ["web", "mobile"],
    },
    {
      id: "compare",
      label: "Compare models",
      aliases: ["compare", "cmp"],
      surfaces: ["web", "mobile"],
    },
  ] as const;

export function getChatComposerCommandsForSurface(
  surface: ChatComposerSurfaceId,
): ChatComposerCommandDefinition[] {
  return CHAT_COMPOSER_COMMANDS.filter((command) =>
    command.surfaces.includes(surface),
  );
}

export function findChatComposerCommand(
  query: string,
  surface: ChatComposerSurfaceId,
): ChatComposerCommandDefinition | null {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return null;

  return (
    getChatComposerCommandsForSurface(surface).find((command) =>
      command.aliases.some((alias) => alias.startsWith(normalized)),
    ) ?? null
  );
}

function clampCursor(text: string, cursor: number) {
  if (!Number.isFinite(cursor)) return text.length;
  return Math.max(0, Math.min(text.length, Math.floor(cursor)));
}

export function getLineStartSlashMatch(
  text: string,
  cursorInput: number,
): ChatComposerSlashMatch | null {
  const cursor = clampCursor(text, cursorInput);
  const lineStart = text.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1;
  const linePrefix = text.slice(lineStart, cursor);
  const match = /^\/(\S*)$/.exec(linePrefix);

  if (!match) return null;

  return {
    query: (match[1] ?? "").toLowerCase(),
    rangeStart: lineStart,
    rangeEnd: cursor,
  };
}

export function replaceTextRange(
  text: string,
  rangeStart: number,
  rangeEnd: number,
  replacement: string,
) {
  const safeStart = Math.max(0, Math.min(text.length, rangeStart));
  const safeEnd = Math.max(safeStart, Math.min(text.length, rangeEnd));
  return {
    text: `${text.slice(0, safeStart)}${replacement}${text.slice(safeEnd)}`,
    cursor: safeStart + replacement.length,
  };
}
