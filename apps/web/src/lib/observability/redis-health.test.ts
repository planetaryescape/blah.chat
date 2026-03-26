/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { MemoryGenerationEventStore } from "../generation-v2/store";
import { checkRedisStreamHealth } from "./redis-health";

describe("checkRedisStreamHealth", () => {
  it("returns stale streams when no terminal event exists past TTL", async () => {
    const store = new MemoryGenerationEventStore();
    const now = 100_000;

    // Append a non-terminal event with old timestamp
    await store.append("req_1", {
      requestId: "req_1",
      sessionId: "sess_1",
      assistantMessageId: "msg_1",
      modelId: "openai:gpt-5-mini",
      seq: 0,
      ts: now - 120_000, // 2 minutes ago
      type: "delta",
      delta: "hello",
    });

    const result = await checkRedisStreamHealth({
      store,
      requestIds: ["req_1"],
      now,
      staleTtlMs: 60_000,
    });

    expect(result.staleStreams).toEqual(["req_1"]);
    expect(result.healthyStreams).toEqual([]);
  });

  it("returns healthy when stream has terminal event", async () => {
    const store = new MemoryGenerationEventStore();
    const now = 100_000;

    await store.append("req_1", {
      requestId: "req_1",
      sessionId: "sess_1",
      assistantMessageId: "msg_1",
      modelId: "openai:gpt-5-mini",
      seq: 0,
      ts: now - 5_000,
      type: "complete",
      content: "done",
    });

    const result = await checkRedisStreamHealth({
      store,
      requestIds: ["req_1"],
      now,
      staleTtlMs: 60_000,
    });

    expect(result.staleStreams).toEqual([]);
    expect(result.healthyStreams).toEqual(["req_1"]);
  });

  it("returns healthy when non-terminal stream is recent", async () => {
    const store = new MemoryGenerationEventStore();
    const now = 100_000;

    // Recent non-terminal event (within TTL)
    await store.append("req_1", {
      requestId: "req_1",
      sessionId: "sess_1",
      assistantMessageId: "msg_1",
      modelId: "openai:gpt-5-mini",
      seq: 0,
      ts: now - 10_000, // 10 seconds ago, within 60s TTL
      type: "delta",
      delta: "streaming...",
    });

    const result = await checkRedisStreamHealth({
      store,
      requestIds: ["req_1"],
      now,
      staleTtlMs: 60_000,
    });

    expect(result.staleStreams).toEqual([]);
    expect(result.healthyStreams).toEqual(["req_1"]);
  });

  it("handles mixed healthy and stale streams", async () => {
    const store = new MemoryGenerationEventStore();
    const now = 100_000;

    // Healthy: complete
    await store.append("req_healthy", {
      requestId: "req_healthy",
      sessionId: "sess_h",
      assistantMessageId: "msg_h",
      modelId: "openai:gpt-5-mini",
      seq: 0,
      ts: now - 5_000,
      type: "complete",
      content: "done",
    });

    // Stale: old delta, no terminal
    await store.append("req_stale", {
      requestId: "req_stale",
      sessionId: "sess_s",
      assistantMessageId: "msg_s",
      modelId: "openai:gpt-5-mini",
      seq: 0,
      ts: now - 120_000,
      type: "delta",
      delta: "stuck",
    });

    const result = await checkRedisStreamHealth({
      store,
      requestIds: ["req_healthy", "req_stale"],
      now,
      staleTtlMs: 60_000,
    });

    expect(result.healthyStreams).toEqual(["req_healthy"]);
    expect(result.staleStreams).toEqual(["req_stale"]);
  });

  it("handles empty request list", async () => {
    const store = new MemoryGenerationEventStore();

    const result = await checkRedisStreamHealth({
      store,
      requestIds: [],
      now: Date.now(),
      staleTtlMs: 60_000,
    });

    expect(result.staleStreams).toEqual([]);
    expect(result.healthyStreams).toEqual([]);
  });

  it("handles request with no events in store", async () => {
    const store = new MemoryGenerationEventStore();

    const result = await checkRedisStreamHealth({
      store,
      requestIds: ["req_missing"],
      now: Date.now(),
      staleTtlMs: 60_000,
    });

    // No events = treat as stale (zombie request)
    expect(result.staleStreams).toEqual(["req_missing"]);
  });
});
