export interface ApiEnvelope<T = unknown> {
  status: "success" | "error";
  sys: {
    entity: string;
    id?: string;
    async?: boolean;
    timestamps?: Record<string, string>;
  };
  data?: T;
  error?: string | { message: string; code?: string; details?: unknown };
}

export type ThinkingEffort = "none" | "low" | "medium" | "high";

export interface Conversation {
  _id: string;
  title?: string | null;
  model?: string | null;
  pinned?: boolean;
  messageCount?: number;
  lastMessageAt?: number;
  createdAt?: number;
}

export interface Message {
  _id: string;
  conversationId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  partialContent?: string;
  status?: "pending" | "generating" | "complete" | "stopped" | "error";
  error?: string;
  createdAt?: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  tokensPerSecond?: number;
  firstTokenAt?: number;
  generationStartedAt?: number;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  isPro: boolean;
}

export interface Memory {
  _id: string;
  content: string;
  category: string;
  importance?: number;
  createdAt: number;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface Bookmark {
  _id: string;
  messageId: string;
  conversationId: string;
  note?: string;
  tags?: string[];
  messagePreview?: string;
  createdAt: number;
}

export interface Template {
  _id: string;
  name: string;
  prompt: string;
  description?: string;
  category: string;
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: number;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: "suggested" | "confirmed" | "in_progress" | "completed" | "cancelled";
  urgency?: "low" | "medium" | "high" | "urgent";
  deadline?: number;
  deadlineSource?: string;
  projectId?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  isPinned: boolean;
  projectId?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CliRpcMethodMap {
  validateApiKey: {
    params: undefined;
    result: { userId: string; email: string; name: string } | null;
  };
  listConversations: {
    params: { limit?: number };
    result: Conversation[] | null;
  };
  getConversation: {
    params: { conversationId: string };
    result: Conversation | null;
  };
  listMessages: {
    params: { conversationId: string };
    result: Message[] | null;
  };
  listModels: { params: undefined; result: Model[] | null };
  getUserDefaultModel: { params: undefined; result: string | null };
  searchConversations: {
    params: { query: string; limit?: number };
    result: Conversation[] | null;
  };
  sendMessage: {
    params: { conversationId: string; content: string; modelId?: string };
    result: { userMessageId: string };
  };
  createConversation: {
    params: { title?: string; model?: string };
    result: { conversationId: string };
  };
  archiveConversation: {
    params: { conversationId: string };
    result: { success: boolean };
  };
  deleteConversation: {
    params: { conversationId: string };
    result: { success: boolean };
  };
  updateConversationModel: {
    params: { conversationId: string; model: string };
    result: { success: boolean };
  };
  renameConversation: {
    params: { conversationId: string; title: string };
    result: { success: boolean };
  };
  createBookmark: {
    params: { messageId: string; conversationId: string; note?: string };
    result: { bookmarkId: string };
  };
  listMemories: { params: { limit?: number }; result: Memory[] | null };
  listProjects: { params: { limit?: number }; result: Project[] | null };
  listBookmarks: { params: { limit?: number }; result: Bookmark[] | null };
  listTemplates: { params: { limit?: number }; result: Template[] | null };
  listTasks: {
    params: {
      status?:
        | "suggested"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled";
      limit?: number;
    };
    result: Task[] | null;
  };
  createTask: {
    params: {
      title: string;
      description?: string;
      urgency?: "low" | "medium" | "high" | "urgent";
      deadline?: number;
      deadlineSource?: string;
      projectId?: string;
    };
    result: { taskId: string };
  };
  updateTask: {
    params: {
      taskId: string;
      title?: string;
      description?: string;
      status?:
        | "suggested"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled";
      urgency?: "low" | "medium" | "high" | "urgent";
      deadline?: number;
    };
    result: { success: true };
  };
  completeTask: { params: { taskId: string }; result: { success: true } };
  deleteTask: { params: { taskId: string }; result: { success: true } };
  listNotes: { params: { limit?: number }; result: Note[] | null };
  createNote: {
    params: {
      content: string;
      title?: string;
      sourceMessageId?: string;
      sourceConversationId?: string;
      projectId?: string;
    };
    result: { noteId: string };
  };
  updateNote: {
    params: {
      noteId: string;
      title?: string;
      content?: string;
      isPinned?: boolean;
    };
    result: { success: true };
  };
  deleteNote: { params: { noteId: string }; result: { success: true } };
}
