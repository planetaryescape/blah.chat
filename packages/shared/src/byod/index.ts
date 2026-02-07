/**
 * BYOD (Bring Your Own Database) shared configuration
 */

export {
  BYOD_EXCLUDED_FIELDS,
  type BYODExcludedField,
  isBYODExcludedField,
} from "./excluded-fields";
export { BYOD_TABLES, type BYODTable, isBYODTable } from "./tables";
export {
  BYOD_SCHEMA_VERSION,
  getSchemaVersion,
  SCHEMA_CHANGELOG,
} from "./version";
