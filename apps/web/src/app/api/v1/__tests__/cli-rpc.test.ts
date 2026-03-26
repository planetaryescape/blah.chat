/**
 * @vitest-environment node
 */
import { createHash } from "node:crypto";
import { cliApiKeys, users } from "@blah-chat/persistence-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/api/middleware/errors", async () => {
  const actual = await vi.importActual("@/lib/api/middleware/errors");
  return actual;
});

function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

describe("/api/v1/cli/rpc", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    db = await createTestPersistenceDb();
  });

  it("returns 401 when API key is missing", async () => {
    const { POST } = await import("../cli/rpc/route");
    const req = createMockRequest("/api/v1/cli/rpc", {
      method: "POST",
      body: { method: "validateApiKey" },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    expect(response.status).toBe(401);
  });

  it("returns 401 for invalid API key", async () => {
    const { POST } = await import("../cli/rpc/route");
    const req = createMockRequest("/api/v1/cli/rpc", {
      method: "POST",
      body: { method: "validateApiKey" },
      headers: {
        "x-api-key": "blah_invalid",
      },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    expect(response.status).toBe(401);
  });

  it("returns success envelope for validateApiKey", async () => {
    // Seed a user and API key
    const [user] = await db
      .insert(users)
      .values({
        clerkId: "clerk_123",
        email: "test@example.com",
        name: "Test User",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .returning();

    const apiKey = "blah_valid_test_key";
    await db.insert(cliApiKeys).values({
      userId: user!.id,
      keyHash: hashApiKey(apiKey),
      keyPrefix: apiKey.slice(0, 12),
      name: "Test Key",
      createdAt: Date.now(),
    });

    const { POST } = await import("../cli/rpc/route");
    const req = createMockRequest("/api/v1/cli/rpc", {
      method: "POST",
      body: { method: "validateApiKey" },
      headers: {
        "x-api-key": apiKey,
      },
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("success");
    expect(json.data.userId).toBe(user!.id);
  });
});
