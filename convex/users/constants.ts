/**
 * Phase 4: User Preferences Constants
 *
 * Centralized defaults and category mappings for the flattened user preferences system.
 */

export const PREFERENCE_DEFAULTS = {
  // Appearance
  theme: "dark" as const,
  fontSize: "medium" as const,
  codeTheme: "rose-pine" as const,
  chatWidth: "standard" as const,

  // Models
  defaultModel: "openai:gpt-4o-mini",
  favoriteModels: [] as string[],
  recentModels: [] as string[],
  newChatModelSelection: "recent" as const,

  // Chat
  sendOnEnter: true,
  alwaysShowMessageActions: true,
  showMessageStatistics: true,
  showComparisonStatistics: true,
  enableHybridSearch: false,
  showModelNamesDuringComparison: false,

  // Audio
  sttEnabled: true,
  sttProvider: "openai" as const,
  ttsEnabled: false,
  ttsProvider: "deepgram",
  ttsVoice: "aura-asteria-en",
  ttsSpeed: 1.0,
  ttsAutoRead: false,

  // Advanced
  showNotes: true,
  showTemplates: true,
  showProjects: true,
  showBookmarks: true,

  // Custom Instructions (single object)
  customInstructions: {
    aboutUser: "",
    responseStyle: "",
    enabled: false,
    baseStyleAndTone: "default" as const,
    nickname: "",
    occupation: "",
    moreAboutYou: "",
  },

  // Reasoning (single object)
  reasoning: {
    showByDefault: true,
    autoExpand: false,
    showDuringStreaming: true,
  },
} as const;

export const PREFERENCE_CATEGORIES: Record<string, string> = {
  // Appearance
  theme: "appearance",
  fontSize: "appearance",
  codeTheme: "appearance",
  chatWidth: "appearance",

  // Models
  defaultModel: "models",
  favoriteModels: "models",
  recentModels: "models",
  newChatModelSelection: "models",

  // Chat
  sendOnEnter: "chat",
  alwaysShowMessageActions: "chat",
  showMessageStatistics: "chat",
  showComparisonStatistics: "chat",
  enableHybridSearch: "chat",
  showModelNamesDuringComparison: "chat",

  // Audio
  sttEnabled: "audio",
  sttProvider: "audio",
  ttsEnabled: "audio",
  ttsProvider: "audio",
  ttsVoice: "audio",
  ttsSpeed: "audio",
  ttsAutoRead: "audio",

  // Advanced
  showNotes: "advanced",
  showTemplates: "advanced",
  showProjects: "advanced",
  showBookmarks: "advanced",

  // Special: nested objects stored as single rows
  customInstructions: "customInstructions",
  reasoning: "reasoning",
};
