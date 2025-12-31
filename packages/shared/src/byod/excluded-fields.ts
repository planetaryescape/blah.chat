/**
 * BYOD Excluded Fields
 *
 * Fields excluded from BYOD schema.
 * These are internal/admin fields that shouldn't be on user deployments.
 *
 * Format: "tableName.fieldName"
 *
 * Most fields are shared by default - only list fields to EXCLUDE.
 */
export const BYOD_EXCLUDED_FIELDS = [
  // Internal processing/admin fields (if any)
  // Currently none - all BYOD table fields are user-facing

  // Example exclusions (uncomment if needed):
  // "messages.internalProcessingId",
  // "conversations.adminNotes",
] as const;

export type BYODExcludedField = (typeof BYOD_EXCLUDED_FIELDS)[number];

/**
 * Check if a field should be excluded from BYOD schema
 */
export function isBYODExcludedField(
  table: string,
  field: string
): boolean {
  const key = `${table}.${field}` as BYODExcludedField;
  return BYOD_EXCLUDED_FIELDS.includes(key);
}
