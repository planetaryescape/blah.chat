/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExecute = vi.fn();
const mockPing = vi.fn();
const mockSend = vi.fn();
const mockTriggerPing = vi.fn();

vi.mock("@blah-chat/persistence-postgres", () => ({
  createPersistenceDatabase: vi.fn(() => ({
    execute: mockExecute,
  })),
  createNeonDatabase: vi.fn(() => ({
    execute: mockExecute,
  })),
  createRedisClient: vi.fn(() => ({
    ping: mockPing,
  })),
  createR2Client: vi.fn(() => ({
    send: mockSend,
  })),
  createTriggerClient: vi.fn(() => ({
    ping: mockTriggerPing,
  })),
  parsePersistenceEnv: vi.fn(() => ({
    databaseUrl: "postgres://user:pass@host/db",
    redis: {
      restUrl: "https://example.upstash.io",
      restToken: "token",
    },
    r2: {
      accountId: "account123",
      accessKeyId: "key",
      secretAccessKey: "secret",
      bucket: "blah-chat-prod",
      endpoint: "https://account123.r2.cloudflarestorage.com",
      region: "auto",
      forcePathStyle: false,
    },
    trigger: {
      secretKey: "tr_dev_123",
      apiUrl: "https://api.trigger.dev",
    },
  })),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  HeadBucketCommand: class HeadBucketCommand {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

vi.mock("drizzle-orm", () => ({
  sql: vi.fn((strings: TemplateStringsArray) => strings.join("")),
}));

import {
  assertEnvelopeError,
  assertEnvelopeSuccess,
} from "@/lib/test/api-helpers";

describe("/api/v1/health", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockExecute.mockResolvedValue([{ "?column?": 1 }]);
    mockPing.mockResolvedValue("PONG");
    mockSend.mockResolvedValue({});
    mockTriggerPing.mockResolvedValue({
      data: [],
      pagination: {},
    });
  });

  it("returns health envelope including persistence status", async () => {
    const { GET } = await import("../health/route");
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    assertEnvelopeSuccess(json);
    expect(json.data.status).toBe("ok");
    expect(json.data.persistence).toEqual({
      database: "ok",
      redis: "ok",
      r2: "ok",
      trigger: "ok",
    });
  });

  it("returns 503 when persistence health fails", async () => {
    mockTriggerPing.mockRejectedValue(new Error("trigger down"));

    const { GET } = await import("../health/route");
    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(503);
    assertEnvelopeError(json);
  });
});
