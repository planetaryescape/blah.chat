export type SuggestionIcon = "sparkles" | "brain" | "zap" | "penLine";

export type SuggestedPrompt = {
  id: string;
  text: string;
  icon: SuggestionIcon;
};

export const EMERGENCY_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: "starter-plan-next-week",
    text: "Plan my week around the priorities I should focus on first",
    icon: "sparkles",
  },
  {
    id: "starter-clarify-draft",
    text: "Rewrite this draft so it is clear, concise, and confident",
    icon: "penLine",
  },
  {
    id: "starter-debug-issue",
    text: "Help me debug this issue step by step and propose the safest fix",
    icon: "brain",
  },
  {
    id: "starter-compare-options",
    text: "Compare these options and recommend one with clear tradeoffs",
    icon: "zap",
  },
  {
    id: "starter-follow-up",
    text: "Draft a short follow-up message for this conversation",
    icon: "sparkles",
  },
];

export function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
