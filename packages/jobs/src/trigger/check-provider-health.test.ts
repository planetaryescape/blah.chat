import { providerHealthSnapshots } from "@blah-chat/persistence-postgres";
import { describe, expect, it } from "vitest";
import { createTestPersistenceDb } from "../../../persistence-postgres/src/testing/pglite";
import { checkProviderHealth, type ProbeResult } from "./check-provider-health";

describe("checkProviderHealth", () => {
  it("inserts health snapshots for all healthy providers", async () => {
    const db = await createTestPersistenceDb();

    const probeProvider = async (probe: {
      provider: string;
      modelId: string;
    }): Promise<ProbeResult> => ({
      provider: probe.provider,
      modelId: probe.modelId,
      status: "healthy",
      latencyMs: 200,
      successRate: 1,
    });

    const result = await checkProviderHealth({
      db,
      now: () => 1000,
      probeProvider,
      probes: [
        { provider: "openai", modelId: "openai:gpt-5-mini" },
        { provider: "anthropic", modelId: "anthropic:claude-haiku-4.5" },
        { provider: "google", modelId: "google:gemini-2.5-flash" },
      ],
    });

    expect(result.probed).toBe(3);
    expect(result.results).toHaveLength(3);
    expect(result.results.every((r) => r.status === "healthy")).toBe(true);

    const rows = await db.select().from(providerHealthSnapshots);
    expect(rows).toHaveLength(3);
    expect(rows[0].capturedAt).toBe(1000);
    expect(rows[0].status).toBe("healthy");
  });

  it("records down status when a provider probe fails", async () => {
    const db = await createTestPersistenceDb();

    const probeProvider = async (probe: {
      provider: string;
      modelId: string;
    }): Promise<ProbeResult> => ({
      provider: probe.provider,
      modelId: probe.modelId,
      status: "down",
      latencyMs: 5000,
      successRate: 0,
    });

    const result = await checkProviderHealth({
      db,
      now: () => 2000,
      probeProvider,
      probes: [{ provider: "openai", modelId: "openai:gpt-5-mini" }],
    });

    expect(result.probed).toBe(1);
    expect(result.results[0].status).toBe("down");

    const rows = await db.select().from(providerHealthSnapshots);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("down");
    expect(rows[0].successRate).toBe(0);
  });

  it("still inserts successful snapshots when some probes reject", async () => {
    const db = await createTestPersistenceDb();

    let callIndex = 0;
    const probeProvider = async (probe: {
      provider: string;
      modelId: string;
    }): Promise<ProbeResult> => {
      callIndex++;
      if (callIndex === 2) {
        throw new Error("Network timeout");
      }
      return {
        provider: probe.provider,
        modelId: probe.modelId,
        status: "healthy",
        latencyMs: 150,
        successRate: 1,
      };
    };

    const result = await checkProviderHealth({
      db,
      now: () => 3000,
      probeProvider,
      probes: [
        { provider: "openai", modelId: "openai:gpt-5-mini" },
        { provider: "anthropic", modelId: "anthropic:claude-haiku-4.5" },
        { provider: "google", modelId: "google:gemini-2.5-flash" },
      ],
    });

    expect(result.probed).toBe(2);

    const rows = await db.select().from(providerHealthSnapshots);
    expect(rows).toHaveLength(2);
  });

  it("marks degraded when latency exceeds 10 seconds", async () => {
    const db = await createTestPersistenceDb();

    const probeProvider = async (probe: {
      provider: string;
      modelId: string;
    }): Promise<ProbeResult> => ({
      provider: probe.provider,
      modelId: probe.modelId,
      status: "degraded",
      latencyMs: 12000,
      successRate: 1,
    });

    const result = await checkProviderHealth({
      db,
      now: () => 4000,
      probeProvider,
      probes: [{ provider: "openai", modelId: "openai:gpt-5-mini" }],
    });

    expect(result.results[0].status).toBe("degraded");
    expect(result.results[0].latencyMs).toBe(12000);

    const rows = await db.select().from(providerHealthSnapshots);
    expect(rows[0].status).toBe("degraded");
  });

  it("handles empty probes list without inserting", async () => {
    const db = await createTestPersistenceDb();

    const result = await checkProviderHealth({
      db,
      now: () => 5000,
      probeProvider: async () => {
        throw new Error("should not be called");
      },
      probes: [],
    });

    expect(result.probed).toBe(0);
    expect(result.results).toHaveLength(0);

    const rows = await db.select().from(providerHealthSnapshots);
    expect(rows).toHaveLength(0);
  });
});
