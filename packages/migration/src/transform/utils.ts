/**
 * Truncate a Convex timestamp (float with decimal precision) to an integer
 * for PostgreSQL bigint columns.
 */
export function ts(value: number): number {
  return Math.floor(value);
}

/** Truncate an optional timestamp. */
export function tsOpt(value: number | undefined | null): number | null {
  if (value == null) return null;
  return Math.floor(value);
}

/** Truncate a numeric field (Convex exports integers as floats like 3.0). */
export function int(value: number): number {
  return Math.floor(value);
}

/** Truncate an optional numeric field. */
export function intOpt(value: number | undefined | null): number | null {
  if (value == null) return null;
  return Math.floor(value);
}
