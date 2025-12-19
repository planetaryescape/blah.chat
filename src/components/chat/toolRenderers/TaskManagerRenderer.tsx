import type { ToolRendererProps } from "./types";

/**
 * Renderer for the manageTasks tool.
 * Displays operation-specific UI for task management.
 */
export function TaskManagerRenderer({
  parsedArgs,
  parsedResult,
  state,
  ToolIcon,
}: ToolRendererProps) {
  const operation = parsedArgs?.operation || "unknown";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-500";
      case "in_progress":
        return "text-blue-500";
      case "cancelled":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "bg-red-500/20 text-red-500";
      case "high":
        return "bg-orange-500/20 text-orange-500";
      case "medium":
        return "bg-yellow-500/20 text-yellow-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getOperationLabel = () => {
    if (state === "executing") {
      switch (operation) {
        case "create":
          return "Creating task...";
        case "update":
          return "Updating task...";
        case "complete":
          return "Completing task...";
        case "delete":
          return parsedArgs?.confirmDelete ? "Deleting task..." : "Finding task...";
        case "list":
          return "Loading tasks...";
        default:
          return "Processing...";
      }
    }

    if (!parsedResult?.success) {
      if (parsedResult?.ambiguous) {
        return "Multiple matches found";
      }
      return parsedResult?.message || "Failed";
    }

    switch (operation) {
      case "create":
        return "Created task";
      case "update":
        return "Updated task";
      case "complete":
        return "Completed";
      case "delete":
        return parsedResult?.deleted ? "Deleted" : "Found (confirm to delete)";
      case "list":
        return `${parsedResult?.totalCount || 0} tasks`;
      default:
        return "Done";
    }
  };

  // Render single task
  const renderTask = (task: any, showLink = true) => (
    <div className="py-1">
      <div className="flex items-center gap-2">
        {showLink && task.url ? (
          <a
            href={task.url}
            className={`font-medium ${
              task.status === "completed"
                ? "line-through text-muted-foreground"
                : "text-primary hover:underline"
            }`}
          >
            {task.title}
          </a>
        ) : (
          <span
            className={`font-medium ${
              task.status === "completed" ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </span>
        )}
        <span className={`text-[10px] ${getStatusColor(task.status)}`}>
          {task.status?.replace("_", " ")}
        </span>
        {task.urgency && task.urgency !== "medium" && (
          <span
            className={`text-[9px] px-1 rounded ${getUrgencyBadge(task.urgency)}`}
          >
            {task.urgency}
          </span>
        )}
      </div>
      {task.deadline && (
        <span className="text-[10px] text-muted-foreground">
          Due: {new Date(task.deadline).toLocaleDateString()}
        </span>
      )}
    </div>
  );

  // Render candidates for disambiguation
  const renderCandidates = () => {
    const candidates = parsedResult?.candidates || [];
    if (candidates.length === 0) return null;

    return (
      <div className="space-y-1 mt-1">
        <div className="text-[10px] text-muted-foreground">
          Please specify which task:
        </div>
        {candidates.slice(0, 5).map((task: any, i: number) => (
          <div key={i}>{renderTask(task)}</div>
        ))}
      </div>
    );
  };

  // Render task list
  const renderTaskList = () => {
    const tasks = parsedResult?.tasks || [];
    if (tasks.length === 0) {
      return (
        <div className="text-muted-foreground text-[11px] mt-1">
          {parsedResult?.message || "No tasks found"}
        </div>
      );
    }

    return (
      <div className="space-y-1.5 max-h-48 overflow-y-auto mt-1">
        {tasks.slice(0, 10).map((task: any, i: number) => (
          <div key={i}>{renderTask(task)}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="text-xs space-y-1 border-l-2 border-border/40 pl-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ToolIcon className="h-3 w-3 text-muted-foreground" />
        <span
          className={`font-medium ${
            state === "executing"
              ? "text-muted-foreground"
              : parsedResult?.success
                ? operation === "complete" || operation === "delete"
                  ? "text-green-500"
                  : "text-muted-foreground"
                : "text-amber-500"
          }`}
        >
          {getOperationLabel()}
        </span>
      </div>

      {/* Operation-specific content */}
      {state !== "executing" && (
        <>
          {/* Create/Update/Complete/Delete - show single task */}
          {(operation === "create" ||
            operation === "update" ||
            operation === "complete" ||
            (operation === "delete" && !parsedResult?.ambiguous)) &&
            parsedResult?.task && (
              <div className="mt-1">{renderTask(parsedResult.task)}</div>
            )}

          {/* Pending delete confirmation */}
          {operation === "delete" && parsedResult?.pendingDelete && (
            <div className="text-[10px] text-amber-500 mt-1">
              Awaiting confirmation...
            </div>
          )}

          {/* Ambiguous - show candidates */}
          {parsedResult?.ambiguous && renderCandidates()}

          {/* List - show tasks */}
          {operation === "list" && renderTaskList()}

          {/* Error message */}
          {!parsedResult?.success && parsedResult?.error && (
            <div className="text-amber-500 text-[11px]">
              {parsedResult.message}
            </div>
          )}
        </>
      )}
    </div>
  );
}
