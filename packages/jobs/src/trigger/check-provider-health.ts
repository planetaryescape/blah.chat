import { getModel } from "@blah-chat/ai/registry";
import {
  createNeonDatabase,
  type PersistenceDb,
  providerHealthSnapshots,
} from "@blah-chat/persistence-postgres";
import { schedules } from "@trigger.dev/sdk";
import { generateText } from "ai";

export const PROVIDER_PROBE_MODELS: Array<{
  provider: string;
  modelId: string;
}> = [
  { provider: "openai", modelId: "openai:gpt-5-mini" },
  { provider: "anthropic", modelId: "anthropic:claude-haiku-4.5" },
  { provider: "google", modelId: "google:gemini-2.5-flash" },
];

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  return databaseUrl;
}

export const CHECK_PROVIDER_HEALTH_CRON = {
  pattern: "0 * * * *",
  timezone: "UTC",
  environments: ["PRODUCTION"] as Array<"PRODUCTION">,
};

export type ProbeResult = {
  provider: string;
  modelId: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  successRate: number;
};

async function defaultProbeProvider(probe: {
  provider: string;
  modelId: string;
}): Promise<ProbeResult> {
  const start = performance.now();
  try {
    await generateText({
      model: getModel(probe.modelId),
      prompt: "Reply with OK.",
      maxOutputTokens: 5,
    });
    const latencyMs = Math.round(performance.now() - start);
    return {
      provider: probe.provider,
      modelId: probe.modelId,
      status: latencyMs > 10_000 ? "degraded" : "healthy",
      latencyMs,
      successRate: 1,
    };
  } catch {
    const latencyMs = Math.round(performance.now() - start);
    return {
      provider: probe.provider,
      modelId: probe.modelId,
      status: "down",
      latencyMs,
      successRate: 0,
    };
  }
}

export interface CheckProviderHealthDependencies {
  db?: PersistenceDb;
  now?: () => number;
  probeProvider?: (probe: {
    provider: string;
    modelId: string;
  }) => Promise<ProbeResult>;
  probes?: Array<{ provider: string; modelId: string }>;
}

export async function checkProviderHealth(
  dependencies: CheckProviderHealthDependencies = {},
) {
  const db = dependencies.db ?? createNeonDatabase(getDatabaseUrl());
  const now = dependencies.now ?? (() => Date.now());
  const probeProvider = dependencies.probeProvider ?? defaultProbeProvider;
  const probes = dependencies.probes ?? PROVIDER_PROBE_MODELS;

  const results = await Promise.allSettled(
    probes.map((probe) => probeProvider(probe)),
  );

  const snapshots = results
    .filter(
      (r): r is PromiseFulfilledResult<ProbeResult> => r.status === "fulfilled",
    )
    .map((r) => r.value);

  if (snapshots.length > 0) {
    await db.insert(providerHealthSnapshots).values(
      snapshots.map((s) => ({
        provider: s.provider,
        modelId: s.modelId,
        status: s.status,
        latencyMs: s.latencyMs,
        successRate: s.successRate,
        metadata: null,
        capturedAt: now(),
      })),
    );
  }

  return {
    probed: snapshots.length,
    results: snapshots.map((s) => ({
      provider: s.provider,
      status: s.status,
      latencyMs: s.latencyMs,
    })),
  };
}

export const checkProviderHealthTask = schedules.task({
  id: "check-provider-health",
  cron: CHECK_PROVIDER_HEALTH_CRON,
  maxDuration: 60,
  retry: {
    maxAttempts: 1,
  },
  run: async () => {
    return checkProviderHealth();
  },
});
