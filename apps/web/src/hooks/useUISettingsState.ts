"use client";

import { api } from "@blah-chat/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUserPreference } from "@/hooks/useUserPreference";
import { analytics } from "@/lib/analytics";
import type { ChatWidth } from "@/lib/utils/chatWidth";

interface ReasoningSettings {
  showByDefault: boolean;
  autoExpand: boolean;
  showDuringStreaming: boolean;
}

export interface UISettingsState {
  alwaysShowMessageActions: boolean;
  autoCompressContext: boolean;
  showModelNamesDuringComparison: boolean;
  showMessageStats: boolean;
  showComparisonStats: boolean;
  showModelProvider: boolean;
  showByDefault: boolean;
  autoExpand: boolean;
  showDuringStreaming: boolean;
  chatWidth: ChatWidth;
  showNotes: boolean;
  showTemplates: boolean;
  showProjects: boolean;
  showBookmarks: boolean;
  showTasks: boolean;
  showSmartAssistant: boolean;
  // Smart Assistant
  noteCategoryMode: "fixed" | "ai-suggested";
  customNoteCategories: string[];
  // Auto Router
  autoRouterCostBias: number;
  autoRouterSpeedBias: number;
}

export interface UISettingsHandlers {
  handleAlwaysShowActionsChange: (checked: boolean) => Promise<void>;
  handleAutoCompressContextChange: (checked: boolean) => Promise<void>;
  handleShowModelNamesChange: (checked: boolean) => Promise<void>;
  handleMessageStatsChange: (checked: boolean) => Promise<void>;
  handleComparisonStatsChange: (checked: boolean) => Promise<void>;
  handleShowModelProviderChange: (checked: boolean) => Promise<void>;
  handleShowByDefaultChange: (checked: boolean) => Promise<void>;
  handleAutoExpandChange: (checked: boolean) => Promise<void>;
  handleShowDuringStreamingChange: (checked: boolean) => Promise<void>;
  handleChatWidthChange: (width: ChatWidth) => Promise<void>;
  handleShowNotesChange: (checked: boolean) => Promise<void>;
  handleShowTemplatesChange: (checked: boolean) => Promise<void>;
  handleShowProjectsChange: (checked: boolean) => Promise<void>;
  handleShowBookmarksChange: (checked: boolean) => Promise<void>;
  handleShowTasksChange: (checked: boolean) => Promise<void>;
  handleShowSmartAssistantChange: (checked: boolean) => Promise<void>;
  // Smart Assistant
  handleNoteCategoryModeChange: (
    mode: "fixed" | "ai-suggested",
  ) => Promise<void>;
  handleCustomNoteCategoriesChange: (categories: string[]) => Promise<void>;
  // Auto Router
  handleCostBiasChange: (value: number) => Promise<void>;
  handleSpeedBiasChange: (value: number) => Promise<void>;
}

/**
 * Hook for managing UI Settings state and handlers.
 * Centralizes all preference management for the UISettings component.
 */
export function useUISettingsState() {
  // @ts-ignore - Type depth exceeded with complex Convex query (85+ modules)
  const user = useQuery(api.users.getCurrentUser);
  // @ts-ignore - Type depth exceeded with complex Convex mutation (85+ modules)
  const updatePreferences = useMutation(api.users.updatePreferences);

  // Get preference values from hooks
  const prefAlwaysShowActions = useUserPreference("alwaysShowMessageActions");
  const prefAutoCompressContext = useUserPreference("autoCompressContext");
  const prefShowModelNames = useUserPreference(
    "showModelNamesDuringComparison",
  );
  const prefShowMessageStats = useUserPreference("showMessageStatistics");
  const prefShowComparisonStats = useUserPreference("showComparisonStatistics");
  const prefShowModelProvider = useUserPreference("showModelProvider");
  const prefReasoning = useUserPreference("reasoning");
  const prefChatWidth = useUserPreference("chatWidth");
  const prefShowNotes = useUserPreference("showNotes");
  const prefShowTemplates = useUserPreference("showTemplates");
  const prefShowProjects = useUserPreference("showProjects");
  const prefShowBookmarks = useUserPreference("showBookmarks");
  const prefShowTasks = useUserPreference("showTasks");
  const prefShowSmartAssistant = useUserPreference("showSmartAssistant");
  const prefNoteCategoryMode = useUserPreference("noteCategoryMode");
  const prefCustomNoteCategories = useUserPreference("customNoteCategories");
  const prefCostBias = useUserPreference("autoRouterCostBias");
  const prefSpeedBias = useUserPreference("autoRouterSpeedBias");

  // Local state for optimistic updates
  const [alwaysShowMessageActions, setAlwaysShowMessageActions] =
    useState<boolean>(prefAlwaysShowActions);
  const [autoCompressContext, setAutoCompressContext] = useState<boolean>(
    prefAutoCompressContext,
  );
  const [showModelNamesDuringComparison, setShowModelNamesDuringComparison] =
    useState<boolean>(prefShowModelNames);
  const [showMessageStats, setShowMessageStats] =
    useState<boolean>(prefShowMessageStats);
  const [showComparisonStats, setShowComparisonStats] = useState<boolean>(
    prefShowComparisonStats,
  );
  const [showModelProvider, setShowModelProvider] = useState<boolean>(
    prefShowModelProvider,
  );
  const [showByDefault, setShowByDefault] = useState<boolean>(
    prefReasoning.showByDefault,
  );
  const [autoExpand, setAutoExpand] = useState<boolean>(
    prefReasoning.autoExpand,
  );
  const [showDuringStreaming, setShowDuringStreaming] = useState<boolean>(
    prefReasoning.showDuringStreaming,
  );
  const [chatWidth, setChatWidth] = useState<ChatWidth>(
    prefChatWidth as ChatWidth,
  );
  const [showNotes, setShowNotes] = useState<boolean>(prefShowNotes);
  const [showTemplates, setShowTemplates] =
    useState<boolean>(prefShowTemplates);
  const [showProjects, setShowProjects] = useState<boolean>(prefShowProjects);
  const [showBookmarks, setShowBookmarks] =
    useState<boolean>(prefShowBookmarks);
  const [showTasks, setShowTasks] = useState<boolean>(prefShowTasks);
  const [showSmartAssistant, setShowSmartAssistant] = useState<boolean>(
    prefShowSmartAssistant,
  );
  const [noteCategoryMode, setNoteCategoryMode] = useState<
    "fixed" | "ai-suggested"
  >(prefNoteCategoryMode as "fixed" | "ai-suggested");
  const [customNoteCategories, setCustomNoteCategories] = useState<string[]>(
    prefCustomNoteCategories as string[],
  );
  const [autoRouterCostBias, setAutoRouterCostBias] =
    useState<number>(prefCostBias);
  const [autoRouterSpeedBias, setAutoRouterSpeedBias] =
    useState<number>(prefSpeedBias);

  // Sync local state when hook values change
  useEffect(
    () => setAlwaysShowMessageActions(prefAlwaysShowActions),
    [prefAlwaysShowActions],
  );
  useEffect(
    () => setAutoCompressContext(prefAutoCompressContext),
    [prefAutoCompressContext],
  );
  useEffect(
    () => setShowModelNamesDuringComparison(prefShowModelNames),
    [prefShowModelNames],
  );
  useEffect(
    () => setShowMessageStats(prefShowMessageStats),
    [prefShowMessageStats],
  );
  useEffect(
    () => setShowComparisonStats(prefShowComparisonStats),
    [prefShowComparisonStats],
  );
  useEffect(
    () => setShowModelProvider(prefShowModelProvider),
    [prefShowModelProvider],
  );
  useEffect(
    () => setShowByDefault(prefReasoning.showByDefault),
    [prefReasoning.showByDefault],
  );
  useEffect(
    () => setAutoExpand(prefReasoning.autoExpand),
    [prefReasoning.autoExpand],
  );
  useEffect(
    () => setShowDuringStreaming(prefReasoning.showDuringStreaming),
    [prefReasoning.showDuringStreaming],
  );
  useEffect(() => setChatWidth(prefChatWidth as ChatWidth), [prefChatWidth]);
  useEffect(() => setShowNotes(prefShowNotes), [prefShowNotes]);
  useEffect(() => setShowTemplates(prefShowTemplates), [prefShowTemplates]);
  useEffect(() => setShowProjects(prefShowProjects), [prefShowProjects]);
  useEffect(() => setShowBookmarks(prefShowBookmarks), [prefShowBookmarks]);
  useEffect(() => setShowTasks(prefShowTasks), [prefShowTasks]);
  useEffect(
    () => setShowSmartAssistant(prefShowSmartAssistant),
    [prefShowSmartAssistant],
  );
  useEffect(
    () => setNoteCategoryMode(prefNoteCategoryMode as "fixed" | "ai-suggested"),
    [prefNoteCategoryMode],
  );
  useEffect(
    () => setCustomNoteCategories(prefCustomNoteCategories as string[]),
    [prefCustomNoteCategories],
  );
  useEffect(() => setAutoRouterCostBias(prefCostBias), [prefCostBias]);
  useEffect(() => setAutoRouterSpeedBias(prefSpeedBias), [prefSpeedBias]);

  // Generic handler for simple boolean preferences
  const createBooleanHandler = (
    key: string,
    setter: (value: boolean) => void,
    analyticsEvent: string,
    successMessage = "Settings saved!",
  ) => {
    return async (checked: boolean) => {
      setter(checked);
      try {
        await updatePreferences({
          preferences: { [key]: checked } as any,
        });
        toast.success(successMessage);
        analytics.track("ui_preference_changed", {
          setting: analyticsEvent,
          value: checked,
          source: "settings_page",
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save");
        setter(!checked);
      }
    };
  };

  // Reasoning handlers need special handling (nested object)
  const createReasoningHandler = (
    field: keyof ReasoningSettings,
    setter: (value: boolean) => void,
  ) => {
    return async (checked: boolean) => {
      setter(checked);
      try {
        await updatePreferences({
          preferences: {
            reasoning: {
              showByDefault:
                field === "showByDefault" ? checked : showByDefault,
              autoExpand: field === "autoExpand" ? checked : autoExpand,
              showDuringStreaming:
                field === "showDuringStreaming" ? checked : showDuringStreaming,
            },
          } as any,
        });
        toast.success("Reasoning settings saved!");
        analytics.track("reasoning_display_changed", {
          setting: field,
          value: checked,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save");
        setter(!checked);
      }
    };
  };

  const handleChatWidthChange = async (width: ChatWidth) => {
    const previousWidth = chatWidth;
    setChatWidth(width);
    try {
      await updatePreferences({
        preferences: { chatWidth: width },
      });
      toast.success("Chat width updated!");
      analytics.track("chat_width_changed", { newWidth: width });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setChatWidth(previousWidth);
    }
  };

  const handleCostBiasChange = async (value: number) => {
    const previous = autoRouterCostBias;
    setAutoRouterCostBias(value);
    try {
      await updatePreferences({
        preferences: { autoRouterCostBias: value },
      });
      toast.success("Cost preference updated!");
      analytics.track("auto_router_cost_bias_changed", { value });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setAutoRouterCostBias(previous);
    }
  };

  const handleSpeedBiasChange = async (value: number) => {
    const previous = autoRouterSpeedBias;
    setAutoRouterSpeedBias(value);
    try {
      await updatePreferences({
        preferences: { autoRouterSpeedBias: value },
      });
      toast.success("Speed preference updated!");
      analytics.track("auto_router_speed_bias_changed", { value });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setAutoRouterSpeedBias(previous);
    }
  };

  const handleNoteCategoryModeChange = async (
    mode: "fixed" | "ai-suggested",
  ) => {
    const previous = noteCategoryMode;
    setNoteCategoryMode(mode);
    try {
      await updatePreferences({
        preferences: { noteCategoryMode: mode },
      });
      toast.success("Note category mode updated!");
      analytics.track("note_category_mode_changed", { mode });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setNoteCategoryMode(previous);
    }
  };

  const handleCustomNoteCategoriesChange = async (categories: string[]) => {
    const previous = customNoteCategories;
    setCustomNoteCategories(categories);
    try {
      await updatePreferences({
        preferences: { customNoteCategories: categories },
      });
      toast.success("Note categories updated!");
      analytics.track("custom_note_categories_changed", {
        count: categories.length,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      setCustomNoteCategories(previous);
    }
  };

  const handlers: UISettingsHandlers = {
    handleAlwaysShowActionsChange: createBooleanHandler(
      "alwaysShowMessageActions",
      setAlwaysShowMessageActions,
      "always_show_message_actions",
      "UI settings saved!",
    ),
    handleAutoCompressContextChange: createBooleanHandler(
      "autoCompressContext",
      setAutoCompressContext,
      "auto_compress_context",
      "Auto-compress setting saved!",
    ),
    handleShowModelNamesChange: createBooleanHandler(
      "showModelNamesDuringComparison",
      setShowModelNamesDuringComparison,
      "show_model_names_during_comparison",
      "UI settings saved!",
    ),
    handleMessageStatsChange: createBooleanHandler(
      "showMessageStatistics",
      setShowMessageStats,
      "show_message_statistics",
    ),
    handleComparisonStatsChange: createBooleanHandler(
      "showComparisonStatistics",
      setShowComparisonStats,
      "show_comparison_statistics",
    ),
    handleShowModelProviderChange: createBooleanHandler(
      "showModelProvider",
      setShowModelProvider,
      "show_model_provider",
    ),
    handleShowByDefaultChange: createReasoningHandler(
      "showByDefault",
      setShowByDefault,
    ),
    handleAutoExpandChange: createReasoningHandler("autoExpand", setAutoExpand),
    handleShowDuringStreamingChange: createReasoningHandler(
      "showDuringStreaming",
      setShowDuringStreaming,
    ),
    handleChatWidthChange,
    handleShowNotesChange: createBooleanHandler(
      "showNotes",
      setShowNotes,
      "show_notes",
    ),
    handleShowTemplatesChange: createBooleanHandler(
      "showTemplates",
      setShowTemplates,
      "show_templates",
    ),
    handleShowProjectsChange: createBooleanHandler(
      "showProjects",
      setShowProjects,
      "show_projects",
    ),
    handleShowBookmarksChange: createBooleanHandler(
      "showBookmarks",
      setShowBookmarks,
      "show_bookmarks",
    ),
    handleShowTasksChange: createBooleanHandler(
      "showTasks",
      setShowTasks,
      "show_tasks",
    ),
    handleShowSmartAssistantChange: createBooleanHandler(
      "showSmartAssistant",
      setShowSmartAssistant,
      "show_smart_assistant",
    ),
    // Smart Assistant
    handleNoteCategoryModeChange,
    handleCustomNoteCategoriesChange,
    // Auto Router
    handleCostBiasChange,
    handleSpeedBiasChange,
  };

  const state: UISettingsState = {
    alwaysShowMessageActions,
    autoCompressContext,
    showModelNamesDuringComparison,
    showMessageStats,
    showComparisonStats,
    showModelProvider,
    showByDefault,
    autoExpand,
    showDuringStreaming,
    chatWidth,
    showNotes,
    showTemplates,
    showProjects,
    showBookmarks,
    showTasks,
    showSmartAssistant,
    // Smart Assistant
    noteCategoryMode,
    customNoteCategories,
    // Auto Router
    autoRouterCostBias,
    autoRouterSpeedBias,
  };

  return {
    state,
    handlers,
    isLoading: !user,
  };
}
