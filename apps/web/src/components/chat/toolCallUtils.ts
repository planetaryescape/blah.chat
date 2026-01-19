import {
  BookmarkPlus,
  Calculator,
  Calendar,
  CheckSquare,
  Cloud,
  Code,
  ExternalLink,
  Eye,
  FileEdit,
  FileText,
  FolderTree,
  Globe,
  History,
  Library,
  MessageSquare,
  RefreshCw,
  Search,
  StickyNote,
  Trash2,
  Youtube,
} from "lucide-react";

/**
 * Get the icon for a tool by name.
 */
export function getToolIcon(toolName: string) {
  switch (toolName) {
    case "saveMemory":
      return BookmarkPlus;
    case "searchMemories":
      return Search;
    case "calculator":
      return Calculator;
    case "datetime":
      return Calendar;
    case "webSearch":
    case "tavilySearch":
    case "tavilyAdvancedSearch":
      return Globe;
    case "urlReader":
      return ExternalLink;
    case "fileDocument":
      return FileText;
    case "codeExecution":
      return Code;
    case "weather":
      return Cloud;
    case "projectContext":
      return FolderTree;
    case "manageTasks":
      return CheckSquare;
    // Canvas tools
    case "createDocument":
      return FileText;
    case "updateDocument":
      return RefreshCw;
    case "readDocument":
      return Eye;
    // Document mode tools
    case "enterDocumentMode":
      return FileEdit;
    case "exitDocumentMode":
      return MessageSquare;
    // Memory tools
    case "deleteMemory":
      return Trash2;
    // Search tools
    case "searchFiles":
      return FileText;
    case "searchNotes":
      return StickyNote;
    case "searchTasks":
      return CheckSquare;
    case "queryHistory":
      return History;
    case "searchAll":
      return Search;
    case "searchKnowledgeBank":
      return Library;
    case "youtubeVideo":
      return Youtube;
    default:
      return Search;
  }
}

/**
 * Get a human-readable label for a tool call state.
 */
export function getToolLabel(
  toolName: string,
  isExecuting: boolean,
  result: any,
): string {
  switch (toolName) {
    case "saveMemory":
      if (isExecuting) return "Saving to memory...";
      if (result?.success === false) return "Failed to save";
      if (result?.duplicate) return "Already saved";
      return "Saved to memory";
    case "searchMemories":
      if (isExecuting) return "Searching memories...";
      return `Memory search (${result?.found || 0} result${result?.found !== 1 ? "s" : ""})`;
    case "calculator":
      if (isExecuting) return "Calculating...";
      if (result?.success === false) return "Calculation error";
      return `= ${result?.result}`;
    case "datetime":
      if (isExecuting) return "Getting date/time...";
      if (result?.success === false) return "Date error";
      if (result?.formatted) return result.formatted;
      if (result?.readable) return result.readable;
      return "Date/time";
    case "webSearch":
    case "tavilySearch":
    case "tavilyAdvancedSearch":
      if (isExecuting) return "Searching the web...";
      if (result?.success === false) return "Search failed";
      return `Web search (${result?.results?.length || 0} result${result?.results?.length !== 1 ? "s" : ""})`;
    case "urlReader":
      if (isExecuting) return "Reading URL...";
      if (result?.success === false) return "Failed to read URL";
      return `Read ${result?.url || "URL"} (${result?.wordCount || 0} words)`;
    case "fileDocument":
      if (isExecuting) return "Processing document...";
      if (result?.success === false) return "Failed to process file";
      return `${result?.fileName || "Document"} (${result?.wordCount || 0} words)`;
    case "codeExecution":
      if (isExecuting) return "Executing code...";
      if (result?.success === false) return "Execution failed";
      return `${result?.language || "Code"} executed (${result?.executionTime || 0}ms)`;
    case "weather": {
      if (isExecuting) return "Fetching weather...";
      if (result?.success === false) return "Weather unavailable";
      const temp = result?.current?.temperature;
      const units = result?.units === "fahrenheit" ? "°F" : "°C";
      return result?.location
        ? `${result.location} • ${temp}${units}`
        : "Weather Forecast";
    }
    case "projectContext": {
      if (isExecuting) return "Loading project context...";
      if (result?.success === false) return "Project not found";
      const section = result?.section || "context";
      if (section === "context") {
        return `Project: ${result?.project?.name || "Unknown"}`;
      } else if (section === "notes") {
        return `${result?.totalCount || 0} project note${result?.totalCount !== 1 ? "s" : ""}`;
      } else if (section === "files") {
        return `${result?.totalCount || 0} project file${result?.totalCount !== 1 ? "s" : ""}`;
      } else if (section === "history") {
        return `${result?.totalCount || 0} conversation${result?.totalCount !== 1 ? "s" : ""}`;
      }
      return "Project context";
    }
    case "manageTasks": {
      if (isExecuting) return "Managing tasks...";
      if (result?.success === false)
        return result?.message || "Task operation failed";
      const op = result?.operation;
      if (op === "create") return `Created: ${result?.task?.title || "task"}`;
      if (op === "complete")
        return `Completed: ${result?.task?.title || "task"}`;
      if (op === "delete")
        return result?.deleted ? "Task deleted" : "Ready to delete";
      if (op === "update") return `Updated: ${result?.task?.title || "task"}`;
      if (op === "list")
        return `${result?.totalCount || 0} task${result?.totalCount !== 1 ? "s" : ""}`;
      return "Task manager";
    }
    // Canvas tools
    case "createDocument":
      if (isExecuting) return "Creating document...";
      if (result?.success === false) return "Failed to create";
      return `Created "${result?.title || "document"}"`;
    case "updateDocument":
      if (isExecuting) return "Updating document...";
      if (result?.success === false) return "Update failed";
      return `Updated to v${result?.newVersion}`;
    case "readDocument":
      if (isExecuting) return "Reading document...";
      if (!result?.hasDocument) return "No document";
      return `Read (${result?.lineCount} lines)`;
    case "enterDocumentMode":
      if (isExecuting) return "Entering document mode...";
      if (result?.success === false) return "Mode switch failed";
      return "Document mode";
    case "exitDocumentMode":
      if (isExecuting) return "Exiting...";
      if (result?.success === false) return "Exit failed";
      return "Back to chat";
    // Memory tools
    case "deleteMemory":
      if (isExecuting) return "Deleting memory...";
      if (result?.success === false) return "Delete failed";
      return "Memory deleted";
    // Search tools
    case "searchFiles":
      if (isExecuting) return "Searching files...";
      return `File search (${result?.totalResults || 0} found)`;
    case "searchNotes":
      if (isExecuting) return "Searching notes...";
      return `Note search (${result?.totalResults || 0} found)`;
    case "searchTasks":
      if (isExecuting) return "Searching tasks...";
      return `Task search (${result?.totalResults || 0} found)`;
    case "queryHistory":
      if (isExecuting) return "Searching history...";
      return `History (${result?.totalResults || 0} found)`;
    case "searchAll":
      if (isExecuting) return "Searching everything...";
      return `Search all (${result?.totalCount || 0} found)`;
    case "searchKnowledgeBank":
      if (isExecuting) return "Searching knowledge bank...";
      return `Knowledge bank (${result?.found || 0} found)`;
    case "youtubeVideo":
      if (isExecuting) return "Analyzing YouTube video...";
      if (result?.success === false) return "Video analysis failed";
      return "YouTube video analyzed";
    default:
      if (isExecuting) return "Processing...";
      return "Done";
  }
}

/**
 * Get a short description for the tool call (query/URL extraction for timeline).
 */
export function getToolDescription(
  toolName: string,
  parsedArgs: any,
): string | null {
  switch (toolName) {
    case "webSearch":
    case "tavilySearch":
    case "tavilyAdvancedSearch":
      return parsedArgs?.query || null;
    case "urlReader":
      return parsedArgs?.url || null;
    case "searchMemories":
    case "searchFiles":
    case "searchNotes":
    case "searchTasks":
    case "queryHistory":
    case "searchAll":
    case "searchKnowledgeBank":
      return parsedArgs?.query || null;
    case "weather":
      return parsedArgs?.location || null;
    case "youtubeVideo":
      return parsedArgs?.url || parsedArgs?.videoId || null;
    case "codeExecution":
      return parsedArgs?.language || null;
    default:
      return null;
  }
}
