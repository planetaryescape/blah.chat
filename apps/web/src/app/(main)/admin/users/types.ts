import type { EntityListItem } from "@/lib/utils/formatEntity";

export type AdminUserTier = "free" | "tier1" | "tier2";

export interface AdminUser {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  imageUrl?: string;
  isAdmin: boolean;
  tier: AdminUserTier;
  createdAt: number;
  lastMessageDate?: string;
}

export interface AdminUsageSummaryRow {
  userId: string;
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
}

export interface AdminUsageSummary {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  avgCostPerRequest: number;
  messageCount: number;
}

export interface AdminDailySpendRow {
  date: string;
  messageCount: number;
  requestCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
}

export interface AdminModelBreakdownRow {
  model: string;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
}

interface CostBucket {
  cost: number;
}

export interface AdminCostByType {
  textGeneration: CostBucket;
  tts: CostBucket;
  transcription: CostBucket;
  images: CostBucket;
  slides: CostBucket;
}

interface AdminFeatureCostBucket {
  total: number;
  text: number;
  tts: number;
  stt: number;
  image: number;
}

export type AdminFeatureCostBreakdown = Record<string, AdminFeatureCostBucket>;

export interface AdminActivityStats {
  notesCount: number;
  projectsCount: number;
  bookmarksCount: number;
  templatesCount: number;
  tasksCount: number;
}

interface EntityListResponse {
  data?: unknown[];
}

export function unwrapEntityList<T extends object>(
  response: EntityListResponse | null | undefined,
): T[] {
  return (response?.data ?? []).map((item) =>
    typeof item === "object" && item !== null && "data" in item
      ? (item as EntityListItem<T>).data
      : (item as T),
  );
}
