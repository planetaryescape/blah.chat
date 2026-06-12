/**
 * @vitest-environment node
 */
import { createUserRepository, notes } from "@blah-chat/persistence-postgres";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockRequest, unwrapData } from "@/lib/test/api-helpers";
import { createTestPersistenceDb } from "../../../../../../../packages/persistence-postgres/src/testing/pglite";

const authMock = vi.fn();
const currentUserMock = vi.fn();
const generateObjectMock = vi.fn();
const getGatewayOptionsMock = vi.fn(() => ({}));
const getModelMock = vi.fn(() => ({ provider: "test" }));
let db: Awaited<ReturnType<typeof createTestPersistenceDb>>;

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("ai", () => ({
  generateObject: generateObjectMock,
}));

vi.mock("@blah-chat/ai/gateway", () => ({
  getGatewayOptions: getGatewayOptionsMock,
}));

vi.mock("@blah-chat/ai/registry", () => ({
  getModel: getModelMock,
}));

vi.mock("@blah-chat/persistence-postgres", async () => {
  const actual = await vi.importActual<
    typeof import("@blah-chat/persistence-postgres")
  >("@blah-chat/persistence-postgres");
  return {
    ...actual,
    parsePersistenceEnv: vi.fn(() => ({
      databaseUrl: "postgres://test:test@localhost/test",
      redis: { restUrl: "https://redis.test", restToken: "token" },
      r2: {
        accountId: "test",
        accessKeyId: "test",
        secretAccessKey: "test",
        bucket: "test",
        endpoint: "https://test.r2.cloudflarestorage.com",
        region: "auto",
        forcePathStyle: false,
      },
      trigger: { secretKey: "tr_test", apiUrl: "https://api.trigger.dev" },
    })),
    createTriggerClient: vi.fn(() => ({
      triggerTask: vi.fn().mockResolvedValue({}),
    })),
  };
});

vi.mock("@/lib/persistence/server", () => ({
  getPersistenceDb: () => db,
}));

vi.mock("@/lib/logger", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

describe("note auto-tag and sharing routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    db = await createTestPersistenceDb();

    authMock.mockResolvedValue({
      userId: "clerk_notes_share",
      getToken: vi.fn(async () => null),
    });

    currentUserMock.mockResolvedValue({
      id: "clerk_notes_share",
      primaryEmailAddress: { emailAddress: "notes@example.com" },
      fullName: "Notes User",
      firstName: "Notes",
      lastName: "User",
      imageUrl: "https://example.com/notes.png",
      publicMetadata: {},
    });

    generateObjectMock.mockResolvedValue({
      object: {
        tags: ["react", "mobile"],
      },
      usage: {
        inputTokens: 10,
        outputTokens: 4,
      },
    });
  });

  it("auto-tags notes, creates shares, toggles shares, and verifies public access", async () => {
    const users = createUserRepository(db);
    await users.upsertFromClerk({
      clerkId: "clerk_notes_share",
      email: "notes@example.com",
      name: "Notes User",
      imageUrl: "https://example.com/notes.png",
    });

    const notesRoute = await import("../notes/route");
    const autoTagRoute = await import("../notes/[id]/auto-tag/route");
    const shareRoute = await import("../notes/[id]/share/route");
    const publicShareRoute = await import(
      "../public/notes/shares/[shareId]/route"
    );
    const verifyRoute = await import(
      "../public/notes/shares/[shareId]/verify/route"
    );

    await notesRoute.POST(
      createMockRequest("/api/v1/notes", {
        method: "POST",
        body: {
          title: "Existing tags",
          content:
            "This note already exists so tag reuse can keep the existing react tag.",
          tags: ["react"],
        },
      }),
      { params: Promise.resolve({}) },
    );

    const createResponse = await notesRoute.POST(
      createMockRequest("/api/v1/notes", {
        method: "POST",
        body: {
          title: "Offline mobile rewrite",
          content:
            "React Native mobile rewrite notes with enough detail to trigger automatic tagging and sharing.",
        },
      }),
      { params: Promise.resolve({}) },
    );

    const createdNote = unwrapData<{
      _id: string;
      title: string;
      tags?: string[];
    }>((await createResponse.json()) as any);

    const autoTagResponse = await autoTagRoute.POST(
      createMockRequest(`/api/v1/notes/${createdNote._id}/auto-tag`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: createdNote._id }) },
    );

    expect(autoTagResponse.status).toBe(200);
    expect(
      unwrapData<{ appliedTags: string[] }>(
        (await autoTagResponse.json()) as any,
      ),
    ).toEqual({
      appliedTags: ["react", "mobile"],
    });

    const shareCreateResponse = await shareRoute.POST(
      createMockRequest(`/api/v1/notes/${createdNote._id}/share`, {
        method: "POST",
        body: {
          password: "secret-pass",
          expiresIn: 7,
        },
      }),
      { params: Promise.resolve({ id: createdNote._id }) },
    );

    expect(shareCreateResponse.status).toBe(200);
    const sharedNote = unwrapData<{
      _id: string;
      shareId: string;
      isPublic: boolean;
      shareExpiresAt?: number;
      tags?: string[];
    }>((await shareCreateResponse.json()) as any);
    expect(sharedNote.shareId).toBeTruthy();
    expect(sharedNote.isPublic).toBe(true);
    expect(sharedNote.shareExpiresAt).toBeTypeOf("number");
    expect(sharedNote.tags).toEqual(["react", "mobile"]);

    const disableResponse = await shareRoute.PATCH(
      createMockRequest(`/api/v1/notes/${createdNote._id}/share`, {
        method: "PATCH",
        body: {
          isActive: false,
        },
      }),
      { params: Promise.resolve({ id: createdNote._id }) },
    );

    expect(disableResponse.status).toBe(200);
    expect(
      unwrapData<{ isPublic: boolean }>((await disableResponse.json()) as any),
    ).toMatchObject({
      isPublic: false,
    });

    const enableResponse = await shareRoute.PATCH(
      createMockRequest(`/api/v1/notes/${createdNote._id}/share`, {
        method: "PATCH",
        body: {
          isActive: true,
        },
      }),
      { params: Promise.resolve({ id: createdNote._id }) },
    );

    expect(enableResponse.status).toBe(200);
    expect(
      unwrapData<{ isPublic: boolean }>((await enableResponse.json()) as any),
    ).toMatchObject({
      isPublic: true,
    });

    authMock.mockResolvedValue({
      userId: null,
      getToken: vi.fn(async () => null),
    });

    const publicMetadataResponse = await publicShareRoute.GET(
      createMockRequest(`/api/v1/public/notes/shares/${sharedNote.shareId}`),
      { params: Promise.resolve({ shareId: sharedNote.shareId }) },
    );

    expect(publicMetadataResponse.status).toBe(200);
    expect(
      unwrapData<{
        _id: string;
        title: string;
        requiresPassword: boolean;
      }>((await publicMetadataResponse.json()) as any),
    ).toMatchObject({
      _id: createdNote._id,
      title: "Offline mobile rewrite",
      requiresPassword: true,
    });

    const wrongPasswordResponse = await verifyRoute.POST(
      createMockRequest(
        `/api/v1/public/notes/shares/${sharedNote.shareId}/verify`,
        {
          method: "POST",
          body: {
            password: "wrong-pass",
          },
        },
      ),
      { params: Promise.resolve({ shareId: sharedNote.shareId }) },
    );

    expect(wrongPasswordResponse.status).toBe(403);

    const verifyResponse = await verifyRoute.POST(
      createMockRequest(
        `/api/v1/public/notes/shares/${sharedNote.shareId}/verify`,
        {
          method: "POST",
          body: {
            password: "secret-pass",
          },
        },
      ),
      { params: Promise.resolve({ shareId: sharedNote.shareId }) },
    );

    expect(verifyResponse.status).toBe(200);
    expect(
      unwrapData<{
        _id: string;
        title: string;
        content: string;
        isOwner: boolean;
      }>((await verifyResponse.json()) as any),
    ).toMatchObject({
      _id: createdNote._id,
      title: "Offline mobile rewrite",
      content:
        "React Native mobile rewrite notes with enough detail to trigger automatic tagging and sharing.",
      isOwner: false,
    });

    const [persisted] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, createdNote._id));
    expect(persisted?.tags).toEqual(["react", "mobile"]);
    expect(persisted?.shareId).toBe(sharedNote.shareId);
    expect(persisted?.isPublic).toBe(true);
    expect(persisted?.sharePassword).not.toBe("secret-pass");
    // New shares are bcrypt-hashed, never the legacy unsalted sha256 hex.
    expect(persisted?.sharePassword).toMatch(/^\$2[aby]\$/);
  });

  it("verifies legacy sha256-hashed share passwords and upgrades them to bcrypt", async () => {
    const { createHash } = await import("node:crypto");
    const users = createUserRepository(db);
    const user = await users.upsertFromClerk({
      clerkId: "clerk_notes_share",
      email: "notes@example.com",
      name: "Notes User",
      imageUrl: "https://example.com/notes.png",
    });

    const now = Date.now();
    const legacyHash = createHash("sha256").update("legacy-pass").digest("hex");
    const [legacyNote] = await db
      .insert(notes)
      .values({
        userId: user.id,
        title: "Legacy share",
        content: "Shared before bcrypt hashing landed.",
        tags: [],
        isPinned: false,
        shareId: "legacy-share-id",
        isPublic: true,
        sharePassword: legacyHash,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    expect(legacyNote).toBeDefined();

    authMock.mockResolvedValue({
      userId: null,
      getToken: vi.fn(async () => null),
    });

    const verifyRoute = await import(
      "../public/notes/shares/[shareId]/verify/route"
    );

    const wrongResponse = await verifyRoute.POST(
      createMockRequest("/api/v1/public/notes/shares/legacy-share-id/verify", {
        method: "POST",
        body: { password: "wrong-pass" },
      }),
      { params: Promise.resolve({ shareId: "legacy-share-id" }) },
    );
    expect(wrongResponse.status).toBe(403);

    // A failed attempt must not upgrade or alter the stored hash.
    let [persisted] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, legacyNote!.id));
    expect(persisted?.sharePassword).toBe(legacyHash);

    const verifyResponse = await verifyRoute.POST(
      createMockRequest("/api/v1/public/notes/shares/legacy-share-id/verify", {
        method: "POST",
        body: { password: "legacy-pass" },
      }),
      { params: Promise.resolve({ shareId: "legacy-share-id" }) },
    );
    expect(verifyResponse.status).toBe(200);

    // Successful legacy verification rewrites the stored hash as bcrypt.
    [persisted] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, legacyNote!.id));
    expect(persisted?.sharePassword).toMatch(/^\$2[aby]\$/);

    // The upgraded hash still verifies via bcrypt.
    const reVerifyResponse = await verifyRoute.POST(
      createMockRequest("/api/v1/public/notes/shares/legacy-share-id/verify", {
        method: "POST",
        body: { password: "legacy-pass" },
      }),
      { params: Promise.resolve({ shareId: "legacy-share-id" }) },
    );
    expect(reVerifyResponse.status).toBe(200);
  });
});
