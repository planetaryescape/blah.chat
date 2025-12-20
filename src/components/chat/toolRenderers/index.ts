import type { ComponentType } from "react";
import type { ToolRendererProps } from "./types";

export type { ToolCall, ToolCallState, ToolRendererProps } from "./types";
// Export types and utilities
export { getCallState } from "./types";

// Import all renderers
import { CalculatorRenderer } from "./CalculatorRenderer";
import { CodeExecutionRenderer } from "./CodeExecutionRenderer";
import { CreateDocumentRenderer } from "./CreateDocumentRenderer";
import { DateTimeRenderer } from "./DateTimeRenderer";
import { DefaultToolRenderer } from "./DefaultToolRenderer";
import { DeleteMemoryRenderer } from "./DeleteMemoryRenderer";
import { FileDocumentRenderer } from "./FileDocumentRenderer";
import { ProjectContextRenderer } from "./ProjectContextRenderer";
import { QueryHistoryRenderer } from "./QueryHistoryRenderer";
import { ReadDocumentRenderer } from "./ReadDocumentRenderer";
import { SaveMemoryRenderer } from "./SaveMemoryRenderer";
import { SearchAllRenderer } from "./SearchAllRenderer";
import { SearchFilesRenderer } from "./SearchFilesRenderer";
import { SearchMemoriesRenderer } from "./SearchMemoriesRenderer";
import { SearchNotesRenderer } from "./SearchNotesRenderer";
import { SearchTasksRenderer } from "./SearchTasksRenderer";
import { TaskManagerRenderer } from "./TaskManagerRenderer";
import { UpdateDocumentRenderer } from "./UpdateDocumentRenderer";
import { UrlReaderRenderer } from "./UrlReaderRenderer";
import { WeatherRenderer } from "./WeatherRenderer";
import { WebSearchRenderer } from "./WebSearchRenderer";

/**
 * Registry mapping tool names to their renderer components.
 * To add a new tool, create a XyzRenderer.tsx file and add it here.
 */
export const toolRenderers: Record<string, ComponentType<ToolRendererProps>> = {
  saveMemory: SaveMemoryRenderer,
  searchMemories: SearchMemoriesRenderer,
  webSearch: WebSearchRenderer,
  calculator: CalculatorRenderer,
  datetime: DateTimeRenderer,
  urlReader: UrlReaderRenderer,
  codeExecution: CodeExecutionRenderer,
  weather: WeatherRenderer,
  fileDocument: FileDocumentRenderer,
  projectContext: ProjectContextRenderer,
  deleteMemory: DeleteMemoryRenderer,
  // Search tools
  searchNotes: SearchNotesRenderer,
  searchTasks: SearchTasksRenderer,
  searchFiles: SearchFilesRenderer,
  queryHistory: QueryHistoryRenderer,
  searchAll: SearchAllRenderer,
  // Task management
  manageTasks: TaskManagerRenderer,
  // Canvas tools
  createDocument: CreateDocumentRenderer,
  updateDocument: UpdateDocumentRenderer,
  readDocument: ReadDocumentRenderer,
};

// Export the default as a named export for explicit usage
export { DefaultToolRenderer };
