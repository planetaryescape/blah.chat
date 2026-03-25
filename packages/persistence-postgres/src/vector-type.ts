import { customType } from "drizzle-orm/pg-core";

export function serializeVector(value: number[]): string {
  return `[${value.map((n) => (Number.isFinite(n) ? n : 0)).join(",")}]`;
}

export function deserializeVector(
  raw: string | number[] | null | undefined,
): number[] {
  if (Array.isArray(raw)) {
    return raw.filter((n): n is number => typeof n === "number");
  }
  if (typeof raw !== "string" || raw.length === 0) {
    return [];
  }
  const stripped = raw.replace(/\[|\]/g, "").trim();
  if (stripped.length === 0) {
    return [];
  }
  return stripped
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

export function vectorType(dimensions?: number) {
  const sqlType = dimensions ? `vector(${dimensions})` : "vector";
  return customType<{ data: number[]; driverData: string }>({
    dataType() {
      return sqlType;
    },
    toDriver(value: number[]): string {
      return serializeVector(value);
    },
    fromDriver(value: string): number[] {
      return deserializeVector(value);
    },
  });
}
