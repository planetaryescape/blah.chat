export type StarterSuggestionIcon = "sparkles" | "brain" | "zap" | "penLine";

/** Number of suggestions shown to the user at once (subset of cached pool) */
export const VISIBLE_SUGGESTION_COUNT = 3;

export type StarterSuggestion = {
  id: string;
  text: string;
  icon: StarterSuggestionIcon;
};

export type StarterSuggestionsSource = "cache" | "fallback";

export type StarterSuggestionsResponse = {
  suggestions: StarterSuggestion[];
  needsRefresh: boolean;
  generatedAt: number;
  source: StarterSuggestionsSource;
};
