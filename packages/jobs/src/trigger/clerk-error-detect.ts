function asObject(value: unknown): Record<string, unknown> | null {
  if (value === null) return null;
  if (typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function statusEquals(obj: Record<string, unknown>, target: number): boolean {
  return obj.status === target;
}

function errorsContainCode(
  obj: Record<string, unknown>,
  code: string,
): boolean {
  const errors = obj.errors;
  if (!Array.isArray(errors)) return false;
  for (const item of errors) {
    const inner = asObject(item);
    if (!inner) continue;
    if (inner.code === code) return true;
  }
  return false;
}

export function isClerkNotFound(err: unknown): boolean {
  const obj = asObject(err);
  if (!obj) return false;
  if (statusEquals(obj, 404)) return true;
  return errorsContainCode(obj, "resource_not_found");
}
