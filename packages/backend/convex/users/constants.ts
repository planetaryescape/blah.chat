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
  defaultModel: "auto",
  favoriteModels: [] as string[],
  recentModels: [] as string[],
  newChatModelSelection: "recent" as const,

  // Auto Router
  autoRouterCostBias: 50, // 0=quality focus, 100=cheapest possible
  autoRouterSpeedBias: 50, // 0=quality focus, 100=fastest possible

  // Chat
  sendOnEnter: true,
  alwaysShowMessageActions: true,
  minimalAssistantStyle: false,
  showMessageStatistics: true,
  showComparisonStatistics: true,
  enableHybridSearch: false,
  showModelNamesDuringComparison: false,
  showModelProvider: false,
  autoCompressContext: false,
  hapticFeedbackEnabled: true,

  // Audio
  sttEnabled: true,
  sttProvider: "openai" as const, // DEPRECATED (2025-12-18): Moved to adminSettings.transcriptProvider - kept for rollback safety only
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
  showTasks: true,
  showSmartAssistant: true,

  // Smart Assistant
  noteCategoryMode: "fixed" as const,
  customNoteCategories: [
    "decision",
    "discussion",
    "action-item",
    "insight",
    "followup",
  ] as string[],

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

  // Memory
  memoryExtractionLevel: "moderate" as const,

  // Accessibility
  highContrastMode: false,
  textScale: 100,
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

  // Auto Router
  autoRouterCostBias: "models",
  autoRouterSpeedBias: "models",

  // Chat
  sendOnEnter: "chat",
  alwaysShowMessageActions: "chat",
  minimalAssistantStyle: "chat",
  showMessageStatistics: "chat",
  showComparisonStatistics: "chat",
  enableHybridSearch: "chat",
  showModelNamesDuringComparison: "chat",
  showModelProvider: "chat",
  autoCompressContext: "chat",
  hapticFeedbackEnabled: "chat",

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
  showTasks: "advanced",
  showSmartAssistant: "advanced",

  // Smart Assistant
  noteCategoryMode: "advanced",
  customNoteCategories: "advanced",

  // Special: nested objects stored as single rows
  customInstructions: "customInstructions",
  reasoning: "reasoning",

  // Memory
  memoryExtractionLevel: "memory",

  // Accessibility
  highContrastMode: "accessibility",
  textScale: "accessibility",
};
