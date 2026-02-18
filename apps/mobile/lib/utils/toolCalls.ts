import {
  BookmarkPlus,
  Calculator,
  Calendar,
  CheckSquare,
  Cloud,
  Code,
  DollarSign,
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
} from "lucide-react-native";

export type ToolCallState = "executing" | "complete" | "error";

export function getCallState(call: {
  result?: string;
  timestamp: number;
}): ToolCallState {
  if (!call.result) {
    const elapsed = Date.now() - call.timestamp;
    if (elapsed > 30000) return "error";
    return "executing";
  }
  try {
    const parsed = JSON.parse(call.result);
    if (parsed.error || parsed.success === false) return "error";
  } catch {}
  return "complete";
}

export function getToolIcon(toolName: string) {
  switch (toolName) {
    case "saveMemory":
      return BookmarkPlus;
    case "searchMemories":
      return Search;
    case "calculator":
      return Calculator;
    case "currencyConverter":
      return DollarSign;
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
    case "createDocument":
      return FileText;
    case "updateDocument":
      return RefreshCw;
    case "readDocument":
      return Eye;
    case "enterDocumentMode":
      return FileEdit;
    case "exitDocumentMode":
      return MessageSquare;
    case "deleteMemory":
      return Trash2;
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
      return `Memory search (${result?.found || 0} results)`;
    case "calculator":
      if (isExecuting) return "Calculating...";
      if (result?.success === false) return "Calculation error";
      return `= ${result?.result}`;
    case "currencyConverter":
      if (isExecuting) return "Converting currency...";
      if (result?.success === false) return "Conversion failed";
      return `${result?.amount} ${result?.from} = ${result?.result} ${result?.to}`;
    case "datetime":
      if (isExecuting) return "Getting date/time...";
      if (result?.formatted) return result.formatted;
      if (result?.readable) return result.readable;
      return "Date/time";
    case "webSearch":
    case "tavilySearch":
    case "tavilyAdvancedSearch":
      if (isExecuting) return "Searching the web...";
      if (result?.success === false) return "Search failed";
      return `Web search (${result?.results?.length || 0} results)`;
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
    case "weather":
      if (isExecuting) return "Fetching weather...";
      if (result?.success === false) return "Weather unavailable";
      return result?.location
        ? `${result.location} \u2022 ${result.current?.temperature}${result.units === "fahrenheit" ? "\u00B0F" : "\u00B0C"}`
        : "Weather Forecast";
    case "projectContext":
      if (isExecuting) return "Loading project context...";
      if (result?.success === false) return "Project not found";
      return `Project: ${result?.project?.name || "Unknown"}`;
    case "manageTasks":
      if (isExecuting) return "Managing tasks...";
      if (result?.success === false)
        return result?.message || "Task operation failed";
      if (result?.operation === "create")
        return `Created: ${result?.task?.title || "task"}`;
      if (result?.operation === "complete")
        return `Completed: ${result?.task?.title || "task"}`;
      if (result?.operation === "list")
        return `${result?.totalCount || 0} tasks`;
      return "Task manager";
    case "createDocument":
      if (isExecuting) return "Creating document...";
      return `Created "${result?.title || "document"}"`;
    case "updateDocument":
      if (isExecuting) return "Updating document...";
      return `Updated to v${result?.newVersion}`;
    case "readDocument":
      if (isExecuting) return "Reading document...";
      return `Read (${result?.lineCount} lines)`;
    case "deleteMemory":
      if (isExecuting) return "Deleting memory...";
      return "Memory deleted";
    case "searchFiles":
      if (isExecuting) return "Searching files...";
      return `File search (${result?.totalResults || 0} found)`;
    case "searchNotes":
      if (isExecuting) return "Searching notes...";
      return `Note search (${result?.totalResults || 0} found)`;
    case "searchTasks":
      if (isExecuting) return "Searching tasks...";
      return `Task search (${result?.totalResults || 0} found)`;
    case "searchAll":
      if (isExecuting) return "Searching everything...";
      return `Search all (${result?.totalCount || 0} found)`;
    case "searchKnowledgeBank":
      if (isExecuting) return "Searching knowledge bank...";
      return `Knowledge bank (${result?.found || 0} found)`;
    case "youtubeVideo":
      if (isExecuting) return "Analyzing YouTube video...";
      return "YouTube video analyzed";
    default:
      if (isExecuting) return "Processing...";
      return "Done";
  }
}

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
    case "currencyConverter":
      return parsedArgs?.amount
        ? `${parsedArgs.amount} ${parsedArgs.from} \u2192 ${parsedArgs.to}`
        : null;
    case "youtubeVideo":
      return parsedArgs?.url || parsedArgs?.videoId || null;
    case "codeExecution":
      return parsedArgs?.language || null;
    default:
      return null;
  }
}
