import type { editor } from "monaco-editor";
import type { DiffOperation } from "./diff";

/**
 * Convert DiffOperations to Monaco edit operations
 */
export function diffToMonacoEdits(
  model: editor.ITextModel,
  operations: DiffOperation[],
): editor.IIdentifiedSingleEditOperation[] {
  const edits: editor.IIdentifiedSingleEditOperation[] = [];

  for (const op of operations) {
    switch (op.type) {
      case "delete": {
        const startLine = op.startLine ?? 1;
        const endLine = op.endLine ?? startLine;
        // Delete entire lines including line breaks
        const endColumn =
          endLine < model.getLineCount() ? 1 : model.getLineLength(endLine) + 1;
        const endLineNumber =
          endLine < model.getLineCount() ? endLine + 1 : endLine;

        edits.push({
          range: {
            startLineNumber: startLine,
            startColumn: 1,
            endLineNumber: endLineNumber,
            endColumn: endLineNumber === endLine ? endColumn : 1,
          },
          text: null,
        });
        break;
      }

      case "insert": {
        const afterLine = op.afterLine ?? 0;
        const content = op.content ?? op.newContent ?? "";
        const insertLine = afterLine + 1;

        // Insert at beginning of the line after afterLine
        edits.push({
          range: {
            startLineNumber: Math.min(insertLine, model.getLineCount() + 1),
            startColumn: 1,
            endLineNumber: Math.min(insertLine, model.getLineCount() + 1),
            endColumn: 1,
          },
          text: content.endsWith("\n") ? content : `${content}\n`,
        });
        break;
      }

      case "replace": {
        const startLine = op.startLine ?? 1;
        const endLine = op.endLine ?? startLine;
        const content = op.content ?? op.newContent ?? "";

        edits.push({
          range: {
            startLineNumber: startLine,
            startColumn: 1,
            endLineNumber: endLine,
            endColumn: model.getLineLength(endLine) + 1,
          },
          text: content,
        });
        break;
      }
    }
  }

  return edits;
}

/**
 * Apply diff operations directly to Monaco editor
 */
export function applyDiffToMonaco(
  editorInstance: editor.IStandaloneCodeEditor,
  operations: DiffOperation[],
): { success: boolean; error?: string } {
  try {
    const model = editorInstance.getModel();
    if (!model) {
      return { success: false, error: "No model attached to editor" };
    }

    const edits = diffToMonacoEdits(model, operations);

    // Apply all edits as single undoable operation
    editorInstance.executeEdits("canvas-diff", edits);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Track content changes and compute diffs
 * Returns a function to get diff since tracking started
 */
export function createChangeTracker(
  editorInstance: editor.IStandaloneCodeEditor,
) {
  let baseContent = editorInstance.getValue();

  const startTracking = () => {
    baseContent = editorInstance.getValue();
  };

  const getDiff = () => {
    const currentContent = editorInstance.getValue();
    return {
      hasChanges: currentContent !== baseContent,
      baseContent,
      currentContent,
    };
  };

  const resetBase = () => {
    baseContent = editorInstance.getValue();
  };

  return {
    startTracking,
    getDiff,
    resetBase,
  };
}
