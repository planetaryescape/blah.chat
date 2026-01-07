export const BYOD_SCHEMA_VERSION = 7;

export const SCHEMA_CHANGELOG: Record<number, string> = {
  1: "Initial BYOD schema - conversations, messages, memories, files, projects, notes, tasks, presentations",
};

export function getSchemaVersion(): number {
  return BYOD_SCHEMA_VERSION;
}
