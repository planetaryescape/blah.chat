export type StarterSuggestionIcon = "sparkles" | "brain" | "zap" | "penLine";

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
