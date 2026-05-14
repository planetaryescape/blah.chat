export type MaintenanceStepResult<T> =
  | { ok: true; value: T }
  | { error: string; ok: false };

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "unknown error";
  }
}

export async function runMaintenanceStep<T>(
  fn: () => Promise<T>,
): Promise<MaintenanceStepResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
