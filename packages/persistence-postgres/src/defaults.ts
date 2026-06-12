import type { AdminSettingsValue, AutoRouterConfigValue } from "./schema";

export const DEFAULT_ADMIN_SETTINGS: AdminSettingsValue = {
  limits: {
    defaultMonthlyBudget: 10,
    defaultBudgetAlertThreshold: 0.8,
    budgetHardLimitEnabled: true,
    defaultDailyMessageLimit: 50,
    defaultMaxIntegrations: 5,
  },
  proTier: {
    proModelsEnabled: false,
    tier1DailyProModelLimit: 1,
    tier2MonthlyProModelLimit: 50,
  },
  search: {
    hybridEnabled: true,
    rrfK: 60,
    maxResults: 20,
    embeddingsEnabled: true,
  },
  memory: {
    maxMemoriesPerUser: 1000,
    autoExtractionEnabled: true,
    consolidationIntervalDays: 30,
    extractEveryNMessages: 5,
  },
  transcriptProvider: {
    provider: "groq",
    costPerMinute: 0.0067,
  },
};

export const DEFAULT_AUTO_ROUTER_CONFIG: AutoRouterConfigValue = {
  contextBuffer: 1.2,
  longContextThreshold: 128_000,
  classifierConfidenceThreshold: 0.82,
  classifierTopK: 5,
  classifierFallbackEnabled: true,
};

export function mergeAdminSettings(
  partial: Partial<AdminSettingsValue> | undefined,
): AdminSettingsValue {
  return {
    limits: { ...DEFAULT_ADMIN_SETTINGS.limits, ...partial?.limits },
    proTier: { ...DEFAULT_ADMIN_SETTINGS.proTier, ...partial?.proTier },
    search: { ...DEFAULT_ADMIN_SETTINGS.search, ...partial?.search },
    memory: { ...DEFAULT_ADMIN_SETTINGS.memory, ...partial?.memory },
    transcriptProvider: {
      ...DEFAULT_ADMIN_SETTINGS.transcriptProvider,
      ...partial?.transcriptProvider,
    },
  };
}

export function mergeAutoRouterConfig(
  partial: Partial<AutoRouterConfigValue> | undefined,
): AutoRouterConfigValue {
  return {
    ...DEFAULT_AUTO_ROUTER_CONFIG,
    ...partial,
  };
}
