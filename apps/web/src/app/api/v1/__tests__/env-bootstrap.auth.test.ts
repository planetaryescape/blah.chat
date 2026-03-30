/**
 * @vitest-environment node
 */
import { createUserRepository } from "@blah-chat/persistence-postgres";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertEnvelopeError,
  createMockRequest,
  unwrapData,
} from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const createPostgresDatabaseMock = vi.fn();
const originalEnv = { ...process.env };
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@blah-chat/persistence-postgres", async () => {
  const actual = await vi.importActual<
    typeof import("@blah-chat/persistence-postgres")
  >("@blah-chat/persistence-postgres");

  return {
    ...actual,
    createPostgresDatabase: (...args: unknown[]) =>
      createPostgresDatabaseMock(...args),
  };
});

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/api/monitoring", () => ({
  trackAPIPerformance: vi.fn(),
}));

vi.mock("server-only", () => ({}));

describe("DB-only env bootstrap", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();
    createPostgresDatabaseMock.mockImplementation(() => db);

    authMock.mockResolvedValue({
      userId: "clerk_env_bootstrap",
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_env_bootstrap",
      primaryEmailAddress: { emailAddress: "env-bootstrap@example.com" },
      fullName: "Env Bootstrap",
      firstName: "Env",
      lastName: "Bootstrap",
      imageUrl: "https://example.com/env-bootstrap.png",
    });

    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgres://user:pass@host/db",
    };
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.R2_ENDPOINT;
    delete process.env.R2_ENDPOINT_URL;
    delete process.env.TRIGGER_SECRET_KEY;
    delete process.env.TRIGGER_API_URL;
    globalThis.__blahPersistenceDb = undefined;
  });

  afterAll(() => {
    process.env = originalEnv;
    globalThis.__blahPersistenceDb = undefined;
  });

  it("serves the DB-backed current user route with only DATABASE_URL configured", async () => {
    const { GET: getCurrentUser } = await import("../user/me/route");

    const userResponse = await getCurrentUser(
      createMockRequest("/api/v1/user/me"),
      { params: Promise.resolve({}) },
    );
    expect(userResponse.status).toBe(200);
    expect(unwrapData<{ email: string }>(await userResponse.json()).email).toBe(
      "env-bootstrap@example.com",
    );
    expect(createPostgresDatabaseMock).toHaveBeenCalledWith(
      "postgres://user:pass@host/db",
    );

    const persistedUser = await createUserRepository(db).findByClerkId(
      "clerk_env_bootstrap",
    );
    expect(persistedUser?.email).toBe("env-bootstrap@example.com");
  });

  it("serves the DB-backed conversations list route with only DATABASE_URL configured", async () => {
    const { GET: getConversations } = await import("../conversations/route");

    const response = await getConversations(
      createMockRequest("/api/v1/conversations?limit=100"),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    expect(
      unwrapData<{ items?: unknown[]; total: number }>(await response.json()),
    ).toMatchObject({
      total: 0,
    });
    expect(createPostgresDatabaseMock).toHaveBeenCalledWith(
      "postgres://user:pass@host/db",
    );

    const persistedUser = await createUserRepository(db).findByClerkId(
      "clerk_env_bootstrap",
    );
    expect(persistedUser?.email).toBe("env-bootstrap@example.com");
  });

  it("serves the DB-backed preferences routes with only DATABASE_URL configured", async () => {
    const { GET: getPreference, PATCH: updatePreference } = await import(
      "../preferences/route"
    );

    const updateResponse = await updatePreference(
      createMockRequest("/api/v1/preferences", {
        method: "PATCH",
        body: {
          key: "theme",
          value: "vesper",
        },
      }),
      { params: Promise.resolve({}) },
    );
    expect(updateResponse.status).toBe(200);

    const getResponse = await getPreference(
      createMockRequest("/api/v1/preferences?key=theme"),
      { params: Promise.resolve({}) },
    );
    expect(getResponse.status).toBe(200);
    expect(
      unwrapData<{ key: string; value: string }>(await getResponse.json()),
    ).toEqual({
      key: "theme",
      value: "vesper",
    });
  });

  it("returns a configuration error when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    globalThis.__blahPersistenceDb = undefined;

    const { GET: getCurrentUser } = await import("../user/me/route");
    const response = await getCurrentUser(
      createMockRequest("/api/v1/user/me"),
      { params: Promise.resolve({}) },
    );
    const json = await response.json();

    expect(response.status).toBe(503);
    assertEnvelopeError(json);
    expect(json.error).toMatchObject({
      message: "Persistence database is not configured",
      code: "CONFIGURATION_ERROR",
    });
  });
});
