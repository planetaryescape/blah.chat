import {
  getStarterSuggestions,
  refreshStarterSuggestions,
} from "@/lib/persistence/starterSuggestions";
import { formatEntity } from "@/lib/utils/formatEntity";
import "server-only";

export const starterSuggestionsDAL = {
  get: async (clerkUserId: string) => {
    const result = await getStarterSuggestions(clerkUserId);
    return formatEntity(result, "starterSuggestions");
  },

  refresh: async (
    clerkUserId: string,
    payload: {
      force?: boolean;
    } = {},
  ) => {
    const result = await refreshStarterSuggestions(clerkUserId, payload);
    return formatEntity(result, "starterSuggestions");
  },
};
