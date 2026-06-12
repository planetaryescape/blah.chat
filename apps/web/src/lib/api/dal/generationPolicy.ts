import { getModelConfig } from "@blah-chat/ai";
import {
  type PersistenceDb,
  userAdminSettings,
} from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import logger from "@/lib/logger";
import { getAdminSettings } from "@/lib/persistence/adminSettings";
import { getMonthlyTotal } from "@/lib/persistence/usageAggregates";
import "server-only";

/**
 * Pro-model classification. Mirrors the client-side QuickModelSwitcher
 * heuristic: explicit `isPro` flag OR price threshold ($5/M input or
 * $15/M output).
 */
export function isProModel(modelId: string): boolean {
  const config = getModelConfig(modelId);
  if (!config) {
    return false;
  }
  return (
    config.isPro === true ||
    (config.pricing?.input ?? 0) >= 5 ||
    (config.pricing?.output ?? 0) >= 15
  );
}

/**
 * Server-side enforcement of admin settings at the generation entry points
 * (send + regenerate). Throws a 403 ApiError when the request is not allowed:
 *
 * - "pro_models_disabled": a pro-tier model was requested while
 *   `proTier.proModelsEnabled` is off and the user is not an admin.
 * - "budget_exceeded": `limits.budgetHardLimitEnabled` is on and the user's
 *   current-month spend has reached `limits.defaultMonthlyBudget`.
 *
 * Admin settings are read via the unstable_cache-wrapped getAdminSettings, so
 * the steady-state cost per send is one cached read plus (when the hard limit
 * is enabled) one SUM over the user's usage records.
 */
export async function assertGenerationAllowed(input: {
  db: PersistenceDb;
  /** Persistence (not Clerk) user id. */
  userId: string;
  requestedModelIds: Array<string | null | undefined>;
  source: "send" | "regenerate";
}): Promise<void> {
  const settings = await getAdminSettings();

  const modelIds = input.requestedModelIds.filter(
    (modelId): modelId is string => Boolean(modelId),
  );
  const proModelIds = modelIds.filter(isProModel);

  if (proModelIds.length > 0 && !settings.proTier.proModelsEnabled) {
    const adminRow = await input.db.query.userAdminSettings.findFirst({
      where: eq(userAdminSettings.userId, input.userId),
    });
    if (adminRow?.isAdmin !== true) {
      logger.warn(
        { userId: input.userId, proModelIds, source: input.source },
        "Generation denied: pro models disabled by admin settings",
      );
      throw new ApiError(
        403,
        "Pro models are currently disabled by the administrator",
        "pro_models_disabled",
      );
    }
  }
  // NOTE: per-tier pro-model quotas (proTier.tier1DailyProModelLimit /
  // tier2MonthlyProModelLimit) are not enforced yet — only the global
  // proModelsEnabled switch.

  const { budgetHardLimitEnabled, defaultMonthlyBudget } = settings.limits;
  if (budgetHardLimitEnabled && defaultMonthlyBudget > 0) {
    const monthly = await getMonthlyTotal({ userId: input.userId });
    if (monthly.cost >= defaultMonthlyBudget) {
      logger.warn(
        {
          userId: input.userId,
          monthlySpend: monthly.cost,
          budget: defaultMonthlyBudget,
          source: input.source,
        },
        "Generation denied: monthly budget hard limit reached",
      );
      throw new ApiError(
        403,
        "Monthly budget exceeded. Generation is blocked until the budget resets or an admin raises it",
        "budget_exceeded",
      );
    }
  }
}
