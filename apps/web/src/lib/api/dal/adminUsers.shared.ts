import type { AdminUserTier } from "@blah-chat/persistence-postgres";
import { usageRecords } from "@blah-chat/persistence-postgres";
import { and, gte, lte } from "drizzle-orm";
import { z } from "zod";

export const adminUserTierValues = ["free", "tier1", "tier2"] as const;

export const updateRoleSchema = z.object({
  isAdmin: z.boolean(),
});

export const updateTierSchema = z.object({
  tier: z.enum(adminUserTierValues),
});

export const dateRangeSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

const clerkAdminMetadataSchema = z
  .object({
    isAdmin: z.boolean().optional(),
    tier: z.enum(adminUserTierValues).optional(),
  })
  .passthrough();

export interface ClerkAdminMetadata {
  isAdmin: boolean;
  tier: AdminUserTier;
}

export interface AdminUserDto {
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

export const ADMIN_SETTINGS_RECONCILE_INTERVAL_MS = 15 * 60 * 1000;
export const ADMIN_SETTINGS_RECONCILE_BATCH_SIZE = 10;

export function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function emptyCostByFeature() {
  return {
    chat: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
    notes: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
    tasks: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
    files: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
    memory: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
    smart_assistant: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
    slides: { total: 0, text: 0, tts: 0, stt: 0, image: 0 },
  };
}

export function getDateFilter(startDate: string, endDate: string) {
  return and(
    gte(usageRecords.date, startDate),
    lte(usageRecords.date, endDate),
  );
}

export function toAdminUserDto(user: {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  imageUrl: string | null;
  isAdmin: boolean;
  tier: AdminUserTier;
  createdAt: number;
  lastMessageDate?: string | null;
}): AdminUserDto {
  return {
    _id: user._id,
    clerkId: user.clerkId,
    name: user.name,
    email: user.email,
    imageUrl: user.imageUrl ?? undefined,
    isAdmin: user.isAdmin,
    tier: user.tier,
    createdAt: user.createdAt,
    lastMessageDate: user.lastMessageDate ?? undefined,
  };
}

export function parseClerkAdminMetadata(
  publicMetadata: unknown,
): ClerkAdminMetadata {
  const rawMetadata =
    publicMetadata && typeof publicMetadata === "object"
      ? (publicMetadata as Record<string, unknown>)
      : {};
  const parsed = clerkAdminMetadataSchema.safeParse(rawMetadata);
  const metadata = parsed.success ? parsed.data : {};
  const isAdmin =
    metadata.isAdmin ??
    (typeof rawMetadata.isAdmin === "boolean" ? rawMetadata.isAdmin : false);

  return {
    isAdmin,
    tier: metadata.tier ?? "free",
  };
}
