const DEFAULT_MAX_AGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export function checkBackupRestoreDrill({
  drillAt,
  evidenceUrl,
  maxAgeDays = DEFAULT_MAX_AGE_DAYS,
  now = new Date(),
}: {
  drillAt?: string;
  evidenceUrl?: string;
  maxAgeDays?: number;
  now?: Date;
}): {
  ageDays: number;
  drillAt: Date;
  evidenceUrl: string;
  maxAgeDays: number;
} {
  if (!drillAt) {
    throw new Error("Missing BACKUP_RESTORE_DRILL_AT.");
  }

  const parsedDrillAt = new Date(drillAt);
  if (!Number.isFinite(parsedDrillAt.getTime())) {
    throw new Error("BACKUP_RESTORE_DRILL_AT must be a valid date.");
  }

  if (!Number.isFinite(maxAgeDays) || maxAgeDays <= 0) {
    throw new Error("BACKUP_RESTORE_DRILL_MAX_AGE_DAYS must be positive.");
  }

  if (parsedDrillAt.getTime() - now.getTime() > FUTURE_TOLERANCE_MS) {
    throw new Error("BACKUP_RESTORE_DRILL_AT cannot be in the future.");
  }

  const ageDays = Math.floor(
    (now.getTime() - parsedDrillAt.getTime()) / DAY_MS,
  );
  if (ageDays > maxAgeDays) {
    throw new Error(
      `Backup restore drill is stale: ${ageDays} days old; max is ${maxAgeDays}.`,
    );
  }

  if (!evidenceUrl) {
    throw new Error("Missing BACKUP_RESTORE_DRILL_URL.");
  }

  let parsedEvidenceUrl: URL;
  try {
    parsedEvidenceUrl = new URL(evidenceUrl);
  } catch {
    throw new Error("BACKUP_RESTORE_DRILL_URL must be a valid URL.");
  }

  if (!["http:", "https:"].includes(parsedEvidenceUrl.protocol)) {
    throw new Error("BACKUP_RESTORE_DRILL_URL must use http or https.");
  }

  return {
    ageDays,
    drillAt: parsedDrillAt,
    evidenceUrl,
    maxAgeDays,
  };
}

if (import.meta.main) {
  try {
    const result = checkBackupRestoreDrill({
      drillAt: process.env.BACKUP_RESTORE_DRILL_AT,
      evidenceUrl: process.env.BACKUP_RESTORE_DRILL_URL,
      maxAgeDays: process.env.BACKUP_RESTORE_DRILL_MAX_AGE_DAYS
        ? Number(process.env.BACKUP_RESTORE_DRILL_MAX_AGE_DAYS)
        : undefined,
    });

    console.log(
      `Backup restore drill OK: ${result.ageDays} days old (${result.drillAt.toISOString()})`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Backup restore drill check failed: ${message}`);
    process.exit(1);
  }
}
