import {
    Archive,
    BarChart3,
    Bookmark,
    Brain,
    Download,
    Edit,
    FileText,
    FolderKanban,
    Keyboard,
    Laptop,
    MessageSquarePlus,
    Moon,
    NotebookPen,
    Pin,
    Search,
    Settings,
    Sparkles,
    Star,
    Sun,
    Trash2,
    type LucideIcon,
} from "lucide-react";
import type { Doc, Id } from "../../convex/_generated/dataModel";

export type ActionItem = {
  id: string;
  label: string;
  keywords?: string[];
  icon: LucideIcon;
  onSelect: () => void;
  group: "actions" | "navigation" | "theme" | "conversation";
  shortcut?: string;
  destructive?: boolean;
};

export const createActionItems = (params: {
  handleNewChat: () => void;
  handleNavigate: (path: string) => void;
  handleTheme: (theme: "light" | "dark" | "system") => void;
  conversationId?: Id<"conversations"> | null;
  conversation?: Doc<"conversations"> | null;
  onRename?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onTogglePin?: () => void;
  onToggleStar?: () => void;
  onAutoRename?: () => void;
}): ActionItem[] => [
  {
    id: "new-chat",
    label: "New Chat",
    keywords: ["create", "start", "conversation"],
    icon: MessageSquarePlus,
    onSelect: params.handleNewChat,
    group: "actions",
    shortcut: "⌘⇧O",
  },
  // Navigation items
  {
    id: "search",
    label: "Search",
    keywords: ["find", "messages", "go to", "navigate"],
    icon: Search,
    onSelect: () => params.handleNavigate("/search"),
    group: "navigation",
  },
  {
    id: "notes",
    label: "Notes",
    keywords: ["notes", "notebook", "go to", "navigate"],
    icon: NotebookPen,
    onSelect: () => params.handleNavigate("/notes"),
    group: "navigation",
  },
  {
    id: "memories",
    label: "Memories",
    keywords: ["memories", "brain", "ai", "go to", "navigate"],
    icon: Brain,
    onSelect: () => params.handleNavigate("/memories"),
    group: "navigation",
  },
  {
    id: "projects",
    label: "Projects",
    keywords: ["projects", "folders", "organize", "go to", "navigate"],
    icon: FolderKanban,
    onSelect: () => params.handleNavigate("/projects"),
    group: "navigation",
  },
  {
    id: "templates",
    label: "Templates",
    keywords: ["templates", "prompts", "go to", "navigate"],
    icon: FileText,
    onSelect: () => params.handleNavigate("/templates"),
    group: "navigation",
  },
  {
    id: "usage",
    label: "Usage",
    keywords: ["usage", "stats", "analytics", "go to", "navigate"],
    icon: BarChart3,
    onSelect: () => params.handleNavigate("/usage"),
    group: "navigation",
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    keywords: ["bookmarks", "saved", "favorites", "go to", "navigate"],
    icon: Bookmark,
    onSelect: () => params.handleNavigate("/bookmarks"),
    group: "navigation",
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    keywords: ["shortcuts", "keyboard", "hotkeys", "go to", "navigate"],
    icon: Keyboard,
    onSelect: () => params.handleNavigate("/shortcuts"),
    group: "navigation",
  },
  {
    id: "settings",
    label: "Settings",
    keywords: ["settings", "preferences", "config", "go to", "navigate"],
    icon: Settings,
    onSelect: () => params.handleNavigate("/settings"),
    group: "navigation",
    shortcut: "⌘,",
  },
  {
    id: "export",
    label: "Export Data",
    keywords: ["download", "backup"],
    icon: Download,
    onSelect: () => window.open("/api/export?format=json", "_blank"),
    group: "actions",
  },
  // Conversation actions (only if in a conversation)
  ...(params.conversationId && params.conversation
    ? [
        {
          id: "conv-rename",
          label: "Rename conversation",
          keywords: ["rename", "title", "edit"],
          icon: Edit,
          onSelect: params.onRename || (() => {}),
          group: "conversation" as const,
        },
        {
          id: "conv-pin",
          label: params.conversation.pinned
            ? "Unpin conversation"
            : "Pin conversation",
          keywords: ["pin", "unpin", "sticky"],
          icon: Pin,
          onSelect: params.onTogglePin || (() => {}),
          group: "conversation" as const,
        },
        {
          id: "conv-star",
          label: params.conversation.starred
            ? "Unstar conversation"
            : "Star conversation",
          keywords: ["star", "unstar", "favorite"],
          icon: Star,
          onSelect: params.onToggleStar || (() => {}),
          group: "conversation" as const,
        },
        {
          id: "conv-archive",
          label: "Archive conversation",
          keywords: ["archive", "hide"],
          icon: Archive,
          onSelect: params.onArchive || (() => {}),
          group: "conversation" as const,
        },
        {
          id: "conv-auto-rename",
          label: "Auto-rename conversation",
          keywords: ["auto", "rename", "generate", "title"],
          icon: Sparkles,
          onSelect: params.onAutoRename || (() => {}),
          group: "conversation" as const,
        },
        {
          id: "conv-delete",
          label: "Delete conversation",
          keywords: ["delete", "remove", "trash"],
          icon: Trash2,
          onSelect: params.onDelete || (() => {}),
          group: "conversation" as const,
          destructive: true,
        },
      ]
    : []),
  {
    id: "theme-light",
    label: "Light",
    keywords: ["theme", "bright"],
    icon: Sun,
    onSelect: () => params.handleTheme("light"),
    group: "theme",
  },
  {
    id: "theme-dark",
    label: "Dark",
    keywords: ["theme", "night"],
    icon: Moon,
    onSelect: () => params.handleTheme("dark"),
    group: "theme",
  },
  {
    id: "theme-system",
    label: "System",
    keywords: ["theme", "auto"],
    icon: Laptop,
    onSelect: () => params.handleTheme("system"),
    group: "theme",
  },
];
