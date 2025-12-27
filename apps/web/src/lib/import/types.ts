// Common types for import functionality

export interface ImportMessage {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: number;
  model?: string;
}

export interface ImportConversation {
  title: string;
  messages: ImportMessage[];
  model?: string;
  systemPrompt?: string;
  createdAt?: number;
}

export interface ImportData {
  conversations: ImportConversation[];
  format: "json" | "markdown" | "chatgpt";
}

export interface ImportResult {
  success: boolean;
  data?: ImportData;
  error?: string;
  conversationsCount?: number;
  messagesCount?: number;
}
