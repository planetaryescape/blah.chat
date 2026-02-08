"use node";

import { createHash } from "node:crypto";

export const MAX_TOOL_NAME_LENGTH = 64;
const DEFAULT_TOOL_NAME = "tool";

type RenameReason = "invalid_chars" | "too_long" | "collision" | "empty";

export interface ToolRename {
  from: string;
  to: string;
  reason: RenameReason;
}

interface NormalizeToolNameResult {
  name: string;
  reason: RenameReason | null;
}

function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

function sanitizeName(name: string): string {
  return name
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function withSuffix(baseName: string, suffix: string): string {
  const maxBaseLength = Math.max(0, MAX_TOOL_NAME_LENGTH - suffix.length - 1);
  const base = baseName.slice(0, maxBaseLength).replace(/_+$/g, "");
  return `${base}_${suffix}`;
}

function normalizeToolNameWithReason(name: string): NormalizeToolNameResult {
  const sanitized = sanitizeName(name);
  if (!sanitized) {
    return { name: DEFAULT_TOOL_NAME, reason: "empty" };
  }

  if (sanitized.length > MAX_TOOL_NAME_LENGTH) {
    const hash8 = sha1(name).slice(0, 8);
    return {
      name: withSuffix(sanitized, hash8),
      reason: "too_long",
    };
  }

  if (sanitized !== name) {
    return { name: sanitized, reason: "invalid_chars" };
  }

  return { name: sanitized, reason: null };
}

function ensureUniqueName(
  baseName: string,
  originalName: string,
  usedNames: Set<string>,
): string {
  if (!usedNames.has(baseName)) {
    return baseName;
  }

  const hashPrefix = sha1(originalName).slice(0, 6);
  for (let attempt = 0; ; attempt += 1) {
    const suffix = `${hashPrefix}${attempt.toString(36)}`;
    const candidate = withSuffix(baseName, suffix);
    if (!usedNames.has(candidate)) {
      return candidate;
    }
  }
}

export function normalizeToolName(name: string): string {
  return normalizeToolNameWithReason(name).name;
}

export function normalizeToolRecordKeys<T>(tools: Record<string, T>): {
  normalizedTools: Record<string, T>;
  renames: ToolRename[];
} {
  const normalizedTools: Record<string, T> = {};
  const renames: ToolRename[] = [];
  const usedNames = new Set<string>();

  for (const [originalName, tool] of Object.entries(tools)) {
    const { name: normalizedBase, reason: normalizationReason } =
      normalizeToolNameWithReason(originalName);
    const uniqueName = ensureUniqueName(
      normalizedBase,
      originalName,
      usedNames,
    );
    usedNames.add(uniqueName);
    normalizedTools[uniqueName] = tool;

    if (uniqueName !== originalName) {
      renames.push({
        from: originalName,
        to: uniqueName,
        reason:
          uniqueName !== normalizedBase
            ? "collision"
            : (normalizationReason ?? "invalid_chars"),
      });
    }
  }

  return { normalizedTools, renames };
}
