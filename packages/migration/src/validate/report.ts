import type { ParityReport } from "./parity";
import type { TreeIntegrityResult } from "./tree-integrity";

export function formatParityReport(report: ParityReport): string {
  const lines: string[] = [
    "=== Parity Report ===",
    "",
    `Passed: ${report.passed} | Failed: ${report.failed}`,
    "",
  ];

  for (const r of report.results) {
    const status = r.match ? "OK" : "MISMATCH";
    lines.push(
      `  [${status}] ${r.table}: Convex=${r.convexCount} PG=${r.pgCount}`,
    );
  }

  return lines.join("\n");
}

export function formatTreeReport(result: TreeIntegrityResult): string {
  const lines: string[] = [
    "=== Tree Integrity ===",
    "",
    `Status: ${result.passed ? "PASSED" : "FAILED"}`,
    `Orphan edges: ${result.orphanEdges}`,
    `Invalid active leaf: ${result.invalidActiveLeaf}`,
  ];

  if (result.details.length > 0) {
    lines.push("", "Details:");
    for (const d of result.details) {
      lines.push(`  - ${d}`);
    }
  }

  return lines.join("\n");
}
