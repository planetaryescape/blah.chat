import { describe, expect, it, vi } from "vitest";
import { UpstashGenerationEventStore } from "../store";

const event = {
  requestId: "req_1",
  sessionId: "sess_1",
  assistantMessageId: "msg_1",
  modelId: "openai/gpt-5-mini",
  seq: 0,
  ts: 1,
  type: "start" as const,
};

describe("UpstashGenerationEventStore", () => {
  it("reads stringified generation events", async () => {
    const redis = {
      lrange: vi.fn().mockResolvedValue([JSON.stringify(event)]),
    } as any;

    const store = new UpstashGenerationEventStore(redis);
    const result = await store.read("req_1");

    expect(result.events).toEqual([event]);
    expect(result.nextCursor).toBe(0);
  });

  it("reads object generation events returned by local Upstash dev", async () => {
    const redis = {
      lrange: vi.fn().mockResolvedValue([event]),
    } as any;

    const store = new UpstashGenerationEventStore(redis);
    const result = await store.read("req_1");

    expect(result.events).toEqual([event]);
    expect(result.nextCursor).toBe(0);
  });
});
