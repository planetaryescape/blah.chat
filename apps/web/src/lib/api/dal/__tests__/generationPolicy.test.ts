/**
 * @vitest-environment node
 */
import type { PersistenceDb } from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminSettings, getMonthlyTotal } = vi.hoisted(() => ({
  getAdminSettings: vi.fn(),
  getMonthlyTotal: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/persistence/adminSettings", () => ({
  getAdminSettings,
}));

vi.mock("@/lib/persistence/usageAggregates", () => ({
  getMonthlyTotal,
}));

import { ApiError } from "@/lib/api/errors";
import { assertGenerationAllowed, isProModel } from "../generationPolicy";

// Real MODEL_CONFIG entries: opus is pro (input $5/M), gpt-5 is not.
const PRO_MODEL = "anthropic:claude-opus-4.5";
const STANDARD_MODEL = "openai:gpt-5";

const adminLookup = vi.fn();

function fakeDb(): PersistenceDb {
  return {
    query: {
      userAdminSettings: {
        findFirst: adminLookup,
      },
    },
  } as unknown as PersistenceDb;
}

function settings(overrides?: {
  proModelsEnabled?: boolean;
  budgetHardLimitEnabled?: boolean;
  defaultMonthlyBudget?: number;
}) {
  return {
    limits: {
      defaultMonthlyBudget: overrides?.defaultMonthlyBudget ?? 10,
      defaultBudgetAlertThreshold: 0.8,
      budgetHardLimitEnabled: overrides?.budgetHardLimitEnabled ?? false,
      defaultDailyMessageLimit: 50,
      defaultMaxIntegrations: 5,
    },
    proTier: {
      proModelsEnabled: overrides?.proModelsEnabled ?? true,
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
      provider: "groq" as const,
      costPerMinute: 0.0067,
    },
  };
}

function monthly(cost: number) {
  return {
    month: "2026-06",
    cost,
    tokens: 0,
    messages: 0,
    budget: 10,
    percentUsed: 0,
  };
}

describe("isProModel", () => {
  it("classifies by price threshold", () => {
    expect(isProModel(PRO_MODEL)).toBe(true);
    expect(isProModel(STANDARD_MODEL)).toBe(false);
  });

  it("treats unknown models as non-pro", () => {
    expect(isProModel("")).toBe(false);
  });
});

describe("assertGenerationAllowed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMonthlyTotal.mockResolvedValue(monthly(0));
  });

  it("throws 403 pro_models_disabled for non-admins when pro models are off", async () => {
    getAdminSettings.mockResolvedValue(settings({ proModelsEnabled: false }));
    adminLookup.mockResolvedValue({ userId: "u1", isAdmin: false });

    const error = await assertGenerationAllowed({
      db: fakeDb(),
      userId: "u1",
      requestedModelIds: [PRO_MODEL],
      source: "send",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).code).toBe("pro_models_disabled");
  });

  it("allows admins to use pro models even when disabled", async () => {
    getAdminSettings.mockResolvedValue(settings({ proModelsEnabled: false }));
    adminLookup.mockResolvedValue({ userId: "u1", isAdmin: true });

    await expect(
      assertGenerationAllowed({
        db: fakeDb(),
        userId: "u1",
        requestedModelIds: [PRO_MODEL],
        source: "regenerate",
      }),
    ).resolves.toBeUndefined();
  });

  it("skips the admin lookup entirely for non-pro models", async () => {
    getAdminSettings.mockResolvedValue(settings({ proModelsEnabled: false }));

    await expect(
      assertGenerationAllowed({
        db: fakeDb(),
        userId: "u1",
        requestedModelIds: [STANDARD_MODEL],
        source: "send",
      }),
    ).resolves.toBeUndefined();
    expect(adminLookup).not.toHaveBeenCalled();
  });

  it("throws 403 budget_exceeded when monthly spend reaches the budget", async () => {
    getAdminSettings.mockResolvedValue(
      settings({ budgetHardLimitEnabled: true, defaultMonthlyBudget: 10 }),
    );
    getMonthlyTotal.mockResolvedValue(monthly(12.5));

    const error = await assertGenerationAllowed({
      db: fakeDb(),
      userId: "u1",
      requestedModelIds: [STANDARD_MODEL],
      source: "send",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(403);
    expect((error as ApiError).code).toBe("budget_exceeded");
    expect(getMonthlyTotal).toHaveBeenCalledWith({ userId: "u1" });
  });

  it("skips the budget check when the budget is 0/unset", async () => {
    getAdminSettings.mockResolvedValue(
      settings({ budgetHardLimitEnabled: true, defaultMonthlyBudget: 0 }),
    );

    await expect(
      assertGenerationAllowed({
        db: fakeDb(),
        userId: "u1",
        requestedModelIds: [STANDARD_MODEL],
        source: "send",
      }),
    ).resolves.toBeUndefined();
    expect(getMonthlyTotal).not.toHaveBeenCalled();
  });

  it("skips the budget check when the hard limit is disabled", async () => {
    getAdminSettings.mockResolvedValue(
      settings({ budgetHardLimitEnabled: false }),
    );

    await expect(
      assertGenerationAllowed({
        db: fakeDb(),
        userId: "u1",
        requestedModelIds: [STANDARD_MODEL],
        source: "send",
      }),
    ).resolves.toBeUndefined();
    expect(getMonthlyTotal).not.toHaveBeenCalled();
  });

  it("passes the happy path: pro models enabled, spend under budget", async () => {
    getAdminSettings.mockResolvedValue(
      settings({
        proModelsEnabled: true,
        budgetHardLimitEnabled: true,
        defaultMonthlyBudget: 10,
      }),
    );
    getMonthlyTotal.mockResolvedValue(monthly(2));

    await expect(
      assertGenerationAllowed({
        db: fakeDb(),
        userId: "u1",
        requestedModelIds: [PRO_MODEL, STANDARD_MODEL],
        source: "send",
      }),
    ).resolves.toBeUndefined();
  });
});
