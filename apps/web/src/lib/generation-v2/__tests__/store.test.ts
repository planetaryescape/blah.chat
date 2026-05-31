import {
  generationCancelKey,
  generationRequestMetaKey,
  generationSessionStateKey,
} from "@blah-chat/streaming-core";
import { describe, expect, it, vi } from "vitest";
import { RedisGenerationEventStore } from "../store";

const event = {
  requestId: "req_1",
  sessionId: "sess_1",
  assistantMessageId: "msg_1",
  modelId: "openai/gpt-5-mini",
  seq: 0,
  ts: 1,
  type: "start" as const,
};

type RedisClient = ConstructorParameters<typeof RedisGenerationEventStore>[0];
type MockRedis = {
  [K in keyof RedisClient]: ReturnType<typeof vi.fn<RedisClient[K]>>;
};

function createRedisMock(): MockRedis {
  return {
    ping: vi.fn<RedisClient["ping"]>(),
    rpush: vi.fn<RedisClient["rpush"]>(),
    expire: vi.fn<RedisClient["expire"]>(),
    lrange: vi.fn<RedisClient["lrange"]>(),
    setex: vi.fn<RedisClient["setex"]>(),
    del: vi.fn<RedisClient["del"]>(),
    get: vi.fn<RedisClient["get"]>(),
  };
}

function createStore(redis = createRedisMock()) {
  return {
    redis,
    store: new RedisGenerationEventStore(redis as unknown as RedisClient),
  };
}

describe("RedisGenerationEventStore", () => {
  it("appends events as JSON and refreshes the stream TTL", async () => {
    const { redis, store } = createStore();
    redis.rpush.mockResolvedValue(3);
    redis.expire.mockResolvedValue(1);
    const index = await store.append("req_1", event);

    expect(index).toBe(2);
    expect(redis.rpush).toHaveBeenCalledWith(
      `${generationRequestMetaKey("req_1")}:events`,
      JSON.stringify(event),
    );
    expect(redis.expire).toHaveBeenCalledWith(
      `${generationRequestMetaKey("req_1")}:events`,
      60 * 60,
    );
  });

  it("reads stringified generation events from the next cursor", async () => {
    const { redis, store } = createStore();
    redis.lrange.mockResolvedValue([JSON.stringify(event)]);
    const result = await store.read("req_1", 1);

    expect(result.events).toEqual([event]);
    expect(result.nextCursor).toBe(2);
    expect(redis.lrange).toHaveBeenCalledWith(
      `${generationRequestMetaKey("req_1")}:events`,
      2,
      -1,
    );
  });

  it("reads object generation events returned by the current redis client", async () => {
    const { redis, store } = createStore();
    redis.lrange.mockResolvedValue([{ ...event }]);
    const result = await store.read("req_1");

    expect(result.events).toEqual([event]);
    expect(result.nextCursor).toBe(0);
  });

  it("stores and clears request cancellation flags", async () => {
    const { redis, store } = createStore();
    redis.setex.mockResolvedValue("OK");
    redis.del.mockResolvedValue(1);
    redis.get.mockResolvedValueOnce("1").mockResolvedValueOnce(null);

    await store.setCancelled("req_1", true);
    expect(redis.setex).toHaveBeenCalledWith(
      generationCancelKey("req_1"),
      60 * 60,
      "1",
    );
    await expect(store.isCancelled("req_1")).resolves.toBe(true);

    await store.setCancelled("req_1", false);
    expect(redis.del).toHaveBeenCalledWith(generationCancelKey("req_1"));
    await expect(store.isCancelled("req_1")).resolves.toBe(false);
  });

  it("stores and clears session cancellation flags", async () => {
    const { redis, store } = createStore();
    redis.setex.mockResolvedValue("OK");
    redis.del.mockResolvedValue(1);
    redis.get.mockResolvedValueOnce("1").mockResolvedValueOnce(null);

    await store.setSessionCancelled("sess_1", true);
    expect(redis.setex).toHaveBeenCalledWith(
      `${generationSessionStateKey("sess_1")}:cancel`,
      60 * 60,
      "1",
    );
    await expect(store.isSessionCancelled("sess_1")).resolves.toBe(true);

    await store.setSessionCancelled("sess_1", false);
    expect(redis.del).toHaveBeenCalledWith(
      `${generationSessionStateKey("sess_1")}:cancel`,
    );
    await expect(store.isSessionCancelled("sess_1")).resolves.toBe(false);
  });

  it("stores request status with TTL-backed metadata", async () => {
    const { redis, store } = createStore();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1234);
    redis.setex.mockResolvedValue("OK");
    redis.get.mockResolvedValue({ status: "streaming" });

    try {
      await store.setRequestStatus("req_1", "streaming");
      expect(redis.setex).toHaveBeenCalledWith(
        generationRequestMetaKey("req_1"),
        60 * 60,
        {
          status: "streaming",
          updatedAt: 1234,
        },
      );
      await expect(store.getRequestStatus("req_1")).resolves.toBe("streaming");
    } finally {
      nowSpy.mockRestore();
    }
  });
});
