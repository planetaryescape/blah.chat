import type { ApiResponse } from "@/lib/api/types";
import type { EntityListItem } from "@/lib/utils/formatEntity";

export type AdminUserTier = "free" | "tier1" | "tier2";

export type AdminUser = {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  imageUrl?: string;
  isAdmin: boolean;
  tier: AdminUserTier;
  createdAt: number;
  lastMessageDate?: string;
};

export type AdminUsageSummaryRow = {
  userId: string;
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
};

export type AdminUsageSummary = {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  avgCostPerRequest: number;
  messageCount: number;
};

export type AdminDailySpendRow = {
  date: string;
  messageCount: number;
  requestCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
};

export type AdminModelBreakdownRow = {
  model: string;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
};

type CostBucket = {
  cost: number;
};

export type AdminCostByType = {
  textGeneration: CostBucket;
  tts: CostBucket;
  transcription: CostBucket;
  images: CostBucket;
  slides: CostBucket;
};

export type AdminFeatureCostBreakdown = Record<
  string,
  {
    total: number;
    text: number;
    tts: number;
    stt: number;
    image: number;
  }
>;

export type AdminActivityStats = {
  notesCount: number;
  projectsCount: number;
  bookmarksCount: number;
  templatesCount: number;
  tasksCount: number;
};

export function unwrapEntityList<T>(
  response: ApiResponse<Array<EntityListItem<T> | T>> | null | undefined,
): T[] {
  return (response?.data ?? []).map((item) =>
    typeof item === "object" && item !== null && "data" in item
      ? item.data
      : item,
  );
}
