import { describe, expect, it } from "bun:test";
import { checkBackupRestoreDrill } from "./check-backup-restore-drill";

const NOW = new Date("2026-05-31T12:00:00.000Z");

describe("checkBackupRestoreDrill", () => {
  it("accepts a recent restore drill with an evidence URL", () => {
    expect(
      checkBackupRestoreDrill({
        drillAt: "2026-05-20T09:00:00.000Z",
        evidenceUrl: "https://github.com/org/repo/issues/123",
        maxAgeDays: 30,
        now: NOW,
      }),
    ).toEqual({
      ageDays: 11,
      drillAt: new Date("2026-05-20T09:00:00.000Z"),
      evidenceUrl: "https://github.com/org/repo/issues/123",
      maxAgeDays: 30,
    });
  });

  it("rejects missing restore drill evidence", () => {
    expect(() =>
      checkBackupRestoreDrill({
        drillAt: "2026-05-20T09:00:00.000Z",
        evidenceUrl: "",
        now: NOW,
      }),
    ).toThrow(/BACKUP_RESTORE_DRILL_URL/);
  });

  it("rejects stale restore drills", () => {
    expect(() =>
      checkBackupRestoreDrill({
        drillAt: "2026-04-20T09:00:00.000Z",
        evidenceUrl: "https://github.com/org/repo/issues/123",
        maxAgeDays: 30,
        now: NOW,
      }),
    ).toThrow(/stale/);
  });

  it("rejects future restore drills", () => {
    expect(() =>
      checkBackupRestoreDrill({
        drillAt: "2026-06-01T09:00:00.000Z",
        evidenceUrl: "https://github.com/org/repo/issues/123",
        now: NOW,
      }),
    ).toThrow(/future/);
  });
});
