import { applyPatch, createPatch, diffLines } from "diff";

/**
 * Structured diff operation for LLM consumption
 */
export interface DiffOperation {
  type: "replace" | "insert" | "delete";
  startLine?: number; // 1-indexed
  endLine?: number; // 1-indexed, inclusive
  afterLine?: number; // For insert: line after which to insert
  content?: string; // New content (for replace/insert)
  newContent?: string; // Alias for content (backwards compat)
}

export interface DiffResult {
  operations: DiffOperation[];
  summary: string;
  linesAdded: number;
  linesRemoved: number;
}

/**
 * Structured conflict info for LLM feedback
 */
export interface DiffConflict {
  operation: DiffOperation;
  reason: string;
  lineCount: number;
  suggestion: "retry" | "manual" | "skip";
  context?: {
    expectedContent?: string;
    actualContent?: string;
    lineNumber?: number;
  };
}

export interface ApplyDiffResult {
  success: boolean;
  result: string;
  applied: number;
  skipped: number;
  failed: string[];
  conflicts: DiffConflict[];
}

/**
 * Compute diff operations between two texts
 * Used by Diff Grabber to extract user edits
 */
export function computeDiff(oldText: string, newText: string): DiffResult {
  const changes = diffLines(oldText, newText);

  const operations: DiffOperation[] = [];
  let lineNumber = 1;
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const change of changes) {
    const lineCount = change.count ?? 0;

    if (change.added) {
      linesAdded += lineCount;
      operations.push({
        type: "insert",
        afterLine: lineNumber - 1,
        content: change.value,
      });
    } else if (change.removed) {
      linesRemoved += lineCount;
      operations.push({
        type: "delete",
        startLine: lineNumber,
        endLine: lineNumber + lineCount - 1,
      });
      lineNumber += lineCount;
    } else {
      lineNumber += lineCount;
    }
  }

  const mergedOps = mergeOperations(operations);

  return {
    operations: mergedOps,
    summary: `${linesAdded} lines added, ${linesRemoved} lines removed`,
    linesAdded,
    linesRemoved,
  };
}

/**
 * Merge adjacent delete + insert into replace operations
 */
function mergeOperations(operations: DiffOperation[]): DiffOperation[] {
  const merged: DiffOperation[] = [];

  for (let i = 0; i < operations.length; i++) {
    const current = operations[i];
    const next = operations[i + 1];

    if (
      current.type === "delete" &&
      next?.type === "insert" &&
      next.afterLine === (current.startLine ?? 0) - 1
    ) {
      merged.push({
        type: "replace",
        startLine: current.startLine,
        endLine: current.endLine,
        content: next.content,
      });
      i++;
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Apply diff operations to text
 * Used by Diff Applier to apply LLM changes
 */
export function applyDiffOperations(
  text: string,
  operations: DiffOperation[],
): {
  result: string;
  applied: number;
  failed: string[];
  conflicts: DiffConflict[];
} {
  const lines = text.split("\n");
  const failed: string[] = [];
  const conflicts: DiffConflict[] = [];
  let applied = 0;

  // Sort operations by line number descending (apply from bottom to top)
  const sortedOps = [...operations].sort((a, b) => {
    const lineA = a.startLine ?? a.afterLine ?? 0;
    const lineB = b.startLine ?? b.afterLine ?? 0;
    return lineB - lineA;
  });

  for (const op of sortedOps) {
    try {
      switch (op.type) {
        case "delete": {
          const start = (op.startLine ?? 1) - 1;
          const end = (op.endLine ?? op.startLine ?? 1) - 1;
          const count = end - start + 1;

          if (start >= 0 && end < lines.length) {
            lines.splice(start, count);
            applied++;
          } else {
            failed.push(
              `Delete: lines ${op.startLine}-${op.endLine} out of bounds`,
            );
            conflicts.push({
              operation: op,
              reason: `Lines ${op.startLine}-${op.endLine} out of bounds (doc has ${lines.length} lines)`,
              lineCount: lines.length,
              suggestion: "retry",
              context: {
                lineNumber: op.startLine,
                actualContent: lines
                  .slice(
                    Math.max(0, start - 2),
                    Math.min(lines.length, end + 3),
                  )
                  .join("\n"),
              },
            });
          }
          break;
        }

        case "insert": {
          const afterLine = op.afterLine ?? 0;
          const content = op.content ?? op.newContent ?? "";
          const newLines = content.split("\n");

          if (newLines[newLines.length - 1] === "") {
            newLines.pop();
          }

          if (afterLine >= 0 && afterLine <= lines.length) {
            lines.splice(afterLine, 0, ...newLines);
            applied++;
          } else {
            failed.push(`Insert: afterLine ${afterLine} out of bounds`);
            conflicts.push({
              operation: op,
              reason: `afterLine ${afterLine} exceeds doc length ${lines.length}`,
              lineCount: lines.length,
              suggestion: "retry",
              context: {
                lineNumber: afterLine,
                actualContent: lines
                  .slice(
                    Math.max(0, afterLine - 2),
                    Math.min(lines.length, afterLine + 3),
                  )
                  .join("\n"),
              },
            });
          }
          break;
        }

        case "replace": {
          const start = (op.startLine ?? 1) - 1;
          const end = (op.endLine ?? op.startLine ?? 1) - 1;
          const count = end - start + 1;
          const content = op.content ?? op.newContent ?? "";
          const newLines = content.split("\n");

          if (newLines[newLines.length - 1] === "") {
            newLines.pop();
          }

          if (start >= 0 && end < lines.length) {
            lines.splice(start, count, ...newLines);
            applied++;
          } else {
            failed.push(
              `Replace: lines ${op.startLine}-${op.endLine} out of bounds`,
            );
            conflicts.push({
              operation: op,
              reason: `Lines ${op.startLine}-${op.endLine} out of bounds (doc has ${lines.length} lines)`,
              lineCount: lines.length,
              suggestion: "retry",
              context: {
                lineNumber: op.startLine,
                expectedContent: op.content ?? op.newContent,
                actualContent: lines
                  .slice(
                    Math.max(0, start - 2),
                    Math.min(lines.length, end + 3),
                  )
                  .join("\n"),
              },
            });
          }
          break;
        }
      }
    } catch (error) {
      failed.push(`${op.type}: ${error}`);
    }
  }

  return {
    result: lines.join("\n"),
    applied,
    failed,
    conflicts,
  };
}

/**
 * Create a unified diff string for display/storage
 */
export function createUnifiedDiff(
  oldText: string,
  newText: string,
  fileName = "document",
): string {
  return createPatch(fileName, oldText, newText);
}

/**
 * Apply a unified diff patch
 */
export function applyUnifiedDiff(
  text: string,
  patch: string,
): { result: string | false; success: boolean } {
  const result = applyPatch(text, patch);
  return {
    result,
    success: result !== false,
  };
}

/**
 * Validate diff operations before applying
 */
export function validateDiffOperations(
  text: string,
  operations: DiffOperation[],
): { valid: boolean; errors: string[] } {
  const lines = text.split("\n");
  const lineCount = lines.length;
  const errors: string[] = [];

  for (const op of operations) {
    switch (op.type) {
      case "delete":
      case "replace":
        if (!op.startLine || op.startLine < 1) {
          errors.push(`${op.type}: startLine must be >= 1`);
        }
        if (op.startLine && op.startLine > lineCount) {
          errors.push(
            `${op.type}: startLine ${op.startLine} exceeds document length ${lineCount}`,
          );
        }
        if (op.endLine && op.endLine > lineCount) {
          errors.push(
            `${op.type}: endLine ${op.endLine} exceeds document length ${lineCount}`,
          );
        }
        if (op.startLine && op.endLine && op.startLine > op.endLine) {
          errors.push(
            `${op.type}: startLine ${op.startLine} > endLine ${op.endLine}`,
          );
        }
        break;

      case "insert":
        if (op.afterLine === undefined || op.afterLine < 0) {
          errors.push("insert: afterLine must be >= 0");
        }
        if (op.afterLine && op.afterLine > lineCount) {
          errors.push(
            `insert: afterLine ${op.afterLine} exceeds document length ${lineCount}`,
          );
        }
        if (!op.content && !op.newContent) {
          errors.push("insert: content is required");
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Apply diff operations with enhanced conflict detection
 * Supports fuzzy matching and content similarity checks
 */
export function applyDiffOperationsWithConflicts(
  text: string,
  operations: DiffOperation[],
  options: {
    strict?: boolean; // Fail on any conflict
    fuzzyMatch?: boolean; // Try to match content even if lines shifted
  } = {},
): ApplyDiffResult {
  const lines = text.split("\n");
  const conflicts: DiffConflict[] = [];
  const failed: string[] = [];
  let applied = 0;
  let skipped = 0;

  // Sort operations by line number descending (apply from bottom to top)
  const sortedOps = [...operations].sort((a, b) => {
    const lineA = a.startLine ?? a.afterLine ?? 0;
    const lineB = b.startLine ?? b.afterLine ?? 0;
    return lineB - lineA;
  });

  for (const op of sortedOps) {
    const conflict = detectConflict(lines, op);

    if (conflict) {
      conflicts.push(conflict);

      if (options.strict) {
        skipped++;
        failed.push(conflict.reason);
        continue;
      }

      // Try fuzzy resolution if enabled
      if (options.fuzzyMatch && conflict.suggestion === "retry") {
        const resolved = tryFuzzyResolve(lines, op);
        if (resolved) {
          applyOperation(lines, resolved);
          applied++;
          continue;
        }
      }

      skipped++;
      failed.push(conflict.reason);
      continue;
    }

    // No conflict, apply operation
    applyOperation(lines, op);
    applied++;
  }

  return {
    success: conflicts.length === 0 || applied > 0,
    result: lines.join("\n"),
    applied,
    skipped,
    failed,
    conflicts,
  };
}

/**
 * Detect if an operation will conflict with current document state
 */
function detectConflict(
  lines: string[],
  op: DiffOperation,
): DiffConflict | null {
  const lineCount = lines.length;

  switch (op.type) {
    case "delete":
    case "replace": {
      const start = (op.startLine ?? 1) - 1;
      const end = (op.endLine ?? op.startLine ?? 1) - 1;

      // Check bounds
      if (start < 0 || end >= lineCount) {
        return {
          operation: op,
          reason: `Lines ${op.startLine}-${op.endLine} out of bounds (document has ${lineCount} lines)`,
          lineCount,
          suggestion: "retry",
          context: {
            lineNumber: op.startLine,
            actualContent: lines
              .slice(Math.max(0, start - 2), Math.min(lineCount, end + 3))
              .join("\n"),
          },
        };
      }

      // For replace, check if target section looks significantly different
      if (op.type === "replace") {
        const targetLines = lines.slice(start, end + 1).join("\n");
        // Heuristic: if target is empty but replacement is substantial, flag it
        if (
          targetLines.trim().length === 0 &&
          (op.content?.trim().length ?? 0) > 50
        ) {
          return {
            operation: op,
            reason:
              "Target lines are empty but replacement is substantial - document may have changed",
            lineCount,
            suggestion: "manual",
            context: {
              actualContent: targetLines,
              expectedContent: op.content ?? op.newContent,
              lineNumber: op.startLine,
            },
          };
        }
      }
      break;
    }

    case "insert": {
      const afterLine = op.afterLine ?? 0;
      if (afterLine < 0 || afterLine > lineCount) {
        return {
          operation: op,
          reason: `Insert position ${afterLine} out of bounds (document has ${lineCount} lines)`,
          lineCount,
          suggestion: "retry",
          context: {
            lineNumber: afterLine,
            actualContent: lines
              .slice(
                Math.max(0, afterLine - 2),
                Math.min(lineCount, afterLine + 3),
              )
              .join("\n"),
          },
        };
      }
      break;
    }
  }

  return null;
}

/**
 * Try to resolve conflict by finding content elsewhere in document
 * Returns adjusted operation if found, null otherwise
 */
function tryFuzzyResolve(
  _lines: string[],
  _op: DiffOperation,
): DiffOperation | null {
  // Simple implementation: for now, return null and escalate
  // Future: implement line-content matching to find where content moved
  return null;
}

/**
 * Apply a single diff operation to lines array (mutates in place)
 */
function applyOperation(lines: string[], op: DiffOperation): void {
  switch (op.type) {
    case "delete": {
      const start = (op.startLine ?? 1) - 1;
      const end = (op.endLine ?? op.startLine ?? 1) - 1;
      lines.splice(start, end - start + 1);
      break;
    }
    case "insert": {
      const afterLine = op.afterLine ?? 0;
      const content = op.content ?? op.newContent ?? "";
      const newLines = content.split("\n");
      if (newLines[newLines.length - 1] === "") {
        newLines.pop();
      }
      lines.splice(afterLine, 0, ...newLines);
      break;
    }
    case "replace": {
      const start = (op.startLine ?? 1) - 1;
      const end = (op.endLine ?? op.startLine ?? 1) - 1;
      const content = op.content ?? op.newContent ?? "";
      const newLines = content.split("\n");
      if (newLines[newLines.length - 1] === "") {
        newLines.pop();
      }
      lines.splice(start, end - start + 1, ...newLines);
      break;
    }
  }
}
